<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\MembershipRecord;
use App\Models\Organization;
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

    // PATCH /api/admin/organizations/{organization}  { status: Active | Suspended }
    public function setStatus(Request $request, Organization $organization)
    {
        abort_unless(in_array($organization->status, ['Active', 'Suspended'], true), 422, 'Only live organizations can be suspended.');
        $organization->update($request->validate(['status' => 'required|in:Active,Suspended']));

        return ['ok' => true, 'status' => $organization->status];
    }
}
