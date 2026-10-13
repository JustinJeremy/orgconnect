<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Lets OrgConnect hold several student organizations.
// Everything that already exists is moved into the first org (Computer Society).
return new class extends Migration
{
    // Tables whose rows belong to one organization
    private const SCOPED_TABLES = ['events', 'volunteer_hours', 'tutoring_sessions', 'learning_resources', 'announcements', 'user_notifications'];

    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('short_name');
            $table->string('college');
            $table->string('tagline');
            $table->text('description');
            $table->text('mission')->nullable();
            $table->text('vision')->nullable();
            $table->unsignedSmallInteger('founded_year')->nullable();
            $table->string('adviser')->nullable();
            $table->string('email')->nullable();
            $table->string('facebook_url')->nullable();
            $table->string('office')->nullable();
            $table->string('meeting_schedule')->nullable();
            $table->string('membership_fee')->nullable();
            $table->json('courses')->nullable();        // courses that can join, e.g. ["BSIT", "BSCS"]
            $table->json('theme');                      // color palette used by the frontend
            $table->timestamps();
        });

        $orgId = DB::table('organizations')->insertGetId([
            'slug' => 'computer-society',
            'name' => 'Computer Society',
            'short_name' => 'CompSoc',
            'college' => 'College of Computer Studies',
            'tagline' => 'Code, connect and give back.',
            'description' => 'The official academic organization of the College of Computer Studies. CompSoc runs workshops, hackathons and outreach programs, and connects IT and CS students with peer tutors and industry mentors.',
            'mission' => 'To develop competent and socially responsible computing professionals through hands-on learning, peer support and community service.',
            'vision' => 'A community of CCS students who use technology to solve real problems in their school and community.',
            'founded_year' => 2009,
            'adviser' => 'Prof. Ramon Villanueva',
            'email' => 'compsoc.ccs@school.edu.ph',
            'facebook_url' => 'https://facebook.com/ccs.compsoc',
            'office' => 'CCS Building, Room 304',
            'meeting_schedule' => 'General assembly every first Friday, 4:00 PM',
            'membership_fee' => '₱150 per school year',
            'courses' => json_encode(['BSIT', 'BSCS', 'BSIS', 'BSEMC']),
            'theme' => json_encode([
                'navy' => '#1e3a6e', 'navyDark' => '#152b54', 'navy2' => '#2a4a86', 'brand' => '#2350c8',
                'accent' => '#e5701f', 'accentDark' => '#c95f15', 'highlight' => '#fb923c',
                'bg' => '#f5f7fc', 'tint' => '#eef3fd', 'primarySoft' => '#e7edf8', 'primaryLine' => '#c5d2ea',
                'accentSoft' => '#fdeee2', 'sidebarMuted' => '#b8c5e3', 'ring1' => '#3b5ba9', 'ring2' => '#2b4a8f',
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach (self::SCOPED_TABLES as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->foreignId('organization_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            });
            DB::table($name)->update(['organization_id' => $orgId]);
        }

        // Events can be face-to-face, online or both
        Schema::table('events', function (Blueprint $table) {
            $table->string('mode')->default('F2F')->after('location');   // F2F | Online | Hybrid
        });

        // A person can now be in several orgs, with a different role in each
        Schema::table('membership_records', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable()->after('user_id')->constrained()->cascadeOnDelete();
            $table->string('role')->default('member')->after('organization_id');   // officer | member
            $table->unique(['user_id', 'organization_id']);
        });
        Schema::table('membership_records', function (Blueprint $table) {
            $table->dropUnique(['user_id']);
        });

        DB::table('users')->orderBy('id')->each(function ($user) use ($orgId) {
            DB::table('membership_records')->where('user_id', $user->id)->update([
                'organization_id' => $orgId,
                'role' => $user->role ?? 'member',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('member');
        });

        $firstOrg = DB::table('organizations')->orderBy('id')->value('id');
        DB::table('membership_records')->where('organization_id', $firstOrg)->orderBy('id')->each(function ($record) {
            DB::table('users')->where('id', $record->user_id)->update(['role' => $record->role]);
        });
        DB::table('membership_records')->where('organization_id', '!=', $firstOrg)->delete();

        Schema::table('membership_records', function (Blueprint $table) {
            $table->unique('user_id');
        });
        Schema::table('membership_records', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'organization_id']);
            $table->dropConstrainedForeignId('organization_id');
            $table->dropColumn('role');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('mode');
        });

        foreach (self::SCOPED_TABLES as $name) {
            DB::table($name)->where('organization_id', '!=', $firstOrg)->delete();
            Schema::table($name, function (Blueprint $table) {
                $table->dropConstrainedForeignId('organization_id');
            });
        }

        Schema::dropIfExists('organizations');
    }
};
