<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Batch 19:
//   - reasons: why an hour log or tutoring request was rejected, why an org was suspended,
//     and the admin's message when approving an org
//   - platform announcements from the OrgConnect admin, sent to presidents, officers, members or
//     everyone (all orgs or chosen ones), with a reply thread per org (presidents, VPs, secretaries and the admin)
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('volunteer_hours', function (Blueprint $table) {
            $table->string('rejection_reason', 500)->nullable()->after('status');
        });
        Schema::table('tutoring_requests', function (Blueprint $table) {
            $table->string('rejection_reason', 500)->nullable()->after('status');
        });
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('suspension_reason', 500)->nullable()->after('review_note');
        });

        Schema::create('platform_announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();   // the admin who sent it
            $table->string('title');
            $table->text('content');
            $table->string('audience');   // presidents | officers | members | everyone
            $table->json('organization_ids')->nullable();   // null: every org
            $table->timestamps();
        });
        Schema::create('platform_announcement_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('platform_announcement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();   // whose thread
            $table->foreignId('user_id')->constrained();
            $table->text('text');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_announcement_replies');
        Schema::dropIfExists('platform_announcements');
        Schema::table('organizations', fn (Blueprint $table) => $table->dropColumn('suspension_reason'));
        Schema::table('tutoring_requests', fn (Blueprint $table) => $table->dropColumn('rejection_reason'));
        Schema::table('volunteer_hours', fn (Blueprint $table) => $table->dropColumn('rejection_reason'));
    }
};
