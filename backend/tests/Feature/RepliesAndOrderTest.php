<?php

namespace Tests\Feature;

use App\Models\Announcement;
use Tests\TestCase;

// Batch 18: People order (friends, then requests, then everyone), replies to comments, and hours in minutes
class RepliesAndOrderTest extends TestCase
{
    public function test_people_lists_friends_first_then_requests_then_everyone_else(): void
    {
        $org = $this->compSoc();
        $me = $this->person($org, 'member', 'Active', ['name' => 'Me Myself']);
        $president = $this->person($org, 'officer', 'Active', ['name' => 'Ava President']);
        $oldFriend = $this->person($org, 'member', 'Active', ['name' => 'Old Friend']);
        $newFriend = $this->person($org, 'member', 'Active', ['name' => 'New Friend']);
        $asker = $this->person($org, 'member', 'Active', ['name' => 'Asking Me']);
        $asked = $this->person($org, 'member', 'Active', ['name' => 'Asked By Me']);

        $this->actingIn($me, $org)->postJson("/api/friends/{$oldFriend->id}");
        $this->actingIn($oldFriend, $org)->patchJson("/api/friends/{$me->id}");
        $this->travel(1)->minutes();
        $this->actingIn($newFriend, $org)->postJson("/api/friends/{$me->id}");
        $this->actingIn($me, $org)->patchJson("/api/friends/{$newFriend->id}");
        $this->actingIn($asker, $org)->postJson("/api/friends/{$me->id}");
        $this->actingIn($me, $org)->postJson("/api/friends/{$asked->id}");

        $names = collect($this->actingIn($me, $org)->getJson('/api/people')->json())->pluck('name')->all();
        // The one you just accepted is the first friend
        $this->assertSame(['New Friend', 'Old Friend', 'Asking Me', 'Asked By Me', 'Ava President', 'Me Myself'], $names);
        $this->actingIn($me, $org)->getJson('/api/friends')->assertJsonPath('friends.0.name', 'New Friend');
    }

    public function test_officers_reply_to_comments_and_the_commenter_is_notified(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer', 'Active', ['name' => 'Maria Santos']);
        $member = $this->person($org, 'member', 'Active', ['name' => 'Juan']);
        $post = $this->inOrg($org, fn () => Announcement::create(['user_id' => $officer->id, 'title' => 'Room change', 'content' => 'Room 302', 'category' => 'General']));

        $comment = $this->actingIn($member, $org)->postJson("/api/announcements/{$post->id}/comments", ['text' => 'Which floor?'])->assertCreated()->json('id');
        $reply = $this->actingIn($officer, $org)->postJson("/api/announcements/{$post->id}/comments", ['text' => 'Third floor', 'parentId' => $comment])
            ->assertCreated()->assertJsonPath('parentId', $comment)->json('id');
        $this->assertDatabaseHas('user_notifications', ['user_id' => $member->id, 'message' => 'Maria Santos replied to your comment on Room change']);

        // A reply to a reply stays under the same top-level comment
        $this->actingIn($member, $org)->postJson("/api/announcements/{$post->id}/comments", ['text' => 'Thanks!', 'parentId' => $reply])
            ->assertCreated()->assertJsonPath('parentId', $comment);

        // Officers see every comment; deleting a comment removes its replies
        $this->actingIn($officer, $org)->getJson("/api/announcements/{$post->id}/comments")->assertJsonCount(3);
        $this->actingIn($officer, $org)->deleteJson("/api/announcements/{$post->id}/comments/{$comment}")->assertOk();
        $this->actingIn($officer, $org)->getJson("/api/announcements/{$post->id}/comments")->assertJsonCount(0);
    }

    public function test_hours_can_be_logged_in_minutes(): void
    {
        $org = $this->compSoc();
        $member = $this->person($org);
        $log = ['activity' => 'Booth', 'date' => now()->toDateString()];

        $this->actingIn($member, $org)->postJson('/api/hours', $log + ['hours' => 0.25])->assertCreated()->assertJsonPath('hours', 0.25);   // 15 minutes
        $this->actingIn($member, $org)->postJson('/api/hours', $log + ['hours' => 1.75])->assertCreated();                                   // 1 hr 45 min
        $this->actingIn($member, $org)->postJson('/api/hours', $log + ['hours' => 0.01])->assertStatus(422)->assertJsonValidationErrors('hours');
    }
}
