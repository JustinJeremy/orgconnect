<?php

use App\Support\Schedule;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Tutoring sessions meet on one date and time (picked from a calendar) instead of weekly text, and have a
// format like events (F2F, Online, Hybrid). Each org keeps its own list of rooms for the location dropdowns.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tutoring_sessions', function (Blueprint $table) {
            $table->date('date')->nullable()->after('area');
            $table->string('time', 5)->nullable()->after('date');   // "15:00"
            $table->string('mode')->default('F2F')->after('time');  // F2F | Online | Hybrid
        });
        Schema::table('organizations', function (Blueprint $table) {
            $table->json('rooms')->nullable()->after('tutoring_areas');
        });

        // Sessions already posted ("Mondays, 3:00 PM"): their next meeting day becomes their date
        foreach (DB::table('tutoring_sessions')->get() as $session) {
            [$date, $time] = Schedule::fromWeekly((string) $session->schedule);
            DB::table('tutoring_sessions')->where('id', $session->id)->update([
                'date' => $date, 'time' => $time, 'mode' => Schedule::modeFor($session->location),
                'schedule' => Schedule::label($date, $time),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('tutoring_sessions', function (Blueprint $table) {
            $table->dropColumn(['date', 'time', 'mode']);
        });
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn('rooms');
        });
    }
};
