<?php

namespace Tests\Feature;

use Tests\TestCase;

class HoursTest extends TestCase
{
    private function logHours($member, $org, float $hours = 2): int
    {
        return $this->actingIn($member, $org)->postJson('/api/hours', [
            'activity' => 'Lab cleanup',
            'date' => now()->subDay()->toDateString(),
            'hours' => $hours,
        ])->assertCreated()->assertJsonPath('status', 'Pending')->json('id');
    }

    public function test_an_officer_approves_logged_hours_and_the_member_is_notified(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org);
        $officer = $this->person($org, 'officer');
        $logId = $this->logHours($member, $org, 2.5);

        $this->actingIn($officer, $org)->patchJson("/api/hours/{$logId}", ['status' => 'Approved'])
            ->assertOk()
            ->assertJsonPath('status', 'Approved');

        $this->assertDatabaseHas('volunteer_hours', ['id' => $logId, 'reviewed_by' => $officer->id]);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $member->id, 'message' => 'Your 2.5 hrs for Lab cleanup were approved']);
    }

    public function test_members_cannot_approve_hours(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org);
        $logId = $this->logHours($member, $org);

        $this->actingIn($member, $org)->patchJson("/api/hours/{$logId}", ['status' => 'Approved'])->assertForbidden();
    }

    public function test_hours_must_be_in_the_past_and_between_half_an_hour_and_a_day(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org);

        $this->actingIn($member, $org)->postJson('/api/hours', [
            'activity' => 'Future work', 'date' => now()->addDay()->toDateString(), 'hours' => 30,
        ])->assertStatus(422)->assertJsonValidationErrors(['date', 'hours']);
    }

    public function test_members_see_only_their_own_logs(): void
    {
        $org = $this->compSoc();
        $me = $this->person($org);
        $this->logHours($me, $org);
        $this->logHours($this->person($org), $org);

        $this->actingIn($me, $org)->getJson('/api/hours')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.userId', $me->id);
    }

    public function test_the_leaderboard_counts_approved_hours_only(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $member = $this->person($org);
        $approved = $this->logHours($member, $org, 3);
        $this->logHours($member, $org, 5);   // stays pending
        $this->actingIn($officer, $org)->patchJson("/api/hours/{$approved}", ['status' => 'Approved']);

        $this->actingIn($member, $org)->getJson('/api/leaderboard')
            ->assertOk()
            ->assertJsonPath('0.id', $member->id)
            ->assertJsonPath('0.hours', 3);
    }
}
