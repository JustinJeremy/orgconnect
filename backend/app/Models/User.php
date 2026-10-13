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
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // Officer of the currently selected organization
    public function isOfficer(): bool
    {
        return $this->membership->role === 'officer';
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
            'membershipStatus' => $this->membership->status,
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
            'approvedHours' => (float) ($this->approved_sum ?? $this->approvedHours()),
        ];
    }

    // A membership application (a student who signed up)
    public function toApplication(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'studentId' => $this->student_id,
            'course' => $this->course,
            'yearLevel' => $this->year_level,
            'appliedAt' => $this->created_at->format('Y-m-d'),
            'status' => match ($this->membership->status) {
                'Pending' => 'Pending',
                'Rejected' => 'Rejected',
                default => 'Approved',
            },
        ];
    }
}
