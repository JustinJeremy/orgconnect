<?php

namespace Tests\Feature;

use App\Models\Event;
use Tests\TestCase;

// List endpoints: ?page returns one page + meta, filters run on the server, no ?page returns everything
class PaginationTest extends TestCase
{
    private function events($org, int $count, array $attributes = []): void
    {
        $this->inOrg($org, function () use ($count, $attributes) {
            foreach (range(1, $count) as $i) {
                Event::create($attributes + [
                    'title' => "Workshop {$i}", 'category' => 'Workshop', 'date' => now()->addDays($i)->toDateString(),
                    'time' => '13:00', 'location' => 'Room 304', 'mode' => 'F2F', 'capacity' => 30, 'status' => 'upcoming',
                ]);
            }
        });
    }

    public function test_a_page_comes_back_with_its_meta(): void
    {
        $org = $this->compSoc();
        $this->events($org, 12);

        $this->actingIn($this->person($org), $org)->getJson('/api/events?page=2&perPage=5')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta', ['page' => 2, 'lastPage' => 3, 'total' => 12, 'perPage' => 5])
            ->assertJsonPath('data.0.title', 'Workshop 6');   // sorted by date
    }

    public function test_without_a_page_the_full_list_is_returned(): void
    {
        $org = $this->compSoc();
        $this->events($org, 12);

        $this->actingIn($this->person($org), $org)->getJson('/api/events')->assertOk()->assertJsonCount(12);
    }

    public function test_page_size_is_capped_at_fifty(): void
    {
        $org = $this->compSoc();

        $this->actingIn($this->person($org), $org)->getJson('/api/events?page=1&perPage=500')
            ->assertOk()
            ->assertJsonPath('meta.perPage', 50);
    }

    public function test_filters_and_search_apply_before_paging(): void
    {
        $org = $this->compSoc();
        $this->events($org, 3);
        $this->events($org, 2, ['category' => 'Seminar', 'title' => 'Cybersecurity Seminar']);
        $member = $this->person($org);

        $this->actingIn($member, $org)->getJson('/api/events?page=1&category=Seminar')
            ->assertJsonPath('meta.total', 2);

        $this->actingIn($member, $org)->getJson('/api/events?page=1&search=cyber')
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.title', 'Cybersecurity Seminar');
    }

    public function test_hour_logs_filter_by_status(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $member = $this->person($org);
        foreach ([1, 2, 3] as $hours) {
            $this->actingIn($member, $org)->postJson('/api/hours', ['activity' => "Task {$hours}", 'date' => now()->toDateString(), 'hours' => $hours]);
        }
        $first = $this->actingIn($officer, $org)->getJson('/api/hours?page=1')->json('data.0.id');
        $this->actingIn($officer, $org)->patchJson("/api/hours/{$first}", ['status' => 'Approved']);

        $this->actingIn($officer, $org)->getJson('/api/hours?page=1&status=Pending')->assertJsonPath('meta.total', 2);
        $this->actingIn($officer, $org)->getJson('/api/hours?page=1&status=Approved')->assertJsonPath('meta.total', 1);
    }
}
