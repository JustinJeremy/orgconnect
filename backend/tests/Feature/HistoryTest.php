<?php

namespace Tests\Feature;

use App\Models\Certificate;
use App\Models\Event;
use App\Models\VolunteerHour;
use Tests\TestCase;

// Profile history pages: your own hours, events and certificates in the selected org only
class HistoryTest extends TestCase
{
    private function event($org, string $title, int $days, string $status): Event
    {
        return $this->inOrg($org, fn () => Event::create([
            'title' => $title, 'category' => 'Workshop', 'date' => now()->addDays($days)->toDateString(),
            'time' => '13:00', 'location' => 'Room 304', 'mode' => 'F2F', 'capacity' => 30, 'status' => $status,
        ]));
    }

    public function test_your_hours_events_and_certificates(): void
    {
        $org = $this->compSoc();
        $secretary = $this->person($org, 'officer', 'Active', ['name' => 'Angela Rivera'], 'Secretary');
        $member = $this->person($org);
        $other = $this->person($org);

        $attended = $this->event($org, 'Git Workshop', -10, 'completed');
        $missed = $this->event($org, 'Figma Workshop', -5, 'completed');
        $coming = $this->event($org, 'Movie Night', 4, 'upcoming');
        $attended->registrations()->create(['user_id' => $member->id, 'status' => 'attended']);
        $missed->registrations()->create(['user_id' => $member->id, 'status' => 'registered']);
        $coming->registrations()->create(['user_id' => $member->id, 'status' => 'registered']);
        $attended->registrations()->create(['user_id' => $other->id, 'status' => 'attended']);
        Certificate::create(['user_id' => $member->id, 'event_id' => $attended->id, 'issued_at' => now()]);
        $this->inOrg($org, fn () => VolunteerHour::create([
            'user_id' => $member->id, 'activity' => 'Booth duty', 'date' => now()->subDays(3)->toDateString(),
            'hours' => 2, 'status' => 'Approved', 'reviewed_by' => $secretary->id,
        ]));
        $this->inOrg($org, fn () => VolunteerHour::create([
            'user_id' => $other->id, 'activity' => 'Not mine', 'date' => now()->toDateString(), 'hours' => 1, 'status' => 'Pending',
        ]));

        $res = $this->actingIn($member, $org)->getJson('/api/my-history')->assertOk();

        $res->assertJsonCount(1, 'hours')->assertJsonPath('hours.0.activity', 'Booth duty')->assertJsonPath('hours.0.reviewedBy', 'Angela Rivera');
        $results = collect($res->json('events'))->pluck('result', 'title');
        $this->assertSame(['Movie Night' => 'going', 'Figma Workshop' => 'missed', 'Git Workshop' => 'attended'], $results->all());
        $res->assertJsonCount(1, 'certificates')->assertJsonPath('certificates.0.title', 'Git Workshop');
    }

    public function test_only_the_selected_orgs_history(): void
    {
        $compsoc = $this->compSoc();
        $dss = $this->secondOrg();
        $member = $this->person($compsoc);
        $member->memberships()->create(['organization_id' => $dss->id, 'role' => 'member', 'position' => 'Member', 'status' => 'Active']);

        $dssEvent = $this->event($dss, 'Kaggle Night', -3, 'completed');
        $dssEvent->registrations()->create(['user_id' => $member->id, 'status' => 'attended']);
        Certificate::create(['user_id' => $member->id, 'event_id' => $dssEvent->id, 'issued_at' => now()]);

        $this->actingIn($member, $compsoc)->getJson('/api/my-history')
            ->assertJsonCount(0, 'events')->assertJsonCount(0, 'certificates');
        $this->actingIn($member, $dss)->getJson('/api/my-history')
            ->assertJsonCount(1, 'events')->assertJsonCount(1, 'certificates');
    }
}
