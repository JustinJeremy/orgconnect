<?php

namespace Tests\Feature;

use App\Models\Event;
use Tests\TestCase;

// Who can reach what: officers vs members, and one org's data vs another's
class AccessTest extends TestCase
{
    private function eventIn($org): Event
    {
        return $this->inOrg($org, fn () => Event::create([
            'title' => 'Git Workshop', 'category' => 'Workshop', 'date' => now()->addWeek()->toDateString(),
            'time' => '13:00', 'location' => 'Room 304', 'mode' => 'F2F', 'capacity' => 30, 'status' => 'upcoming',
        ]));
    }

    public function test_api_requires_signing_in(): void
    {
        $this->withHeader('X-Organization', 'computer-society')->getJson('/api/events')->assertUnauthorized();
    }

    public function test_someone_who_has_not_joined_the_org_is_refused(): void
    {
        $outsider = $this->person($this->secondOrg());

        $this->actingIn($outsider, $this->compSoc())->getJson('/api/events')->assertForbidden();
    }

    public function test_a_rejected_applicant_is_refused(): void
    {
        $rejected = $this->person($this->compSoc(), 'member', 'Rejected');

        $this->actingIn($rejected, $this->compSoc())->getJson('/api/events')->assertForbidden();
    }

    public function test_a_pending_applicant_can_already_browse(): void
    {
        $pending = $this->person($this->compSoc(), 'member', 'Pending');

        $this->actingIn($pending, $this->compSoc())->getJson('/api/events')->assertOk();
    }

    public function test_members_cannot_use_officer_actions(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org);

        $this->actingIn($member, $org)->getJson('/api/members')->assertForbidden();
        $this->actingIn($member, $org)->getJson('/api/applications')->assertForbidden();
        $this->actingIn($member, $org)->postJson('/api/announcements', ['title' => 'Hi', 'category' => 'General', 'content' => 'Hello'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Only officers can do this.');
    }

    public function test_officers_can_use_officer_actions(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');

        $this->actingIn($officer, $org)->getJson('/api/members')->assertOk();
        $this->actingIn($officer, $org)->getJson('/api/applications')->assertOk();
    }

    public function test_one_orgs_events_are_invisible_to_another_org(): void
    {
        $dss = $this->secondOrg();
        $this->eventIn($this->compSoc());
        $theirs = $this->eventIn($dss);

        // Someone in both orgs, viewing DSS, sees only DSS's event and can't open CompSoc's
        $both = $this->person($this->compSoc());
        $both->memberships()->create(['organization_id' => $dss->id, 'role' => 'member', 'position' => 'Member', 'status' => 'Active']);

        $this->actingIn($both, $dss)->getJson('/api/events')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $theirs->id);

        $compSocEvent = Event::withoutGlobalScopes()->where('organization_id', $this->compSoc()->id)->firstOrFail();
        $this->actingIn($both, $dss)->postJson("/api/events/{$compSocEvent->id}/rsvp")->assertNotFound();
    }
}
