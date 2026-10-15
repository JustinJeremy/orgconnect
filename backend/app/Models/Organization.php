<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    protected $fillable = [
        'slug', 'name', 'short_name', 'college', 'tagline', 'description', 'mission', 'vision', 'founded_year',
        'adviser', 'email', 'facebook_url', 'office', 'meeting_schedule', 'membership_fee', 'courses', 'tutoring_areas', 'theme', 'logo_path',
    ];

    protected function casts(): array
    {
        return ['courses' => 'array', 'tutoring_areas' => 'array', 'theme' => 'array', 'founded_year' => 'integer'];
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
            // ?v= changes on every upload so browsers don't keep showing the old logo
            'logoUrl' => $this->logo_path ? url("/api/organizations/{$this->slug}/logo").'?v='.$this->updated_at?->timestamp : null,
            'memberCount' => $this->memberships()->where('status', 'Active')->count(),
        ];
    }
}
