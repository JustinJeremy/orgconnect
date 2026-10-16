<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'student_id',
        'course',
        'year_level',
        'avatar',
        'avatar_path',
    ];

    // Avatar characters a user can pick (drawn by frontend/src/components/Avatars.jsx)
    public const AVATARS = ['bun', 'cap', 'headband', 'glasses', 'curly', 'pigtails', 'spiky', 'bow'];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
        ];
    }

    // Officer of the currently selected organization
    public function isOfficer(): bool
    {
        return $this->membership->role === 'officer';
    }

    // Officers who manage the member roster: applications, adding, editing and removing members.
    // Only the President manages other officers (see MemberController).
    public const MEMBER_MANAGERS = ['President', 'Secretary'];

    public function canManageMembers(): bool
    {
        $position = (string) $this->membership->position;

        return $this->isOfficer() && (in_array($position, self::MEMBER_MANAGERS, true) || str_starts_with($position, 'VP'));
    }

    public function isPresident(): bool
    {
        return $this->isOfficer() && $this->membership->position === 'President';
    }

    // Also a member of (or applicant to) another org: only they can change their own account details
    public function inOtherOrganizations(): bool
    {
        return $this->memberships()
            ->where('organization_id', '!=', Organization::current()?->id)
            ->where('status', '!=', 'Rejected')
            ->exists();
    }

    // Role, position, status and join date in the currently selected organization.
    // Someone who hasn't joined it gets an empty record (status null).
    public function membership(): HasOne
    {
        return $this->hasOne(MembershipRecord::class)
            ->where('organization_id', Organization::current()?->id)
            ->withDefault(['role' => 'member', 'position' => 'Member', 'status' => null]);
    }

    // Every organization this person has joined or applied to
    public function memberships(): HasMany
    {
        return $this->hasMany(MembershipRecord::class);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }

    // Users whose membership status is one of $statuses
    public function scopeWithMembershipStatus(Builder $query, array $statuses): Builder
    {
        return $query->whereHas('membership', fn ($q) => $q->whereIn('status', $statuses));
    }

    public function hourLogs(): HasMany
    {
        return $this->hasMany(VolunteerHour::class);
    }

    public function approvedHours(): float
    {
        return (float) $this->hourLogs()->where('status', 'Approved')->sum('hours');
    }

    // The signed-in user, shaped the way the React app expects it
    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->membership->role,
            'position' => $this->membership->position,
            'studentId' => $this->student_id,
            'course' => $this->course,
            'yearLevel' => $this->year_level,
            'avatar' => $this->avatar,   // a character key, "photo" (their own upload), "initials", or null until they pick one
            // ?v= changes on every upload so browsers don't keep showing the old photo
            'avatarUrl' => $this->avatar_path ? url("/api/users/{$this->id}/avatar").'?v='.$this->updated_at?->timestamp : null,
            'membershipStatus' => $this->membership->status,
            'isAdmin' => $this->is_admin,   // platform admin: reviews org registrations
            'canManageMembers' => $this->canManageMembers(),
            'isPresident' => $this->isPresident(),
            // For the "under review" and "inactive" screens
            'appliedAt' => $this->membership->created_at?->format('Y-m-d'),
            'applicationMessage' => $this->membership->status === 'Pending' ? $this->membership->application_message : null,
            'inactive' => $this->membership->status === 'Inactive' ? [
                'reason' => $this->membership->inactive_reason,
                'by' => $this->membership->inactiveBy?->name,
                'byPosition' => $this->membership->inactiveBy?->memberships()
                    ->where('organization_id', $this->membership->organization_id)->value('position'),
                'at' => $this->membership->inactive_at?->format('Y-m-d'),
                'requestedAt' => $this->membership->reactivation_requested_at?->format('Y-m-d'),
                'message' => $this->membership->reactivation_message,
            ] : null,
            // For the "application not approved" screen
            'rejection' => $this->membership->status === 'Rejected' ? [
                'reason' => $this->membership->rejection_reason,
                'by' => $this->membership->rejectedBy?->name,
                'byPosition' => $this->membership->rejectedBy?->memberships()
                    ->where('organization_id', $this->membership->organization_id)->value('position'),
                'at' => $this->membership->rejected_at?->format('Y-m-d'),
            ] : null,
        ];
    }

    // A row in the officer's member roster
    public function toMember(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'position' => $this->membership->position,
            'joinDate' => optional($this->membership->join_date ?? $this->created_at)->format('Y-m-d'),
            'status' => $this->membership->status === 'Inactive' ? 'Inactive' : 'Active',
            'inactiveReason' => $this->membership->inactive_reason,
            'approvedHours' => (float) ($this->approved_sum ?? $this->approvedHours()),
        ];
    }

    // A membership application (a student who signed up)
    // An inactive member asking to be active again (officers' Requests tab)
    public function toReactivation(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'message' => $this->membership->reactivation_message,
            'requestedAt' => $this->membership->reactivation_requested_at?->format('Y-m-d'),
            'reason' => $this->membership->inactive_reason,
            'inactiveAt' => $this->membership->inactive_at?->format('Y-m-d'),
        ];
    }

    public function toApplication(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'studentId' => $this->student_id,
            'course' => $this->course,
            'yearLevel' => $this->year_level,
            // When they applied to this org (not when the account was made: they may have joined another org first)
            'appliedAt' => ($this->membership->created_at ?? $this->created_at)->format('Y-m-d'),
            'message' => $this->membership->application_message,
            'status' => match ($this->membership->status) {
                'Pending' => 'Pending',
                'Rejected' => 'Rejected',
                default => 'Approved',
            },
        ];
    }
}
