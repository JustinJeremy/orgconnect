<?php

namespace Tests\Feature;

use App\Mail\OrgRequestDecided;
use App\Models\Organization;
use App\Models\TutoringRequest;
use App\Models\TutoringSession;
use App\Models\User;
use App\Models\VolunteerHour;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

// Batch 19: rejection reasons, the admin's decisions (messages, email, suspension reasons, org details),
// org colors, and announcements from the admin with a reply thread per org
class AdminToolsTest extends TestCase
{
    private function admin(): User
    {
        $admin = User::factory()->create(['student_id' => 'ADMIN-'.fake()->unique()->numerify('###'), 'course' => 'Staff', 'year_level' => 'Staff']);
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    private function orgForm(array $overrides = []): array
    {
        return $overrides + [
            'name' => 'Junior Philippine Computer Society – TIP', 'shortName' => 'JPCS', 'college' => 'College of Computer Studies',
            'tagline' => 'Building IT leaders', 'description' => 'Bootcamps and talks.', 'adviser' => 'Engr. Paolo Dizon',
            'email' => 'jpcs.tip@school.edu.ph', 'courses' => ['BSIT'],
        ];
    }

    public function test_rejecting_hours_or_a_tutoring_request_needs_a_reason_the_member_sees(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $member = $this->person($org);
        $log = $this->inOrg($org, fn () => VolunteerHour::create(['user_id' => $member->id, 'activity' => 'Booth', 'date' => now()->toDateString(), 'hours' => 2, 'status' => 'Pending']));

        $this->actingIn($officer, $org)->patchJson("/api/hours/{$log->id}", ['status' => 'Rejected'])->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->actingIn($officer, $org)->patchJson("/api/hours/{$log->id}", ['status' => 'Rejected', 'reason' => 'No sign-in sheet'])
            ->assertOk()->assertJsonPath('rejectionReason', 'No sign-in sheet');
        $this->assertDatabaseHas('user_notifications', ['user_id' => $member->id, 'message' => 'Your 2 hrs for Booth were rejected. Reason: No sign-in sheet']);

        $session = $this->inOrg($org, fn () => TutoringSession::create(['tutor_id' => $officer->id, 'subject' => 'SQL', 'area' => 'Databases', 'schedule' => 'Mondays, 3:00 PM', 'location' => 'Room 302', 'slots' => 2]));
        $request = $this->inOrg($org, fn () => TutoringRequest::create(['tutoring_session_id' => $session->id, 'user_id' => $member->id, 'status' => 'Pending']));
        $this->actingIn($officer, $org)->patchJson("/api/tutoring-requests/{$request->id}", ['status' => 'Rejected'])->assertStatus(422);
        $this->actingIn($officer, $org)->patchJson("/api/tutoring-requests/{$request->id}", ['status' => 'Rejected', 'reason' => 'Full this week'])
            ->assertOk()->assertJsonPath('rejectionReason', 'Full this week');
    }

    public function test_the_admin_messages_and_emails_the_requester(): void
    {
        Mail::fake();
        $student = $this->person($this->compSoc());
        $this->actingIn($student, $this->compSoc())->postJson('/api/org-requests', $this->orgForm())->assertCreated();
        $jpcs = Organization::where('short_name', 'JPCS')->firstOrFail();

        $this->actingIn($this->admin(), $this->compSoc())->patchJson("/api/admin/org-requests/{$jpcs->id}", ['decision' => 'Approved', 'note' => 'Welcome aboard!'])->assertOk();
        Mail::assertSent(OrgRequestDecided::class, fn ($mail) => $mail->hasTo($student->email) && $mail->approved && $mail->note === 'Welcome aboard!');
        $this->assertDatabaseHas('user_notifications', ['user_id' => $student->id, 'message' => "JPCS is live on OrgConnect. You're its President: add your officers next. Message from the admin: Welcome aboard!"]);
    }

    public function test_suspending_needs_a_reason_and_the_admin_can_view_an_org(): void
    {
        $org = $this->compSoc();
        $this->person($org, 'officer', 'Active', ['name' => 'Maria Santos']);
        $this->person($org);
        $admin = $this->admin();

        $this->actingIn($admin, $org)->patchJson("/api/admin/organizations/{$org->id}", ['status' => 'Suspended'])->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->actingIn($admin, $org)->getJson("/api/admin/organizations/{$org->id}")->assertOk()
            ->assertJsonPath('officers.0.name', 'Maria Santos')->assertJsonPath('officers.0.position', 'President')
            ->assertJsonPath('counts.members', 2)->assertJsonPath('color.label', 'Navy (default)');
        $this->actingIn($admin, $org)->patchJson("/api/admin/organizations/{$org->id}", ['status' => 'Suspended', 'reason' => 'No adviser this term'])->assertOk();
        $this->actingIn($admin, $org)->getJson("/api/admin/organizations/{$org->id}")->assertJsonPath('suspensionReason', 'No adviser this term');
    }

    public function test_a_new_org_picks_a_color_no_other_org_has(): void
    {
        $student = $this->person($this->compSoc());
        $other = $this->person($this->compSoc());

        $options = collect($this->actingIn($student, $this->compSoc())->getJson('/api/org-themes')->assertOk()->json());
        $this->assertSame(['royal', 'indigo', 'sky', 'steel', 'midnight'], $options->pluck('key')->all());

        $this->actingIn($student, $this->compSoc())->postJson('/api/org-requests', $this->orgForm(['themeKey' => 'royal']))->assertCreated();
        $this->assertSame('#2448b8', Organization::where('short_name', 'JPCS')->first()->theme['navy']);

        // Taken now
        $this->assertTrue(collect($this->actingIn($other, $this->compSoc())->getJson('/api/org-themes')->json())->firstWhere('key', 'royal')['taken']);
        $this->actingIn($other, $this->compSoc())->postJson('/api/org-requests', $this->orgForm(['name' => 'Another Org', 'shortName' => 'AO', 'themeKey' => 'royal']))
            ->assertStatus(422)->assertJsonValidationErrors('themeKey');
    }

    public function test_the_president_asks_for_a_new_color_and_the_admin_approves_it(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');

        $change = $this->actingIn($president, $org)->postJson('/api/organization/change-requests', ['themeKey' => 'indigo', 'reason' => 'New branding'])
            ->assertCreated()->assertJsonPath('changes.0.field', 'color')->assertJsonPath('changes.0.to.label', 'Indigo')->json('id');
        $this->actingIn($this->admin(), $org)->patchJson("/api/admin/change-requests/{$change}", ['decision' => 'Approved'])->assertOk();
        $this->assertSame('indigo', $org->fresh()->theme['key']);
    }

    public function test_admin_announcements_reach_the_chosen_audience_and_each_org_has_its_own_thread(): void
    {
        $compsoc = $this->compSoc();
        $dss = $this->secondOrg();
        $president = $this->person($compsoc, 'officer');
        $treasurer = $this->person($compsoc, 'officer', 'Active', [], 'Treasurer');
        $member = $this->person($compsoc);
        $dssPresident = $this->person($dss, 'officer');
        $admin = $this->admin();

        // Officers of CompSoc only
        $id = $this->actingIn($admin, $compsoc)->postJson('/api/admin/announcements', [
            'title' => 'Org renewal', 'content' => 'Submit your documents.', 'audience' => 'officers', 'organizationIds' => [$compsoc->id],
        ])->assertCreated()->assertJsonPath('recipients', 2)->json('id');
        $this->assertDatabaseHas('user_notifications', ['user_id' => $treasurer->id, 'message' => 'OrgConnect announcement: Org renewal', 'organization_id' => null]);

        $this->actingIn($president, $compsoc)->getJson('/api/platform-announcements')->assertJsonPath('0.title', 'Org renewal')->assertJsonPath('0.canReply', true);
        $this->actingIn($treasurer, $compsoc)->getJson('/api/platform-announcements')->assertJsonPath('0.canReply', false);
        $this->actingIn($member, $compsoc)->getJson('/api/platform-announcements')->assertJsonCount(0);
        $this->actingIn($dssPresident, $dss)->getJson('/api/platform-announcements')->assertJsonCount(0);

        // The President replies; the treasurer can read but not write; the admin answers
        $this->actingIn($president, $compsoc)->postJson("/api/platform-announcements/{$id}/replies", ['text' => 'Sending them Friday.'])->assertCreated();
        $this->actingIn($treasurer, $compsoc)->postJson("/api/platform-announcements/{$id}/replies", ['text' => 'Me too'])->assertForbidden();
        $this->actingIn($treasurer, $compsoc)->getJson("/api/platform-announcements/{$id}/replies")->assertJsonCount(1);
        $this->actingIn($admin, $compsoc)->postJson("/api/admin/announcements/{$id}/replies", ['organizationId' => $compsoc->id, 'text' => 'Thanks!'])->assertCreated();
        $this->actingIn($admin, $compsoc)->getJson("/api/admin/announcements/{$id}/replies?org={$compsoc->id}")->assertJsonCount(2)->assertJsonPath('1.isAdmin', true);
        $this->actingIn($admin, $compsoc)->getJson('/api/admin/announcements')->assertJsonPath('0.threads.0.shortName', $compsoc->short_name);

        // Members see member-wide announcements, but never the replies
        $all = $this->actingIn($admin, $compsoc)->postJson('/api/admin/announcements', ['title' => 'Maintenance', 'content' => 'Down Sunday.', 'audience' => 'members'])->json('id');
        $this->actingIn($member, $compsoc)->getJson('/api/platform-announcements')->assertJsonPath('0.id', $all)->assertJsonPath('0.seeReplies', false);
        $this->actingIn($member, $compsoc)->getJson("/api/platform-announcements/{$all}/replies")->assertForbidden();
        $this->actingIn($dssPresident, $dss)->getJson('/api/platform-announcements')->assertJsonPath('0.id', $all);
    }
}
