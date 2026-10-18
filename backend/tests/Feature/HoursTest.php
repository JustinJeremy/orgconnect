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

    public function test_officers_log_their_own_hours_and_only_the_president_vps_and_secretary_review_them(): void
    {
        $org = $this->compSoc();
        $treasurer = $this->person($org, 'officer', 'Active', ['name' => 'Tess Treasurer'], 'Treasurer');
        $auditor = $this->person($org, 'officer', 'Active', [], 'Auditor');
        $vp = $this->person($org, 'officer', 'Active', [], 'VP Internal');
        $president = $this->person($org, 'officer');
        $member = $this->person($org);

        $logId = $this->logHours($treasurer, $org);
        // Only the managers hear about it
        $this->assertDatabaseHas('user_notifications', ['user_id' => $president->id, 'message' => 'Tess Treasurer logged 2 hrs for Lab cleanup']);
        $this->assertDatabaseMissing('user_notifications', ['user_id' => $auditor->id, 'message' => 'Tess Treasurer logged 2 hrs for Lab cleanup']);
        // The officer sees just their own with ?mine=1, marked as an officer's log
        $this->actingIn($treasurer, $org)->getJson('/api/hours?mine=1')->assertJsonCount(1)->assertJsonPath('0.byOfficer', true);

        $this->actingIn($treasurer, $org)->patchJson("/api/hours/{$logId}", ['status' => 'Approved'])->assertForbidden();
        $this->actingIn($auditor, $org)->patchJson("/api/hours/{$logId}", ['status' => 'Approved'])
            ->assertForbidden()->assertJsonPath('message', "Only the President, VPs and Secretary review an officer's hours.");
        $this->actingIn($vp, $org)->patchJson("/api/hours/{$logId}", ['status' => 'Approved'])->assertOk();

        // The President's own hours: a VP or the Secretary reviews them
        $presidentLog = $this->logHours($president, $org);
        $this->actingIn($vp, $org)->patchJson("/api/hours/{$presidentLog}", ['status' => 'Approved'])->assertOk();

        // A member's hours: any other officer, as before
        $memberLog = $this->logHours($member, $org);
        $this->actingIn($auditor, $org)->patchJson("/api/hours/{$memberLog}", ['status' => 'Approved'])->assertOk();
    }
}
