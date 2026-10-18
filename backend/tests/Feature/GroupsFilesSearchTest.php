<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Event;
use App\Models\UserNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

// Batch 23: group chats, photos and files in messages and announcements, and search everything
class GroupsFilesSearchTest extends TestCase
{
    // A real 1x1 PNG (the fake image helper needs the GD extension)
    private function png(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='));
    }

    public function test_members_make_a_group_add_people_and_leave(): void
    {
        $org = $this->compSoc();
        $maria = $this->person($org, 'officer', 'Active', ['name' => 'Maria']);
        $juan = $this->person($org, 'member', 'Active', ['name' => 'Juan']);
        $leo = $this->person($org, 'member', 'Active', ['name' => 'Leo']);
        $ana = $this->person($org, 'member', 'Active', ['name' => 'Ana']);
        $outsider = $this->person($this->secondOrg(), 'member', 'Active', ['name' => 'Outsider']);

        // A member (not only officers) starts it; people from another org are left out
        $id = $this->actingIn($juan, $org)->postJson('/api/groups', ['name' => 'Hackathon team', 'memberIds' => [$maria->id, $outsider->id]])
            ->assertCreated()->assertJsonPath('kind', 'group')->assertJsonPath('title', 'Hackathon team')->assertJsonPath('subtitle', '2 members')->json('id');
        $this->assertDatabaseHas('user_notifications', ['user_id' => $maria->id, 'message' => 'Juan added you to the group Hackathon team', 'link' => "messages/{$id}"]);
        $this->assertSame(0, UserNotification::withoutGlobalScopes()->where('user_id', $outsider->id)->count());

        // Anyone in the group adds more people from the org
        $this->actingIn($maria, $org)->postJson("/api/groups/{$id}/members", ['memberIds' => [$leo->id, $ana->id]])->assertOk()->assertJsonPath('subtitle', '4 members');
        $this->actingIn($leo, $org)->getJson("/api/groups/{$id}/members")->assertOk()->assertJsonCount(4);
        $this->actingIn($leo, $org)->getJson("/api/conversations/{$id}/messages")->assertOk()
            ->assertJsonPath('messages.1.body', 'Maria added Leo and Ana')->assertJsonPath('messages.1.notice', true);

        // Messages reach everyone in it, once per unread stretch, and show who has seen them
        $this->actingIn($leo, $org)->postJson("/api/conversations/{$id}/messages", ['body' => 'Meeting at 3?'])->assertCreated();
        $this->assertDatabaseHas('user_notifications', ['user_id' => $ana->id, 'message' => 'New message from Leo in Hackathon team']);
        $this->actingIn($ana, $org)->getJson('/api/messages/unread')->assertJsonPath('count', 1);   // notices don't count
        $this->actingIn($ana, $org)->getJson("/api/conversations/{$id}/messages");
        $this->actingIn($leo, $org)->getJson("/api/conversations/{$id}/status")->assertJsonFragment(['name' => 'Ana']);

        // Rename, then leave: they can't read it anymore; the last one out deletes it
        $this->actingIn($ana, $org)->putJson("/api/groups/{$id}", ['name' => 'Team Byte'])->assertJsonPath('title', 'Team Byte');
        $this->actingIn($ana, $org)->deleteJson("/api/groups/{$id}/members/me")->assertOk();
        $this->actingIn($ana, $org)->getJson("/api/conversations/{$id}/messages")->assertNotFound();
        $this->actingIn($ana, $org)->getJson('/api/conversations')->assertJsonMissing(['title' => 'Team Byte']);
        $this->actingIn($outsider, $this->secondOrg())->getJson("/api/groups/{$id}/members")->assertNotFound();
        foreach ([$juan, $maria, $leo] as $who) {
            $this->actingIn($who, $org)->deleteJson("/api/groups/{$id}/members/me")->assertOk();
        }
        $this->assertDatabaseMissing('conversations', ['id' => $id]);
    }

