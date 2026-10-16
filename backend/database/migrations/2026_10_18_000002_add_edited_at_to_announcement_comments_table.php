<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// A comment can be edited once: edited_at is set on that edit, and then no more edits are allowed
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcement_comments', function (Blueprint $table) {
            $table->timestamp('edited_at')->nullable()->after('text');
        });
    }

    public function down(): void
    {
        Schema::table('announcement_comments', function (Blueprint $table) {
            $table->dropColumn('edited_at');
        });
    }
};
