<?php

namespace App\Http\Controllers;

use App\Models\OrgChangeRequest;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserNotification;
use App\Support\OrgThemes;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

// Changing the org's details: the President asks (with a reason), the platform admin decides
class OrgChangeController extends Controller
{
    // GET /api/organization/change-requests -> this org's latest request (President)
    public function latest(Request $request)
    {
        $this->presidentOnly($request);
        $latest = OrgChangeRequest::with('organization')->where('organization_id', Organization::current()->id)->latest('id')->first();

        return ['request' => $latest?->toFrontend()];
    }

    // POST /api/organization/change-requests  { name?, shortName?, ..., courses?, reason }
    public function store(Request $request)
    {
        $user = $this->presidentOnly($request);
        $org = Organization::current();

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120', Rule::unique('organizations', 'name')->ignore($org->id)],
            'shortName' => 'sometimes|required|string|max:20',
            'college' => 'sometimes|required|string|max:120',
            'tagline' => 'sometimes|required|string|max:160',
            'description' => 'sometimes|required|string|max:2000',
            'mission' => 'sometimes|nullable|string|max:1000',
            'vision' => 'sometimes|nullable|string|max:1000',
            'adviser' => 'sometimes|nullable|string|max:120',
            'email' => 'sometimes|nullable|email|max:255',
            'office' => 'sometimes|nullable|string|max:120',
            'meetingSchedule' => 'sometimes|nullable|string|max:160',
            'membershipFee' => 'sometimes|nullable|string|max:80',
            'courses' => 'sometimes|required|array|min:1|max:20',
            'courses.*' => 'required|string|max:20|distinct:ignore_case',
            // A new color (one no other org has)
            'themeKey' => ['sometimes', 'required', Rule::in(array_keys(OrgThemes::PRESETS)), Rule::notIn(OrgThemes::taken($org->id))],
            'reason' => 'required|string|max:1000',
        ], [
            'themeKey.not_in' => 'Another organization already uses this color. Pick a different one.',
            'reason.required' => 'Say why the details are changing.',
            'name.unique' => 'Another organization already uses this name.',
        ]);

        if (OrgChangeRequest::where('organization_id', $org->id)->where('status', 'Pending')->exists()) {
            throw ValidationException::withMessages(['reason' => 'A change request is already waiting for review.']);
        }

        // Keep only what actually changes
        $changes = [];
        foreach (OrgChangeRequest::FIELDS as $field => $column) {
            if (! array_key_exists($field, $data)) {
                continue;
            }
            $value = $field === 'courses'
                ? array_values(array_map(fn ($c) => strtoupper(trim($c)), $data['courses']))
                : (is_string($data[$field]) ? (trim($data[$field]) ?: null) : $data[$field]);
            if ($value !== $org->{$column}) {
                $changes[$column] = $value;
            }
        }
        if (! empty($data['themeKey']) && $data['themeKey'] !== ($org->theme['key'] ?? null)) {
            $changes['theme'] = OrgThemes::theme($data['themeKey']);
        }
        if (! $changes) {
            throw ValidationException::withMessages(['reason' => 'Nothing was changed.']);
        }

        $change = OrgChangeRequest::create([
            'organization_id' => $org->id, 'requested_by' => $user->id,
            'proposed' => $changes, 'reason' => trim($data['reason']), 'status' => 'Pending',
        ]);

        return response()->json($change->load('organization')->toFrontend(), 201);
    }

    // PATCH /api/admin/change-requests/{change}  { decision: Approved | Rejected, note? }  (platform admin)
    public function decide(Request $request, OrgChangeRequest $change)
    {
        abort_unless($change->status === 'Pending', 422, 'This request was already reviewed.');
        $data = $request->validate([
            'decision' => 'required|in:Approved,Rejected',
            'note' => 'required_if:decision,Rejected|nullable|string|max:500',
        ], ['note.required_if' => 'Give the President a reason.']);
        $org = $change->organization;
        $approved = $data['decision'] === 'Approved';

        if ($approved) {
            // The name may have been taken since the request was sent
            if (isset($change->proposed['name']) && Organization::where('name', $change->proposed['name'])->where('id', '!=', $org->id)->exists()) {
                throw ValidationException::withMessages(['decision' => 'Another organization now uses that name.']);
            }
            // ...or the color
            if (isset($change->proposed['theme']['key']) && in_array($change->proposed['theme']['key'], OrgThemes::taken($org->id), true)) {
                throw ValidationException::withMessages(['decision' => 'Another organization now uses that color.']);
            }
            $org->update($change->proposed);
        }
        $change->update([
            'status' => $approved ? 'Approved' : 'Rejected',
            'review_note' => $approved ? null : trim($data['note']),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        if ($change->requested_by) {
            UserNotification::create([
                'organization_id' => $org->id,
                'user_id' => $change->requested_by,
                'message' => $approved
                    ? "Your changes to {$org->short_name}'s details were approved"
                    : "Your changes to {$org->short_name}'s details were not approved: {$change->review_note}",
                'link' => 'profile',
            ]);
        }

        return $change->fresh()->load('organization')->toFrontend();
    }

    private function presidentOnly(Request $request): User
    {
        $user = $request->user();
        abort_unless($user->isPresident(), 403, 'Only the President can change the organization\'s details.');

        return $user;
    }
}
