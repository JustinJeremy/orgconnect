<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Friends: one row per pair. user_id sent the request to friend_id; Accepted once friend_id says yes.
// Friendships belong to the accounts, not an org (friends stay friends across orgs).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('friendships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('friend_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('Pending');   // Pending | Accepted
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'friend_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('friendships');
    }
};
