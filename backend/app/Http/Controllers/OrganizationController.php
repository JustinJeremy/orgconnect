<?php

namespace App\Http\Controllers;

use App\Models\MembershipRecord;
use App\Models\Organization;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OrganizationController extends Controller
{
    // GET /api/organizations  (public) -> every org, for the org picker
    public function index()
    {
        return Organization::orderBy('name')->get()->map->toFrontend();
    }

    // GET /api/my-organizations -> orgs the signed-in user joined or applied to
    public function mine(Request $request)
    {
        return $request->user()->memberships()
            ->get()
            ->map(fn (MembershipRecord $m) => [
                'organizationId' => $m->organization_id,
                'role' => $m->role,
                'position' => $m->position,
                'status' => $m->status,
            ]);
    }

    // POST /api/organizations/{organization}/join -> apply to another org with the same account
    public function join(Request $request, Organization $organization)
    {
        $user = $request->user();
        $existing = $user->memberships()->where('organization_id', $organization->id)->first();

        if ($existing && $existing->status !== 'Rejected') {
            throw ValidationException::withMessages(['organization' => "You already applied to {$organization->name}."]);
        }

        $user->memberships()->updateOrCreate(
            ['organization_id' => $organization->id],
            ['role' => 'member', 'position' => 'Member', 'status' => 'Pending', 'join_date' => null]
        );

        // Let that org's officers know there is a new application
        $officerIds = $organization->memberships()->where('role', 'officer')->where('status', 'Active')->pluck('user_id');
        foreach ($officerIds as $officerId) {
            UserNotification::create([
                'organization_id' => $organization->id,
                'user_id' => $officerId,
                'message' => "{$user->name} applied to join {$organization->short_name}",
            ]);
        }

        Organization::setCurrent($organization);

        return response()->json($user->fresh()->toFrontend(), 201);
    }
}
