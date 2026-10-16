<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\MembershipRecord;
use App\Models\OrgChangeRequest;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\VolunteerHour;
use Illuminate\Http\Request;

// Platform admin (users.is_admin): reviews org registrations and can suspend orgs.
// Admins don't belong to any org; every route here is behind the EnsureAdmin middleware.
class AdminController extends Controller
{
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

            return $organization->fresh()->toRequest();
        }

        $organization->update([
            'status' => 'Active',
            'review_note' => null,
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
                'message' => "{$organization->short_name} is live on OrgConnect. You're its President: add your officers next",
                'link' => 'hours',
            ]);
        }

        return $organization->fresh()->toRequest();
    }

    // GET /api/admin/users?search=&page= -> every account (not admins), with the orgs they're in
    public function users(Request $request)
    {
        $words = trim((string) $request->input('search'));
        $page = User::where('is_admin', false)
            ->when($words !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$words}%")->orWhere('email', 'like', "%{$words}%")->orWhere('student_id', 'like', "%{$words}%")))
            ->with('memberships.organization')
            ->orderBy('name')
            ->paginate(min(max((int) $request->input('perPage', 12), 1), 50));

        return [
            'data' => collect($page->items())->map(fn (User $u) => [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'studentId' => $u->student_id,
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

    // PATCH /api/admin/organizations/{organization}  { status: Active | Suspended }
    public function setStatus(Request $request, Organization $organization)
    {
        abort_unless(in_array($organization->status, ['Active', 'Suspended'], true), 422, 'Only live organizations can be suspended.');
        $before = $organization->status;
        $organization->update($request->validate(['status' => 'required|in:Active,Suspended']));

        // Tell its officers (not tied to the org: a suspended org can't be opened)
        if ($before !== $organization->status) {
            $officers = MembershipRecord::where('organization_id', $organization->id)->where('role', 'officer')->where('status', 'Active')->pluck('user_id');
            foreach ($officers as $officerId) {
                UserNotification::platform($officerId, $organization->status === 'Suspended'
                    ? "{$organization->name} was suspended by an OrgConnect admin"
                    : "{$organization->name} is active again", 'dashboard');
            }
        }

        return ['ok' => true, 'status' => $organization->status];
    }
}