    public function test_photos_and_files_in_messages_have_signed_links(): void
    {
        Storage::fake('public');
        $org = $this->compSoc();
        $juan = $this->person($org, 'member', 'Active', ['name' => 'Juan']);
        $isa = $this->person($org, 'member', 'Active', ['name' => 'Isa']);
        $id = $this->actingIn($juan, $org)->postJson("/api/conversations/direct/{$isa->id}")->json('id');

        // A photo on its own, then a file with text
        $photo = $this->actingIn($juan, $org)->post("/api/conversations/{$id}/messages", ['file' => $this->png('booth.png')])
            ->assertCreated()->assertJsonPath('attachment.type', 'image')->assertJsonPath('attachment.name', 'booth.png')->json('attachment.url');
        $this->actingIn($juan, $org)->post("/api/conversations/{$id}/messages", ['body' => 'The minutes', 'file' => UploadedFile::fake()->create('minutes.pdf', 120, 'application/pdf')])
            ->assertCreated()->assertJsonPath('attachment.type', 'file')->assertJsonPath('body', 'The minutes');
        $this->actingIn($isa, $org)->getJson('/api/conversations')->assertJsonPath('0.lastMessage.body', 'The minutes');

        // The signed link works without signing in; a tampered one doesn't
        $path = parse_url($photo, PHP_URL_PATH).'?'.parse_url($photo, PHP_URL_QUERY);
        $this->get($path)->assertOk();
        $this->get(preg_replace('/signature=\w/', 'signature=0', $path))->assertForbidden();

        // Not allowed: scripts, and empty messages
        $this->actingIn($juan, $org)->post("/api/conversations/{$id}/messages", ['file' => UploadedFile::fake()->create('page.html', 1, 'text/html')], ['Accept' => 'application/json'])->assertStatus(422);
        $this->actingIn($juan, $org)->postJson("/api/conversations/{$id}/messages", ['body' => ''])->assertStatus(422);
    }

