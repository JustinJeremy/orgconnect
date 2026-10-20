<?php

namespace Tests\Feature;

use Tests\TestCase;

// Batch 18: events and tutoring sessions list the topics they cover (shown in their details)
class TopicsTest extends TestCase
{
    public function test_events_and_sessions_save_their_topics(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $event = [
            'title' => 'Blockchain 101', 'category' => 'Seminar', 'date' => now()->addWeek()->toDateString(), 'time' => '13:00',
            'location' => 'Room 304', 'mode' => 'F2F', 'capacity' => 30, 'topics' => ['Blockchain', 'Smart contracts'],
        ];

        $id = $this->actingIn($officer, $org)->postJson('/api/events', $event)->assertCreated()
            ->assertJsonPath('topics', ['Blockchain', 'Smart contracts'])->json('id');
        $this->actingIn($officer, $org)->putJson("/api/events/{$id}", ['topics' => ['Web3']] + $event)->assertOk()->assertJsonPath('topics', ['Web3']);

        // At most 8, no repeats
        $this->actingIn($officer, $org)->postJson('/api/events', ['topics' => ['A', 'A']] + $event)->assertStatus(422)->assertJsonValidationErrors('topics.0');
        $this->actingIn($officer, $org)->postJson('/api/events', ['topics' => range(1, 9)] + $event)->assertStatus(422)->assertJsonValidationErrors('topics');

        $this->actingIn($officer, $org)->postJson('/api/tutoring-sessions', [
            'subject' => 'SQL joins', 'area' => $org->tutoringAreas()[0], 'date' => now()->addWeek()->toDateString(), 'time' => '15:00', 'mode' => 'F2F', 'location' => 'Room 305', 'slots' => 3,
            'topics' => ['Joins', 'GROUP BY'],
        ])->assertCreated()->assertJsonPath('topics', ['Joins', 'GROUP BY']);
    }
}
