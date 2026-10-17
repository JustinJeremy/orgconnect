<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Topics an event or tutoring session covers, e.g. ["Blockchain", "Smart contracts"], shown in its details
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->json('topics')->nullable()->after('description');
        });
        Schema::table('tutoring_sessions', function (Blueprint $table) {
            $table->json('topics')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('events', fn (Blueprint $table) => $table->dropColumn('topics'));
        Schema::table('tutoring_sessions', fn (Blueprint $table) => $table->dropColumn('topics'));
    }
};
