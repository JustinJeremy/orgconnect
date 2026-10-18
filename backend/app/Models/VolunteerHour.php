<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;

class VolunteerHour extends Model
{
    use BelongsToOrganization;

    protected $fillable = ['user_id', 'activity', 'date', 'hours', 'status', 'reviewed_by', 'rejection_reason'];

    protected function casts(): array
    {
        return ['date' => 'date', 'hours' => 'float'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // The officer who approved or rejected it
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    // Who reviews someone's hours in an org: any other officer for a member's log; for an officer's own
    // log, only the President, VPs and Secretary (never the officer themselves)
    public static function reviewersFor(int $ownerId, int $organizationId): Collection
    {
        $ownerIsOfficer = MembershipRecord::where('organization_id', $organizationId)->where('user_id', $ownerId)
            ->where('status', 'Active')->where('role', 'officer')->exists();

        return MembershipRecord::where('organization_id', $organizationId)->where('role', 'officer')->where('status', 'Active')
            ->where('user_id', '!=', $ownerId)
            ->when($ownerIsOfficer, fn ($q) => $q->where(fn ($q) => $q->whereIn('position', ['President', 'Secretary'])->orWhere('position', 'like', 'VP%')))
            ->pluck('user_id');
    }

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->user_id,
            'memberName' => $this->user?->name,
            'memberAvatar' => $this->user?->avatarData(),
            'activity' => $this->activity,
            'date' => $this->date->format('Y-m-d'),
            'hours' => $this->hours,
            'status' => $this->status,
            'rejectionReason' => $this->rejection_reason,   // why an officer rejected it
            // An officer's own log: only the President, VPs and Secretary review it
            'byOfficer' => $this->user?->membership->role === 'officer',
        ];
    }
}
