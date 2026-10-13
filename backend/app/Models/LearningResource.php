<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningResource extends Model
{
    use BelongsToOrganization;

    protected $fillable = ['user_id', 'title', 'subject', 'type', 'url', 'description'];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'subject' => $this->subject,
            'type' => $this->type,
            'url' => $this->url,
            'description' => $this->description,
            'uploadedById' => $this->user_id,
            'uploadedBy' => $this->uploader?->name,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
