<?php

namespace Tests\Feature;

use Tests\TestCase;

class ProfileTest extends TestCase
{
    public function test_members_update_their_own_details(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org);

        $this->actingIn($member, $org)->putJson('/api/user', [
            'name' => 'Juan D. Cruz', 'email' => 'juan.cruz@school.edu.ph', 'studentId' => '2025-99999', 'course' => 'BSCS', 'yearLevel' => '2nd year',
        ])->assertOk()->assertJsonPath('name', 'Juan D. Cruz');

        $this->assertDatabaseHas('users', ['id' => $member->id, 'email' => 'juan.cruz@school.edu.ph', 'year_level' => '2nd year']);
    }

    public function test_the_email_cannot_belong_to_another_account(): void
    {
        $org = $this->compSoc();
        $this->person($org, 'member', 'Active', ['email' => 'taken@school.edu.ph']);
        $member = $this->person($org);

        $this->actingIn($member, $org)->putJson('/api/user', [
            'name' => 'Juan', 'email' => 'taken@school.edu.ph', 'studentId' => '2025-99999', 'course' => 'BSCS', 'yearLevel' => '2nd year',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_changing_the_password_needs_the_current_one(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org, 'member', 'Active', ['email' => 'juan@school.edu.ph']);

        $this->actingIn($member, $org)->putJson('/api/user/password', [
            'currentPassword' => 'wrong', 'password' => 'newpassword1', 'password_confirmation' => 'newpassword1',
        ])->assertStatus(422)->assertJsonValidationErrors('currentPassword');

        $this->actingIn($member, $org)->putJson('/api/user/password', [
            'currentPassword' => 'password', 'password' => 'newpassword1', 'password_confirmation' => 'newpassword1',
        ])->assertOk();

        $this->postJson('/api/login', ['email' => 'juan@school.edu.ph', 'password' => 'newpassword1'])->assertOk();
    }
}
