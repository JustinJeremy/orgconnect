<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

// Group chats inside the selected org: committees, study groups. Any active member starts one and
// picks people from the org; anyone in the group can add more people from the org, rename it, or
// leave. People who are added get a notification, and the chat shows a line like "Maria added Juan".
class GroupController extends Controller
{
    // POST /api/groups  { name, memberIds: [] } -> the new group
    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => 'required|string|max:60',
            'memberIds' => 'required|array|min:1|max:50',
            'memberIds.*' => 'integer',
        ], ['memberIds.required' => 'Add at least one person to the group.']);
        $people = $this->peopleHere($data['memberIds'], $user);
        abort_if($people->isEmpty(), 422, 'Add at least one active member of this org.');

        $group = Conversation::create(['kind' => 'group', 'name' => trim($data['name']), 'organization_id' => Organization::current()->id, 'created_by' => $user->id]);
        $group->members()->attach($people->pluck('id')->push($user->id)->mapWithKeys(fn ($id) => [$id => ['added_by' => $user->id]])->all());
        $this->notice($group, $user, "{$user->name} created the group");
        $this->tell($people, "{$user->name} added you to the group {$group->name}", $group);

        return response()->json($group->toFrontend($user), 201);
    }

    // GET /api/groups/{conversation}/members -> who's in it (officers first, then by name)
    public function members(Request $request, Conversation $conversation)
    {
        $this->inGroup($request->user(), $conversation);

        return $conversation->members()->with('membership')->orderBy('name')->get()
            ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name, ...$u->avatarData(), 'position' => $u->membership->position,
                'creator' => $u->id === $conversation->created_by])
            ->sortBy(fn ($m) => $m['position'] === 'Member' ? 1 : 0)->values();
    }

    // POST /api/groups/{conversation}/members  { memberIds: [] } -> add people from the org
    public function add(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        $this->inGroup($user, $conversation, write: true);
        $data = $request->validate(['memberIds' => 'required|array|min:1|max:50', 'memberIds.*' => 'integer']);
        $already = $conversation->members()->pluck('users.id');
        $people = $this->peopleHere($data['memberIds'], $user)->reject(fn (User $u) => $already->contains($u->id))->values();
        abort_if($people->isEmpty(), 422, 'They are already in the group.');

        $conversation->members()->attach($people->pluck('id')->mapWithKeys(fn ($id) => [$id => ['added_by' => $user->id]])->all());
        $this->notice($conversation, $user, "{$user->name} added ".$this->names($people));
        $this->tell($people, "{$user->name} added you to the group {$conversation->name}", $conversation);

        return $conversation->fresh()->toFrontend($user);
    }

    // PUT /api/groups/{conversation}  { name }
    public function rename(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        $this->inGroup($user, $conversation, write: true);
        $name = trim($request->validate(['name' => 'required|string|max:60'])['name']);
        if ($name !== $conversation->name) {
            $conversation->update(['name' => $name]);
            $this->notice($conversation, $user, "{$user->name} renamed the group to {$name}");
        }

        return $conversation->toFrontend($user);
    }

    // DELETE /api/groups/{conversation}/members/me -> leave (the last one out deletes the group)
    public function leave(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        $this->inGroup($user, $conversation);
        $conversation->members()->detach($user->id);
        if ($conversation->members()->doesntExist()) {
            $conversation->messages()->get()->each->deleteAttachment();
            $conversation->delete();
        } else {
            $this->notice($conversation, $user, "{$user->name} left the group");
        }

        return ['ok' => true];
    }

    // Active members of the selected org among these ids (not you)
    private function peopleHere(array $ids, User $user): Collection
    {
        return User::withMembershipStatus(['Active'])->whereIn('users.id', $ids)->where('users.id', '!=', $user->id)->get();
    }

    private function inGroup(User $user, Conversation $conversation, bool $write = false): void
    {
        abort_unless($conversation->kind === 'group' && $conversation->organization_id === Organization::current()->id && $conversation->isMember($user), 404);
        abort_if($write && ($reason = $conversation->cantWrite($user)), 403, $reason ?? '');
    }

    // "Juan", "Juan and Leo", "Juan, Leo and Ana"
    private function names(Collection $people): string
    {
        $names = $people->pluck('name');

        return $names->count() > 1 ? $names->slice(0, -1)->implode(', ').' and '.$names->last() : (string) $names->first();
    }

    private function notice(Conversation $group, User $by, string $text): void
    {
        $message = $group->messages()->create(['user_id' => $by->id, 'body' => $text, 'notice' => true]);
        $group->update(['last_message_at' => $message->created_at]);
    }

    private function tell(Collection $people, string $text, Conversation $group): void
    {
        UserNotification::send($people->pluck('id'), $text, "messages/{$group->id}");
    }
}
