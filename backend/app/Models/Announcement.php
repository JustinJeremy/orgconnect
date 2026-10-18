<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use App\Models\Concerns\HasAttachment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Announcement extends Model
{
    use BelongsToOrganization, HasAttachment;

    protected $fillable = ['user_id', 'title', 'category', 'content', 'pinned'];

    protected function casts(): array
    {
        return ['pinned' => 'boolean'];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function readers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'announcement_reads')->withTimestamps();
    }

    public function likers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'announcement_likes')->withTimestamps();
    }

    public function comments(): HasMany
    {
        return $this->hasMany(AnnouncementComment::class)->oldest()->oldest('id');
    }

    // $viewer is the signed-in user, so "isRead" is personal to them
    public function toFrontend(User $viewer): array
    {
        $this->loadMissing(['author', 'readers', 'likers']);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'category' => $this->category,
            'content' => $this->content,
            'pinned' => $this->pinned,
            'attachment' => $this->attachmentData('files.announcement'),   // a photo or file, if it has one
            'authorName' => $this->author?->name,
            'authorAvatar' => $this->author?->avatarData(),
            'authorPosition' => $this->author?->membership->position,
            'createdAt' => $this->created_at->format('Y-m-d\TH:i:s'),
            'isRead' => $this->user_id === $viewer->id || $this->readers->contains('id', $viewer->id),
            'readCount' => $this->readers->count(),
            'likes' => $this->likers->count(),
            'likedByMe' => $this->likers->contains('id', $viewer->id),
            'commentCount' => $this->comments_count ?? $this->comments()->count(),
        ];
    }
}
