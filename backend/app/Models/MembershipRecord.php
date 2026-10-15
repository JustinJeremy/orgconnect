<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MembershipRecord extends Model
{
    protected $fillable = [
        'user_id', 'organization_id', 'role', 'position', 'status', 'join_date',
        'inactive_reason', 'inactive_by', 'inactive_at', 'reactivation_message', 'reactivation_requested_at',
    ];

    protected function casts(): array
    {
        return ['join_date' => 'date', 'inactive_at' => 'datetime', 'reactivation_requested_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    // The officer who made this membership inactive
    public function inactiveBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inactive_by');
    }

    // Officers of this org who manage members (President, Vice Presidents, Secretary)
    public static function managerIds(int $organizationId)
    {
        return static::where('organization_id', $organizationId)
            ->where('role', 'officer')
            ->where('status', 'Active')
            ->where(fn ($q) => $q->whereIn('position', User::MEMBER_MANAGERS)->orWhere('position', 'like', 'VP%'))
            ->pluck('user_id');
    }
}
