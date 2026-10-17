<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\ConversationRead;
use App\Models\Friendship;
use App\Models\MembershipRecord;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;

// Messages: members of the same org with each other (inside that org), an org's officers with the
// OrgConnect admin, and someone registering an org with the admin (including "Ask for changes").
class MessageController extends Controller
{
    // GET /api/conversations -> yours, latest message first
    public function index(Request $request)
    {
        $user = $request->user();

        return Conversation::visibleTo($user)->whereNotNull('last_message_at')
            ->with(['organization.requester', 'userOne', 'userTwo'])
            ->orderByDesc('last_message_at')->get()
            ->map(fn (Conversation $c) => $c->toFrontend($user));
    }

    // GET /api/messages/unread -> { count } for the menu badge
    public function unread(Request $request)
    {
        $user = $request->user();

        return ['count' => Conversation::visibleTo($user)->whereNotNull('last_message_at')->get()->sum(fn (Conversation $c) => $c->unreadFor($user))];
    }

    // GET /api/conversations/{conversation}/messages -> the conversation and its messages (marks it read)
    public function show(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        abort_unless($conversation->canSee($user), 404);
        // The first message they hadn't read yet (a notification opens the chat right there)
        $read = (int) ConversationRead::where('conversation_id', $conversation->id)->where('user_id', $user->id)->value('last_read_message_id');
        $firstUnread = $conversation->messages()->where('id', '>', $read)->where('user_id', '!=', $user->id)->min('id');
        $conversation->markRead($user);

        return [
            'conversation' => $conversation->toFrontend($user),
            'firstUnreadId' => $firstUnread,
            'messages' => $conversation->messages()->with('user')->orderBy('id')->get()->map(fn ($m) => $m->toFrontend($user)),
        ];
    }

    // POST /api/conversations/{conversation}/messages  { body }
    public function send(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        abort_unless($conversation->canSee($user), 404);
        abort_if($reason = $conversation->cantWrite($user), 403, $reason);
        $data = $request->validate(['body' => 'required|string|max:2000']);

        return response()->json($this->post($conversation, $user, trim($data['body']))->toFrontend($user), 201);
    }

    // POST /api/conversations/direct/{person} -> your conversation with someone in the selected org
    // (made the first time). Someone in another org: message them from that org.
    public function direct(Request $request, User $person)
    {
        $user = $request->user();
        $org = Organization::current();
        abort_if($person->id === $user->id, 422, "You can't message yourself.");
        abort_unless($person->membership->status === 'Active', 403, "You can only message people in {$org->short_name}. To message someone in another org, open that org.");

        return Conversation::direct($org->id, $user->id, $person->id)->toFrontend($user);
    }

    // GET /api/messages/contacts?search= -> people in the selected org you can message:
    // friends you haven't talked to yet first, then your other friends, then everyone else (officers first)
    public function contacts(Request $request)
    {
        $user = $request->user();
        $org = Organization::current();
        $words = trim((string) $request->input('search'));
        $friends = Friendship::involving($user->id)->where('status', 'Accepted')->get()
            ->map(fn (Friendship $f) => $f->user_id === $user->id ? $f->friend_id : $f->user_id)->all();
        $talked = Conversation::where('kind', 'direct')->where('organization_id', $org->id)->whereNotNull('last_message_at')
            ->where(fn ($q) => $q->where('user_one_id', $user->id)->orWhere('user_two_id', $user->id))->get()
            ->mapWithKeys(fn (Conversation $c) => [($c->user_one_id === $user->id ? $c->user_two_id : $c->user_one_id) => $c->id]);

        return User::withMembershipStatus(['Active'])->with('membership')
            ->where('users.id', '!=', $user->id)
            ->when($words !== '', fn ($q) => $q->where('name', 'like', "%{$words}%"))
            ->orderBy(MembershipRecord::rankIn($org->id))->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id, 'name' => $u->name, ...$u->avatarData(),
                'position' => $u->membership->position, 'course' => $u->course, 'yearLevel' => $u->year_level,
                'friend' => in_array($u->id, $friends, true),
                'conversationId' => $talked[$u->id] ?? null,
            ])
            ->sortBy(fn ($p) => $p['friend'] && ! $p['conversationId'] ? 0 : ($p['friend'] ? 1 : 2))
            ->values();
    }

    // POST /api/conversations/org/{organization} -> an org's conversation with the OrgConnect admin
    // (its officers, or the admin)
    public function org(Request $request, Organization $organization)
    {
        $user = $request->user();
        $officer = MembershipRecord::where('organization_id', $organization->id)->where('user_id', $user->id)
            ->where('status', 'Active')->where('role', 'officer')->exists();
        abort_unless($user->is_admin || $officer, 403, "Only the org's officers can message the OrgConnect admin.");

        return Conversation::forOrg('org', $organization->id)->toFrontend($user);
    }

    // POST /api/conversations/request/{organization} -> the conversation about an org request
    // (the person who sent it, or the admin)
    public function request(Request $request, Organization $organization)
    {
        $user = $request->user();
        abort_unless($user->is_admin || $organization->requested_by === $user->id, 404);

        return Conversation::forOrg('request', $organization->id)->toFrontend($user);
    }

    // POST /api/admin/org-requests/{organization}/ask-changes  { message } -> the request stays Pending;
    // the requester sees what to change, answers in the conversation and can edit the request
    public function askChanges(Request $request, Organization $organization)
    {
        abort_unless($organization->status === 'Pending', 422, 'Only requests waiting for review can be sent back for changes.');
        $data = $request->validate(['message' => 'required|string|max:2000'], ['message.required' => 'Say what needs to change.']);

        $organization->update(['changes_requested_at' => now()]);
        $conversation = Conversation::forOrg('request', $organization->id);
        $this->post($conversation, $request->user(), trim($data['message']), notify: false);
        if ($organization->requested_by) {
            UserNotification::platform($organization->requested_by, "The OrgConnect admin asked for changes to your {$organization->short_name} request", 'register-org');
        }

        return $organization->fresh()->toRequest();
    }

    // Saves a message and tells everyone else in the conversation (once per unread stretch, not every message)
    private function post(Conversation $conversation, User $user, string $body, bool $notify = true)
    {
        $message = $conversation->messages()->create(['user_id' => $user->id, 'body' => $body]);
        $conversation->update(['last_message_at' => $message->created_at]);
        $conversation->markRead($user);

        if ($notify) {
            $from = $user->is_admin ? 'the OrgConnect admin' : $user->name;
            $about = match ($conversation->kind) {
                'org' => " ({$conversation->organization?->short_name} officers)",
                'request' => " about the {$conversation->organization?->short_name} request",
                default => '',
            };
            foreach ($conversation->audience($user) as $userId) {
                $recipient = User::find($userId);
                // Already has unread messages here: they've been told
                if (! $recipient || $conversation->unreadFor($recipient) !== 1) {
                    continue;
                }
                // Chats belong to their org: the notice shows there. The admin and requests have no org.
                $notice = "New message from {$from}{$about}";
                if ($conversation->kind === 'request' || $recipient->is_admin) {
                    UserNotification::platform($userId, $notice, "messages/{$conversation->id}");
                } else {
                    UserNotification::create(['organization_id' => $conversation->organization_id, 'user_id' => $userId, 'message' => $notice, 'link' => "messages/{$conversation->id}"]);
                }
            }
        }

        return $message->load('user');
    }
}
