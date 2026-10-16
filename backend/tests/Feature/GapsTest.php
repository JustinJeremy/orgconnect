<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Organization;
use App\Models\TutoringSession;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\VolunteerHour;
use Tests\TestCase;

// Batch 15.1: leaving with a reason, cancelling tutoring, org detail changes reviewed by the admin,
// tutoring hours, platform notifications, no RSVP after an event starts
class GapsTest extends TestCase
{
    private function admin(): User
    {
        $admin = User::factory()->create(['student_id' => 'ADMIN-'.fake()->unique()->numerify('###'), 'course' => 'Staff', 'year_level' => 'Staff']);
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    private function tutoringSession($org, $tutor, int $slots = 3): TutoringSession
    {
        return $this->inOrg($org, fn () => TutoringSession::create([
            'tutor_id' => $tutor->id, 'subject' => 'Subnetting', 'area' => 'Other', 'schedule' => 'Fridays, 10:00 AM', 'location' => 'Lab', 'slots' => $slots,
        ]));
    }

    public function test_a_member_leaves_with_a_reason_and_the_managers_are_told(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $member = $this->person($org, 'member', 'Active', ['name' => 'Joanna Uy']);

        $this->actingIn($member, $org)->deleteJson("/api/organizations/{$org->slug}/membership")->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->actingIn($member, $org)->deleteJson("/api/organizations/{$org->slug}/membership", ['reason' => 'Moving to another school.'])->assertOk();

        $this->assertDatabaseMissing('membership_records', ['user_id' => $member->id, 'organization_id' => $org->id]);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $president->id, 'message' => 'Joanna Uy left CompSoc: "Moving to another school."']);
        // The President can't just leave
        $this->actingIn($president, $org)->deleteJson("/api/organizations/{$org->slug}/membership", ['reason' => 'Bye'])->assertStatus(422);
    }

    public function test_a_student_cancels_their_request_with_a_reason_and_gets_the_slot_back(): void
    {
        $org = $this->compSoc();
        $tutor = $this->person($org, 'member', 'Active', ['name' => 'Mark Dela Rosa']);
        $student = $this->person($org, 'member', 'Active', ['name' => 'Joanna Uy']);
        $other = $this->person($org);
        $session = $this->tutoringSession($org, $tutor);
        $id = $this->actingIn($student, $org)->postJson('/api/tutoring-requests', ['sessionId' => $session->id])->json('id');
        $this->actingIn($tutor, $org)->patchJson("/api/tutoring-requests/{$id}", ['status' => 'Confirmed'])->assertOk();
        $this->assertSame(2, $session->fresh()->slots);

        $this->actingIn($other, $org)->deleteJson("/api/tutoring-requests/{$id}", ['reason' => 'x'])->assertForbidden();
        $this->actingIn($student, $org)->deleteJson("/api/tutoring-requests/{$id}")->assertStatus(422);
        $this->actingIn($student, $org)->deleteJson("/api/tutoring-requests/{$id}", ['reason' => 'Schedule conflict'])->assertOk();

        $this->assertSame(3, $session->fresh()->slots);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $tutor->id, 'message' => 'Joanna Uy cancelled their request for Subnetting: "Schedule conflict"']);
    }

    public function test_finishing_a_session_logs_pending_hours_for_the_tutor(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $tutor = $this->person($org, 'member', 'Active', ['name' => 'Mark Dela Rosa']);
        $student = $this->person($org, 'member', 'Active', ['name' => 'Joanna Uy']);
        $id = $this->actingIn($student, $org)->postJson('/api/tutoring-requests', ['sessionId' => $this->tutoringSession($org, $tutor)->id])->json('id');
        $this->actingIn($tutor, $org)->patchJson("/api/tutoring-requests/{$id}", ['status' => 'Confirmed']);

        $this->actingIn($tutor, $org)->patchJson("/api/tutoring-requests/{$id}", ['status' => 'Completed', 'hours' => 1.5])->assertOk();

        $log = $this->inOrg($org, fn () => VolunteerHour::where('user_id', $tutor->id)->first());
        $this->assertSame('Peer tutoring: Subnetting with Joanna Uy', $log->activity);
        $this->assertSame('Pending', $log->status);
        $this->assertEquals(1.5, $log->hours);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $president->id, 'message' => 'Mark Dela Rosa logged 1.5 hrs for Peer tutoring: Subnetting with Joanna Uy']);
    }

    public function test_the_president_asks_to_change_details_and_the_admin_approves(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $secretary = $this->person($org, 'officer', 'Active', [], 'Secretary');

        $this->actingIn($secretary, $org)->postJson('/api/organization/change-requests', ['tagline' => 'New', 'reason' => 'x'])->assertForbidden();
        $this->actingIn($president, $org)->postJson('/api/organization/change-requests', ['tagline' => 'Build, share, serve.'])
            ->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->actingIn($president, $org)->postJson('/api/organization/change-requests', [
            'tagline' => 'Build, share, serve.', 'name' => $org->name, 'courses' => ['bsit', 'BSCS'], 'reason' => 'New tagline voted at the assembly.',
        ])->assertCreated()->assertJsonCount(2, 'changes');   // the unchanged name is left out
        $this->actingIn($president, $org)->postJson('/api/organization/change-requests', ['tagline' => 'Again', 'reason' => 'x'])->assertStatus(422);

        // Nothing changes until the admin approves
        $this->assertNotSame('Build, share, serve.', $org->fresh()->tagline);
        $admin = $this->admin();
        $id = $this->actingIn($admin, $org)->getJson('/api/admin/overview')->assertJsonCount(1, 'changeRequests')->json('changeRequests.0.id');
        $this->actingIn($admin, $org)->patchJson("/api/admin/change-requests/{$id}", ['decision' => 'Approved'])->assertOk();

        $this->assertSame('Build, share, serve.', $org->fresh()->tagline);
        $this->assertSame(['BSIT', 'BSCS'], $org->fresh()->courses);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $president->id, 'message' => "Your changes to CompSoc's details were approved"]);
    }

    public function test_a_rejected_change_needs_a_note_and_changes_nothing(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $this->actingIn($president, $org)->postJson('/api/organization/change-requests', ['tagline' => 'Something else', 'reason' => 'Rebrand'])->assertCreated();
        $id = $this->actingIn($president, $org)->getJson('/api/organization/change-requests')->json('request.id');
        $admin = $this->admin();

        $this->actingIn($admin, $org)->patchJson("/api/admin/change-requests/{$id}", ['decision' => 'Rejected'])->assertStatus(422);
        $this->actingIn($admin, $org)->patchJson("/api/admin/change-requests/{$id}", ['decision' => 'Rejected', 'note' => 'Needs the adviser\'s OK.'])->assertOk();

        $this->assertNotSame('Something else', $org->fresh()->tagline);
        $this->actingIn($president, $org)->getJson('/api/organization/change-requests')
            ->assertJsonPath('request.status', 'Rejected')->assertJsonPath('request.reviewNote', 'Needs the adviser\'s OK.');
    }

    public function test_platform_notices_reach_people_in_any_org(): void
    {
        $compsoc = $this->compSoc();
        $dss = $this->secondOrg();
        $student = $this->person($compsoc);
        $officer = $this->person($dss, 'officer', 'Active', [], 'Treasurer');
        $officer->memberships()->create(['organization_id' => $compsoc->id, 'role' => 'member', 'position' => 'Member', 'status' => 'Active']);
        $admin = $this->admin();

        // An org request rejected: the requester sees it in the org they have open
        $this->actingIn($student, $compsoc)->postJson('/api/org-requests', [
            'name' => 'Robotics Club', 'shortName' => 'RC', 'college' => 'Engineering', 'tagline' => 'Build.', 'description' => 'Robots.',
            'adviser' => 'Engr. X', 'email' => 'rc@school.edu.ph', 'courses' => ['BSCPE'],
        ])->assertCreated();
        $rc = Organization::where('short_name', 'RC')->first();
        $this->actingIn($admin, $compsoc)->patchJson("/api/admin/org-requests/{$rc->id}", ['decision' => 'Rejected', 'note' => 'Add your adviser\'s email.'])->assertOk();
        $this->actingIn($student, $compsoc)->getJson('/api/notifications')->assertJsonFragment(['message' => "Your request to register RC was not approved: Add your adviser's email."]);

        // DSS suspended: its officer sees it while in CompSoc
        $this->actingIn($admin, $compsoc)->patchJson("/api/admin/organizations/{$dss->id}", ['status' => 'Suspended'])->assertOk();
        $this->actingIn($officer, $compsoc)->getJson('/api/notifications')->assertJsonFragment(['message' => 'Data Science Society was suspended by an OrgConnect admin']);
        $this->assertSame(0, UserNotification::withoutGlobalScopes()->whereNotNull('organization_id')->where('user_id', $officer->id)->count());
    }

    public function test_no_rsvp_once_an_event_has_started(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org);
        $event = $this->inOrg($org, fn () => Event::create([
            'title' => 'Earlier today', 'category' => 'Workshop', 'date' => now()->toDateString(), 'time' => now()->subHour()->format('H:i'),
            'location' => 'Room 304', 'mode' => 'F2F', 'capacity' => 30, 'status' => 'upcoming',
        ]));

        $this->actingIn($member, $org)->postJson("/api/events/{$event->id}/rsvp")->assertStatus(422)->assertJsonValidationErrors('event');
    }
}
