<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Moves membership info (position, status, join date) out of `users`
// into its own table, as planned in the project proposal.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('membership_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('position')->default('Member');     // President, Secretary, Member...
            $table->string('status')->default('Pending');      // Pending | Active | Inactive | Rejected
            $table->date('join_date')->nullable();
            $table->timestamps();
        });

        // Copy what is already stored on the users table
        DB::table('users')->orderBy('id')->each(function ($user) {
            DB::table('membership_records')->insert([
                'user_id' => $user->id,
                'position' => $user->position ?? 'Member',
                'status' => $user->membership_status ?? 'Pending',
                'join_date' => $user->joined_at,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['position', 'membership_status', 'joined_at']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('position')->default('Member');
            $table->string('membership_status')->default('Pending');
            $table->date('joined_at')->nullable();
        });

        DB::table('membership_records')->orderBy('id')->each(function ($record) {
            DB::table('users')->where('id', $record->user_id)->update([
                'position' => $record->position,
                'membership_status' => $record->status,
                'joined_at' => $record->join_date,
            ]);
        });

        Schema::dropIfExists('membership_records');
    }
};
