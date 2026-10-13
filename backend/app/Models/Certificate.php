<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Certificate extends Model
{
    // Only rows whose event is in the selected org (the event query is already org-scoped)
    protected static function booted(): void
    {
        static::addGlobalScope('organization', fn ($query) => $query->whereHas('event'));
    }

    protected $fillable = ['user_id', 'event_id', 'issued_at', 'file_path'];

    protected function casts(): array
    {
        return ['issued_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'eventId' => $this->event_id,
            'title' => $this->event?->title,
            'date' => $this->event?->date->format('Y-m-d'),
            'issuedAt' => $this->issued_at->toIso8601String(),
        ];
    }
}
