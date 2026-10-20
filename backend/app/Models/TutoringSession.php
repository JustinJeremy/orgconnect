<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use App\Support\Schedule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TutoringSession extends Model
{
    use BelongsToOrganization;

    protected $fillable = ['tutor_id', 'subject', 'area', 'date', 'time', 'mode', 'schedule', 'location', 'slots', 'description', 'topics', 'checkin_code'];

    // A session meets once, on its date and time. `schedule` is only its label ("Mon, Oct 26 · 3:00 PM").
    // Sample data still written as weekly text ("Mondays, 3:00 PM") gets that day's next date.
    protected static function booted(): void
    {
        static::saving(function (TutoringSession $session) {
            if (! $session->date || ($session->isDirty('schedule') && ! $session->isDirty(['date', 'time']))) {
                [$session->date, $session->time] = Schedule::fromWeekly((string) $session->schedule);
            }
            $session->mode = $session->mode ?: Schedule::modeFor($session->location);
            $session->schedule = Schedule::label($session->date, $session->time);
        });
    }

    protected function casts(): array
    {
        return ['date' => 'date', 'slots' => 'integer', 'topics' => 'array'];
    }

    public function tutor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tutor_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(TutoringRequest::class);
    }

    // QR check-in works on the session's day
    public function meetsToday(): bool
    {
        return (bool) $this->date?->isToday();
    }

    // Its day is over: it can't be requested any more
    public function isFinished(): bool
    {
        return (bool) $this->date?->lt(today());
    }

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'subject' => $this->subject,
            'topics' => $this->topics ?? [],
            'area' => $this->area,
            'tutorId' => $this->tutor_id,
            'tutorName' => $this->tutor?->name,
            'tutorAvatar' => $this->tutor?->avatarData(),
            'date' => $this->date?->format('Y-m-d'),
            'time' => $this->time,
            'mode' => $this->mode,
            'schedule' => $this->schedule,
            'location' => $this->location,
            'slots' => $this->slots,   // still open
            // Taken by confirmed (or completed) requests: slots + taken = how many it had
            'taken' => $this->taken_count ?? $this->requests()->whereIn('status', ['Confirmed', 'Completed'])->count(),
            'finished' => $this->isFinished(),
            'description' => $this->description,
            'checkinOpen' => $this->meetsToday(),   // scanning works today (the QR button always shows)
        ];
    }
}
