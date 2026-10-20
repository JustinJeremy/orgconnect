<?php

namespace App\Http\Controllers;

use App\Mail\OrgRequestDecided;
use App\Models\Event;
use App\Models\MembershipRecord;
use App\Models\Organization;
use App\Models\OrgChangeRequest;
use App\Models\PlatformAnnouncementReply;
use App\Models\Setting;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\VolunteerHour;
use App\Support\OrgThemes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

// Platform admin (users.is_admin): reviews org registrations and can suspend orgs.
// Admins don't belong to any org; every route here is behind the EnsureAdmin middleware.
class AdminController extends Controller
{
    // Officers listed President, VPs, Secretary, Treasurer, then other officers (as on the roster)
    private const POSITION_RANK = ['President' => 0, 'Secretary' => 2, 'Treasurer' => 3];

    // GET /api/admin/overview -> totals, every registration request and every org
    public function overview()
    {
        $orgs = Organization::with('requester')->orderBy('name')->get();
        $live = $orgs->whereIn('status', ['Active', 'Suspended']);
        $activeIds = $orgs->where('status', 'Active')->pluck('id');

        return [
            'stats' => [
                'organizations' => $live->count(),
                'activeOrganizations' => $activeIds->count(),
                'pendingRequests' => $orgs->where('status', 'Pending')->count(),
                // people counted once even if they're in several orgs
                'members' => MembershipRecord::whereIn('organization_id', $activeIds)->where('status', 'Active')->distinct()->count('user_id'),
                'approvedHours' => (float) VolunteerHour::withoutGlobalScopes()->whereIn('organization_id', $activeIds)->where('status', 'Approved')->sum('hours'),
            ],
            // Org threads under your announcements whose latest message is theirs (waiting for your answer)
            'repliesWaiting' => PlatformAnnouncementReply::with('user')->orderBy('id')->get()
                ->groupBy(fn ($r) => $r->platform_announcement_id.'-'.$r->organization_id)
                ->filter(fn ($thread) => ! $thread->last()->user?->is_admin)
                ->count(),
            // Presidents' requests to change their org's details, waiting for review
            'changeRequests' => OrgChangeRequest::with(['organization', 'requester'])->where('status', 'Pending')->latest()->get()->map->toFrontend(),
            'requests' => $orgs->whereIn('status', ['Pending', 'Rejected'])
                ->sortByDesc('created_at')->values()->map->toRequest(),
            'organizations' => $live->values()->map(fn (Organization $org) => [
                'id' => $org->id,
                'slug' => $org->slug,
                'name' => $org->name,
                'college' => $org->college,
                'status' => $org->status,
                'president' => MembershipRecord::where('organization_id', $org->id)
                    ->where('position', 'President')->where('status', 'Active')->first()?->user?->name,
                'members' => MembershipRecord::where('organization_id', $org->id)->where('status', 'Active')->count(),
                'events' => Event::withoutGlobalScopes()->where('organization_id', $org->id)->count(),
            ]),
        ];
    }

    // PATCH /api/admin/org-requests/{organization}  { decision: Approved | Rejected, note?, courses? }
    // Approving puts the org live and makes the requester its President.
    // The admin may fix the course list before approving.
    // note: the reason when rejecting (required), or an optional message when approving.
    // The requester is notified and emailed (with the org's details when approved).
    public function decide(Request $request, Organization $organization)
    {
        abort_unless($organization->status === 'Pending', 422, 'This request was already reviewed.');
        $data = $request->validate([
            'decision' => 'required|in:Approved,Rejected',
            'note' => 'required_if:decision,Rejected|nullable|string|max:500',
            'courses' => 'sometimes|array|min:1|max:20',
            'courses.*' => 'required|string|max:20|distinct:ignore_case',
        ], ['note.required_if' => 'Give the requester a reason.']);

        if ($data['decision'] === 'Rejected') {
            $organization->update(['status' => 'Rejected', 'review_note' => trim($data['note']), 'reviewed_at' => now()]);
            // Not tied to an org (it isn't live), so it shows in whichever org they open
            if ($organization->requested_by) {
                UserNotification::platform($organization->requested_by, "Your request to register {$organization->short_name} was not approved: {$organization->review_note}", 'register-org');
            }
            $this->email($organization, false, $organization->review_note);

            return $organization->fresh()->toRequest();
        }

        $message = trim((string) ($data['note'] ?? '')) ?: null;
        $organization->update([
            'status' => 'Active',
            'review_note' => $message,
            'reviewed_at' => now(),
        ] + (isset($data['courses']) ? ['courses' => array_values(array_map(fn ($c) => strtoupper(trim($c)), $data['courses']))] : []));

        if ($organization->requested_by) {
            MembershipRecord::updateOrCreate(
                ['user_id' => $organization->requested_by, 'organization_id' => $organization->id],
                ['role' => 'officer', 'position' => 'President', 'status' => 'Active', 'join_date' => now()]
            );
            UserNotification::create([
                'organization_id' => $organization->id,
                'user_id' => $organization->requested_by,
                'message' => "{$organization->short_name} is live on OrgConnect. You're its President: add your officers next".($message ? ". Message from the admin: {$message}" : ''),
                'link' => 'hours',
            ]);
        }
        $this->email($organization->fresh(), true, $message);

        return $organization->fresh()->toRequest();
    }

