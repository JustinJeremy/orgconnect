<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Older notifications were saved with no link, or a link to the dashboard, so clicking them went
// nowhere useful. Point them at their page, and at the exact item where it can be found:
//   applications / reactivation requests -> "applications"
//   "<name> commented on <title>"         -> "announcements/<id>" (the post with that title)
//   "New announcement: <title>"           -> "announcements/<id>"
//   "New event: <title>", certificates     -> "events/<id>"
return new class extends Migration
{
    public function up(): void
    {
        $old = fn () => DB::table('user_notifications')->where(fn ($q) => $q->whereNull('link')->orWhere('link', 'dashboard'));

        $old()->where(fn ($q) => $q->where('message', 'like', '%applied to join%')->orWhere('message', 'like', '%asked to be reactivated%'))
            ->update(['link' => 'applications']);

        $patterns = [
            ['/ commented on (.+)$/', 'announcements', 'announcements'],
            ['/^New announcement: (.+)$/', 'announcements', 'announcements'],
            ['/^New event: (.+)$/', 'events', 'events'],
            ['/^Your certificate for (.+) is ready$/', 'events', 'events'],
        ];

        foreach ($old()->get(['id', 'message', 'organization_id']) as $n) {
            foreach ($patterns as [$regex, $table, $page]) {
                if (! preg_match($regex, $n->message, $m)) {
                    continue;
                }
                $id = DB::table($table)->where('organization_id', $n->organization_id)->where('title', $m[1])->value('id');
                DB::table('user_notifications')->where('id', $n->id)->update(['link' => $id ? "{$page}/{$id}" : $page]);
                break;
            }
        }
    }

    public function down(): void
    {
        // Links are only more specific now; nothing to undo
    }
};
