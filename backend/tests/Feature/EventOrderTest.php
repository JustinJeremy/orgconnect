<?php

namespace Tests\Feature;

use App\Models\Event;
use Tests\TestCase;

// Batch 18: event lists show what's coming up first, then completed or passed events
class EventOrderTest extends TestCase
{
    public function test_upcoming_events_come_first_then_completed_or_passed_ones(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org);
        $event = fn ($title, $days, $status = 'upcoming') => $this->inOrg($org, fn () => Event::create([
            'title' => $title, 'category' => 'Workshop', 'date' => now()->addDays($days)->toDateString(),
            'time' => '13:00', 'location' => 'Room 304', 'mode' => 'F2F', 'capacity' => 30, 'status' => $status,
        ]));
        $event('Old completed', -30, 'completed');
        $event('Next month', 30);
        $event('Recent completed', -3, 'completed');
        $event('Passed, not marked', -1);
        $event('Tomorrow', 1);

        $titles = collect($this->actingIn($member, $org)->getJson('/api/events')->json())->pluck('title')->all();
        $this->assertSame(['Tomorrow', 'Next month', 'Passed, not marked', 'Recent completed', 'Old completed'], $titles);

        $page = $this->actingIn($member, $org)->getJson('/api/events?page=1&tab=upcoming')->json('data');
        $this->assertSame(['Tomorrow', 'Next month', 'Passed, not marked'], collect($page)->pluck('title')->all());
    }
}
