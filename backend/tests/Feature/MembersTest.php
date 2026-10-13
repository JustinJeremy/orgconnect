<?php

namespace Tests\Feature;

use Tests\TestCase;

// Applications, adding members with a temporary password, and password resets by officers
class MembersTest extends TestCase
{
    public function test_an_officer_approves_an_application(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $applicant = $this->person($org, 'member', 'Pending');

        $this->actingIn($officer, $org)->patchJson("/api/applications/{$applicant->id}", ['status' => 'Approved'])->assertOk();

        $this->assertDatabaseHas('membership_records', ['user_id' => $applicant->id, 'organization_id' => $org->id, 'status' => 'Active']);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $applicant->id, 'message' => 'Your membership application was approved. Welcome!']);
    }

    public function test_a_new_member_gets_a_temporary_password_that_works(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');

        $temporary = $this->actingIn($officer, $org)->postJson('/api/members', [
            'name' => 'Leo Manalo', 'email' => 'leo@school.edu.ph', 'position' => 'Member', 'status' => 'Active',
        ])->assertCreated()->json('temporaryPassword');

        $this->assertMatchesRegularExpression('/^[A-HJ-NP-Za-km-np-z2-9]{10}$/', $temporary);   // no look-alike characters
        $this->postJson('/api/login', ['email' => 'leo@school.edu.ph', 'password' => $temporary])->assertOk();
    }

    public function test_adding_someone_who_already_has_an_account_keeps_their_password(): void
    {
        $officer = $this->person($this->compSoc(), 'officer');
        $existing = $this->person($this->secondOrg(), 'member', 'Active', ['email' => 'ana@school.edu.ph']);

        $this->actingIn($officer, $this->compSoc())->postJson('/api/members', [
            'name' => $existing->name, 'email' => 'ana@school.edu.ph', 'position' => 'Member', 'status' => 'Active',
        ])->assertCreated()->assertJsonPath('temporaryPassword', null);

        $this->postJson('/api/login', ['email' => 'ana@school.edu.ph', 'password' => 'password'])->assertOk();
    }

    public function test_an_officer_resets_a_members_password(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $member = $this->person($org, 'member', 'Active', ['email' => 'juan@school.edu.ph']);

        $temporary = $this->actingIn($officer, $org)->postJson("/api/members/{$member->id}/reset-password")->assertOk()->json('temporaryPassword');

        $this->postJson('/api/login', ['email' => 'juan@school.edu.ph', 'password' => 'password'])->assertStatus(422);
        $this->postJson('/api/login', ['email' => 'juan@school.edu.ph', 'password' => $temporary])->assertOk();
    }

    public function test_officers_cannot_reset_an_officer_of_another_org(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $otherOfficer = $this->person($this->secondOrg(), 'officer');
        $otherOfficer->memberships()->create(['organization_id' => $org->id, 'role' => 'member', 'position' => 'Member', 'status' => 'Active']);

        $this->actingIn($officer, $org)->postJson("/api/members/{$otherOfficer->id}/reset-password")->assertStatus(422);
    }

    public function test_officers_cannot_remove_themselves(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');

        $this->actingIn($officer, $org)->deleteJson("/api/members/{$officer->id}")->assertStatus(422);
    }
}
