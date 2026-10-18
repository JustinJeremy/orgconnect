<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A student who scanned a tutoring session's QR code on one of its meeting days
class TutoringCheckin extends Model
{
    protected $fillable = ['tutoring_session_id', 'user_id', 'date'];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