    // The requester's copy of the decision. A mail problem never undoes the decision.
    private function email(Organization $organization, bool $approved, ?string $note): void
    {
        $to = $organization->requester?->email;
        if (! $to) {
            return;
        }
        try {
            Mail::to($to)->send(new OrgRequestDecided($organization, $approved, $note));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    // GET /api/admin/organizations/{organization}  -> everything about one org, for the "View" pop-up
    public function organization(Organization $organization)
    {
        $members = MembershipRecord::with('user')->where('organization_id', $organization->id);
        $officers = (clone $members)->where('role', 'officer')->where('status', 'Active')->get()
            ->sortBy(fn (MembershipRecord $m) => [self::POSITION_RANK[$m->position] ?? (str_starts_with((string) $m->position, 'VP') ? 1 : 4), $m->user?->name])
            ->values();
        $events = Event::withoutGlobalScopes()->where('organization_id', $organization->id);

        return $organization->toFrontend() + [
            'status' => $organization->status,
            'suspensionReason' => $organization->suspension_reason,
            'color' => OrgThemes::describe($organization->theme),
            'requestedBy' => $organization->requester?->name,
            'approvedAt' => $organization->reviewed_at?->format('Y-m-d'),
            'officers' => $officers->map(fn (MembershipRecord $m) => [
                'id' => $m->user_id, 'name' => $m->user?->name, 'email' => $m->user?->email, 'position' => $m->position,
                ...($m->user?->avatarData() ?? []),
            ])->values(),
            'counts' => [
                'members' => (clone $members)->where('status', 'Active')->count(),
                'inactive' => (clone $members)->where('status', 'Inactive')->count(),
                'applicants' => (clone $members)->where('status', 'Pending')->count(),
                'events' => (clone $events)->count(),
                'upcoming' => (clone $events)->where('status', '!=', 'completed')->whereDate('date', '>=', now()->toDateString())->count(),
                'approvedHours' => (float) VolunteerHour::withoutGlobalScopes()->where('organization_id', $organization->id)->where('status', 'Approved')->sum('hours'),
            ],
        ];
    }

    // GET /api/admin/users?search=&org=&page= -> every account (not admins), with the orgs they're in
    //   org (id): only that org's people, officers first then members (like its roster)
    public function users(Request $request)
    {
        $words = trim((string) $request->input('search'));
        $org = $request->filled('org') ? Organization::find((int) $request->input('org')) : null;
        $page = User::where('is_admin', false)
            ->when($org, fn ($q) => $q->whereHas('memberships', fn ($m) => $m->where('organization_id', $org->id)->whereIn('status', ['Active', 'Inactive', 'Pending']))
                ->orderBy(MembershipRecord::rankIn($org->id)))
            ->when($words !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$words}%")->orWhere('email', 'like', "%{$words}%")->orWhere('student_id', 'like', "%{$words}%")))
            ->with('memberships.organization')
            ->orderBy('name')
            ->paginate(min(max((int) $request->input('perPage', 12), 1), 50));

        return [
            'data' => collect($page->items())->map(fn (User $u) => [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'studentId' => $u->student_id,
                'course' => $u->course, 'yearLevel' => $u->year_level,
                ...$u->avatarData(),
                'orgs' => $u->memberships->filter(fn ($m) => $m->organization)->map(fn ($m) => [
                    'shortName' => $m->organization->short_name, 'position' => $m->position, 'status' => $m->status,
                ])->values(),
            ]),
            'meta' => ['page' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total(), 'perPage' => $page->perPage()],
        ];
    }

    // POST /api/admin/users/{user}/reset-password -> { temporaryPassword }
    // For anyone who forgot their password. Signs them out everywhere. Only the platform admin can.
    public function resetPassword(User $user)
    {
        abort_if($user->is_admin, 422, 'Admins change their own password on their profile.');
        $temporary = collect(range(1, 10))->map(fn () => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'[random_int(0, 54)])->implode('');
        $user->update(['password' => $temporary]);
        $user->tokens()->delete();

        return ['temporaryPassword' => $temporary];
    }

    // PUT /api/admin/users/{user}  { name, email, studentId, course, yearLevel }
    // Students can't change these themselves while details are locked, so the admin fixes mistakes
    public function updateUser(Request $request, User $user)
    {
        abort_if($user->is_admin, 422, 'Admins change their own details on their profile.');
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'studentId' => ['required', 'string', 'max:50', Rule::when($request->input('studentId') !== $user->student_id, 'regex:'.User::STUDENT_ID_FORMAT), Rule::unique('users', 'student_id')->ignore($user->id)],
            'course' => 'required|string|max:50',
            'yearLevel' => 'required|string|max:50',
        ], [
            'email.unique' => 'An account with this email already exists.',
            'studentId.unique' => 'This student ID is already registered.',
            'studentId.regex' => 'Student IDs look like 2025-00142.',
        ]);
        $user->update([
            'name' => $data['name'], 'email' => $data['email'], 'student_id' => $data['studentId'],
            'course' => $data['course'], 'year_level' => $data['yearLevel'],
        ]);
        UserNotification::platform($user->id, 'The OrgConnect admin updated your account details', 'profile');

        return ['ok' => true];
    }

    // GET /api/admin/settings
    public function settings()
    {
        return ['detailsOpen' => Setting::flag(Setting::DETAILS_OPEN)];
    }

    // PUT /api/admin/settings  { detailsOpen }  -> e.g. open details updates at the start of a school year, then close them again
    public function updateSettings(Request $request)
    {
        $data = $request->validate(['detailsOpen' => 'required|boolean']);
        Setting::setFlag(Setting::DETAILS_OPEN, $data['detailsOpen']);

        return $this->settings();
    }

    // PATCH /api/admin/organizations/{organization}  { status: Active | Suspended }
    public function setStatus(Request $request, Organization $organization)
    {
        abort_unless(in_array($organization->status, ['Active', 'Suspended'], true), 422, 'Only live organizations can be suspended.');
        $data = $request->validate([
            'status' => 'required|in:Active,Suspended',
            // Suspending needs a reason (its officers see it); reactivating may add a note
            'reason' => 'required_if:status,Suspended|nullable|string|max:500',
        ], ['reason.required_if' => 'Give the officers a reason.']);
        $before = $organization->status;
        $note = trim((string) ($data['reason'] ?? '')) ?: null;
        $organization->update([
            'status' => $data['status'],
            'suspension_reason' => $data['status'] === 'Suspended' ? $note : null,
        ]);

        // Tell its officers (not tied to the org: a suspended org can't be opened)
        if ($before !== $organization->status) {
            $officers = MembershipRecord::where('organization_id', $organization->id)->where('role', 'officer')->where('status', 'Active')->pluck('user_id');
            foreach ($officers as $officerId) {
                UserNotification::platform($officerId, $organization->status === 'Suspended'
                    ? "{$organization->name} was suspended by an OrgConnect admin. Reason: {$note}"
                    : "{$organization->name} is active again".($note ? ". Note from the admin: {$note}" : ''), 'dashboard');
            }
        }

        return ['ok' => true, 'status' => $organization->status];
    }
}
