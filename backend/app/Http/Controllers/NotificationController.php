<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ListsOrPages;
use App\Models\Organization;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use ListsOrPages;

    // What each type filter matches, by the page the notification links to
    private const TYPES = [
        'events' => ['events'],
        'hours' => ['hours'],
        'tutoring' => ['tutoring'],
        'announcements' => ['announcements'],
    ];

    // Yours in the selected org, plus platform ones (organization_id null: org request rejected, org suspended)
    private function mine(Request $request): Builder
    {
        return UserNotification::withoutGlobalScope('organization')
            ->where('user_id', $request->user()->id)
            ->where(fn (Builder $q) => $q->where('organization_id', Organization::current()?->id)->orWhereNull('organization_id'));
    }

    // GET /api/notifications -> the signed-in user's notifications, newest first
    //   no ?page: the latest 30 (the bell)
    //   ?page=N: the Notifications page, with ?view=unread and ?type=events|hours|tutoring|announcements|membership
    public function index(Request $request)
    {
        $query = $this->mine($request)
            ->when($request->input('view') === 'unread', fn ($q) => $q->where('is_read', false))
            ->latest()->latest('id');

        $type = $request->input('type');
        if (isset(self::TYPES[$type])) {
            $query->where(fn (Builder $q) => collect(self::TYPES[$type])->each(fn ($page) => $q->orWhere('link', 'like', "{$page}%")));
        } elseif ($type === 'membership') {
            // Applications, approvals, inactive and reactivation: everything that isn't one of the above
            $query->where(fn (Builder $q) => $q->whereNull('link')->orWhere(fn (Builder $r) => collect(self::TYPES)->flatten()
                ->each(fn ($page) => $r->where('link', 'not like', "{$page}%"))));
        }

        if (! $request->has('page')) {
            return $query->limit(30)->get()->map->toFrontend();
        }

        return $this->listOrPage($request, $query, fn (UserNotification $n) => $n->toFrontend());
    }

    // POST /api/notifications/{id}/read  -> mark one as read (when it is clicked)
    public function read(Request $request, int $id)
    {
        $notification = $this->mine($request)->findOrFail($id);
        $notification->update(['is_read' => true]);

        return $notification->toFrontend();
    }

    // POST /api/notifications/read-all
    public function readAll(Request $request)
    {
        $this->mine($request)->update(['is_read' => true]);

        return ['ok' => true];
    }
}
