<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ListsOrPages;
use App\Http\Controllers\Concerns\OfficerOnly;
use App\Http\Requests\DecideApplicationRequest;
use App\Http\Requests\MemberRequest;
use App\Models\MembershipRecord;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            // Officers first (President, VPs, Secretary, Treasurer...), then members; A to Z within each
            ->orderBy(MembershipRecord::rankIn(Organization::current()->id))
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

    // PUT /api/members/{member}  (officers) -> position and status only; name and email stay as the person registered them
    public function update(MemberRequest $request, User $member)
    {
        $this->membersManagerOnly($request);
        $this->ensureInThisOrg($member);
        abort_if($member->id === $request->user()->id, 422, "You can't change your own position or status. Ask another officer.");
        $data = $request->validated();
        $this->presidentForOfficers($request, $member->isOfficer() || $data['position'] !== 'Member');

        $wasInactive = $member->membership->status === 'Inactive';
        $this->saveMembership($member, $data);

        if ($data['status'] === 'Inactive' && ! $wasInactive) {
            UserNotification::send($member->id, 'Your membership in '.Organization::current()->short_name.' was set to inactive', 'dashboard');
        }

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
            ->get()
            ->sortByDesc(fn (User $u) => $u->membership->created_at)
            ->values()
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
            'rejection_reason' => $approved ? null : trim($request->validated('reason')),
            'rejected_by' => $approved ? null : $request->user()->id,
            'rejected_at' => $approved ? null : now(),
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

    // GET /api/reactivations  (officers) -> inactive members who asked to be active again
    public function reactivations(Request $request)
    {
        $this->officerOnly($request);

        return User::withMembershipStatus(['Inactive'])
            ->whereHas('membership', fn ($q) => $q->whereNotNull('reactivation_requested_at'))
            ->with('membership')
            ->get()
            ->sortByDesc(fn (User $u) => $u->membership->reactivation_requested_at)
            ->values()
            ->map->toReactivation();
    }

    // PATCH /api/reactivations/{member}  { status: Approved | Declined }  (President, VPs, Secretary)
    public function decideReactivation(Request $request, User $member)
    {
        $this->membersManagerOnly($request);
        $approved = $request->validate(['status' => 'required|in:Approved,Declined'])['status'] === 'Approved';
        $membership = $member->membership;
        abort_unless($membership->status === 'Inactive' && $membership->reactivation_requested_at, 404, 'No reactivation request from this member.');

        $membership->update($approved ? [
            'status' => 'Active',
            'inactive_reason' => null, 'inactive_by' => null, 'inactive_at' => null,
            'reactivation_message' => null, 'reactivation_requested_at' => null,
        ] : ['reactivation_message' => null, 'reactivation_requested_at' => null]);

        $org = Organization::current()->short_name;
        UserNotification::send($member->id, $approved
            ? "Welcome back! Your {$org} membership is active again"
            : "Your request to reactivate your {$org} membership was declined", 'dashboard');

        return ['ok' => true];
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

    // Inactive: keep the reason, who set it and when (a new reason clears any earlier reactivation request).
    // Active again: forget all of that.
    private function saveMembership(User $member, array $data, array $extra = []): void
    {
        $existing = $member->memberships()->where('organization_id', Organization::current()->id)->first();
        $inactive = $data['status'] === 'Inactive';
        $reason = $inactive ? trim((string) ($data['inactiveReason'] ?? '')) : null;
        $changed = ! $existing || $existing->status !== 'Inactive' || $existing->inactive_reason !== $reason;

        $member->memberships()->updateOrCreate(['organization_id' => Organization::current()->id], [
            'role' => $data['position'] === 'Member' ? 'member' : 'officer',
            'position' => $data['position'],
            'status' => $data['status'],
        ] + ($inactive ? ($changed ? [
            'inactive_reason' => $reason,
            'inactive_by' => request()->user()->id,
            'inactive_at' => now(),
            'reactivation_message' => null,
            'reactivation_requested_at' => null,
        ] : []) : [
            'inactive_reason' => null,
            'inactive_by' => null,
            'inactive_at' => null,
            'reactivation_message' => null,
            'reactivation_requested_at' => null,
        ]) + $extra);
    }
}
