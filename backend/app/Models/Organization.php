<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    protected $fillable = [
        'slug', 'status', 'requested_by', 'proof_url', 'review_note', 'suspension_reason', 'reviewed_at', 'name', 'short_name', 'college', 'tagline', 'description', 'mission', 'vision', 'founded_year',
        'adviser', 'email', 'facebook_url', 'office', 'meeting_schedule', 'membership_fee', 'courses', 'tutoring_areas', 'theme', 'logo_path',
    ];

    protected function casts(): array
    {
        return ['courses' => 'array', 'tutoring_areas' => 'array', 'theme' => 'array', 'founded_year' => 'integer', 'reviewed_at' => 'datetime'];
    }

    // Orgs people can see and use (not waiting for review, rejected or suspended)
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'Active');
    }

    // The student who asked to register this org
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    // An org registration request, as the requester and the platform admin see it
    public function toRequest(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'status' => $this->status,
            'name' => $this->name,
            'shortName' => $this->short_name,
            'college' => $this->college,
            'tagline' => $this->tagline,
            'description' => $this->description,
            'adviser' => $this->adviser,
            'email' => $this->email,
            'courses' => $this->courses ?? [],
            'proofUrl' => $this->proof_url,
            'requestedBy' => $this->requester?->name,
            'requestedByAvatar' => $this->requester?->avatarData(),
            'requestedByEmail' => $this->requester?->email,
            'submittedAt' => $this->created_at?->format('Y-m-d'),
            'reviewedAt' => $this->reviewed_at?->format('Y-m-d'),
            'reviewNote' => $this->review_note,
            'color' => \App\Support\OrgThemes::describe($this->theme),   // the color they picked
        ];
    }

    // The org picked in the app (sent by the frontend in the X-Organization header).
    // Set by the ResolveOrganization middleware; null outside a request.
    public static function current(): ?self
    {
        return app()->bound('organization') ? app('organization') : null;
    }

    public static function setCurrent(?self $organization): void
    {
        app()->instance('organization', $organization);
    }

    // Used when an org hasn't picked its own tutoring areas
    public const DEFAULT_TUTORING_AREAS = ['Mathematics', 'Programming', 'Science', 'English', 'Other'];

    // Subject areas for this org's tutoring sessions and shared resources
    public function tutoringAreas(): array
    {
        return $this->tutoring_areas ?: self::DEFAULT_TUTORING_AREAS;
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(MembershipRecord::class);
    }

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'shortName' => $this->short_name,
            'college' => $this->college,
            'tagline' => $this->tagline,
            'description' => $this->description,
            'mission' => $this->mission,
            'vision' => $this->vision,
            'foundedYear' => $this->founded_year,
            'adviser' => $this->adviser,
            'email' => $this->email,
            'facebookUrl' => $this->facebook_url,
            'office' => $this->office,
            'meetingSchedule' => $this->meeting_schedule,
            'membershipFee' => $this->membership_fee,
            'courses' => $this->courses ?? [],
            'tutoringAreas' => $this->tutoringAreas(),
            'theme' => $this->theme,
            'color' => \App\Support\OrgThemes::describe($this->theme),   // its name and swatch
            // ?v= changes on every upload so browsers don't keep showing the old logo
            'logoUrl' => $this->logo_path ? url("/api/organizations/{$this->slug}/logo").'?v='.$this->updated_at?->timestamp : null,
            'memberCount' => $this->memberships()->where('status', 'Active')->count(),
        ];
    }
}
