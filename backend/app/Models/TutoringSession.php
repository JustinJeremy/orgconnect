<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TutoringSession extends Model
{
    use BelongsToOrganization;

    protected $fillable = ['tutor_id', 'subject', 'area', 'schedule', 'location', 'slots', 'description', 'topics', 'checkin_code'];

    protected function casts(): array
    {
        return ['slots' => 'integer', 'topics' => 'array'];
    }

    public function tutor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tutor_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(TutoringRequest::class);
    }

    // QR check-in works on the session's meeting days ("Mondays, 3:00 PM" meets on Mondays)
    public function meetsToday(): bool
    {
        return str_contains(strtolower($this->schedule), strtolower(now()->format('D')));
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
            'schedule' => $this->schedule,
            'location' => $this->location,
            'slots' => $this->slots,
            'description' => $this->description,
            'checkinOpen' => $this->meetsToday(),
        ];
    }
}
