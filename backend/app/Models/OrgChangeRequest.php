<?php

namespace App\Models;

use App\Support\OrgThemes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A President's request to change the org's details; applied only when the platform admin approves
class OrgChangeRequest extends Model
{
    protected $fillable = ['organization_id', 'requested_by', 'proposed', 'reason', 'status', 'review_note', 'reviewed_by', 'reviewed_at'];

    protected function casts(): array
    {
        return ['proposed' => 'array', 'reviewed_at' => 'datetime'];
    }

    // Form field (camelCase, as the app sends it) => organizations column
    public const FIELDS = [
        'name' => 'name', 'shortName' => 'short_name', 'college' => 'college', 'tagline' => 'tagline',
        'description' => 'description', 'mission' => 'mission', 'vision' => 'vision', 'adviser' => 'adviser',
        'email' => 'email', 'office' => 'office', 'meetingSchedule' => 'meeting_schedule',
        'membershipFee' => 'membership_fee', 'courses' => 'courses',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    // For the President's status and the admin's review: each changed field, before and after
    public function toFrontend(): array
    {
        $org = $this->organization;
        $columns = array_flip(self::FIELDS);

        return [
            'id' => $this->id,
            'status' => $this->status,
            'reason' => $this->reason,
            'reviewNote' => $this->review_note,
            'submittedAt' => $this->created_at?->format('Y-m-d'),
            'reviewedAt' => $this->reviewed_at?->format('Y-m-d'),
            'requestedBy' => $this->requester?->name,
            'organization' => ['id' => $org?->id, 'name' => $org?->name, 'shortName' => $org?->short_name],
            'changes' => collect($this->proposed)->map(fn ($new, $column) => $column === 'theme' ? [
                // A color: its name and swatch, not the whole palette
                'field' => 'color',
                'from' => $this->status === 'Pending' ? OrgThemes::describe($org?->theme) : null,
                'to' => OrgThemes::describe($new),
            ] : [
                'field' => $columns[$column] ?? $column,
                'from' => $this->status === 'Pending' ? $org?->{$column} : null,
                'to' => $new,
            ])->values(),
        ];
    }
}
