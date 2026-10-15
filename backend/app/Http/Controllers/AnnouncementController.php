<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ListsOrPages;
use App\Http\Controllers\Concerns\OfficerOnly;
use App\Http\Requests\AnnouncementRequest;
use App\Models\Announcement;
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
        $query = Announcement::with(['author.membership', 'readers'])
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
            'announcements'
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
    public function markAllRead(Request $request)
    {
        $user = $request->user();

        Announcement::whereDoesntHave('readers', fn ($q) => $q->where('users.id', $user->id))
            ->get()
            ->each(fn ($a) => $a->readers()->attach($user->id));

        return ['ok' => true];
    }
}
