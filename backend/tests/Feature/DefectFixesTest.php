<?php

namespace Tests\Feature;

use App\Models\Certificate;
use App\Models\Event;
use App\Models\TutoringSession;
use App\Models\UserNotification;
use App\Models\VolunteerHour;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

// One test per issue in "OrgConnect – Access & Logic Defect Test Scenarios" (Oct 15, 2026),
// plus the member-management rules: President, Vice Presidents and Secretary manage members,
// only the President manages officers, and nobody changes their own position.
class DefectFixesTest extends TestCase
{
    private function logHours($member, $org, float $hours = 2, ?string $date = null): TestResponse
    {
        return $this->actingIn($member, $org)->postJson('/api/hours', [
            'activity' => 'Lab cleanup', 'date' => $date ?? now()->toDateString(), 'hours' => $hours,
        ]);
    }

    private function eventIn($org, array $attributes = []): Event
    {
        return $this->inOrg($org, fn () => Event::create($attributes + [
            'title' => 'Git Workshop', 'category' => 'Workshop', 'date' => now()->addWeek()->toDateString(),
            'time' => '13:00', 'location' => 'Room 304', 'mode' => 'F2F', 'capacity' => 30, 'status' => 'upcoming',
        ]));
    }

    // #2
    public function test_an_officer_cannot_approve_their_own_hours(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer', 'Active', [], 'Secretary');
        $logId = $this->logHours($officer, $org)->json('id');

        $this->actingIn($officer, $org)->patchJson("/api/hours/{$logId}", ['status' => 'Approved'])->assertForbidden();
        $this->assertDatabaseHas('volunteer_hours', ['id' => $logId, 'status' => 'Pending']);
    }

    // #3
    public function test_a_decided_log_cannot_be_decided_again(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $member = $this->person($org);
        $logId = $this->logHours($member, $org)->json('id');

        $this->actingIn($officer, $org)->patchJson("/api/hours/{$logId}", ['status' => 'Approved'])->assertOk();
        $this->actingIn($officer, $org)->patchJson("/api/hours/{$logId}", ['status' => 'Rejected'])->assertStatus(422);

        $this->assertDatabaseHas('volunteer_hours', ['id' => $logId, 'status' => 'Approved']);
        // The member was told once (approved), not again by the refused second decision
        $this->assertDatabaseCount('user_notifications', 2);   // + the officer's "logged hours" notice
        $this->assertSame(1, UserNotification::where('user_id', $member->id)->count());
    }

    // #4
    public function test_one_day_holds_at_most_24_hours(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org);

