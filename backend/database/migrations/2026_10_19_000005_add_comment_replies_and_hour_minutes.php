<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Replies to announcement comments (one level: a reply belongs to a top-level comment),
// and hour logs in minutes too (e.g. 1 hr 15 min = 1.25, so two decimals instead of one)
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcement_comments', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->after('user_id')->constrained('announcement_comments')->cascadeOnDelete();
        });
        Schema::table('volunteer_hours', function (Blueprint $table) {
            $table->decimal('hours', 5, 2)->change();
        });
    }

    public function down(): void
    {
        Schema::table('announcement_comments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
        });
        Schema::table('volunteer_hours', function (Blueprint $table) {
            $table->decimal('hours', 4, 1)->change();
        });
    }
};
