<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// An announcement from the OrgConnect admin (not from an org), sent to:
//   presidents | officers | members (everyone in the org) | everyone (every account on OrgConnect)
// in every org (organization_ids null) or only the chosen ones.
// Each org has its own reply thread with the admin (PlatformAnnouncementReply).
class PlatformAnnouncement extends Model
{
    public const AUDIENCES = ['presidents', 'officers', 'members', 'everyone'];

    protected $fillable = ['user_id', 'title', 'content', 'audience', 'organization_ids'];

    protected function casts(): array
    {
        return ['organization_ids' => 'array'];
    }

    public function replies(): HasMany
    {
        return $this->hasMany(PlatformAnnouncementReply::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reachesOrg(int $organizationId): bool
    {
        return $this->audience === 'everyone' || $this->organization_ids === null || in_array($organizationId, $this->organization_ids, true);
    }

    // Can this member of the org (their membership there) see it?
    public function visibleTo(?MembershipRecord $membership): bool
    {
        if ($this->audience === 'everyone') {
            return true;
        }
        if (! $membership || $membership->status !== 'Active' || ! $this->reachesOrg($membership->organization_id)) {
            return false;
        }

        return match ($this->audience) {
            'presidents' => $membership->position === 'President',
            'officers' => $membership->role === 'officer',
            default => true,   // members
        };
    }

    // Who receives it: account ids
    public function recipientIds()
    {
        if ($this->audience === 'everyone') {
            return User::where('is_admin', false)->pluck('id');
        }
        $orgIds = Organization::where('status', 'Active')
            ->when($this->organization_ids !== null, fn ($q) => $q->whereIn('id', $this->organization_ids))
            ->pluck('id');

        return MembershipRecord::whereIn('organization_id', $orgIds)->where('status', 'Active')
            ->when($this->audience === 'presidents', fn ($q) => $q->where('position', 'President'))
            ->when($this->audience === 'officers', fn ($q) => $q->where('role', 'officer'))
            ->distinct()->pluck('user_id');
    }

    public static function audienceLabel(string $audience): string
    {
        return [
            'presidents' => 'Presidents', 'officers' => 'All officers', 'members' => 'All members', 'everyone' => 'Every account',
        ][$audience] ?? $audience;
    }

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'content' => $this->content,
            'audience' => $this->audience,
            'audienceLabel' => self::audienceLabel($this->audience),
            'organizationIds' => $this->organization_ids,
            'createdAt' => $this->created_at->format('Y-m-d\TH:i:s'),
        ];
    }
}
