<?php

namespace App\Support;

use Illuminate\Support\Carbon;

// Dates, times and places of events and tutoring sessions
class Schedule
{
    // Meeting apps picked for Online (and the online half of Hybrid); same list in frontend/src/data/constants.js
    public const PLATFORMS = ['Google Meet', 'Zoom', 'Microsoft Teams'];

    // "Mon, Oct 26 · 3:00 PM" (shown on cards and in search)
    public static function label(Carbon|string $date, string $time): string
    {
        return Carbon::parse($date)->format('D, M j').' · '.Carbon::parse($time)->format('g:i A');
    }

    // Older tutoring sessions were weekly text like "Mondays, 3:00 PM": the next such day (today counts)
    // and its time, e.g. ['2026-10-26', '15:00']. No weekday: a week from today; no time: 3:00 PM.
    public static function fromWeekly(string $text, ?Carbon $from = null): array
    {
        $from = ($from ?? now())->copy()->startOfDay();
        $lower = strtolower($text);
        $days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        $weekday = collect($days)->search(fn ($d) => preg_match("/\\b{$d}/", $lower));
        $date = $weekday === false ? $from->addWeek() : $from->addDays(($weekday - $from->dayOfWeek + 7) % 7);

        $time = '15:00';
        if (preg_match('/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/', $lower, $t)) {
            $ampm = $t[3] ?? '';
            $hour = (int) $t[1] % 12;
            if ($ampm === 'pm' || ($ampm === '' && ((int) $t[1] < 7 || (int) $t[1] === 12))) {
                $hour += 12;   // "3:00" with no am/pm: a class-day afternoon
            }
            $time = sprintf('%02d:%s', $hour, ($t[2] ?? '') ?: '00');
        }

        return [$date->toDateString(), $time];
    }

    // How people attend, guessed from an older location: "Google Meet" -> Online, "Room 210 + Zoom" -> Hybrid
    public static function modeFor(?string $location): string
    {
        $online = self::isOnline($location);

        return str_contains((string) $location, ' + ') && $online ? 'Hybrid' : ($online ? 'Online' : 'F2F');
    }

    // The room part of a location ("Room 210 + Zoom" -> "Room 210"); null when it's only online
    public static function room(?string $location, string $mode): ?string
    {
        if ($mode === 'Online' || ! $location) {
            return null;
        }
        $room = trim(explode(' + ', $location)[0]);

        return $room === '' || self::isOnline($room) ? null : $room;
    }

    private static function isOnline(?string $text): bool
    {
        return (bool) preg_match('/\b(meet|zoom|teams|online|link|https?:)/i', (string) $text);
    }
}
