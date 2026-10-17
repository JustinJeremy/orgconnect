<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// One message in an org's thread under an admin announcement: from the org's President, a VP or
// the Secretary, or from the admin answering them. Only that org's officers and the admin see it.
class PlatformAnnouncementReply extends Model
{
    protected $fillable = ['platform_announcement_id', 'organization_id', 'user_id', 'text'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function toFrontend(): array
    {
        $position = $this->user?->is_admin ? null : $this->user?->memberships()
            ->where('organization_id', $this->organization_id)->value('position');

        return [
            'id' => $this->id,
            'text' => $this->text,
            'userId' => $this->user_id,
            'userName' => $this->user?->is_admin ? 'OrgConnect admin' : $this->user?->name,
            'userAvatar' => $this->user?->avatarData(),
            'isAdmin' => (bool) $this->user?->is_admin,
            'position' => $position,
            'createdAt' => $this->created_at->format('Y-m-d\TH:i:s'),
        ];
    }
}
