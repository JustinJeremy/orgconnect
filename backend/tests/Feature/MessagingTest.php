<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Models\UserNotification;
use Tests\TestCase;

// Batch 20: messages between friends, an org's officers and the admin, and a requester and the admin
class MessagingTest extends TestCase
{
    private function admin(): User
    {
        $admin = User::factory()->create(['student_id' => 'ADMIN-'.fake()->unique()->numerify('###'), 'course' => 'Staff', 'year_level' => 'Staff']);
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    private function befriend(User $a, User $b, Organization $org): void
    {
        $this->actingIn($a, $org)->postJson("/api/friends/{$b->id}");
        $this->actingIn($b, $org)->patchJson("/api/friends/{$a->id}");
    }

    public function test_members_of_the_same_org_message_each_other_inside_it(): void
    {
        $org = $this->compSoc();
        $juan = $this->person($org, 'member', 'Active', ['name' => 'Juan']);
        $isa = $this->person($org, 'member', 'Active', ['name' => 'Isabel']);
        $elsewhere = $this->person($this->secondOrg(), 'member', 'Active', ['name' => 'Other Org']);

        // Not friends: still fine inside the org
        $id = $this->actingIn($juan, $org)->postJson("/api/conversations/direct/{$isa->id}")->assertOk()->assertJsonPath('title', 'Isabel')->json('id');
        $this->actingIn($juan, $org)->postJson("/api/conversations/{$id}/messages", ['body' => 'Hi! Study group later?'])->assertCreated()->assertJsonPath('mine', true);
        $this->actingIn($juan, $org)->postJson("/api/conversations/{$id}/messages", ['body' => 'Library at 3?'])->assertCreated();
        // One notification for the unread stretch, not one per message, shown in the org
        $this->assertDatabaseHas('user_notifications', ['user_id' => $isa->id, 'message' => 'New message from Juan', 'link' => "messages/{$id}", 'organization_id' => $org->id]);
        $this->assertSame(1, UserNotification::withoutGlobalScopes()->where('user_id', $isa->id)->count());

        $this->actingIn($isa, $org)->getJson('/api/messages/unread')->assertJsonPath('count', 2);
        $this->actingIn($isa, $org)->getJson('/api/conversations')->assertJsonPath('0.title', 'Juan')->assertJsonPath('0.unread', 2);
        $this->actingIn($isa, $org)->getJson("/api/conversations/{$id}/messages")->assertOk()->assertJsonCount(2, 'messages');
        $this->actingIn($isa, $org)->getJson('/api/messages/unread')->assertJsonPath('count', 0);

        // Someone in another org can't be messaged from here, and the chat doesn't show in another org
        $this->actingIn($juan, $org)->postJson("/api/conversations/direct/{$elsewhere->id}")->assertForbidden();
        $this->actingIn($elsewhere, $org)->getJson("/api/conversations/{$id}/messages")->assertNotFound();
        $isa->memberships()->create(['organization_id' => $this->secondOrg()->id, 'role' => 'member', 'position' => 'Member', 'status' => 'Active']);
        $this->actingIn($isa, $this->secondOrg())->getJson('/api/conversations')->assertJsonCount(0);
    }

    public function test_new_message_suggests_friends_you_have_not_talked_to_first(): void
    {
        $org = $this->compSoc();
        $me = $this->person($org, 'member', 'Active', ['name' => 'Me']);
        $talked = $this->person($org, 'member', 'Active', ['name' => 'Friend Talked']);
        $quiet = $this->person($org, 'member', 'Active', ['name' => 'Friend Quiet']);
        $this->person($org, 'officer', 'Active', ['name' => 'Ava President']);
        $this->befriend($me, $talked, $org);
        $this->befriend($me, $quiet, $org);
        $c = $this->actingIn($me, $org)->postJson("/api/conversations/direct/{$talked->id}")->json('id');
        $this->actingIn($me, $org)->postJson("/api/conversations/{$c}/messages", ['body' => 'Hey']);

        $names = collect($this->actingIn($me, $org)->getJson('/api/messages/contacts')->json())->pluck('name')->all();
        $this->assertSame(['Friend Quiet', 'Friend Talked', 'Ava President'], $names);
        $this->actingIn($me, $org)->getJson('/api/messages/contacts?search=ava')->assertJsonCount(1)->assertJsonPath('0.friend', false);
    }

    public function test_org_officers_and_the_admin_talk_and_only_managers_write(): void
    {
        $org = $this->compSoc();
        $president = $this->person($org, 'officer');
        $treasurer = $this->person($org, 'officer', 'Active', [], 'Treasurer');
        $member = $this->person($org);
        $admin = $this->admin();

        $id = $this->actingIn($president, $org)->postJson("/api/conversations/org/{$org->id}")->assertOk()->assertJsonPath('title', 'OrgConnect admin')->json('id');
        $this->actingIn($member, $org)->postJson("/api/conversations/org/{$org->id}")->assertForbidden();
        $this->actingIn($president, $org)->postJson("/api/conversations/{$id}/messages", ['body' => 'Can we get an extension?'])->assertCreated();
        $this->actingIn($treasurer, $org)->postJson("/api/conversations/{$id}/messages", ['body' => 'Me too'])->assertForbidden();
        $this->actingIn($treasurer, $org)->getJson("/api/conversations/{$id}/messages")->assertOk()->assertJsonCount(1, 'messages');
        $this->actingIn($member, $org)->getJson("/api/conversations/{$id}/messages")->assertNotFound();

        $this->actingIn($admin, $org)->getJson('/api/conversations')->assertJsonPath('0.title', $org->name)->assertJsonPath('0.unread', 1);
        $this->actingIn($admin, $org)->postJson("/api/conversations/{$id}/messages", ['body' => 'Yes, until Friday.'])->assertCreated()->assertJsonPath('userName', 'OrgConnect admin');
        $this->assertDatabaseHas('user_notifications', ['user_id' => $treasurer->id, 'message' => "New message from the OrgConnect admin ({$org->short_name} officers)"]);
    }

    public function test_the_admin_asks_for_changes_and_the_requester_edits_the_request(): void
    {
        $student = $this->person($this->compSoc());
        $form = [
            'name' => 'Junior Philippine Computer Society – TIP', 'shortName' => 'JPCS', 'college' => 'College of Computer Studies',
            'tagline' => 'Building IT leaders', 'description' => 'Bootcamps and talks.', 'adviser' => 'Engr. Paolo Dizon',
            'email' => 'jpcs.tip@school.edu.ph', 'courses' => ['BSIT'],
        ];
        $jpcs = $this->actingIn($student, $this->compSoc())->postJson('/api/org-requests', $form)->json('id');
        $admin = $this->admin();

        $this->actingIn($admin, $this->compSoc())->postJson("/api/admin/org-requests/{$jpcs}/ask-changes", ['message' => 'Please attach the OSA letter.'])
            ->assertOk()->assertJsonPath('changesRequested', true)->assertJsonPath('status', 'Pending');
        $this->assertDatabaseHas('user_notifications', ['user_id' => $student->id, 'message' => 'The OrgConnect admin asked for changes to your JPCS request']);

        // The requester reads the admin's message, answers, and edits the request
        $id = $this->actingIn($student, $this->compSoc())->postJson("/api/conversations/request/{$jpcs}")->json('id');
        $this->actingIn($student, $this->compSoc())->getJson("/api/conversations/{$id}/messages")->assertJsonPath('messages.0.body', 'Please attach the OSA letter.');
        $this->actingIn($student, $this->compSoc())->postJson("/api/conversations/{$id}/messages", ['body' => 'Added the link!'])->assertCreated();
        $this->actingIn($student, $this->compSoc())->putJson("/api/org-requests/{$jpcs}", ['proofUrl' => 'https://drive.google.com/osa'] + $form)
            ->assertOk()->assertJsonPath('changesRequested', false)->assertJsonPath('proofUrl', 'https://drive.google.com/osa');

        // Someone else can't see or edit it
        $other = $this->person($this->compSoc());
        $this->actingIn($other, $this->compSoc())->getJson("/api/conversations/{$id}/messages")->assertNotFound();
        $this->actingIn($other, $this->compSoc())->putJson("/api/org-requests/{$jpcs}", $form)->assertNotFound();
    }
}
