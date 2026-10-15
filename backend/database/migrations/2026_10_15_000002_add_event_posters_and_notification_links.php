<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Events can have a poster image; notifications remember which page they open (events, hours, ...)
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('poster_path')->nullable()->after('description');
        });
        Schema::table('user_notifications', function (Blueprint $table) {
            $table->string('link', 40)->nullable()->after('message');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('poster_path');
        });
        Schema::table('user_notifications', function (Blueprint $table) {
            $table->dropColumn('link');
        });
    }
};