        $this->logHours($member, $org, 20)->assertCreated();
        $this->logHours($member, $org, 5)->assertStatus(422)->assertJsonValidationErrors('hours');
        $this->logHours($member, $org, 4)->assertCreated();
        $this->logHours($member, $org, 3, now()->subDay()->toDateString())->assertCreated();   // another day is fine
    }

    // #5 / Batch 16: name and email belong to the person's account; officers change only position and status
    public function test_officers_change_only_position_and_status(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $member = $this->person($org, 'member', 'Active', ['email' => 'andrea@school.edu.ph']);

        $this->actingIn($president, $org)->putJson("/api/members/{$member->id}", [
            'name' => 'New Name', 'email' => 'someone.else@school.edu.ph', 'position' => 'Member', 'status' => 'Active',
        ])->assertStatus(422)->assertJsonValidationErrors(['name', 'email']);
        $this->assertDatabaseHas('users', ['id' => $member->id, 'email' => 'andrea@school.edu.ph']);

        $this->actingIn($president, $org)->putJson("/api/members/{$member->id}", [
            'position' => 'Member', 'status' => 'Inactive', 'inactiveReason' => 'Missed three assemblies',
        ])->assertOk()->assertJsonPath('status', 'Inactive');
    }

    // #6 and the member-management rules
    public function test_only_the_president_manages_officers(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer', 'Active', [], 'President');
        $vp = $this->person($org, 'officer', 'Active', [], 'VP Academics');
        $member = $this->person($org);

        // A VP can't remove or edit the President, or promote a member
        $this->actingIn($vp, $org)->deleteJson("/api/members/{$president->id}")->assertForbidden();
        $this->actingIn($vp, $org)->putJson("/api/members/{$member->id}", [
            'position' => 'Treasurer', 'status' => 'Active',
        ])->assertForbidden();

        // A VP can manage regular members
        $this->actingIn($vp, $org)->putJson("/api/members/{$member->id}", [
            'position' => 'Member', 'status' => 'Inactive', 'inactiveReason' => 'Missed three assemblies',
        ])->assertOk();

        // The President can promote and remove officers
        $this->actingIn($president, $org)->putJson("/api/members/{$member->id}", [
            'position' => 'Treasurer', 'status' => 'Active',
        ])->assertOk();
        $this->actingIn($president, $org)->deleteJson("/api/members/{$vp->id}")->assertOk();
    }

    public function test_nobody_can_change_their_own_position_so_the_org_keeps_a_president(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');

        $this->actingIn($president, $org)->putJson("/api/members/{$president->id}", [
            'position' => 'Member', 'status' => 'Active',
        ])->assertStatus(422);
        $this->actingIn($president, $org)->deleteJson("/api/members/{$president->id}")->assertStatus(422);
    }

    public function test_officers_outside_the_president_vp_and_secretary_cannot_manage_members(): void
    {
        $org = $this->compSoc();
        $treasurer = $this->person($org, 'officer', 'Active', [], 'Treasurer');
        $applicant = $this->person($org, 'member', 'Pending');

        $this->actingIn($treasurer, $org)->getJson('/api/applications')->assertOk();   // can still see them
        $this->actingIn($treasurer, $org)->patchJson("/api/applications/{$applicant->id}", ['status' => 'Approved'])->assertForbidden();
        $this->actingIn($treasurer, $org)->postJson('/api/members', [
            'name' => 'New Person', 'email' => 'new@school.edu.ph', 'position' => 'Member', 'status' => 'Active',
        ])->assertForbidden();
        $this->actingIn($treasurer, $org)->getJson('/api/user')->assertJsonPath('canManageMembers', false);
    }

    // #7
    public function test_answering_another_orgs_tutoring_request_returns_404(): void
    {
        $dss = $this->secondOrg();
        $session = $this->inOrg($dss, fn () => TutoringSession::create([
            'tutor_id' => $this->person($dss)->id, 'subject' => 'Statistics', 'area' => 'Statistics', 'schedule' => 'Mon', 'location' => 'Lab', 'slots' => 2,
        ]));
        $request = $this->inOrg($dss, fn () => $session->requests()->create(['user_id' => $this->person($dss)->id, 'status' => 'Pending']));
        $compSocOfficer = $this->person($this->compSoc(), 'officer');

        $this->actingIn($compSocOfficer, $this->compSoc())
            ->patchJson("/api/tutoring-requests/{$request->id}", ['status' => 'Confirmed'])
            ->assertNotFound();
    }

    public function test_an_officer_cannot_approve_their_own_tutoring_request(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $sessionId = $this->actingIn($this->person($org), $org)->postJson('/api/tutoring-sessions', [
            'subject' => 'SQL', 'area' => 'Databases', 'schedule' => 'Mon', 'location' => 'Lab', 'slots' => 2,
        ])->json('id');
        $requestId = $this->actingIn($officer, $org)->postJson('/api/tutoring-requests', ['sessionId' => $sessionId])->json('id');

        $this->actingIn($officer, $org)->patchJson("/api/tutoring-requests/{$requestId}", ['status' => 'Confirmed'])->assertForbidden();
    }

    // #8
    public function test_removed_members_leave_the_leaderboard(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $member = $this->person($org);
        $logId = $this->logHours($member, $org, 5)->json('id');
        $this->actingIn($president, $org)->patchJson("/api/hours/{$logId}", ['status' => 'Approved']);

        $this->actingIn($president, $org)->getJson('/api/leaderboard')->assertJsonPath('0.id', $member->id);
        $this->actingIn($president, $org)->deleteJson("/api/members/{$member->id}")->assertOk();
        $this->actingIn($president, $org)->getJson('/api/leaderboard')->assertJsonCount(0);
    }

    // #9
    public function test_the_certificates_list_shows_only_this_orgs_certificates(): void
    {
        $member = $this->person($this->compSoc());
        $member->memberships()->create(['organization_id' => $this->secondOrg()->id, 'role' => 'member', 'position' => 'Member', 'status' => 'Active']);
        $ours = $this->eventIn($this->compSoc(), ['title' => 'Ours', 'status' => 'completed']);
        $theirs = $this->eventIn($this->secondOrg(), ['title' => 'Theirs', 'status' => 'completed']);
        Certificate::create(['user_id' => $member->id, 'event_id' => $ours->id, 'issued_at' => now()]);
        Certificate::create(['user_id' => $member->id, 'event_id' => $theirs->id, 'issued_at' => now()]);

        $this->actingIn($member, $this->compSoc())->getJson('/api/certificates')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.eventId', $ours->id);
    }

    // #10
    public function test_an_event_cannot_be_moved_into_the_past(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $event = $this->eventIn($org);

        $this->actingIn($president, $org)->putJson("/api/events/{$event->id}", [
            'title' => $event->title, 'category' => 'Workshop', 'date' => now()->subMonth()->toDateString(), 'time' => '13:00',
            'location' => 'Room 304', 'mode' => 'F2F', 'capacity' => 30,
        ])->assertStatus(422)->assertJsonValidationErrors('date');
    }

    public function test_a_future_event_cannot_be_completed_early(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $event = $this->eventIn($org);

        $this->actingIn($president, $org)->putJson("/api/events/{$event->id}/attendance", ['attendees' => [], 'completed' => true])
            ->assertStatus(422);
        $this->actingIn($president, $org)->putJson("/api/events/{$event->id}/attendance", ['attendees' => [], 'completed' => false])
            ->assertOk();   // saving attendance without completing is fine
        $this->assertSame(0, Certificate::withoutGlobalScopes()->count());
    }

    // #11
    public function test_the_export_keeps_members_with_the_same_name_apart(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $first = $this->person($org, 'member', 'Active', ['name' => 'Juan Dela Cruz', 'email' => 'juan@school.edu.ph']);
        $second = $this->person($org, 'member', 'Active', ['name' => 'Juan Dela Cruz', 'email' => 'juan2@school.edu.ph']);
        $this->logHours($first, $org, 2);
        $this->logHours($second, $org, 3);

        $csv = $this->actingIn($president, $org)->get('/api/members/export')->assertOk()->getContent();

        $this->assertStringContainsString('"juan@school.edu.ph"', $csv);
        $this->assertMatchesRegularExpression('/"juan@school\.edu\.ph".*"0","2"/', $csv);
        $this->assertMatchesRegularExpression('/"juan2@school\.edu\.ph".*"0","3"/', $csv);
        $this->assertSame(0, VolunteerHour::withoutGlobalScopes()->where('status', 'Approved')->count());
    }
}
