<?php

namespace App\Support;

use App\Models\Organization;

// Colors a new org can pick (at registration, or later through an admin-reviewed details change).
// Shades of blue that aren't already in use: Computer Society keeps the default navy (#1b3a6b) and
// Data Science Society its ocean blue (#0e5c7e). Each org gets its own: a color another org already
// has (or has asked for) can't be picked again. The palette keys match frontend/src/utils/theme.js.
// Generated from one base color each (scratchpad themes.py), the way DSS's palette relates to its base.
class OrgThemes
{
    public const PRESETS = [
        'royal' => ['label' => 'Royal blue', 'theme' => ['navy' => '#2448b8', 'navyDark' => '#1c3890', 'navy2' => '#3a5abf', 'sky' => '#d8def2', 'skySoft' => '#ebeff9', 'skyRgb' => '216, 222, 242', 'bg' => '#f4f6fb', 'primaryLine' => '#bdc8ea', 'sidebarMuted' => '#cdd5ef', 'ring1' => '#3153bc', 'ring2' => '#2041a6', 'pageFrom' => '#edf0f9', 'softInk' => '#5b6ea0', 'softInk2' => '#8696be', 'cardLine' => '#dce2f4', 'cardLineStrong' => '#c2cceb', 'metaInk' => '#60729e', 'metaInkStrong' => '#3a508c']],
        'indigo' => ['label' => 'Indigo', 'theme' => ['navy' => '#3b3a9c', 'navyDark' => '#2e2d7a', 'navy2' => '#4f4ea6', 'sky' => '#dcdced', 'skySoft' => '#ededf6', 'skyRgb' => '220, 220, 237', 'bg' => '#f5f5fa', 'primaryLine' => '#c4c4e1', 'sidebarMuted' => '#d2d2e8', 'ring1' => '#4746a2', 'ring2' => '#35348c', 'pageFrom' => '#efeff7', 'softInk' => '#646995', 'softInk2' => '#8d92b5', 'cardLine' => '#e0dfef', 'cardLineStrong' => '#c8c8e3', 'metaInk' => '#686d94', 'metaInkStrong' => '#46497e']],
        'sky' => ['label' => 'Sky blue', 'theme' => ['navy' => '#1f7ac2', 'navyDark' => '#185f97', 'navy2' => '#3587c8', 'sky' => '#d7e7f4', 'skySoft' => '#ebf3fa', 'skyRgb' => '215, 231, 244', 'bg' => '#f4f8fc', 'primaryLine' => '#bcd7ed', 'sidebarMuted' => '#cbe0f1', 'ring1' => '#2c82c6', 'ring2' => '#1c6eaf', 'pageFrom' => '#edf4fa', 'softInk' => '#5982a4', 'softInk2' => '#84a5c1', 'cardLine' => '#dbeaf5', 'cardLineStrong' => '#c0daee', 'metaInk' => '#5e83a2', 'metaInkStrong' => '#386991']],
        'steel' => ['label' => 'Steel blue', 'theme' => ['navy' => '#3e5c7a', 'navyDark' => '#30485f', 'navy2' => '#516c87', 'sky' => '#dce2e7', 'skySoft' => '#eef0f3', 'skyRgb' => '220, 226, 231', 'bg' => '#f5f7f8', 'primaryLine' => '#c5ced7', 'sidebarMuted' => '#d3dae0', 'ring1' => '#4a6682', 'ring2' => '#38536e', 'pageFrom' => '#f0f2f4', 'softInk' => '#667687', 'softInk2' => '#8e9cab', 'cardLine' => '#e0e5ea', 'cardLineStrong' => '#c9d1da', 'metaInk' => '#697988', 'metaInkStrong' => '#475a6d']],
        'midnight' => ['label' => 'Midnight', 'theme' => ['navy' => '#10203f', 'navyDark' => '#0c1931', 'navy2' => '#283652', 'sky' => '#d4d7dc', 'skySoft' => '#e9ebee', 'skyRgb' => '212, 215, 220', 'bg' => '#f3f4f5', 'primaryLine' => '#b7bcc5', 'sidebarMuted' => '#c8ccd3', 'ring1' => '#1e2d4b', 'ring2' => '#0e1d39', 'pageFrom' => '#ecedf0', 'softInk' => '#535e70', 'softInk2' => '#808a99', 'cardLine' => '#d9dbe0', 'cardLineStrong' => '#bcc1c9', 'metaInk' => '#596474', 'metaInkStrong' => '#303c50']],
    ];

    // The keys other orgs already use or have asked for (Pending, Active or Suspended)
    public static function taken(?int $exceptOrganizationId = null): array
    {
        return Organization::whereIn('status', ['Pending', 'Active', 'Suspended'])
            ->when($exceptOrganizationId, fn ($q) => $q->where('id', '!=', $exceptOrganizationId))
            ->get(['id', 'theme'])
            ->map(fn (Organization $o) => $o->theme['key'] ?? null)
            ->filter()->values()->all();
    }

    // [{ key, label, theme, taken }] for the color picker
    public static function options(?int $exceptOrganizationId = null): array
    {
        $taken = self::taken($exceptOrganizationId);

        return collect(self::PRESETS)->map(fn ($p, $key) => [
            'key' => $key, 'label' => $p['label'], 'theme' => $p['theme'], 'taken' => in_array($key, $taken, true),
        ])->values()->all();
    }

    // { key, label, color } for any org's theme, including the two built-in ones
    public static function describe(?array $theme): array
    {
        $key = $theme['key'] ?? null;
        if ($key && isset(self::PRESETS[$key])) {
            return ['key' => $key, 'label' => self::PRESETS[$key]['label'], 'color' => self::PRESETS[$key]['theme']['navy']];
        }
        if (! empty($theme['navy'])) {
            return ['key' => null, 'label' => 'Ocean blue', 'color' => $theme['navy']];   // Data Science Society
        }

        return ['key' => null, 'label' => 'Navy (default)', 'color' => '#1b3a6b'];
    }

    // The stored theme for a key: the palette plus the key, so the org's choice can be told apart later
    public static function theme(string $key): array
    {
        return self::PRESETS[$key]['theme'] + ['key' => $key];
    }
}
