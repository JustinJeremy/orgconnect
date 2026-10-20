<?php

namespace Tests\Feature;

use App\Models\TutoringSession;
use Tests\TestCase;

// Batch 23.8: tutoring sessions meet on one date and time with a format, rooms come from each org's list,
// and the same thing can't be posted twice (same title that day, or a room already in use then)
class SchedulingTest extends TestCase
{
    private function sessionForm(array $changes = []): array
    {
        return $changes + [
            'subject' => 'SQL basics', 'area' => 'Databases', 'date' => now()->addWeek()->toDateString(), 'time' => '15:00',
            'mode' => 'F2F', 'location' => 'Room 302', 'slots' => 3,
        ];
    }

    private function event(array $changes = []): array
    {
        return $changes + [
            'title' => 'Laravel Workshop', 'category' => 'Workshop', 'date' => now()->addWeek()->toDateString(), 'time' => '15:00',
            'location' => 'Room 304', 'mode' => 'F2F', 'capacity' => 20,
        ];
    }

    public function test_a_session_has_a_date_time_and_format(): void
    {
        $org = $this->compSoc();
        $tutor = $this->person($org);
        $date = now()->addWeek();

        $this->actingIn($tutor, $org)->postJson('/api/tutoring-sessions', $this->sessionForm(['mode' => 'Hybrid', 'location' => 'Room 302 + Zoom']))
            ->assertCreated()
            ->assertJsonPath('date', $date->toDateString())
            ->assertJsonPath('time', '15:00')
            ->assertJsonPath('mode', 'Hybrid')
            ->assertJsonPath('schedule', $date->format('D, M j').' · 3:00 PM')
            ->assertJsonPath('taken', 0)
            ->assertJsonPath('finished', false);

        $this->actingIn($tutor, $org)->postJson('/api/tutoring-sessions', $this->sessionForm(['subject' => 'Joins', 'date' => now()->subDay()->toDateString()]))
            ->assertStatus(422)->assertJsonValidationErrors('date');
        $this->actingIn($tutor, $org)->postJson('/api/tutoring-sessions', $this->sessionForm(['subject' => 'Joins', 'mode' => 'Party']))
            ->assertStatus(422)->assertJsonValidationErrors('mode');
    }

    public function test_the_same_title_on_the_same_date_is_refused(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');

        $this->actingIn($officer, $org)->postJson('/api/tutoring-sessions', $this->sessionForm())->assertCreated();
        $this->actingIn($officer, $org)->postJson('/api/tutoring-sessions', $this->sessionForm(['subject' => ' sql BASICS ', 'location' => 'Room 305', 'time' => '09:00']))
            ->assertStatus(422)->assertJsonValidationErrors('subject');
        $this->actingIn($officer, $org)->postJson('/api/tutoring-sessions', $this->sessionForm(['date' => now()->addWeeks(2)->toDateString()]))->assertCreated();

        $id = $this->actingIn($officer, $org)->postJson('/api/events', $this->event())->assertCreated()->json('id');
        $this->actingIn($officer, $org)->postJson('/api/events', $this->event(['location' => 'Room 305', 'time' => '09:00']))
            ->assertStatus(422)->assertJsonValidationErrors('title');
        // Editing an event doesn't clash with itself
        $this->actingIn($officer, $org)->putJson("/api/events/{$id}", $this->event(['capacity' => 30]))->assertOk();
    }

    public function test_a_room_cannot_be_used_twice_at_the_same_date_and_time(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');

        $this->actingIn($officer, $org)->postJson('/api/events', $this->event(['location' => 'Room 302']))->assertCreated();

        $this->actingIn($officer, $org)->postJson('/api/tutoring-sessions', $this->sessionForm())
            ->assertStatus(422)->assertJsonValidationErrors('location')
            ->assertJsonPath('errors.location.0', 'That room is already used at that date and time by the event "Laravel Workshop".');
        // Hybrid uses the room too; online-only and another time are fine
        $this->actingIn($officer, $org)->postJson('/api/tutoring-sessions', $this->sessionForm(['mode' => 'Hybrid', 'location' => 'room 302 + Zoom']))
            ->assertStatus(422)->assertJsonValidationErrors('location');
        $this->actingIn($officer, $org)->postJson('/api/tutoring-sessions', $this->sessionForm(['mode' => 'Online', 'location' => 'Zoom']))->assertCreated();
        $this->actingIn($officer, $org)->postJson('/api/events', $this->event(['title' => 'Git Workshop', 'location' => 'Room 302', 'time' => '17:00']))->assertCreated();
    }

