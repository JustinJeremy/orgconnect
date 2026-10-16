<?php

namespace Tests\Feature;

use App\Models\Setting;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    // Batch 16: details are locked until the admin opens updates (e.g. a new school year)
    public function test_details_are_locked_until_the_admin_opens_updates(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org, 'member', 'Active', ['name' => 'Juan Cruz']);
        $body = ['name' => 'Juan D. Cruz', 'email' => 'juan.cruz@school.edu.ph', 'studentId' => '2025-99999', 'course' => 'BSCS', 'yearLevel' => '2nd year'];

        $this->actingIn($member, $org)->getJson('/api/user')->assertJsonPath('detailsLocked', true);
        $this->actingIn($member, $org)->putJson('/api/user', $body)->assertForbidden();
        $this->assertSame('Juan Cruz', $member->fresh()->name);

        $admin = $this->person($this->secondOrg());
        $admin->forceFill(['is_admin' => true])->save();
        $this->actingIn($member, $org)->putJson('/api/admin/settings', ['detailsOpen' => true])->assertForbidden();
        $this->actingIn($admin, $org)->putJson('/api/admin/settings', ['detailsOpen' => true])->assertOk()->assertJsonPath('detailsOpen', true);

        $this->actingIn($member, $org)->getJson('/api/user')->assertJsonPath('detailsLocked', false);
        $this->actingIn($member, $org)->putJson('/api/user', $body)->assertOk()->assertJsonPath('name', 'Juan D. Cruz');
    }

    public function test_the_admin_corrects_a_students_details(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org);
        $this->person($org, 'member', 'Active', ['email' => 'taken@school.edu.ph']);
        $admin = $this->person($this->secondOrg());
        $admin->forceFill(['is_admin' => true])->save();
        $body = ['name' => 'Juan D. Cruz', 'email' => 'juan.cruz@school.edu.ph', 'studentId' => '2025-99999', 'course' => 'BSCS', 'yearLevel' => '2nd year'];

        $this->actingIn($member, $org)->putJson("/api/admin/users/{$member->id}", $body)->assertForbidden();
        $this->actingIn($admin, $org)->putJson("/api/admin/users/{$member->id}", ['email' => 'taken@school.edu.ph'] + $body)
            ->assertStatus(422)->assertJsonValidationErrors('email');
        $this->actingIn($admin, $org)->putJson("/api/admin/users/{$member->id}", $body)->assertOk();
        $this->assertDatabaseHas('users', ['id' => $member->id, 'name' => 'Juan D. Cruz', 'student_id' => '2025-99999', 'year_level' => '2nd year']);
    }

    public function test_members_update_their_own_details(): void
    {
        Setting::setFlag(Setting::DETAILS_OPEN, true);
        $org = $this->compSoc();
        $member = $this->person($org);

        $this->actingIn($member, $org)->putJson('/api/user', [
            'name' => 'Juan D. Cruz', 'email' => 'juan.cruz@school.edu.ph', 'studentId' => '2025-99999', 'course' => 'BSCS', 'yearLevel' => '2nd year',
        ])->assertOk()->assertJsonPath('name', 'Juan D. Cruz');

        $this->assertDatabaseHas('users', ['id' => $member->id, 'email' => 'juan.cruz@school.edu.ph', 'year_level' => '2nd year']);
    }

    public function test_the_email_cannot_belong_to_another_account(): void
    {
        Setting::setFlag(Setting::DETAILS_OPEN, true);
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
