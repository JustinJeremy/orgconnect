<?php

namespace App\Support;

use App\Models\Event;
use App\Models\TutoringSession;

// Stops posting the same thing twice in the selected org:
//   - the same title on the same date (an event, or a tutoring subject)
//   - a room another event or tutoring session already uses at the same date and time
//     (online-only ones don't take a room)
class Conflicts
{
    // $ignore: the event or session being edited (it doesn't clash with itself)
    public static function sameTitle(string $model, string $column, string $title, string $date, ?int $ignore = null): bool
    {
        return $model::whereRaw("LOWER(TRIM({$column})) = ?", [mb_strtolower(trim($title))])
            ->whereDate('date', $date)
            ->when($ignore, fn ($q) => $q->whereKeyNot($ignore))
            ->exists();
    }

    // The event or session already in that room then, e.g. "Laravel Workshop", or null if the room is free
    public static function roomTakenBy(?string $location, string $mode, string $date, string $time, ?Event $event = null, ?TutoringSession $session = null): ?string
    {
        $room = Schedule::room($location, $mode);
        if (! $room) {
            return null;
        }
        $same = fn ($item) => mb_strtolower((string) Schedule::room($item->location, $item->mode ?? 'F2F')) === mb_strtolower($room);

        $events = Event::whereDate('date', $date)->where('time', $time)->where('mode', '!=', 'Online')
            ->when($event, fn ($q) => $q->whereKeyNot($event->id))->get();
        if ($hit = $events->first($same)) {
            return "the event \"{$hit->title}\"";
        }

        $sessions = TutoringSession::whereDate('date', $date)->where('time', $time)->where('mode', '!=', 'Online')
            ->when($session, fn ($q) => $q->whereKeyNot($session->id))->get();
        if ($hit = $sessions->first($same)) {
            return "the tutoring session \"{$hit->subject}\"";
        }

        return null;
    }
}
