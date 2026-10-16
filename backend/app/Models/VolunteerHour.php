<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VolunteerHour extends Model
{
    use BelongsToOrganization;

    protected $fillable = ['user_id', 'activity', 'date', 'hours', 'status', 'reviewed_by'];

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

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->user_id,
            'memberName' => $this->user?->name,
            'activity' => $this->activity,
            'date' => $this->date->format('Y-m-d'),
            'hours' => $this->hours,
            'status' => $this->status,
        ];
    }
}
