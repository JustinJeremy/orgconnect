<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// An applicant's optional message to the officers, and the officers' reason when they reject an application
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('membership_records', function (Blueprint $table) {
            $table->text('application_message')->nullable()->after('join_date');
            $table->text('rejection_reason')->nullable()->after('application_message');
            $table->foreignId('rejected_by')->nullable()->after('rejection_reason')->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable()->after('rejected_by');
        });
    }

    public function down(): void
    {
        Schema::table('membership_records', function (Blueprint $table) {
            $table->dropConstrainedForeignId('rejected_by');
            $table->dropColumn(['application_message', 'rejection_reason', 'rejected_at']);
        });
    }
};
