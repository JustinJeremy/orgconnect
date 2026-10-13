<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tutoring_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tutor_id')->constrained('users')->cascadeOnDelete();
            $table->string('subject');
            $table->string('area');
            $table->string('schedule');
            $table->string('location');
            $table->unsignedInteger('slots')->default(1);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('tutoring_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tutoring_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('Pending');      // Pending | Confirmed | Rejected | Completed
            $table->timestamps();
            $table->unique(['tutoring_session_id', 'user_id']);
        });

        Schema::create('learning_resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('subject');
            $table->string('type')->default('PDF');            // PDF | Link
            $table->string('url');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_resources');
        Schema::dropIfExists('tutoring_requests');
        Schema::dropIfExists('tutoring_sessions');
    }
};
