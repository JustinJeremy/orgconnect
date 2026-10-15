<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OfficerOnly;
use App\Models\MembershipRecord;
use App\Models\Organization;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class OrganizationController extends Controller
{
    use OfficerOnly;

    // GET /api/organizations  (public) -> every org, for the org picker
    public function index()
    {
        return Organization::active()->orderBy('name')->get()->map->toFrontend();
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

    // DELETE /api/organizations/{organization}/application -> withdraw a pending application
    public function withdraw(Request $request, Organization $organization)
    {
        $deleted = $request->user()->memberships()
            ->where('organization_id', $organization->id)
            ->where('status', 'Pending')
            ->delete();
        abort_unless($deleted, 404, 'There is no pending application to withdraw.');

        return ['ok' => true];
    }

    // POST /api/organizations/{organization}/reactivation  { message } -> an inactive member asks to be active again
    public function requestReactivation(Request $request, Organization $organization)
    {
        $message = trim($request->validate(['message' => 'required|string|max:1000'])['message']);
        $user = $request->user();
        $membership = $user->memberships()->where('organization_id', $organization->id)->first();
        abort_unless($membership?->status === 'Inactive', 422, 'Only inactive members can ask to be reactivated.');

        $membership->update(['reactivation_message' => $message, 'reactivation_requested_at' => now()]);

        foreach (MembershipRecord::managerIds($organization->id) as $officerId) {
            UserNotification::create([
                'organization_id' => $organization->id,
                'user_id' => $officerId,
                'message' => "{$user->name} asked to be reactivated in {$organization->short_name}",
                'link' => 'hours',
            ]);
        }

        return ['ok' => true];
    }

    // POST /api/organizations/{organization}/join -> apply to another org with the same account
    public function join(Request $request, Organization $organization)
    {
        abort_unless($organization->status === 'Active', 404);
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
                'link' => 'dashboard', // applications are reviewed on the dashboard
            ]);
        }

        Organization::setCurrent($organization);

        return response()->json($user->fresh()->toFrontend(), 201);
    }

    // GET /api/organizations/{organization}/logo  (public) -> the org's uploaded logo image
    public function logo(Organization $organization)
    {
        $disk = Storage::disk('public');
        abort_unless($organization->logo_path && $disk->exists($organization->logo_path), 404);

        return response()->file($disk->path($organization->logo_path), ['Cache-Control' => 'public, max-age=31536000']);
    }

    // POST /api/organization/logo (officers of the selected org) -> upload or replace the logo
    public function uploadLogo(Request $request)
    {
        $this->officerOnly($request);
        // No SVG: it can carry scripts
        $request->validate(['logo' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048']]);

        $organization = Organization::current();
        $old = $organization->logo_path;
        $organization->update(['logo_path' => $request->file('logo')->store('org-logos', 'public')]);
        if ($old) {
            Storage::disk('public')->delete($old);
        }

        return $organization->fresh()->toFrontend();
    }

    // DELETE /api/organization/logo (officers of the selected org) -> back to no logo
    public function removeLogo(Request $request)
    {
        $this->officerOnly($request);

        $organization = Organization::current();
        if ($organization->logo_path) {
            Storage::disk('public')->delete($organization->logo_path);
            $organization->update(['logo_path' => null]);
        }

        return $organization->fresh()->toFrontend();
    }
}
