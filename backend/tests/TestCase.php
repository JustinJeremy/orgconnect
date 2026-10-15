<?php

namespace Tests;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

// Every test starts from a fresh in-memory database (see phpunit.xml).
// The migrations create Computer Society; secondOrg() adds a second org when a test needs one.
abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function compSoc(): Organization
    {
        return Organization::where('slug', 'computer-society')->firstOrFail();
    }

    protected function secondOrg(): Organization
    {
        return Organization::firstOrCreate(['slug' => 'data-science-society'], [
            'name' => 'Data Science Society',
            'short_name' => 'DSS',
            'college' => 'College of Computer Studies',
            'tagline' => 'Turning data into decisions.',
            'description' => 'A second org for tests.',
            'courses' => ['BSCS', 'BSIT', 'BSIS'],
            'tutoring_areas' => ['Python', 'Statistics', 'Other'],
            'theme' => ['navy' => '#0f4c4f'],
        ]);
    }

    // A user with a membership in $org. $role: officer | member; $status: Active | Inactive | Pending | Rejected
    // $position defaults to President for officers and Member for members
    protected function person(Organization $org, string $role = 'member', string $status = 'Active', array $attributes = [], ?string $position = null): User
    {
        $user = User::factory()->create($attributes + [
            'student_id' => fake()->unique()->numerify('2025-#####'),
            'course' => 'BSIT',
            'year_level' => '1st year',
        ]);
        $user->memberships()->create([
            'organization_id' => $org->id,
            'role' => $role,
            'position' => $position ?? ($role === 'officer' ? 'President' : 'Member'),
            'status' => $status,
            'join_date' => $status === 'Active' ? now() : null,
        ]);

        return $user;
    }

    // The next requests are sent by $user (a real Sanctum token) with $org selected
    protected function actingIn(User $user, Organization $org): static
    {
        $this->app['auth']->forgetGuards();   // don't reuse the previous request's signed-in user

        return $this->withToken($user->createToken('test')->plainTextToken)
            ->withHeaders(['X-Organization' => $org->slug, 'Accept' => 'application/json']);
    }

    // Rows created directly in a test (events, sessions...) are saved under $org
    protected function inOrg(Organization $org, callable $make): mixed
    {
        Organization::setCurrent($org);
        try {
            return $make();
        } finally {
            Organization::setCurrent(null);
        }
    }
}