    public function test_a_session_whose_day_is_over_cannot_be_requested(): void
    {
        $org = $this->compSoc();
        $tutor = $this->person($org);
        $session = $this->inOrg($org, fn () => TutoringSession::create([
            'tutor_id' => $tutor->id, 'subject' => 'Statistics', 'area' => 'Other', 'date' => now()->subDays(2)->toDateString(), 'time' => '10:00',
            'mode' => 'F2F', 'location' => 'Room 210', 'slots' => 3,
        ]));

        $this->actingIn($this->person($org), $org)->postJson('/api/tutoring-requests', ['sessionId' => $session->id])
            ->assertStatus(422)->assertJsonValidationErrors('sessionId');
    }

    public function test_older_weekly_sessions_get_their_next_meeting_day(): void
    {
        $org = $this->compSoc();
        $session = $this->inOrg($org, fn () => TutoringSession::create([
            'tutor_id' => $this->person($org)->id, 'subject' => 'Subnetting', 'area' => 'Other', 'schedule' => 'Fridays, 10:00 AM',
            'location' => 'Room 210 + Google Meet', 'slots' => 3,
        ]));

        $this->assertSame('Friday', $session->date->format('l'));
        $this->assertTrue($session->date->between(today(), today()->addDays(6)));
        $this->assertSame('10:00', $session->time);
        $this->assertSame('Hybrid', $session->mode);
    }

    public function test_officers_keep_the_orgs_room_list(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');

        // Until it's edited: the rooms the org's events and sessions already use
        $this->actingIn($officer, $org)->postJson('/api/events', $this->event(['mode' => 'Hybrid', 'location' => 'Room 304 + Zoom']))->assertCreated();
        $this->assertContains('Room 304', $org->fresh()->rooms());

        $this->actingIn($this->person($org), $org)->putJson('/api/organization/rooms', ['rooms' => ['Room 1']])->assertForbidden();
        $this->actingIn($officer, $org)->putJson('/api/organization/rooms', ['rooms' => ['Room 1', 'room 1']])
            ->assertStatus(422)->assertJsonValidationErrors('rooms.1');
        $this->actingIn($officer, $org)->putJson('/api/organization/rooms', ['rooms' => ['Computer Lab 1', 'Room 210']])
            ->assertOk()->assertJsonPath('rooms', ['Computer Lab 1', 'Room 210']);
    }

    public function test_resources_and_announcements_are_not_posted_twice(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $resource = ['title' => 'SQL cheat sheet', 'subject' => $org->tutoringAreas()[0], 'type' => 'Link', 'url' => 'https://example.com/sql'];
        $post = ['title' => 'General assembly', 'category' => 'General', 'content' => 'See you on Friday.'];

        $this->actingIn($officer, $org)->postJson('/api/resources', $resource)->assertCreated();
        $this->actingIn($officer, $org)->postJson('/api/resources', ['title' => 'Another'] + $resource)->assertStatus(422)->assertJsonValidationErrors('url');
        $this->actingIn($officer, $org)->postJson('/api/resources', ['url' => 'https://example.com/other'] + $resource)->assertStatus(422)->assertJsonValidationErrors('title');

        $this->actingIn($officer, $org)->postJson('/api/announcements', $post)->assertCreated();
        $this->actingIn($officer, $org)->postJson('/api/announcements', ['content' => 'Again.'] + $post)->assertStatus(422)->assertJsonValidationErrors('title');
    }
}