    public function test_officers_attach_a_photo_or_file_to_an_announcement(): void
    {
        Storage::fake('public');
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $member = $this->person($org);
        $post = $this->inOrg($org, fn () => Announcement::create(['user_id' => $officer->id, 'title' => 'Org Day', 'category' => 'Event', 'content' => 'See the map.']));

        $this->actingIn($member, $org)->post("/api/announcements/{$post->id}/attachment", ['file' => $this->png('map.png')], ['Accept' => 'application/json'])->assertForbidden();
        $this->actingIn($officer, $org)->post("/api/announcements/{$post->id}/attachment", ['file' => $this->png('map.png')], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('attachment.type', 'image');
        $this->actingIn($member, $org)->getJson('/api/announcements')->assertJsonPath('0.attachment.name', 'map.png');
        $this->actingIn($officer, $org)->deleteJson("/api/announcements/{$post->id}/attachment")->assertOk()->assertJsonPath('attachment', null);
    }

    public function test_search_finds_people_events_sessions_announcements_and_chats_in_this_org_only(): void
    {
        $org = $this->compSoc();
        $me = $this->person($org, 'officer', 'Active', ['name' => 'Maria Santos']);
        $this->person($org, 'member', 'Active', ['name' => 'Hacker Juan']);
        $this->person($this->secondOrg(), 'member', 'Active', ['name' => 'Hacker Elsewhere']);
        $this->inOrg($org, fn () => Event::create(['title' => 'CCS Hackathon', 'category' => 'Competition', 'date' => now()->addWeek()->toDateString(), 'time' => '09:00',
            'location' => 'Gym', 'mode' => 'F2F', 'capacity' => 50, 'description' => 'x', 'status' => 'upcoming', 'created_by' => $me->id]));
        $this->inOrg($org, fn () => Announcement::create(['user_id' => $me->id, 'title' => 'Hackathon teams', 'category' => 'Deadline', 'content' => 'Register now']));
        $this->actingIn($me, $org)->postJson('/api/groups', ['name' => 'Hackathon committee', 'memberIds' => [$this->person($org)->id]]);

        $result = $this->actingIn($me, $org)->getJson('/api/search?q=hack')->assertOk();
        $result->assertJsonCount(1, 'people')->assertJsonPath('people.0.name', 'Hacker Juan')
            ->assertJsonPath('events.0.title', 'CCS Hackathon')
            ->assertJsonPath('announcements.0.title', 'Hackathon teams')
            ->assertJsonPath('chats.0.title', 'Hackathon committee');
        $this->actingIn($me, $org)->getJson('/api/search?q=h')->assertStatus(422);
    }

    public function test_people_edit_and_delete_their_own_messages(): void
    {
        Storage::fake('public');
        $org = $this->compSoc();
        $juan = $this->person($org, 'member', 'Active', ['name' => 'Juan']);
        $isa = $this->person($org, 'member', 'Active', ['name' => 'Isa']);
        $id = $this->actingIn($juan, $org)->postJson("/api/conversations/direct/{$isa->id}")->json('id');
        $mine = $this->actingIn($juan, $org)->postJson("/api/conversations/{$id}/messages", ['body' => 'Meet at 3?'])->json('id');
        $theirs = $this->actingIn($isa, $org)->postJson("/api/conversations/{$id}/messages", ['body' => 'Sure'])->json('id');
        $before = $this->actingIn($isa, $org)->getJson("/api/conversations/{$id}/status")->json('changedAt');

        // Edit: shows "edited", and the other side's open chat sees a change
        $this->travel(2)->seconds();
        $this->actingIn($juan, $org)->patchJson("/api/conversations/{$id}/messages/{$mine}", ['body' => 'Meet at 4?'])
            ->assertOk()->assertJsonPath('body', 'Meet at 4?')->assertJsonPath('edited', true);
        $this->assertNotSame($before, $this->actingIn($isa, $org)->getJson("/api/conversations/{$id}/status")->json('changedAt'));

        // Only your own
        $this->actingIn($juan, $org)->patchJson("/api/conversations/{$id}/messages/{$theirs}", ['body' => 'Hacked'])->assertForbidden();
        $this->actingIn($juan, $org)->deleteJson("/api/conversations/{$id}/messages/{$theirs}")->assertForbidden();

        // Delete: stays in place as deleted, with its file gone
        $photo = $this->actingIn($juan, $org)->post("/api/conversations/{$id}/messages", ['file' => $this->png('a.png')])->json('id');
        $this->actingIn($juan, $org)->deleteJson("/api/conversations/{$id}/messages/{$photo}")
            ->assertOk()->assertJsonPath('deleted', true)->assertJsonPath('attachment', null)->assertJsonPath('body', null);
        $this->assertCount(0, Storage::disk('public')->allFiles('message-files'));
        $this->actingIn($isa, $org)->getJson('/api/conversations')->assertJsonPath('0.lastMessage.body', 'Message deleted');
        $this->actingIn($juan, $org)->patchJson("/api/conversations/{$id}/messages/{$photo}", ['body' => 'x'])->assertStatus(422);

        // Another conversation's message can't be reached through this one
        $other = $this->actingIn($isa, $org)->postJson("/api/conversations/direct/{$this->person($org)->id}")->json('id');
        $elsewhere = $this->actingIn($isa, $org)->postJson("/api/conversations/{$other}/messages", ['body' => 'hi'])->json('id');
        $this->actingIn($isa, $org)->deleteJson("/api/conversations/{$id}/messages/{$elsewhere}")->assertNotFound();
    }

    public function test_files_too_large_for_the_server_get_a_clear_message(): void
    {
        $org = $this->compSoc();
        $juan = $this->person($org);
        $id = $this->actingIn($juan, $org)->postJson("/api/conversations/direct/{$this->person($org)->id}")->json('id');

        // PHP dropped the file (over upload_max_filesize)
        $tmp = tempnam(sys_get_temp_dir(), 'big');
        $dropped = new UploadedFile($tmp, 'big.pdf', 'application/pdf', UPLOAD_ERR_INI_SIZE, true);
        $this->actingIn($juan, $org)->post("/api/conversations/{$id}/messages", ['file' => $dropped], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('errors.file.0', 'That file is too large to upload. Files can be up to 10 MB.');

        // Same for an event poster (it would otherwise say the poster is required)
        $officer = $this->person($org, 'officer');
        $event = $this->inOrg($org, fn () => Event::create(['title' => 'Poster test', 'category' => 'Seminar', 'date' => now()->addWeek()->toDateString(), 'time' => '09:00',
            'location' => 'Hall', 'mode' => 'F2F', 'capacity' => 10, 'description' => 'x', 'status' => 'upcoming', 'created_by' => $officer->id]));
        $poster = new UploadedFile(tempnam(sys_get_temp_dir(), 'big'), 'poster.jpg', 'image/jpeg', UPLOAD_ERR_INI_SIZE, true);
        $this->actingIn($officer, $org)->post("/api/events/{$event->id}/poster", ['poster' => $poster], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('errors.poster.0', 'That file is too large to upload. Posters can be up to 5 MB.');

        // The whole request is over post_max_size
        $this->actingIn($juan, $org)->call('POST', "/api/conversations/{$id}/messages", [], [], [], ['CONTENT_LENGTH' => 64 * 1024 * 1024, 'HTTP_ACCEPT' => 'application/json'])
            ->assertStatus(413)->assertJsonPath('message', 'That file is too large to upload.');
    }
}
