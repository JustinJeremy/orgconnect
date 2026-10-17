<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Friendship;
use App\Models\MembershipRecord;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;

// Messages: friends with each other, an org's officers with the OrgConnect admin, and someone
// registering an org with the admin (including "Ask for changes"). Not tied to the selected org,
// so they work from any org, from the registration page and in the admin console.
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
        $conversation->markRead($user);

        return [
            'conversation' => $conversation->toFrontend($user),
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

    // POST /api/conversations/direct/{person} -> the conversation with a friend (made the first time)
    public function direct(Request $request, User $person)
    {
        $user = $request->user();
        abort_if($person->id === $user->id, 422, "You can't message yourself.");
        abort_unless(Friendship::stateFor(Friendship::between($user->id, $person->id), $user->id) === 'friends', 403, 'You can only message your friends.');

        return Conversation::direct($user->id, $person->id)->toFrontend($user);
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
                if ($recipient && $conversation->unreadFor($recipient) === 1) {
                    UserNotification::platform($userId, "New message from {$from}{$about}", "messages/{$conversation->id}");
                }
            }
        }

        return $message->load('user');
    }
}
