<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
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

    // POST /api/org-requests
    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => 'required|string|max:120|unique:organizations,name',
            'shortName' => 'required|string|max:20',
            'college' => 'required|string|max:120',
            'tagline' => 'required|string|max:160',
            'description' => 'required|string|max:2000',
            'adviser' => 'required|string|max:120',
            'email' => 'required|email|max:255',
            'courses' => 'required|array|min:1|max:20',
            'courses.*' => 'required|string|max:20|distinct:ignore_case',
            'proofUrl' => 'nullable|url|max:500',
        ], [
            'name.unique' => 'An organization with this name is already on OrgConnect.',
            'courses.required' => 'Pick at least one course that can join.',
        ]);

        if (Organization::where('requested_by', $user->id)->where('status', 'Pending')->exists()) {
            throw ValidationException::withMessages(['name' => 'You already have a request waiting for review.']);
        }

        $org = Organization::create([
            'slug' => $this->uniqueSlug($data['shortName']),
            'status' => 'Pending',
            'requested_by' => $user->id,
            'name' => trim($data['name']),
            'short_name' => trim($data['shortName']),
            'college' => trim($data['college']),
            'tagline' => trim($data['tagline']),
            'description' => trim($data['description']),
            'adviser' => trim($data['adviser']),
            'email' => $data['email'],
            'courses' => array_values(array_map(fn ($c) => strtoupper(trim($c)), $data['courses'])),
            'proof_url' => $data['proofUrl'] ?? null,
            'theme' => [],   // the default palette until the org picks its own
        ]);

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
