<?php

namespace Tests\Feature;

use App\Models\TutoringSession;
use App\Models\UserNotification;
use Tests\TestCase;

// Who hears about what, and the Notifications page (pages and filters)
class NotificationTest extends TestCase
{
    public function test_officers_hear_about_new_hour_logs_but_not_their_own(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $secretary = $this->person($org, 'officer', 'Active', [], 'Secretary');
        $member = $this->person($org, 'member', 'Active', ['name' => 'Juan Dela Cruz']);

        $this->actingIn($member, $org)->postJson('/api/hours', ['activity' => 'Booth duty', 'date' => now()->toDateString(), 'hours' => 2])->assertCreated();
        foreach ([$president, $secretary] as $officer) {
            $this->assertDatabaseHas('user_notifications', ['user_id' => $officer->id, 'message' => 'Juan Dela Cruz logged 2 hrs for Booth duty']);
        }

        // An officer logging their own hours: the other officers hear, they don't
        $this->actingIn($secretary, $org)->postJson('/api/hours', ['activity' => 'Poster design', 'date' => now()->toDateString(), 'hours' => 1])->assertCreated();
        $this->assertDatabaseHas('user_notifications', ['user_id' => $president->id, 'message' => "{$secretary->name} logged 1 hrs for Poster design"]);
        $this->assertDatabaseMissing('user_notifications', ['user_id' => $secretary->id, 'message' => "{$secretary->name} logged 1 hrs for Poster design"]);
        $this->assertDatabaseMissing('user_notifications', ['user_id' => $member->id, 'message' => "{$secretary->name} logged 1 hrs for Poster design"]);
    }

    public function test_both_sides_of_a_tutoring_session_hear_when_an_officer_decides(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer', 'Active', ['name' => 'Maria Santos']);
        $tutor = $this->person($org, 'member', 'Active', ['name' => 'Mark Dela Rosa']);
        $student = $this->person($org, 'member', 'Active', ['name' => 'Joanna Uy']);
        $session = $this->inOrg($org, fn () => TutoringSession::create([
            'tutor_id' => $tutor->id, 'subject' => 'Subnetting', 'area' => 'Other', 'schedule' => 'Fridays', 'location' => 'Lab', 'slots' => 3,
        ]));

        $requestId = $this->actingIn($student, $org)->postJson('/api/tutoring-requests', ['sessionId' => $session->id])->assertCreated()->json('id');
        $this->assertDatabaseHas('user_notifications', ['user_id' => $tutor->id, 'message' => 'Joanna Uy requested your tutoring session: Subnetting']);

        // An officer approves it in the tutor's place: student and tutor both hear
        $this->actingIn($president, $org)->patchJson("/api/tutoring-requests/{$requestId}", ['status' => 'Confirmed'])->assertOk();
        $this->assertDatabaseHas('user_notifications', ['user_id' => $student->id, 'message' => 'Your tutoring request for Subnetting was approved']);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $tutor->id, 'message' => "Maria Santos approved Joanna Uy's request for your tutoring session: Subnetting"]);

        // The tutor completes it themselves: only the student needs to hear
        $before = UserNotification::where('user_id', $tutor->id)->count();
        $this->actingIn($tutor, $org)->patchJson("/api/tutoring-requests/{$requestId}", ['status' => 'Completed'])->assertOk();
        $this->assertDatabaseHas('user_notifications', ['user_id' => $student->id, 'message' => 'Your tutoring request for Subnetting was marked as completed']);
        $this->assertSame($before, UserNotification::where('user_id', $tutor->id)->count());
    }

    public function test_the_notifications_page_pages_and_filters(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org);
        $this->inOrg($org, function () use ($member) {
            for ($i = 1; $i <= 12; $i++) {
                UserNotification::create(['user_id' => $member->id, 'message' => "New event: Event {$i}", 'link' => "events/{$i}", 'is_read' => $i > 3]);
            }
            UserNotification::create(['user_id' => $member->id, 'message' => 'Your 2 hrs for Booth were approved', 'link' => 'hours/5']);
            UserNotification::create(['user_id' => $member->id, 'message' => 'Your membership application was approved. Welcome!', 'link' => 'dashboard']);
        });

        // The bell: no page, the latest 30
        $this->actingIn($member, $org)->getJson('/api/notifications')->assertOk()->assertJsonCount(14);

        $this->actingIn($member, $org)->getJson('/api/notifications?page=1&perPage=10')
            ->assertJsonCount(10, 'data')->assertJsonPath('meta.total', 14)->assertJsonPath('meta.lastPage', 2);
        $this->actingIn($member, $org)->getJson('/api/notifications?page=1&view=unread')->assertJsonPath('meta.total', 5);
        $this->actingIn($member, $org)->getJson('/api/notifications?page=1&type=events')->assertJsonPath('meta.total', 12);
        $this->actingIn($member, $org)->getJson('/api/notifications?page=1&type=hours')->assertJsonPath('meta.total', 1);
        $this->actingIn($member, $org)->getJson('/api/notifications?page=1&type=membership')
            ->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.message', 'Your membership application was approved. Welcome!');
    }
}
