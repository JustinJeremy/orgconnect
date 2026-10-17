<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Batch 20: messages.
//   conversations.kind:
//     direct  - two friends (user_one_id < user_two_id)
//     org     - an org's officers and the OrgConnect admin (organization_id)
//     request - someone registering an org and the admin, about that request (organization_id)
//   conversation_reads: the last message each person has read in a conversation (for unread counts)
//   organizations.changes_requested_at: the admin asked for changes to a pending request
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->string('kind');
            $table->foreignId('organization_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('user_one_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('user_two_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
            $table->unique(['kind', 'organization_id', 'user_one_id', 'user_two_id'], 'conversations_who_unique');
        });
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
        });
        Schema::create('conversation_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('last_read_message_id')->default(0);
            $table->unique(['conversation_id', 'user_id']);
        });
        Schema::table('organizations', function (Blueprint $table) {
            $table->timestamp('changes_requested_at')->nullable()->after('reviewed_at');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', fn (Blueprint $table) => $table->dropColumn('changes_requested_at'));
        Schema::dropIfExists('conversation_reads');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
    }
};
