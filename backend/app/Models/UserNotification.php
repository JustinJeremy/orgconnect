<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class UserNotification extends Model
{
    use BelongsToOrganization;

    protected $fillable = ['user_id', 'message', 'is_read'];

    protected function casts(): array
    {
        return ['is_read' => 'boolean'];
    }

    // Send the same message to one or many users
    public static function send(iterable|int $userIds, string $message): void
    {
        foreach (is_int($userIds) ? [$userIds] : $userIds as $id) {
            static::create(['user_id' => $id, 'message' => $message]);
        }
    }

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'message' => $this->message,
            'createdAt' => $this->created_at->format('Y-m-d\TH:i:s'),
            'isRead' => $this->is_read,
        ];
    }
}
