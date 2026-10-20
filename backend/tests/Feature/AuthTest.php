<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class AuthTest extends TestCase
{
    public function test_a_member_can_sign_in_and_gets_a_token(): void
    {
        $user = $this->person($this->compSoc(), 'member', 'Active', ['email' => 'juan@school.edu.ph']);

        $this->postJson('/api/login', ['email' => 'juan@school.edu.ph', 'password' => 'password'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']])
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_a_wrong_password_is_refused(): void
    {
        $this->person($this->compSoc(), 'member', 'Active', ['email' => 'juan@school.edu.ph']);

        $this->postJson('/api/login', ['email' => 'juan@school.edu.ph', 'password' => 'wrong-password'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Incorrect email or password.');
    }

    public function test_remember_me_off_gives_a_token_that_expires(): void
    {
        $user = $this->person($this->compSoc(), 'member', 'Active', ['email' => 'juan@school.edu.ph']);

        $this->postJson('/api/login', ['email' => 'juan@school.edu.ph', 'password' => 'password', 'remember' => false])->assertOk();
        $this->assertNotNull($user->tokens()->first()->expires_at);
    }

    public function test_sign_in_is_limited_to_five_attempts_a_minute(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/login', ['email' => 'nobody@school.edu.ph', 'password' => 'wrong'])->assertStatus(422);
        }

        $this->postJson('/api/login', ['email' => 'nobody@school.edu.ph', 'password' => 'wrong'])->assertStatus(429);
    }

    public function test_signing_up_creates_a_pending_application_to_the_selected_org(): void
    {
        $org = $this->compSoc();

        $this->withHeader('X-Organization', $org->slug)->postJson('/api/register', [
            'name' => 'Ana Reyes',
            'studentId' => '2025-11111',
            'email' => 'ana@school.edu.ph',
            'course' => 'BSIT',
            'yearLevel' => '1st year',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated()->assertJsonPath('user.membershipStatus', 'Pending');

        $user = User::where('email', 'ana@school.edu.ph')->firstOrFail();
        $this->assertDatabaseHas('membership_records', ['user_id' => $user->id, 'organization_id' => $org->id, 'status' => 'Pending']);
    }

    public function test_sign_up_only_accepts_the_orgs_own_courses(): void
    {
        $org = $this->secondOrg();   // accepts BSCS, BSIT, BSIS

        $this->withHeader('X-Organization', $org->slug)->postJson('/api/register', [
            'name' => 'Ana Reyes',
            'studentId' => '2025-11111',
            'email' => 'ana@school.edu.ph',
            'course' => 'BSEMC',
            'yearLevel' => '1st year',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(422)->assertJsonValidationErrors('course');
    }

    public function test_signing_out_revokes_the_token(): void
    {
        $user = $this->person($this->compSoc());

        $this->actingIn($user, $this->compSoc())->postJson('/api/logout')->assertOk();
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_sign_up_only_accepts_a_student_id_like_2025_00142(): void
    {
        $org = $this->compSoc();
        $body = [
            'name' => 'Ana Reyes', 'email' => 'ana@school.edu.ph', 'course' => 'BSIT', 'yearLevel' => '1st year',
            'password' => 'password123', 'password_confirmation' => 'password123',
        ];

        // Sign-ups are limited to 5 a minute, so 4 bad IDs and then a good one
        foreach (['abc', '2025-abcde', '202500142', '2025-001422'] as $bad) {
            $this->withHeader('X-Organization', $org->slug)->postJson('/api/register', ['studentId' => $bad] + $body)
                ->assertStatus(422)->assertJsonValidationErrors('studentId');
        }
        $this->assertDatabaseMissing('users', ['email' => 'ana@school.edu.ph']);

        $this->withHeader('X-Organization', $org->slug)->postJson('/api/register', ['studentId' => '2025-00142'] + $body)->assertCreated();
    }
}
