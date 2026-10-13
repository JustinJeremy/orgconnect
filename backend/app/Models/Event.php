<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    use BelongsToOrganization;

    protected $fillable = ['title', 'category', 'date', 'time', 'location', 'mode', 'capacity', 'description', 'status', 'created_by'];

    protected function casts(): array
    {
        return ['date' => 'date', 'capacity' => 'integer'];
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }

    public function toFrontend(): array
    {
        $this->loadMissing('registrations.user');

        return [
            'id' => $this->id,
            'title' => $this->title,
            'category' => $this->category,
            'date' => $this->date->format('Y-m-d'),
            'time' => substr($this->time, 0, 5),
            'location' => $this->location,
            'mode' => $this->mode,
            'capacity' => $this->capacity,
            'description' => $this->description,
            'status' => $this->status,
            'registrations' => $this->registrations->map(fn ($r) => [
                'id' => $r->id,
                'userId' => $r->user_id,
                'name' => $r->user?->name,
                'status' => $r->status,
            ])->values(),
        ];
    }
}
