<?php

namespace Tests\Feature;

use App\Models\Event;
use Tests\TestCase;

// Pending applicants and inactive members can't use the org; inactive members see why and can ask to be reactivated
class MembershipStatusTest extends TestCase
{
    private function eventIn($org): Event
    {
        return $this->inOrg($org, fn () => Event::create([
            'title' => 'Git Workshop', 'category' => 'Workshop', 'date' => now()->addWeek()->toDateString(),
            'time' => '13:00', 'location' => 'Room 304', 'mode' => 'F2F', 'capacity' => 30, 'status' => 'upcoming',
        ]));
    }

    public function test_pending_applicants_cannot_log_hours_rsvp_or_request_tutoring(): void
    {
        $org = $this->compSoc();
        $pending = $this->person($org, 'member', 'Pending');
        $event = $this->eventIn($org);

        $this->actingIn($pending, $org)->postJson('/api/hours', ['activity' => 'Cleanup', 'date' => now()->toDateString(), 'hours' => 2])
            ->assertForbidden()->assertJsonPath('message', 'Your application is still being reviewed by an officer.');
        $this->actingIn($pending, $org)->postJson("/api/events/{$event->id}/rsvp")->assertForbidden();
        $this->actingIn($pending, $org)->getJson('/api/tutoring-sessions')->assertForbidden();
        $this->assertDatabaseCount('volunteer_hours', 0);

        // ...but can still see their own status
        $this->actingIn($pending, $org)->getJson('/api/user')->assertOk()->assertJsonPath('membershipStatus', 'Pending');
    }

    public function test_inactive_members_cannot_use_the_org(): void
    {
        $org = $this->compSoc();
        $inactive = $this->person($org, 'member', 'Inactive');

        $this->actingIn($inactive, $org)->postJson('/api/hours', ['activity' => 'Cleanup', 'date' => now()->toDateString(), 'hours' => 2])
            ->assertForbidden()->assertJsonPath('message', 'Your membership in this organization is inactive.');
    }

    public function test_a_pending_applicant_can_withdraw(): void
    {
        $org = $this->compSoc();
        $pending = $this->person($org, 'member', 'Pending');

        $this->actingIn($pending, $org)->deleteJson("/api/organizations/{$org->slug}/application")->assertOk();
        $this->assertDatabaseMissing('membership_records', ['user_id' => $pending->id, 'organization_id' => $org->id]);
        $this->actingIn($pending, $org)->deleteJson("/api/organizations/{$org->slug}/application")->assertNotFound();
    }

    public function test_setting_a_member_inactive_needs_a_reason_and_they_see_it(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer', 'Active', ['name' => 'Maria Santos']);
        $member = $this->person($org);
        $body = ['name' => $member->name, 'email' => $member->email, 'position' => 'Member', 'status' => 'Inactive'];

        $this->actingIn($president, $org)->putJson("/api/members/{$member->id}", $body)
            ->assertStatus(422)->assertJsonValidationErrors('inactiveReason');

        $this->actingIn($president, $org)->putJson("/api/members/{$member->id}", $body + ['inactiveReason' => 'Missed three assemblies'])
            ->assertOk()->assertJsonPath('inactiveReason', 'Missed three assemblies');

        $this->actingIn($member, $org)->getJson('/api/user')
            ->assertJsonPath('membershipStatus', 'Inactive')
            ->assertJsonPath('inactive.reason', 'Missed three assemblies')
            ->assertJsonPath('inactive.by', 'Maria Santos')
            ->assertJsonPath('inactive.byPosition', 'President');
        $this->assertDatabaseHas('user_notifications', ['user_id' => $member->id, 'message' => 'Your membership in CompSoc was set to inactive']);
    }

    public function test_an_inactive_member_asks_to_be_reactivated_and_an_officer_approves(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $treasurer = $this->person($org, 'officer', 'Active', [], 'Treasurer');
        $member = $this->person($org, 'member', 'Active', ['name' => 'Enzo Villanueva']);
        $this->actingIn($president, $org)->putJson("/api/members/{$member->id}", [
            'name' => $member->name, 'email' => $member->email, 'position' => 'Member', 'status' => 'Inactive', 'inactiveReason' => 'Fee unpaid',
        ])->assertOk();

        $this->actingIn($member, $org)->postJson("/api/organizations/{$org->slug}/reactivation", ['message' => 'I paid the fee today.'])->assertOk();
        $this->assertDatabaseHas('user_notifications', ['user_id' => $president->id, 'message' => 'Enzo Villanueva asked to be reactivated in CompSoc']);
        $this->assertDatabaseMissing('user_notifications', ['user_id' => $treasurer->id, 'message' => 'Enzo Villanueva asked to be reactivated in CompSoc']);

        $this->actingIn($president, $org)->getJson('/api/reactivations')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.message', 'I paid the fee today.')->assertJsonPath('0.reason', 'Fee unpaid');

        // A Treasurer can see requests but not decide them
        $this->actingIn($treasurer, $org)->patchJson("/api/reactivations/{$member->id}", ['status' => 'Approved'])->assertForbidden();

        $this->actingIn($president, $org)->patchJson("/api/reactivations/{$member->id}", ['status' => 'Approved'])->assertOk();
        $this->assertDatabaseHas('membership_records', ['user_id' => $member->id, 'status' => 'Active', 'inactive_reason' => null]);
        $this->actingIn($member, $org)->getJson('/api/events')->assertOk();   // back in
    }

    public function test_a_declined_request_keeps_the_member_inactive(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $member = $this->person($org);
        $this->actingIn($president, $org)->putJson("/api/members/{$member->id}", [
            'name' => $member->name, 'email' => $member->email, 'position' => 'Member', 'status' => 'Inactive', 'inactiveReason' => 'Fee unpaid',
        ]);
        $this->actingIn($member, $org)->postJson("/api/organizations/{$org->slug}/reactivation", ['message' => 'Please?']);

        $this->actingIn($president, $org)->patchJson("/api/reactivations/{$member->id}", ['status' => 'Declined'])->assertOk();

        $this->assertDatabaseHas('membership_records', ['user_id' => $member->id, 'status' => 'Inactive', 'reactivation_requested_at' => null]);
        $this->actingIn($president, $org)->getJson('/api/reactivations')->assertJsonCount(0);
    }

    public function test_only_inactive_members_can_ask_to_be_reactivated(): void
    {
        $org = $this->compSoc();
        $active = $this->person($org);

        $this->actingIn($active, $org)->postJson("/api/organizations/{$org->slug}/reactivation", ['message' => 'Hi'])->assertStatus(422);
    }
}
