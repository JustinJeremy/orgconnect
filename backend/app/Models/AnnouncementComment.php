<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A comment on an announcement in the feed. Belongs to its org through the announcement.
class AnnouncementComment extends Model
{
    protected $fillable = ['announcement_id', 'user_id', 'text', 'edited_at'];

    protected function casts(): array
    {
        return ['edited_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->user_id,
            'userName' => $this->user?->name,
            'text' => $this->text,
            'createdAt' => $this->created_at->format('Y-m-d\TH:i:s'),
            'edited' => $this->edited_at !== null,   // shown as "(edited)"
        ];
    }
}
