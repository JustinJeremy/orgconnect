<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Orgs can now be registered by students and reviewed by a platform admin:
//   Pending (waiting for the admin) -> Active, or Rejected; an Active org can be Suspended.
// Also: platform admin accounts, and per-org colors (Data Science Society becomes green).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('status')->default('Active')->after('slug');   // Pending | Active | Rejected | Suspended
            $table->foreignId('requested_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->string('proof_url')->nullable()->after('requested_by');  // proof the school recognizes the org
            $table->text('review_note')->nullable()->after('proof_url');     // the admin's reason when rejecting
            $table->timestamp('reviewed_at')->nullable()->after('review_note');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false)->after('password');
        });

        // Computer Society keeps the default navy palette from App.css; DSS gets its own green one
        DB::table('organizations')->where('slug', 'computer-society')->update(['theme' => json_encode([])]);
        DB::table('organizations')->where('slug', 'data-science-society')->update(['theme' => json_encode(self::GREEN)]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_admin');
        });
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('requested_by');
            $table->dropColumn(['status', 'proof_url', 'review_note', 'reviewed_at']);
        });
    }

    public const GREEN = [
        'navy' => '#1d5a3c', 'navyDark' => '#144530', 'navy2' => '#2a6e4e',
        'sky' => '#d2ecdb', 'skySoft' => '#e8f5ec', 'skyRgb' => '210, 236, 219', 'bg' => '#f3f9f5',
        'primaryLine' => '#b5d9c2', 'sidebarMuted' => '#c4e2cf', 'ring1' => '#2f7352', 'ring2' => '#276446',
        'pageFrom' => '#ecf6f0', 'softInk' => '#557566', 'softInk2' => '#8aaa98',
        'cardLine' => '#d6e8dc', 'cardLineStrong' => '#b9d8c5', 'metaInk' => '#5f7a6c', 'metaInkStrong' => '#3d5a4b',
    ];
};
