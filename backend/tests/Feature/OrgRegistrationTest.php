<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Tests\TestCase;

// A student registers a new org -> a platform admin approves (org goes live, requester becomes President)
// or rejects it (with a reason); live orgs can be suspended.
class OrgRegistrationTest extends TestCase
{
    private function form(array $overrides = []): array
    {
        return $overrides + [
            'name' => 'Junior Philippine Computer Society – TIP',
            'shortName' => 'JPCS',
            'college' => 'College of Computer Studies',
            'tagline' => "Building tomorrow's IT leaders, together.",
            'description' => 'Coding bootcamps, industry talks and outreach.',
            'adviser' => 'Engr. Paolo Dizon',
            'email' => 'jpcs.tip@school.edu.ph',
            'courses' => ['BSIT', 'bscpe'],
        ];
    }

    private function admin(): User
    {
        $admin = User::factory()->create(['student_id' => 'ADMIN-'.fake()->unique()->numerify('###'), 'course' => 'Staff', 'year_level' => 'Staff']);
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    private function request(User $by): Organization
    {
        $this->actingIn($by, $this->compSoc())->postJson('/api/org-requests', $this->form())->assertCreated();

        return Organization::where('short_name', 'JPCS')->firstOrFail();
    }

    public function test_a_request_waits_for_review_and_is_hidden_until_approved(): void
    {
        $student = $this->person($this->compSoc());
        $org = $this->request($student);

        $this->assertSame('Pending', $org->status);
        $this->assertSame(['BSIT', 'BSCPE'], $org->courses);   // courses typed in by hand are allowed
        $this->getJson('/api/organizations')->assertJsonMissing(['slug' => 'jpcs']);
        $this->actingIn($student, $this->compSoc())->getJson('/api/org-requests')->assertJsonPath('0.status', 'Pending');

        // Not usable or joinable while pending
        $other = $this->person($this->compSoc());
        $this->actingIn($other, $this->compSoc())->postJson('/api/organizations/jpcs/join')->assertNotFound();

        // Only one request at a time
        $this->actingIn($student, $this->compSoc())->postJson('/api/org-requests', $this->form(['name' => 'Another Org']))
            ->assertStatus(422);
    }

    public function test_the_admin_approves_and_the_requester_becomes_president(): void
    {
        $student = $this->person($this->compSoc());
        $org = $this->request($student);

        $this->actingIn($this->admin(), $this->compSoc())
            ->patchJson("/api/admin/org-requests/{$org->id}", ['decision' => 'Approved', 'courses' => ['BSIT', 'BSCS', 'BSCPE']])
            ->assertOk()->assertJsonPath('status', 'Active');

        $this->getJson('/api/organizations')->assertJsonFragment(['slug' => 'jpcs', 'courses' => ['BSIT', 'BSCS', 'BSCPE']]);
        $this->actingIn($student, $org->fresh())->getJson('/api/user')
            ->assertJsonPath('position', 'President')->assertJsonPath('membershipStatus', 'Active')->assertJsonPath('isPresident', true);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $student->id, 'organization_id' => $org->id]);
    }

    public function test_rejecting_needs_a_reason_the_requester_sees(): void
    {
        $student = $this->person($this->compSoc());
        $org = $this->request($student);
        $admin = $this->admin();

        $this->actingIn($admin, $this->compSoc())->patchJson("/api/admin/org-requests/{$org->id}", ['decision' => 'Rejected'])
            ->assertStatus(422)->assertJsonValidationErrors('note');
        $this->actingIn($admin, $this->compSoc())
            ->patchJson("/api/admin/org-requests/{$org->id}", ['decision' => 'Rejected', 'note' => 'Attach the OSA recognition letter.'])
            ->assertOk();

        $this->actingIn($student, $this->compSoc())->getJson('/api/org-requests')
            ->assertJsonPath('0.status', 'Rejected')->assertJsonPath('0.reviewNote', 'Attach the OSA recognition letter.');
        // ...and can send a new one
        $this->actingIn($student, $this->compSoc())->postJson('/api/org-requests', $this->form(['name' => 'JPCS – TIP Manila']))->assertCreated();
    }

    public function test_a_suspended_org_cannot_be_used(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org);

        $this->actingIn($this->admin(), $org)->patchJson("/api/admin/organizations/{$org->id}", ['status' => 'Suspended', 'reason' => 'Missing adviser'])->assertOk();

        $this->getJson('/api/organizations')->assertJsonMissing(['slug' => 'computer-society']);
        $this->actingIn($member, $org)->getJson('/api/events')->assertStatus(403);
    }

    public function test_only_admins_reach_the_admin_pages(): void
    {
        $president = $this->person($this->compSoc(), 'officer');

        $this->actingIn($president, $this->compSoc())->getJson('/api/admin/overview')->assertForbidden();
        $this->actingIn($this->admin(), $this->compSoc())->getJson('/api/admin/overview')
            ->assertOk()->assertJsonPath('stats.organizations', 1)->assertJsonPath('stats.members', 1);
    }

    public function test_signing_up_to_register_an_org_does_not_apply_to_the_selected_org(): void
    {
        $this->withHeaders(['X-Organization' => 'computer-society'])->postJson('/api/register', [
            'name' => 'Andrea Lim', 'studentId' => '2022-00318', 'email' => 'andrea@school.edu.ph',
            'course' => 'BSCPE', 'yearLevel' => '4th year',
            'password' => 'password123', 'password_confirmation' => 'password123', 'registerOrg' => true,
        ])->assertCreated();

        $this->assertDatabaseMissing('membership_records', ['user_id' => User::where('email', 'andrea@school.edu.ph')->value('id')]);
    }
}
