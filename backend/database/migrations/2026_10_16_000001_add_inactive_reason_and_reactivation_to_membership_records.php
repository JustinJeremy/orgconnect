<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Why a membership was made inactive (shown to the member), and their request to be reactivated
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('membership_records', function (Blueprint $table) {
            $table->text('inactive_reason')->nullable()->after('join_date');
            $table->foreignId('inactive_by')->nullable()->after('inactive_reason')->constrained('users')->nullOnDelete();
            $table->timestamp('inactive_at')->nullable()->after('inactive_by');
            $table->text('reactivation_message')->nullable()->after('inactive_at');
            $table->timestamp('reactivation_requested_at')->nullable()->after('reactivation_message');
        });
    }

    public function down(): void
    {
        Schema::table('membership_records', function (Blueprint $table) {
            $table->dropConstrainedForeignId('inactive_by');
            $table->dropColumn(['inactive_reason', 'inactive_at', 'reactivation_message', 'reactivation_requested_at']);
        });
    }
};
