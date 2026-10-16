<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ListsOrPages;
use App\Http\Controllers\Concerns\OfficerOnly;
use App\Http\Requests\AnnouncementRequest;
use App\Models\Announcement;
use App\Models\AnnouncementComment;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    use ListsOrPages, OfficerOnly;

    // GET /api/announcements  (pinned first, newest first)
    public function index(Request $request)
    {
        $user = $request->user();

        // List filters: ?view=unread &category= &search= (+ ?page)
        $query = Announcement::with(['author.membership', 'readers', 'likers'])
            ->withCount('comments')
            ->when($request->input('view') === 'unread', fn ($q) => $q
                ->where('user_id', '!=', $user->id)
                ->whereDoesntHave('readers', fn ($r) => $r->where('users.id', $user->id)))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->input('category')))
            ->orderByDesc('pinned')
            ->latest()
            ->latest('id');
        $this->search($request, $query, ['title', 'content']);

        return $this->listOrPage($request, $query, fn (Announcement $a) => $a->toFrontend($user));
    }

    // POST /api/announcements  (officers)
    public function store(AnnouncementRequest $request)
    {
        $this->officerOnly($request);

        $post = Announcement::create($request->validated() + ['user_id' => $request->user()->id]);

        UserNotification::send(
            User::where('id', '!=', $request->user()->id)->withMembershipStatus(['Active', 'Pending'])->pluck('id'),
            "New announcement: {$post->title}",
            "announcements/{$post->id}"
        );

        return response()->json($post->toFrontend($request->user()), 201);
    }

    // PUT /api/announcements/{announcement}  (officers; also used to pin / unpin)
    public function update(AnnouncementRequest $request, Announcement $announcement)
    {
        $this->officerOnly($request);

        $announcement->update($request->validated());

        return $announcement->fresh()->toFrontend($request->user());
    }

    // DELETE /api/announcements/{announcement}  (officers)
    public function destroy(Request $request, Announcement $announcement)
    {
        $this->officerOnly($request);
        $announcement->delete();

        return ['ok' => true];
    }

    // POST /api/announcements/{announcement}/read
    public function markRead(Request $request, Announcement $announcement)
    {
        $announcement->readers()->syncWithoutDetaching([$request->user()->id]);

        return $announcement->fresh()->toFrontend($request->user());
    }

    // POST /api/announcements/read-all
    // POST /api/announcements/{announcement}/like  -> { likes, likedByMe }
    public function like(Request $request, Announcement $announcement)
    {
        $announcement->likers()->syncWithoutDetaching([$request->user()->id]);

        return ['likes' => $announcement->likers()->count(), 'likedByMe' => true];
    }

    // DELETE /api/announcements/{announcement}/like  -> { likes, likedByMe }
    public function unlike(Request $request, Announcement $announcement)
    {
        $announcement->likers()->detach($request->user()->id);

        return ['likes' => $announcement->likers()->count(), 'likedByMe' => false];
    }

    // GET /api/announcements/{announcement}/comments  -> oldest first
    public function comments(Announcement $announcement)
    {
        return $announcement->comments()->with('user')->get()->map->toFrontend();
    }

    // POST /api/announcements/{announcement}/comments  { text }  -> the new comment; the author is notified
    public function addComment(Request $request, Announcement $announcement)
    {
        $data = $request->validate(['text' => 'required|string|max:1000']);
        $user = $request->user();

        $comment = $announcement->comments()->create(['user_id' => $user->id, 'text' => trim($data['text'])]);

        if ($announcement->user_id !== $user->id) {
            UserNotification::send($announcement->user_id, "{$user->name} commented on {$announcement->title}", "announcements/{$announcement->id}");
        }

        return response()->json($comment->load('user')->toFrontend(), 201);
    }

    // PUT /api/announcements/{announcement}/comments/{comment}  { text }  -> only the comment's author (as often as they like; it shows "edited")
    public function updateComment(Request $request, Announcement $announcement, AnnouncementComment $comment)
    {
        abort_unless($comment->announcement_id === $announcement->id, 404);
        abort_unless($comment->user_id === $request->user()->id, 403, 'You can only edit your own comments.');

        $data = $request->validate(['text' => 'required|string|max:1000']);
        $comment->update(['text' => trim($data['text']), 'edited_at' => now()]);

        return $comment->load('user')->toFrontend();
    }

    // DELETE /api/announcements/{announcement}/comments/{comment}  -> the comment's author, or an officer
    public function deleteComment(Request $request, Announcement $announcement, AnnouncementComment $comment)
    {
        abort_unless($comment->announcement_id === $announcement->id, 404);
        $user = $request->user();
        abort_unless($comment->user_id === $user->id || $user->isOfficer(), 403, 'You can only delete your own comments.');

        $comment->delete();

        return ['ok' => true];
    }

    public function markAllRead(Request $request)
    {
        $user = $request->user();

        Announcement::whereDoesntHave('readers', fn ($q) => $q->where('users.id', $user->id))
            ->get()
            ->each(fn ($a) => $a->readers()->attach($user->id));

        return ['ok' => true];
    }
}
