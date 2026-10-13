<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TutoringRequest extends Model
{
    // Only rows whose session is in the selected org (the session query is already org-scoped)
    protected static function booted(): void
    {
        static::addGlobalScope('organization', fn ($query) => $query->whereHas('session'));
    }

    protected $fillable = ['tutoring_session_id', 'user_id', 'status'];

    public function session(): BelongsTo
    {
        return $this->belongsTo(TutoringSession::class, 'tutoring_session_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'sessionId' => $this->tutoring_session_id,
            'userId' => $this->user_id,
            'requesterName' => $this->user?->name,
            'yearLevel' => $this->user?->year_level,
            'status' => $this->status,
        ];
    }
}
