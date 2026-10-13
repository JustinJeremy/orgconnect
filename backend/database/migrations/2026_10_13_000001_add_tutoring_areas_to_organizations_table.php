<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Each org picks its own tutoring areas (used for sessions and shared resources),
// e.g. Computer Society: Web Development, Networking; Data Science Society: Statistics, Machine Learning.
return new class extends Migration
{
    private const AREAS = [
        'computer-society' => ['Programming', 'Web Development', 'Databases', 'Networking', 'Mathematics', 'Other'],
        'data-science-society' => ['Python', 'SQL & Databases', 'Statistics', 'Machine Learning', 'Data Visualization', 'Other'],
    ];

    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->json('tutoring_areas')->nullable()->after('courses');
        });

        foreach (self::AREAS as $slug => $areas) {
            DB::table('organizations')->where('slug', $slug)->update(['tutoring_areas' => json_encode($areas)]);
        }
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn('tutoring_areas');
        });
    }
};
