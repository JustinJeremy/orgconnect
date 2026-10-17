<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Batch 21: chats between two people now belong to an org (they're messaged from inside it).
// Earlier chats get an org both people are active in; a chat with no shared org is removed.
return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('conversations')->where('kind', 'direct')->whereNull('organization_id')->get() as $c) {
            $shared = DB::table('membership_records as a')
                ->join('membership_records as b', 'a.organization_id', '=', 'b.organization_id')
                ->where('a.user_id', $c->user_one_id)->where('b.user_id', $c->user_two_id)
                ->where('a.status', 'Active')->where('b.status', 'Active')
                ->orderBy('a.organization_id')->value('a.organization_id');
            $shared
                ? DB::table('conversations')->where('id', $c->id)->update(['organization_id' => $shared])
                : DB::table('conversations')->where('id', $c->id)->delete();
        }
    }

    public function down(): void
    {
        // Nothing to undo: the chats keep their org
    }
};
