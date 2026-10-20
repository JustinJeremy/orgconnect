<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Models\UserNotification;
use App\Rules\TextFormat;
use App\Support\OrgThemes;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

// Students asking to bring a new organization onto OrgConnect.
// The org is created as Pending; a platform admin approves it (it goes live and the requester
// becomes its President) or rejects it (with a reason). See AdminController.
class OrgRequestController extends Controller
{
    // GET /api/org-requests -> the signed-in user's requests, newest first
    public function index(Request $request)
    {
        return Organization::where('requested_by', $request->user()->id)
            ->latest()
            ->get()
            ->map->toRequest();
    }

    // The registration form. $org: the request being edited (its own name and color don't count as taken)
    private function validated(Request $request, ?Organization $org = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120', TextFormat::orgName(), Rule::unique('organizations', 'name')->ignore($org?->id)],
            'shortName' => ['required', 'string', 'max:20', TextFormat::shortName()],
            'college' => ['required', 'string', 'max:120', TextFormat::college()],
            'tagline' => ['required', 'string', 'max:160', TextFormat::words('Tagline')],
            'description' => ['required', 'string', 'max:2000', TextFormat::words('About the organization')],
            'adviser' => ['required', 'string', 'max:120', TextFormat::personName('Adviser')],
            'email' => 'required|email|max:255',
            'courses' => 'required|array|min:1|max:20',
            'courses.*' => ['required', 'string', 'max:20', 'distinct:ignore_case', TextFormat::course()],
            'proofUrl' => 'nullable|url:http,https|max:500',
            // One of the org colors no other org has (app/Support/OrgThemes.php); none: the default navy
            'themeKey' => ['nullable', Rule::in(array_keys(OrgThemes::PRESETS)), Rule::notIn(OrgThemes::taken($org?->id))],
        ], [
            'themeKey.not_in' => 'Another organization already uses this color. Pick a different one.',
            'name.unique' => 'An organization with this name is already on OrgConnect.',
            'courses.required' => 'Pick at least one course that can join.',
        ]);
    }

    private function fields(array $data): array
    {
        return [
            'name' => trim($data['name']),
            'short_name' => trim($data['shortName']),
            'college' => trim($data['college']),
            'tagline' => trim($data['tagline']),
            'description' => trim($data['description']),
            'adviser' => trim($data['adviser']),
            'email' => $data['email'],
            'courses' => array_values(array_map(fn ($c) => strtoupper(trim($c)), $data['courses'])),
            'proof_url' => $data['proofUrl'] ?? null,
            'theme' => ! empty($data['themeKey']) ? OrgThemes::theme($data['themeKey']) : [],   // the default navy when none is picked
        ];
    }

    // PUT /api/org-requests/{organization} -> your pending request, edited (e.g. after the admin asked for changes)
    public function update(Request $request, Organization $organization)
    {
        $user = $request->user();
        abort_unless($organization->requested_by === $user->id, 404);
        abort_unless($organization->status === 'Pending', 422, 'Only a request waiting for review can be edited.');
        $data = $this->validated($request, $organization);

        $organization->update($this->fields($data) + ['changes_requested_at' => null]);
        foreach (User::where('is_admin', true)->pluck('id') as $adminId) {
            UserNotification::platform($adminId, "{$user->name} updated the {$organization->short_name} request", 'requests');
        }

        return $organization->fresh()->toRequest();
    }

    // POST /api/org-requests
    public function store(Request $request)
    {
        $user = $request->user();
        $data = $this->validated($request);

        if (Organization::where('requested_by', $user->id)->where('status', 'Pending')->exists()) {
            throw ValidationException::withMessages(['name' => 'You already have a request waiting for review.']);
        }

        $org = Organization::create([
            'slug' => $this->uniqueSlug($data['shortName']),
            'status' => 'Pending',
            'requested_by' => $user->id,
        ] + $this->fields($data));

        return response()->json($org->fresh()->toRequest(), 201);
    }

    private function uniqueSlug(string $shortName): string
    {
        $base = Str::slug($shortName) ?: 'org';
        $slug = $base;
        for ($i = 2; Organization::where('slug', $slug)->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }
}
