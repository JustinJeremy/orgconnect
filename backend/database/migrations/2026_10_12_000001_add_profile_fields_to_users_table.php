<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('member');                 // officer | member
            $table->string('position')->default('Member');             // President, Secretary, Member...
            $table->string('student_id')->nullable();
            $table->string('course')->nullable();
            $table->string('year_level')->nullable();
            $table->string('membership_status')->default('Pending');   // Pending | Active | Inactive | Rejected
            $table->date('joined_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'position', 'student_id', 'course', 'year_level', 'membership_status', 'joined_at']);
        });
    }
};
