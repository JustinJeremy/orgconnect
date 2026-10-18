<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\TutoringRequest;
use App\Models\TutoringSession;
use Tests\TestCase;

// Batch 22: QR check-in for events and tutoring sessions, read receipts and "typing..."
class CheckinTest extends TestCase
{
    public function test_members_check_in_to_an_event_with_its_qr_code(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 20)->setTime(12, 30));   // a Tuesday, 30 minutes before the event
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $rsvp = $this->person($org, 'member', 'Active', ['name' => 'Has RSVP']);
        $walkIn = $this->person($org, 'member', 'Active', ['name' => 'Walk In']);
        $outsider = $this->person($this->secondOrg());
        $event = $this->inOrg($org, fn () => Event::create(['title' => 'Demo Day', 'category' => 'Seminar', 'date' => '2026-10-20', 'time' => '13:00',
            'location' => 'Hall', 'mode' => 'F2F', 'capacity' => 50, 'description' => 'x', 'status' => 'upcoming', 'created_by' => $officer->id]));
        $event->registrations()->create(['user_id' => $rsvp->id, 'status' => 'registered']);

        // Only officers see the code; members never get it from the event itself
        $this->actingIn($rsvp, $org)->getJson("/api/events/{$event->id}/checkin")->assertForbidden();
        $this->actingIn($officer, $org)->getJson('/api/events')->assertJsonMissingPath('data.0.checkinCode');
        $code = $this->actingIn($officer, $org)->getJson("/api/events/{$event->id}/checkin")->assertOk()->assertJsonPath('open', true)->json('code');
        $this->assertSame(32, strlen($code));

        // Scanning works whichever org is selected (the link says which event)
        $this->actingIn($rsvp, $this->secondOrg())->postJson('/api/checkin', ['type' => 'event', 'id' => $event->id, 'code' => $code])
            ->assertOk()->assertJsonPath('already', false)->assertJsonPath('organization.slug', $org->slug);
        $this->actingIn($rsvp, $org)->postJson('/api/checkin', ['type' => 'event', 'id' => $event->id, 'code' => $code])->assertJsonPath('already', true);
        $this->actingIn($walkIn, $org)->postJson('/api/checkin', ['type' => 'event', 'id' => $event->id, 'code' => $code])->assertOk();
        $this->assertDatabaseHas('event_registrations', ['event_id' => $event->id, 'user_id' => $walkIn->id, 'status' => 'attended']);
        $this->actingIn($outsider, $this->secondOrg())->postJson('/api/checkin', ['type' => 'event', 'id' => $event->id, 'code' => $code])->assertForbidden();
        $this->actingIn($officer, $org)->getJson("/api/events/{$event->id}/checkin")->assertJsonCount(2, 'checkedIn');

        // A new code makes the old QR stop working
        $this->actingIn($officer, $org)->postJson("/api/events/{$event->id}/checkin/reset")->assertOk();
        $late = $this->person($org);
        $this->actingIn($late, $org)->postJson('/api/checkin', ['type' => 'event', 'id' => $event->id, 'code' => $code])->assertNotFound();
    }

    public function test_event_check_in_opens_a_day_before_and_closes_when_the_event_is_finished(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $member = $this->person($org);
        $event = $this->inOrg($org, fn () => Event::create(['title' => 'Later', 'category' => 'Seminar', 'date' => '2026-10-20', 'time' => '13:00',
            'location' => 'Hall', 'mode' => 'F2F', 'capacity' => 50, 'description' => 'x', 'status' => 'upcoming', 'created_by' => $officer->id]));
        $scan = fn ($code) => $this->actingIn($member, $org)->postJson('/api/checkin', ['type' => 'event', 'id' => $event->id, 'code' => $code]);

        // Two days before: closed, and the card has no QR button
        $this->travelTo(now()->setDate(2026, 10, 18)->setTime(13, 0));
        $this->actingIn($officer, $org)->getJson('/api/events')->assertJsonPath('0.checkinOpen', false);
        $code = $this->actingIn($officer, $org)->getJson("/api/events/{$event->id}/checkin")->assertJsonPath('open', false)->json('code');
        $scan($code)->assertStatus(422)->assertJsonPath('message', 'Check-in opens a day before the event (Oct 19, 1:00 PM).');

        // A day before: open
        $this->travelTo(now()->setDate(2026, 10, 19)->setTime(13, 0));
        $this->actingIn($officer, $org)->getJson('/api/events')->assertJsonPath('0.checkinOpen', true);
        $scan($code)->assertOk();

        // Completed: closed, and the QR button goes away
        $event->update(['status' => 'completed']);
        $this->actingIn($officer, $org)->getJson('/api/events?tab=past')->assertJsonPath('0.checkinOpen', false);
        $scan($code)->assertStatus(422)->assertJsonPath('message', 'This event is finished, so check-in is closed.');

        // Not marked completed but its day is over: closed too
        $event->update(['status' => 'upcoming']);
        $this->travelTo(now()->setDate(2026, 10, 21)->setTime(8, 0));
        $scan($code)->assertStatus(422);
    }

    public function test_students_with_a_confirmed_request_check_in_to_tutoring_once_a_meeting_day(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 19)->setTime(15, 0));   // a Monday
        $org = $this->compSoc();
        $tutor = $this->person($org);
        $student = $this->person($org);
        $stranger = $this->person($org);
        $session = $this->inOrg($org, fn () => TutoringSession::create(['tutor_id' => $tutor->id, 'subject' => 'SQL basics', 'area' => 'Databases',
            'schedule' => 'Mondays, 3:00 PM', 'location' => 'Room 302', 'slots' => 3]));
        $this->inOrg($org, fn () => TutoringRequest::create(['tutoring_session_id' => $session->id, 'user_id' => $student->id, 'status' => 'Confirmed']));

        $this->actingIn($student, $org)->getJson("/api/tutoring-sessions/{$session->id}/checkin")->assertForbidden();
        $code = $this->actingIn($tutor, $org)->getJson("/api/tutoring-sessions/{$session->id}/checkin")->assertOk()->assertJsonPath('open', true)->json('code');

        $scan = fn ($who) => $this->actingIn($who, $org)->postJson('/api/checkin', ['type' => 'session', 'id' => $session->id, 'code' => $code]);
        $scan($student)->assertOk()->assertJsonPath('already', false);
        $scan($student)->assertOk()->assertJsonPath('already', true);
        $scan($stranger)->assertStatus(422);
        $scan($tutor)->assertStatus(422);
        $this->actingIn($tutor, $org)->getJson("/api/tutoring-sessions/{$session->id}/checkin")->assertJsonCount(1, 'checkedIn');

        // Not on Tuesdays
        $this->travelTo(now()->addDay());
        $scan($student)->assertStatus(422);
    }

    public function test_seen_and_typing_in_a_chat(): void
    {
        $org = $this->compSoc();
        $juan = $this->person($org, 'member', 'Active', ['name' => 'Juan']);
        $isa = $this->person($org, 'member', 'Active', ['name' => 'Isabel']);
        $id = $this->actingIn($juan, $org)->postJson("/api/conversations/direct/{$isa->id}")->json('id');
        $message = $this->actingIn($juan, $org)->postJson("/api/conversations/{$id}/messages", ['body' => 'Hi'])->json('id');

        $this->actingIn($juan, $org)->getJson("/api/conversations/{$id}/status")->assertJsonCount(0, 'seen')->assertJsonPath('latestId', $message);
        $this->actingIn($isa, $org)->postJson("/api/conversations/{$id}/typing")->assertNoContent();
        $this->actingIn($juan, $org)->getJson("/api/conversations/{$id}/status")->assertJsonPath('typing', ['Isabel']);

        // Isabel opens the chat: Juan sees "Seen"
        $this->actingIn($isa, $org)->getJson("/api/conversations/{$id}/messages")->assertOk();
        $this->actingIn($juan, $org)->getJson("/api/conversations/{$id}/messages")
            ->assertJsonPath('seen.0.name', 'Isabel')->assertJsonPath('seen.0.lastReadId', $message);

        // Sending stops "typing", and it fades after a few seconds anyway
        $this->actingIn($isa, $org)->postJson("/api/conversations/{$id}/messages", ['body' => 'Hello!']);
        $this->actingIn($juan, $org)->getJson("/api/conversations/{$id}/status")->assertJsonPath('typing', []);
        $this->actingIn($isa, $org)->postJson("/api/conversations/{$id}/typing");
        $this->travel(6)->seconds();
        $this->actingIn($juan, $org)->getJson("/api/conversations/{$id}/status")->assertJsonPath('typing', []);

        // Someone outside the chat can't see or type
        $other = $this->person($org);
        $this->actingIn($other, $org)->getJson("/api/conversations/{$id}/status")->assertNotFound();
        $this->actingIn($other, $org)->postJson("/api/conversations/{$id}/typing")->assertForbidden();
    }
}
