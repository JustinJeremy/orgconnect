<?php

namespace App\Http\Controllers;

use App\Models\MembershipRecord;
use App\Models\Organization;
use App\Models\PlatformAnnouncement;
use App\Models\User;
use App\Models\UserNotification;
use App\Rules\TextFormat;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// Announcements from the OrgConnect admin to presidents, officers, members or every account,
// in every org or chosen ones. Each org has a private reply thread with the admin:
// its President, VPs and Secretary write in it, its other officers can read it, members never see it.
class PlatformAnnouncementController extends Controller
{
    // ---------- The admin ----------

    // GET /api/admin/announcements -> every announcement sent, newest first, with each org's thread
    public function adminIndex()
    {
        $names = Organization::pluck('short_name', 'id');

        return PlatformAnnouncement::with('replies')->latest()->get()->map(fn (PlatformAnnouncement $a) => $a->toFrontend() + [
            'organizations' => $a->organization_ids === null || $a->audience === 'everyone'
                ? null
                : collect($a->organization_ids)->map(fn ($id) => ['id' => $id, 'shortName' => $names[$id] ?? '?'])->values(),
            'recipients' => $a->recipientIds()->count(),
            // Orgs that have written back, newest first
            'threads' => $a->replies->groupBy('organization_id')->map(fn ($replies, $orgId) => [
                'organizationId' => (int) $orgId,
                'shortName' => $names[$orgId] ?? '?',
                'replies' => $replies->count(),
                'lastAt' => $replies->max('created_at')?->format('Y-m-d\TH:i:s'),
                'waiting' => ! $replies->sortBy('id')->last()?->user?->is_admin,   // their message is the latest
            ])->sortByDesc('lastAt')->values(),
        ]);
    }

    // POST /api/admin/announcements  { title, content, audience, organizationIds? (null: every org) }
    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160', TextFormat::words('Title')],
            'content' => ['required', 'string', 'max:5000', TextFormat::words('The announcement')],
            'audience' => ['required', Rule::in(PlatformAnnouncement::AUDIENCES)],
            'organizationIds' => 'nullable|array|min:1',
            'organizationIds.*' => ['integer', Rule::exists('organizations', 'id')->where('status', 'Active')],
        ], ['organizationIds.min' => 'Pick at least one organization, or send it to all of them.']);

        $announcement = PlatformAnnouncement::create([
            'user_id' => $request->user()->id,
            'title' => trim($data['title']),
            'content' => trim($data['content']),
            'audience' => $data['audience'],
            'organization_ids' => $data['audience'] === 'everyone' || empty($data['organizationIds'])
                ? null : array_values(array_unique(array_map('intval', $data['organizationIds']))),
        ]);

        // Not tied to an org: it shows in whichever org they open
        foreach ($announcement->recipientIds() as $userId) {
            UserNotification::platform($userId, "OrgConnect announcement: {$announcement->title}", "announcements/platform/{$announcement->id}");
        }

        return response()->json($announcement->toFrontend() + ['recipients' => $announcement->recipientIds()->count()], 201);
    }

    // DELETE /api/admin/announcements/{announcement}
    public function destroy(PlatformAnnouncement $announcement)
    {
        $announcement->delete();

        return ['ok' => true];
    }

    // GET /api/admin/announcements/{announcement}/replies?org= -> one org's thread
    public function adminReplies(Request $request, PlatformAnnouncement $announcement)
    {
        $orgId = (int) $request->input('org');

        return $announcement->replies()->with('user')->where('organization_id', $orgId)->orderBy('id')->get()->map->toFrontend();
    }

    // POST /api/admin/announcements/{announcement}/replies  { organizationId, text } -> the admin answers an org
    public function adminReply(Request $request, PlatformAnnouncement $announcement)
    {
        $data = $request->validate([
            'organizationId' => ['required', 'integer', Rule::exists('organizations', 'id')],
            'text' => 'required|string|max:2000',
        ]);
        abort_unless($announcement->reachesOrg($data['organizationId']), 422, "This announcement wasn't sent to that organization.");

        $reply = $announcement->replies()->create(['organization_id' => $data['organizationId'], 'user_id' => $request->user()->id, 'text' => trim($data['text'])]);

        // The org's President, VPs and Secretary hear about it
        $org = Organization::find($data['organizationId']);
        foreach ($this->managers($org) as $userId) {
            UserNotification::create([
                'organization_id' => $org->id, 'user_id' => $userId,
                'message' => "The OrgConnect admin replied about: {$announcement->title}",
                'link' => "announcements/platform/{$announcement->id}",
            ]);
        }

        return response()->json($reply->load('user')->toFrontend(), 201);
    }

    // ---------- Members of the selected org ----------

    // GET /api/platform-announcements -> the admin's announcements this person sees in this org
    public function index(Request $request)
    {
        $user = $request->user();
        $membership = $user->membership;
        $org = Organization::current();

        return PlatformAnnouncement::latest()->get()
            ->filter(fn (PlatformAnnouncement $a) => $a->reachesOrg($org->id) && $a->visibleTo($membership))
            ->values()
            ->map(fn (PlatformAnnouncement $a) => $a->toFrontend() + [
                'canReply' => $user->canManageMembers(),
                'seeReplies' => $user->isOfficer(),
                'replies' => $user->isOfficer() ? $a->replies()->where('organization_id', $org->id)->count() : null,
            ]);
    }

    // GET /api/platform-announcements/{announcement}/replies -> this org's thread (officers)
    public function replies(Request $request, PlatformAnnouncement $announcement)
    {
        $this->seeThread($request, $announcement);

        return $announcement->replies()->with('user')->where('organization_id', Organization::current()->id)->orderBy('id')->get()->map->toFrontend();
    }

    // POST /api/platform-announcements/{announcement}/replies  { text }  (President, VPs, Secretary)
    public function reply(Request $request, PlatformAnnouncement $announcement)
    {
        $user = $this->seeThread($request, $announcement);
        abort_unless($user->canManageMembers(), 403, 'Only the President, VPs and Secretary can reply to OrgConnect announcements.');
        $data = $request->validate(['text' => 'required|string|max:2000']);
        $org = Organization::current();

        $reply = $announcement->replies()->create(['organization_id' => $org->id, 'user_id' => $user->id, 'text' => trim($data['text'])]);

        foreach (User::where('is_admin', true)->pluck('id') as $adminId) {
            UserNotification::platform($adminId, "{$org->short_name} replied to your announcement: {$announcement->title}", "announcements/{$announcement->id}");
        }

        return response()->json($reply->load('user')->toFrontend(), 201);
    }

    private function seeThread(Request $request, PlatformAnnouncement $announcement): User
    {
        $user = $request->user();
        abort_unless($announcement->reachesOrg(Organization::current()->id) && $announcement->visibleTo($user->membership), 404);
        abort_unless($user->isOfficer(), 403, "Only your org's officers see replies to OrgConnect announcements.");

        return $user;
    }

    private function managers(Organization $org)
    {
        return MembershipRecord::where('organization_id', $org->id)->where('status', 'Active')
            ->where(fn ($q) => $q->where('position', 'President')->orWhere('position', 'like', 'VP%')->orWhere('position', 'Secretary'))
            ->pluck('user_id');
    }
}
