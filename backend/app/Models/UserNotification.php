<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class UserNotification extends Model
{
    use BelongsToOrganization;

    // organization_id: normally the selected org (BelongsToOrganization); set it to send to another org
    protected $fillable = ['organization_id', 'user_id', 'message', 'link', 'is_read'];

    protected function casts(): array
    {
        return ['is_read' => 'boolean'];
    }

    // Pages a notification can open in the app
    public const LINKS = ['dashboard', 'events', 'hours', 'tutoring', 'announcements', 'profile'];

    // Send the same message to one or many users. $link = the page it opens when clicked,
    // optionally with an id ("events/12" opens the Events page on event 12).
    public static function send(iterable|int $userIds, string $message, ?string $link = null): void
    {
        foreach (is_int($userIds) ? [$userIds] : $userIds as $id) {
            static::create(['user_id' => $id, 'message' => $message, 'link' => $link]);
        }
    }

    // A notification not tied to any org (org request rejected, org suspended): shows in every org
    public static function platform(int $userId, string $message, ?string $link = null): void
    {
        $n = new static(['user_id' => $userId, 'message' => $message, 'link' => $link]);
        $n->organization_id = null;
        static::withoutEvents(fn () => $n->save());   // skip BelongsToOrganization, which would add the selected org
    }

    // Older notifications were saved without a link: work it out from the message
    private function guessLink(): string
    {
        return match (true) {
            str_contains($this->message, 'applied to join') || str_contains($this->message, 'asked to be reactivated') => 'applications',
            str_contains($this->message, 'commented on') => 'announcements',
            str_contains($this->message, 'event') || str_contains($this->message, 'certificate') => 'events',
            str_contains($this->message, 'hrs for') => 'hours',
            str_contains($this->message, 'tutoring') => 'tutoring',
            str_contains($this->message, 'announcement') => 'announcements',
            default => 'dashboard',
        };
    }

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'message' => $this->message,
            'link' => $this->link ?? $this->guessLink(),
            'createdAt' => $this->created_at->format('Y-m-d\TH:i:s'),
            'isRead' => $this->is_read,
        ];
    }
}
