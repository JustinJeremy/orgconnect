<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Event extends Model
{
    use BelongsToOrganization;

    protected $fillable = ['title', 'category', 'date', 'time', 'location', 'mode', 'capacity', 'description', 'topics', 'poster_path', 'status', 'created_by', 'checkin_code'];

    protected function casts(): array
    {
        return ['date' => 'date', 'capacity' => 'integer', 'topics' => 'array'];
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }

    public function startsAt(): Carbon
    {
        return $this->date->copy()->setTimeFromTimeString($this->time);
    }

    // QR check-in is open from a day before the event starts until it's finished: marked completed, or
    // the end of its day at the latest (events have no end time). Officers can show the QR code any time
    // before it's finished; scanning it only works in that window.
    public function checkinOpensAt(): Carbon
    {
        return $this->startsAt()->subDay();
    }

    // Marked completed, or its day is over: check-in is closed for good (the QR button goes away)
    public function isFinished(): bool
    {
        return $this->status === 'completed' || now()->gt($this->date->copy()->endOfDay());
    }

    // null when check-in is open, otherwise why it isn't
    public function checkinClosed(): ?string
    {
        if ($this->isFinished()) {
            return 'This event is finished, so check-in is closed.';
        }
        if (now()->lt($this->checkinOpensAt())) {
            return 'Check-in opens a day before the event ('.$this->checkinOpensAt()->format('M j, g:i A').').';
        }

        return null;
    }

    public function toFrontend(): array
    {
        $this->loadMissing('registrations.user');

        return [
            'id' => $this->id,
            'title' => $this->title,
            'topics' => $this->topics ?? [],
            'category' => $this->category,
            'date' => $this->date->format('Y-m-d'),
            'time' => substr($this->time, 0, 5),
            'location' => $this->location,
            'mode' => $this->mode,
            'capacity' => $this->capacity,
            'description' => $this->description,
            // ?v= changes when the poster is replaced so browsers don't show the old one
            'posterUrl' => $this->poster_path ? url("/api/events/{$this->id}/poster").'?v='.$this->updated_at?->timestamp : null,
            'status' => $this->status,
            'checkinOpen' => $this->checkinClosed() === null,   // scanning works now
            'finished' => $this->isFinished(),   // completed, or its day is over: no QR button
            'registrations' => $this->registrations->map(fn ($r) => [
                'id' => $r->id,
                'userId' => $r->user_id,
                'name' => $r->user?->name,
                ...($r->user?->avatarData() ?? []),   // for "Who's going" in the event's details
                'status' => $r->status,
            ])->values(),
        ];
    }
}
