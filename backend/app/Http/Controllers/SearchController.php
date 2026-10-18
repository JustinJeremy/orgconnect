<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Conversation;
use App\Models\Event;
use App\Models\LearningResource;
use App\Models\Message;
use App\Models\TutoringSession;
use App\Models\User;
use Illuminate\Http\Request;

// Search everything in the selected org from the sidebar (or Ctrl+K): people, events, tutoring
// sessions, announcements, shared resources, and your chats and messages. Up to 5 of each, only
// what you could already see on those pages.
class SearchController extends Controller
{
    private const LIMIT = 5;

    // GET /api/search?q= -> { people, events, sessions, announcements, resources, chats }
    public function index(Request $request)
    {
        $user = $request->user();
        $q = trim((string) $request->validate(['q' => 'required|string|min:2|max:80'])['q']);
        $like = '%'.addcslashes($q, '%_\\').'%';

        return [
            'people' => User::withMembershipStatus(['Active'])->with('membership')->where('name', 'like', $like)
                ->orderBy('name')->limit(self::LIMIT)->get()
                ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name, ...$u->avatarData(), 'position' => $u->membership->position]),
            'events' => Event::where(fn ($w) => $w->where('title', 'like', $like)->orWhere('location', 'like', $like)->orWhere('category', 'like', $like)->orWhere('topics', 'like', $like))
                ->orderByRaw("status = 'completed'")->orderBy('date')->limit(self::LIMIT)->get()
                ->map(fn (Event $e) => ['id' => $e->id, 'title' => $e->title, 'date' => $e->date->format('Y-m-d'), 'time' => substr($e->time, 0, 5), 'location' => $e->location, 'completed' => $e->status === 'completed']),
            'sessions' => TutoringSession::with('tutor')->where(fn ($w) => $w->where('subject', 'like', $like)->orWhere('area', 'like', $like)->orWhere('topics', 'like', $like)
                ->orWhereHas('tutor', fn ($t) => $t->where('name', 'like', $like)))
                ->orderBy('subject')->limit(self::LIMIT)->get()
                ->map(fn (TutoringSession $s) => ['id' => $s->id, 'subject' => $s->subject, 'tutorName' => $s->tutor?->name, 'schedule' => $s->schedule]),
            'announcements' => Announcement::where(fn ($w) => $w->where('title', 'like', $like)->orWhere('content', 'like', $like))
                ->latest()->limit(self::LIMIT)->get()
                ->map(fn (Announcement $a) => ['id' => $a->id, 'title' => $a->title, 'category' => $a->category, 'createdAt' => $a->created_at->format('Y-m-d\TH:i:s')]),
            'resources' => LearningResource::where(fn ($w) => $w->where('title', 'like', $like)->orWhere('subject', 'like', $like)->orWhere('description', 'like', $like))
                ->orderBy('title')->limit(self::LIMIT)->get()
                ->map(fn (LearningResource $r) => ['id' => $r->id, 'title' => $r->title, 'subject' => $r->subject, 'type' => $r->type, 'url' => $r->url]),
            'chats' => $this->chats($user, $q, $like),
        ];
    }

    // Chats named like the search (a group, or the person you talk to), then messages that mention it
    private function chats(User $user, string $q, string $like): array
    {
        $visible = Conversation::visibleTo($user)->whereNotNull('last_message_at')->with(['organization.requester', 'userOne', 'userTwo'])->get();
        $results = $visible->map(fn (Conversation $c) => $c->toFrontend($user))
            ->filter(fn ($c) => str_contains(mb_strtolower((string) $c['title']), mb_strtolower($q)))
            ->take(self::LIMIT)
            ->map(fn ($c) => ['id' => $c['id'], 'title' => $c['title'], 'subtitle' => $c['subtitle'], 'who' => $c['who'], 'snippet' => null])
            ->values();

        $titles = $visible->mapWithKeys(fn (Conversation $c) => [$c->id => $c]);
        $messages = Message::with('user')->whereIn('conversation_id', $visible->pluck('id'))->where('notice', false)->where('body', 'like', $like)
            ->latest('id')->limit(self::LIMIT)->get()
            ->reject(fn (Message $m) => $results->contains('id', $m->conversation_id))
            ->map(function (Message $m) use ($titles, $user) {
                $chat = $titles[$m->conversation_id]->toFrontend($user);

                return ['id' => $m->conversation_id, 'title' => $chat['title'], 'subtitle' => ($m->user_id === $user->id ? 'You' : $m->user?->name).': ', 'who' => $chat['who'], 'snippet' => $m->body];
            })
            ->unique('id');

        return $results->concat($messages)->take(self::LIMIT * 2)->values()->all();
    }
}
