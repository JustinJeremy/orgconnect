<?php

namespace Tests\Feature;

use App\Models\TutoringSession;
use Tests\TestCase;

// Request → approval → completed, with slots used up on approval
class TutoringTest extends TestCase
{
    private function sessionBy($tutor, $org, int $slots = 1): TutoringSession
    {
        $id = $this->actingIn($tutor, $org)->postJson('/api/tutoring-sessions', [
            'subject' => 'SQL basics', 'area' => 'Databases', 'date' => now()->addWeek()->toDateString(), 'time' => '15:00', 'mode' => 'F2F', 'location' => 'Room 302', 'slots' => $slots,
        ])->assertCreated()->json('id');

        return TutoringSession::withoutGlobalScopes()->findOrFail($id);
    }

    public function test_a_request_is_approved_then_completed_and_uses_a_slot(): void
    {
        $org = $this->compSoc();
        $tutor = $this->person($org);
        $student = $this->person($org);
        $session = $this->sessionBy($tutor, $org, 2);

        $requestId = $this->actingIn($student, $org)->postJson('/api/tutoring-requests', ['sessionId' => $session->id])
            ->assertCreated()->assertJsonPath('status', 'Pending')->json('id');

        // The tutor answers requests for their own session
        $this->actingIn($tutor, $org)->patchJson("/api/tutoring-requests/{$requestId}", ['status' => 'Confirmed'])
            ->assertOk()->assertJsonPath('status', 'Confirmed');
        $this->assertSame(1, $session->fresh()->slots);

        $this->actingIn($tutor, $org)->patchJson("/api/tutoring-requests/{$requestId}", ['status' => 'Completed'])
            ->assertOk()->assertJsonPath('status', 'Completed');
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $student->id, 'message' => 'Your tutoring request for SQL basics was marked as completed',
        ]);
    }

    public function test_a_request_cannot_skip_a_step(): void
    {
        $org = $this->compSoc();
        $tutor = $this->person($org);
        $session = $this->sessionBy($tutor, $org);
        $requestId = $this->actingIn($this->person($org), $org)->postJson('/api/tutoring-requests', ['sessionId' => $session->id])->json('id');

        $this->actingIn($tutor, $org)->patchJson("/api/tutoring-requests/{$requestId}", ['status' => 'Completed'])
            ->assertStatus(422);
    }

    public function test_other_members_cannot_answer_someone_elses_requests(): void
    {
        $org = $this->compSoc();
        $session = $this->sessionBy($this->person($org), $org);
        $requestId = $this->actingIn($this->person($org), $org)->postJson('/api/tutoring-requests', ['sessionId' => $session->id])->json('id');

        $this->actingIn($this->person($org), $org)->patchJson("/api/tutoring-requests/{$requestId}", ['status' => 'Confirmed'])
            ->assertForbidden();
    }

    public function test_tutors_cannot_request_their_own_session_and_full_sessions_refuse_requests(): void
    {
        $org = $this->compSoc();
        $tutor = $this->person($org);
        $session = $this->sessionBy($tutor, $org, 1);

        $this->actingIn($tutor, $org)->postJson('/api/tutoring-requests', ['sessionId' => $session->id])->assertStatus(422);

        $first = $this->actingIn($this->person($org), $org)->postJson('/api/tutoring-requests', ['sessionId' => $session->id])->json('id');
        $this->actingIn($tutor, $org)->patchJson("/api/tutoring-requests/{$first}", ['status' => 'Confirmed'])->assertOk();

        $this->actingIn($this->person($org), $org)->postJson('/api/tutoring-requests', ['sessionId' => $session->id])
            ->assertStatus(422)
            ->assertJsonPath('message', 'This session has no open slots.');
    }

    public function test_session_areas_come_from_the_orgs_own_list(): void
    {
        $org = $this->secondOrg();   // areas: Python, Statistics, Other
        $member = $this->person($org);

        $this->actingIn($member, $org)->postJson('/api/tutoring-sessions', [
            'subject' => 'Subnetting', 'area' => 'Networking', 'date' => now()->addWeek()->toDateString(), 'time' => '15:00', 'mode' => 'F2F', 'location' => 'Lab', 'slots' => 3,
        ])->assertStatus(422)->assertJsonValidationErrors('area');
    }
}
