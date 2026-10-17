<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

// A conversation (see the messaging migration for the three kinds and who is in each):
//   direct  - two friends; they can write while they're friends
//   org     - the org's officers read it; its President, VPs and Secretary and the admin write
//   request - the person registering an org and the admin
class Conversation extends Model
{
    protected $fillable = ['kind', 'organization_id', 'user_one_id', 'user_two_id', 'last_message_at'];

    protected function casts(): array
    {
        return ['last_message_at' => 'datetime'];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    public static function direct(int $a, int $b): self
    {
        return static::firstOrCreate(['kind' => 'direct', 'organization_id' => null, 'user_one_id' => min($a, $b), 'user_two_id' => max($a, $b)]);
    }

    public static function forOrg(string $kind, int $organizationId): self
    {
        return static::firstOrCreate(['kind' => $kind, 'organization_id' => $organizationId, 'user_one_id' => null, 'user_two_id' => null]);
    }

    // An officer's membership in the conversation's org (null if they aren't one)
    private function officerIn(User $user): ?MembershipRecord
    {
        return MembershipRecord::where('organization_id', $this->organization_id)->where('user_id', $user->id)
            ->where('status', 'Active')->where('role', 'officer')->first();
    }

    public function canSee(User $user): bool
    {
        return match ($this->kind) {
            'direct' => in_array($user->id, [$this->user_one_id, $this->user_two_id], true),
            'org' => $user->is_admin || (bool) $this->officerIn($user),
            'request' => $user->is_admin || $this->organization?->requested_by === $user->id,
            default => false,
        };
    }

    // Why this person can't write here (null: they can)
    public function cantWrite(User $user): ?string
    {
        if (! $this->canSee($user)) {
            return 'You are not in this conversation.';
        }

        return match ($this->kind) {
            'direct' => Friendship::stateFor(Friendship::between($this->user_one_id, $this->user_two_id), $user->id) === 'friends'
                ? null : 'You can only message your friends.',
            'org' => $user->is_admin || $this->isManager($this->officerIn($user))
                ? null : 'Only the President, VPs and Secretary can write to the OrgConnect admin.',
            'request' => in_array($this->organization?->status, ['Pending', 'Rejected'], true)
                ? null : 'This request was already decided.',
            default => 'You can\'t write here.',
        };
    }

    private function isManager(?MembershipRecord $m): bool
    {
        return $m && ($m->position === 'President' || $m->position === 'Secretary' || str_starts_with((string) $m->position, 'VP'));
    }

    // Everyone who should hear about a new message (account ids), except the sender
    public function audience(User $sender): Collection
    {
        $ids = match ($this->kind) {
            'direct' => collect([$this->user_one_id, $this->user_two_id]),
            'org' => MembershipRecord::where('organization_id', $this->organization_id)->where('status', 'Active')->where('role', 'officer')->pluck('user_id')
                ->merge(User::where('is_admin', true)->pluck('id')),
            'request' => collect([$this->organization?->requested_by])->merge(User::where('is_admin', true)->pluck('id')),
            default => collect(),
        };

        return $ids->filter()->unique()->reject(fn ($id) => $id === $sender->id)->values();
    }

    // Every conversation this person can see
    public static function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->is_admin) {
            return $query->whereIn('kind', ['org', 'request']);
        }
        $officerOrgs = MembershipRecord::where('user_id', $user->id)->where('status', 'Active')->where('role', 'officer')->pluck('organization_id');
        $requested = Organization::where('requested_by', $user->id)->pluck('id');

        return $query->where(fn ($q) => $q
            ->where(fn ($q) => $q->where('kind', 'direct')->where(fn ($q) => $q->where('user_one_id', $user->id)->orWhere('user_two_id', $user->id)))
            ->orWhere(fn ($q) => $q->where('kind', 'org')->whereIn('organization_id', $officerOrgs))
            ->orWhere(fn ($q) => $q->where('kind', 'request')->whereIn('organization_id', $requested)));
    }

    public function unreadFor(User $user): int
    {
        $read = (int) ConversationRead::where('conversation_id', $this->id)->where('user_id', $user->id)->value('last_read_message_id');

        return $this->messages()->where('user_id', '!=', $user->id)->where('id', '>', $read)->count();
    }

    public function markRead(User $user): void
    {
        ConversationRead::updateOrCreate(['conversation_id' => $this->id, 'user_id' => $user->id], ['last_read_message_id' => (int) $this->messages()->max('id')]);
    }

    // How it shows in someone's list: { id, kind, title, subtitle, who (for the avatar), ... }
    public function toFrontend(User $viewer): array
    {
        $last = $this->messages()->with('user')->latest('id')->first();
        $org = $this->organization;
        $other = $this->kind === 'direct' ? ($this->user_one_id === $viewer->id ? $this->userTwo : $this->userOne) : null;

        [$title, $subtitle, $who] = match ($this->kind) {
            'direct' => [$other?->name, 'Friend', ['name' => $other?->name, ...($other?->avatarData() ?? [])]],
            'org' => $viewer->is_admin
                ? [$org?->name, 'Officers', ['name' => $org?->short_name]]
                : ['OrgConnect admin', "{$org?->short_name} officers", ['name' => 'OrgConnect']],
            'request' => $viewer->is_admin
                ? [$org?->requester?->name, "Request to register {$org?->short_name}", ['name' => $org?->requester?->name, ...($org?->requester?->avatarData() ?? [])]]
                : ['OrgConnect admin', "Your request: {$org?->short_name}", ['name' => 'OrgConnect']],
            default => ['', '', ['name' => '']],
        };

        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'title' => $title,
            'subtitle' => $subtitle,
            'who' => $who,
            'isAdminSide' => $this->kind !== 'direct' && ! $viewer->is_admin,   // the other side is the admin
            'otherUserId' => $other?->id,
            'organizationId' => $this->organization_id,
            'lastMessage' => $last ? ['body' => $last->body, 'at' => $last->created_at->format('Y-m-d\TH:i:s'), 'mine' => $last->user_id === $viewer->id] : null,
            'unread' => $this->unreadFor($viewer),
            'cantWrite' => $this->cantWrite($viewer),
        ];
    }
}
