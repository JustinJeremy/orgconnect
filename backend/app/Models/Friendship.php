<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A friend request (Pending) or a friendship (Accepted) between two accounts.
// user_id sent the request; friend_id received it.
class Friendship extends Model
{
    protected $fillable = ['user_id', 'friend_id', 'status', 'accepted_at'];

    protected function casts(): array
    {
        return ['accepted_at' => 'datetime'];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'friend_id');
    }

    // Every row you're in, whoever sent it
    public function scopeInvolving(Builder $query, int $userId): Builder
    {
        return $query->where(fn ($q) => $q->where('user_id', $userId)->orWhere('friend_id', $userId));
    }

    // The row between these two people, whoever sent it
    public static function between(int $a, int $b): ?self
    {
        return static::query()->where(fn (Builder $q) => $q
            ->where(fn ($q) => $q->where('user_id', $a)->where('friend_id', $b))
            ->orWhere(fn ($q) => $q->where('user_id', $b)->where('friend_id', $a)))
            ->first();
    }

    // How it looks from $viewerId's side: none | friends | sent | received
    public static function stateFor(?self $row, int $viewerId): string
    {
        if (! $row) {
            return 'none';
        }
        if ($row->status === 'Accepted') {
            return 'friends';
        }

        return $row->user_id === $viewerId ? 'sent' : 'received';
    }
}
