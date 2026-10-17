<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// One message in a conversation
class Message extends Model
{
    protected $fillable = ['conversation_id', 'user_id', 'body'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function toFrontend(User $viewer): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'userId' => $this->user_id,
            'mine' => $this->user_id === $viewer->id,
            'userName' => $this->user?->is_admin ? 'OrgConnect admin' : $this->user?->name,
            'userAvatar' => $this->user?->avatarData(),
            'isAdmin' => (bool) $this->user?->is_admin,
            'createdAt' => $this->created_at->format('Y-m-d\TH:i:s'),
        ];
    }
}
