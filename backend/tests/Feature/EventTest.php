<?php

namespace Tests\Feature;

use App\Models\Event;
use Tests\TestCase;

class EventTest extends TestCase
{
    private function validEvent(array $changes = []): array
    {
        return $changes + [
            'title' => 'Laravel Workshop',
            'category' => 'Workshop',
            'date' => now()->addWeek()->toDateString(),
            'time' => '13:00',
            'location' => 'Room 304',
            'mode' => 'F2F',
            'capacity' => 2,
            'description' => 'Bring a laptop.',
        ];
    }

    public function test_an_officer_creates_an_event_and_members_are_notified(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $member = $this->person($org);

        $this->actingIn($officer, $org)->postJson('/api/events', $this->validEvent())
            ->assertCreated()
            ->assertJsonPath('title', 'Laravel Workshop');

        $this->assertDatabaseHas('events', ['title' => 'Laravel Workshop', 'organization_id' => $org->id]);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $member->id, 'message' => 'New event: Laravel Workshop']);
    }

    public function test_invalid_events_are_rejected_field_by_field(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');

        $this->actingIn($officer, $org)
            ->postJson('/api/events', $this->validEvent(['title' => '', 'category' => 'Party', 'time' => '25:00', 'capacity' => 0]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'category', 'time', 'capacity']);
    }

    public function test_events_cannot_be_scheduled_in_the_past(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');

        $this->actingIn($officer, $org)
            ->postJson('/api/events', $this->validEvent(['date' => now()->subDay()->toDateString()]))
            ->assertStatus(422);
    }

    public function test_members_rsvp_until_the_event_is_full(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $event = Event::find($this->actingIn($officer, $org)->postJson('/api/events', $this->validEvent())->json('id'));

        [$a, $b, $c] = [$this->person($org), $this->person($org), $this->person($org)];
        $this->actingIn($a, $org)->postJson("/api/events/{$event->id}/rsvp")->assertOk();
        $this->actingIn($b, $org)->postJson("/api/events/{$event->id}/rsvp")->assertOk();
        $this->actingIn($c, $org)->postJson("/api/events/{$event->id}/rsvp")
            ->assertStatus(422)
            ->assertJsonPath('message', 'This event is full.');

        $this->assertDatabaseCount('event_registrations', 2);
    }

    public function test_attendance_completes_the_event_and_issues_certificates(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $event = Event::find($this->actingIn($officer, $org)->postJson('/api/events', $this->validEvent())->json('id'));
        $came = $this->person($org);
        $missed = $this->person($org);

        $registrations = collect([$came, $missed])
            ->map(fn ($u) => $this->actingIn($u, $org)->postJson("/api/events/{$event->id}/rsvp")->json('registrations'))
            ->last();
        $cameId = collect($registrations)->firstWhere('userId', $came->id)['id'];
        Event::withoutGlobalScopes()->whereKey($event->id)->update(['date' => now()->subDay()->toDateString()]);   // the event has now happened

        $this->actingIn($officer, $org)
            ->putJson("/api/events/{$event->id}/attendance", ['attendees' => [$cameId], 'completed' => true])
            ->assertOk()
            ->assertJsonPath('status', 'completed');

        $this->assertDatabaseHas('certificates', ['event_id' => $event->id, 'user_id' => $came->id]);
        $this->assertDatabaseMissing('certificates', ['event_id' => $event->id, 'user_id' => $missed->id]);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $came->id, 'message' => 'Your certificate for Laravel Workshop is ready']);
    }
}
