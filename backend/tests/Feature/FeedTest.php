<?php

namespace Tests\Feature;

use App\Models\Announcement;
use Tests\TestCase;

// Likes and comments on announcements (the dashboard feed)
class FeedTest extends TestCase
{
    private function postIn($org, $author): Announcement
    {
        return $this->inOrg($org, fn () => Announcement::create([
            'user_id' => $author->id, 'title' => 'General assembly', 'category' => 'General', 'content' => 'Friday 4 PM', 'pinned' => false,
        ]));
    }

    public function test_members_like_and_unlike_a_post(): void
    {
        $org = $this->compSoc();
        $post = $this->postIn($org, $this->person($org, 'officer'));
        [$a, $b] = [$this->person($org), $this->person($org)];

        $this->actingIn($a, $org)->postJson("/api/announcements/{$post->id}/like")->assertOk()->assertJson(['likes' => 1, 'likedByMe' => true]);
        $this->actingIn($a, $org)->postJson("/api/announcements/{$post->id}/like")->assertJson(['likes' => 1]);   // liking twice counts once
        $this->actingIn($b, $org)->postJson("/api/announcements/{$post->id}/like")->assertJson(['likes' => 2]);

        $this->actingIn($a, $org)->getJson('/api/announcements')
            ->assertJsonPath('0.likes', 2)
            ->assertJsonPath('0.likedByMe', true);

        $this->actingIn($a, $org)->deleteJson("/api/announcements/{$post->id}/like")->assertJson(['likes' => 1, 'likedByMe' => false]);
    }

    public function test_members_comment_and_the_author_is_notified(): void
    {
        $org = $this->compSoc();
        $author = $this->person($org, 'officer');
        $post = $this->postIn($org, $author);
        $member = $this->person($org, 'member', 'Active', ['name' => 'Juan Dela Cruz']);

        $this->actingIn($member, $org)->postJson("/api/announcements/{$post->id}/comments", ['text' => '  See you there!  '])
            ->assertCreated()
            ->assertJsonPath('text', 'See you there!')
            ->assertJsonPath('userName', 'Juan Dela Cruz');

        $this->actingIn($author, $org)->getJson("/api/announcements/{$post->id}/comments")->assertOk()->assertJsonCount(1);
        $this->actingIn($author, $org)->getJson('/api/announcements')->assertJsonPath('0.commentCount', 1);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $author->id, 'message' => 'Juan Dela Cruz commented on General assembly']);
    }

    public function test_empty_or_very_long_comments_are_refused(): void
    {
        $org = $this->compSoc();
        $post = $this->postIn($org, $this->person($org, 'officer'));
        $member = $this->person($org);

        $this->actingIn($member, $org)->postJson("/api/announcements/{$post->id}/comments", ['text' => ''])->assertStatus(422);
        $this->actingIn($member, $org)->postJson("/api/announcements/{$post->id}/comments", ['text' => str_repeat('a', 1001)])->assertStatus(422);
    }

    public function test_another_orgs_posts_cannot_be_liked_or_read(): void
    {
        $dss = $this->secondOrg();
        $post = $this->postIn($dss, $this->person($dss, 'officer'));
        $compSocMember = $this->person($this->compSoc());

        $this->actingIn($compSocMember, $this->compSoc())->postJson("/api/announcements/{$post->id}/like")->assertNotFound();
        $this->actingIn($compSocMember, $this->compSoc())->getJson("/api/announcements/{$post->id}/comments")->assertNotFound();
    }
}
