<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Batch 22: QR check-in. Each event and tutoring session gets a secret code (made the first time an
// officer or the tutor shows its QR; a new one can replace it). Scanning it marks you present:
// for an event, your registration becomes "attended"; for a weekly tutoring session, one row per
// student per meeting day.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('checkin_code', 40)->nullable()->after('status');
        });
        Schema::table('tutoring_sessions', function (Blueprint $table) {
            $table->string('checkin_code', 40)->nullable()->after('slots');
        });
        Schema::create('tutoring_checkins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tutoring_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->timestamps();
            $table->unique(['tutoring_session_id', 'user_id', 'date'], 'tutoring_checkins_once_a_day');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tutoring_checkins');
        Schema::table('tutoring_sessions', fn (Blueprint $table) => $table->dropColumn('checkin_code'));
        Schema::table('events', fn (Blueprint $table) => $table->dropColumn('checkin_code'));
    }
};
