<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ListsOrPages;
use App\Http\Controllers\Concerns\OfficerOnly;
use App\Http\Requests\DecideApplicationRequest;
use App\Http\Requests\MemberRequest;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MemberController extends Controller
{
    use ListsOrPages, OfficerOnly;

    // GET /api/members  (officers) -> approved members, active and inactive
    public function index(Request $request)
    {
        $this->officerOnly($request);

        // List filter: ?search= name, email or position (+ ?page)
        $query = User::withMembershipStatus(['Active', 'Inactive'])
            ->with('membership')
            ->withSum(['hourLogs as approved_sum' => fn ($q) => $q->where('status', 'Approved')], 'hours')
            ->orderBy('name');
        $this->search($request, $query, ['name', 'email'], ['membership' => 'position']);

        return $this->listOrPage($request, $query, fn (User $u) => $u->toMember());
    }

    // POST /api/members  (officers add someone to the roster directly)
    // Someone who already has an account (e.g. from another org) is added to this org and keeps their password.
    // A brand-new account gets a temporary password, returned once so the officer can pass it on.
    public function store(MemberRequest $request)
    {
        $this->membersManagerOnly($request);
        $data = $request->validated();
        $this->presidentForOfficers($request, $data['position'] !== 'Member');
        $temporary = self::temporaryPassword();

        $member = DB::transaction(function () use ($data, $temporary) {
            $member = User::firstOrCreate(['email' => $data['email']], [
                'name' => $data['name'],
                'password' => $temporary,   // hashed by the User model
            ]);
            $this->saveMembership($member, $data, ['join_date' => now()]);

            return $member;
        });

        return response()->json($member->fresh()->toMember() + [
            'temporaryPassword' => $member->wasRecentlyCreated ? $temporary : null,
        ], 201);
    }

    // POST /api/members/{member}/reset-password  (officers) -> { temporaryPassword }
    // For members who forgot their password. Signs them out everywhere.
    // Not allowed for someone who is an officer in another org, so one org can't take over another org's officer.
    public function resetPassword(Request $request, User $member)
    {
        $this->membersManagerOnly($request);
        $this->ensureInThisOrg($member);
        abort_if($member->id === $request->user()->id, 422, 'Change your own password on your Profile page.');
        $this->presidentForOfficers($request, $member->isOfficer());

        // One org's officers must not be able to take over an account another org relies on
        abort_if($member->inOtherOrganizations(), 422,
            "{$member->name} also belongs to another organization, so only they can change their password.");

        $temporary = self::temporaryPassword();
        $member->update(['password' => $temporary]);
        $member->tokens()->delete();

        return ['temporaryPassword' => $temporary];
    }

    // PUT /api/members/{member}  (officers)
    public function update(MemberRequest $request, User $member)
    {
        $this->membersManagerOnly($request);
        $this->ensureInThisOrg($member);
        abort_if($member->id === $request->user()->id, 422, "You can't change your own position or status. Ask another officer.");
        $data = $request->validated();
        $this->presidentForOfficers($request, $member->isOfficer() || $data['position'] !== 'Member');

        // Name and email belong to the whole account; another org's member changes their own on the Profile page
        $detailsChanged = $data['name'] !== $member->name || strcasecmp($data['email'], $member->email) !== 0;
        abort_if($detailsChanged && $member->inOtherOrganizations(), 422,
            "{$member->name} also belongs to another organization, so only they can change their name and email.");

        $member->update(['name' => $data['name'], 'email' => $data['email']]);
        $this->saveMembership($member, $data);

        return $member->fresh()->toMember();
    }

    // DELETE /api/members/{member}  (officers) -> removes them from this org only; their account stays
    public function destroy(Request $request, User $member)
    {
        $this->membersManagerOnly($request);
        $this->ensureInThisOrg($member);
        abort_if($member->id === $request->user()->id, 422, "You can't remove yourself.");
        $this->presidentForOfficers($request, $member->isOfficer());

        $member->membership()->delete();

        return ['ok' => true];
    }

    // GET /api/applications  (officers) -> students waiting to join
    public function applications(Request $request)
    {
        $this->officerOnly($request);

        return User::withMembershipStatus(['Pending'])
            ->with('membership')
            ->latest()
            ->get()
            ->map->toApplication();
    }

    // PATCH /api/applications/{applicant}  (officers approve or reject)
    public function decideApplication(DecideApplicationRequest $request, User $applicant)
    {
        $this->membersManagerOnly($request);
        $approved = $request->validated('status') === 'Approved';

        abort_unless($applicant->membership->status === 'Pending', 404, 'No pending application from this student.');

        $applicant->membership()->update([
            'status' => $approved ? 'Active' : 'Rejected',
            'join_date' => $approved ? now() : null,
        ]);

        UserNotification::send(
            $applicant->id,
            $approved ? 'Your membership application was approved. Welcome!' : 'Your membership application was not approved.',
            'dashboard'
        );

        return $applicant->fresh()->toApplication();
    }

    // Easy to read out or type: no look-alike characters (0/O/o, 1/l/I)
    private static function temporaryPassword(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

        return collect(range(1, 10))->map(fn () => $alphabet[random_int(0, strlen($alphabet) - 1)])->implode('');
    }

    // GET /api/members/export  (officers) -> CSV of every member's approved and pending hours, by account
    public function export(Request $request)
    {
        $this->officerOnly($request);

        $members = User::withMembershipStatus(['Active', 'Inactive'])
            ->with('membership')
            ->withSum(['hourLogs as approved_sum' => fn ($q) => $q->where('status', 'Approved')], 'hours')
            ->withSum(['hourLogs as pending_sum' => fn ($q) => $q->where('status', 'Pending')], 'hours')
            ->orderBy('name')
            ->get();

        $rows = [['Member', 'Email', 'Student ID', 'Position', 'Status', 'Approved hours', 'Pending hours']];
        foreach ($members as $m) {
            $rows[] = [$m->name, $m->email, $m->student_id, $m->membership->position, $m->membership->status,
                (float) $m->approved_sum, (float) $m->pending_sum];
        }
        $csv = collect($rows)->map(fn ($row) => collect($row)
            ->map(fn ($value) => '"'.str_replace('"', '""', (string) $value).'"')
            ->implode(','))->implode("\n");

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="volunteer-hours-summary.csv"',
        ]);
    }

    // Promoting, demoting, editing or removing an officer is for the President only
    private function presidentForOfficers(Request $request, bool $involvesOfficer): void
    {
        abort_if($involvesOfficer && ! $request->user()->isPresident(), 403, 'Only the President can manage officers.');
    }

    private function ensureInThisOrg(User $member): void
    {
        abort_unless($member->membership->status, 404, 'This person is not in your organization.');
    }

    private function saveMembership(User $member, array $data, array $extra = []): void
    {
        $member->memberships()->updateOrCreate(['organization_id' => Organization::current()->id], [
            'role' => $data['position'] === 'Member' ? 'member' : 'officer',
            'position' => $data['position'],
            'status' => $data['status'],
        ] + $extra);
    }
}
