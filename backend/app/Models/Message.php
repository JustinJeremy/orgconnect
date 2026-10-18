<?php

namespace App\Models;

use App\Models\Concerns\HasAttachment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// One message in a conversation: text, a photo or file, or both. A notice ("Juan added Maria") is a
// line about the group, shown in the middle of the chat. Its writer can edit the text (it then shows
// "edited") or delete it (it stays as "This message was deleted", without its text or file).
class Message extends Model
{
    use HasAttachment;

    protected $fillable = ['conversation_id', 'user_id', 'body', 'notice'];

    protected function casts(): array
    {
        return ['notice' => 'boolean', 'edited_at' => 'datetime', 'deleted_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function remove(): void
    {
        $this->deleteAttachment();
        $this->forceFill(['body' => null, 'deleted_at' => now()])->save();
    }

    public function toFrontend(User $viewer): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'notice' => $this->notice,
            'attachment' => $this->attachmentData('files.message'),
            'edited' => (bool) $this->edited_at,
            'deleted' => (bool) $this->deleted_at,
            'userId' => $this->user_id,
            'mine' => $this->user_id === $viewer->id,
            'userName' => $this->user?->is_admin ? 'OrgConnect admin' : $this->user?->name,
            'userAvatar' => $this->user?->avatarData(),
            'isAdmin' => (bool) $this->user?->is_admin,
            'createdAt' => $this->created_at->format('Y-m-d\TH:i:s'),
        ];
    }
}
