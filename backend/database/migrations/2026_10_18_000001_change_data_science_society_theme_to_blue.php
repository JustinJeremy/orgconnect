<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Data Science Society: green palette -> ocean blue. A teal-leaning blue, so it fits the
// OrgConnect blues but still reads apart from Computer Society's navy (#1b3a6b).
return new class extends Migration
{
    private const BLUE = [
        'navy' => '#0e5c7e', 'navyDark' => '#0a4862', 'navy2' => '#18708f',
        'sky' => '#cfe8f1', 'skySoft' => '#e7f3f8', 'skyRgb' => '207, 232, 241', 'bg' => '#f2f8fb',
        'primaryLine' => '#b1d5e3', 'sidebarMuted' => '#c3e0eb', 'ring1' => '#1a6b8c', 'ring2' => '#135c7a',
        'pageFrom' => '#eaf4f8', 'softInk' => '#55717f', 'softInk2' => '#8aa6b3',
        'cardLine' => '#d4e6ee', 'cardLineStrong' => '#b6d5e2', 'metaInk' => '#5e7783', 'metaInkStrong' => '#3c5865',
    ];

    private const GREEN = [
        'navy' => '#1d5a3c', 'navyDark' => '#144530', 'navy2' => '#2a6e4e',
        'sky' => '#d2ecdb', 'skySoft' => '#e8f5ec', 'skyRgb' => '210, 236, 219', 'bg' => '#f3f9f5',
        'primaryLine' => '#b5d9c2', 'sidebarMuted' => '#c4e2cf', 'ring1' => '#2f7352', 'ring2' => '#276446',
        'pageFrom' => '#ecf6f0', 'softInk' => '#557566', 'softInk2' => '#8aaa98',
        'cardLine' => '#d6e8dc', 'cardLineStrong' => '#b9d8c5', 'metaInk' => '#5f7a6c', 'metaInkStrong' => '#3d5a4b',
    ];

    public function up(): void
    {
        DB::table('organizations')->where('slug', 'data-science-society')->update(['theme' => json_encode(self::BLUE)]);
    }

    public function down(): void
    {
        DB::table('organizations')->where('slug', 'data-science-society')->update(['theme' => json_encode(self::GREEN)]);
    }
};
