<?php

namespace Tests\Feature;

use App\Models\MembershipRecord;
use Tests\TestCase;

// Applying to an org: an optional message to the officers, and a reason when the officers reject it
class ApplicationTest extends TestCase
{
    public function test_officers_see_the_applicants_message_and_the_date_they_applied(): void
    {
        $compsoc = $this->compSoc();
        $dss = $this->secondOrg();
        $president = $this->person($dss, 'officer');
        // An older CompSoc member applying to DSS today
        $student = $this->person($compsoc);
        $student->forceFill(['created_at' => now()->subMonths(3)])->save();

        $this->actingIn($student, $dss)->postJson("/api/organizations/{$dss->slug}/join", ['message' => 'I helped at the Tableau seminar.'])
            ->assertCreated();

        $this->actingIn($president, $dss)->getJson('/api/applications')
            ->assertJsonPath('0.message', 'I helped at the Tableau seminar.')
            ->assertJsonPath('0.appliedAt', now()->format('Y-m-d'));
    }

    public function test_a_pending_applicant_can_add_or_change_their_message(): void
    {
        $org = $this->compSoc();
        $applicant = $this->person($org, 'member', 'Pending');
        $member = $this->person($org);

        $this->actingIn($applicant, $org)->putJson("/api/organizations/{$org->slug}/application", ['message' => 'I want to join the hackathon team.'])->assertOk();
        $this->actingIn($applicant, $org)->getJson('/api/user')->assertJsonPath('applicationMessage', 'I want to join the hackathon team.');
        $this->assertSame('I want to join the hackathon team.', MembershipRecord::where('user_id', $applicant->id)->value('application_message'));

        // Only while the application is pending
        $this->actingIn($member, $org)->putJson("/api/organizations/{$org->slug}/application", ['message' => 'Hi'])->assertNotFound();
    }

    public function test_rejecting_needs_a_reason_the_applicant_sees_and_they_can_apply_again(): void
    {
        $org = $this->compSoc();
        $secretary = $this->person($org, 'officer', 'Active', ['name' => 'Angela Rivera'], 'Secretary');
        $applicant = $this->person($org, 'member', 'Pending');

        $this->actingIn($secretary, $org)->patchJson("/api/applications/{$applicant->id}", ['status' => 'Rejected'])
            ->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->actingIn($secretary, $org)->patchJson("/api/applications/{$applicant->id}", ['status' => 'Rejected', 'reason' => 'CompSoc is only open to CCS students.'])
            ->assertOk();

        $this->actingIn($applicant, $org)->getJson('/api/user')
            ->assertJsonPath('membershipStatus', 'Rejected')
            ->assertJsonPath('rejection.reason', 'CompSoc is only open to CCS students.')
            ->assertJsonPath('rejection.by', 'Angela Rivera')
            ->assertJsonPath('rejection.byPosition', 'Secretary');

        // Applying again: a fresh application, the old reason is gone
        $this->actingIn($applicant, $org)->postJson("/api/organizations/{$org->slug}/join", ['message' => 'I shifted to BSIT.'])->assertCreated();
        $this->actingIn($applicant, $org)->getJson('/api/user')->assertJsonPath('membershipStatus', 'Pending')->assertJsonPath('rejection', null);
        $this->actingIn($secretary, $org)->getJson('/api/applications')->assertJsonPath('0.message', 'I shifted to BSIT.');
    }

    public function test_approving_needs_no_reason(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $applicant = $this->person($org, 'member', 'Pending');

        $this->actingIn($president, $org)->patchJson("/api/applications/{$applicant->id}", ['status' => 'Approved'])->assertOk();
        $this->assertDatabaseHas('membership_records', ['user_id' => $applicant->id, 'status' => 'Active', 'rejection_reason' => null]);
    }
}
