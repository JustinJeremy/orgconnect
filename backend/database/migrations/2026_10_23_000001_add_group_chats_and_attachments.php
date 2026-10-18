<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Batch 23:
//   Group chats (conversations.kind = group): a named chat inside one org (committees, study groups).
//     conversation_members: who is in it; any member can add others from the org, and anyone can leave.
//   messages.notice: a line like "Juan added Maria" (shown in the middle, not counted as unread)
//   One photo or file on a message or an announcement (attachment_*): stored on the public disk under
//   a random name and served through a short-lived signed link, never a guessable address.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('name', 60)->nullable()->after('kind');
            $table->foreignId('created_by')->nullable()->after('user_two_id')->constrained('users')->nullOnDelete();
        });
        Schema::create('conversation_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['conversation_id', 'user_id']);
        });
        Schema::table('messages', function (Blueprint $table) {
            $table->text('body')->nullable()->change();   // a photo or file can be sent on its own
            $table->boolean('notice')->default(false)->after('body');
        });
        foreach (['messages', 'announcements'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->string('attachment_path')->nullable();
                $table->string('attachment_name')->nullable();
                $table->unsignedInteger('attachment_size')->nullable();
                $table->string('attachment_type', 10)->nullable();   // image | file
            });
        }
    }

    public function down(): void
    {
        foreach (['messages', 'announcements'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn(['attachment_path', 'attachment_name', 'attachment_size', 'attachment_type']));
        }
        Schema::table('messages', fn (Blueprint $table) => $table->dropColumn('notice'));
        Schema::dropIfExists('conversation_members');
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn('name');
        });
    }
};
