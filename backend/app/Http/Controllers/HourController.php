<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ListsOrPages;
use App\Http\Controllers\Concerns\OfficerOnly;
use App\Http\Requests\DecideHourRequest;
use App\Http\Requests\StoreHourRequest;
use App\Models\Organization;
use App\Models\UserNotification;
use App\Models\VolunteerHour;
use Illuminate\Http\Request;

class HourController extends Controller
{
    use ListsOrPages, OfficerOnly;

    // GET /api/hours  (officers get every log, members get their own)
    public function index(Request $request)
    {
        $user = $request->user();

        // List filters: ?status= &search= (+ ?page)
        $query = VolunteerHour::with('user')
            ->when(! $user->isOfficer(), fn ($q) => $q->where('user_id', $user->id))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->latest('date')
            ->latest('id');
        $this->search($request, $query, ['activity'], ['user' => 'name']);

        return $this->listOrPage($request, $query, fn (VolunteerHour $h) => $h->toFrontend());
    }

    // POST /api/hours
    public function store(StoreHourRequest $request)
    {
        $log = $request->user()->hourLogs()->create($request->validated() + ['status' => 'Pending']);

        return response()->json($log->load('user')->toFrontend(), 201);
    }

    // PATCH /api/hours/{hour}  (officers approve or reject)
    public function decide(DecideHourRequest $request, VolunteerHour $hour)
    {
        $this->officerOnly($request);
        abort_if($hour->user_id === $request->user()->id, 403, 'Another officer has to review your own hours.');
        abort_unless($hour->status === 'Pending', 422, "This log was already {$hour->status}.");
        $data = $request->validated();

        $hour->update([
            'status' => $data['status'],
            'reviewed_by' => $request->user()->id,
        ]);

        UserNotification::send(
            $hour->user_id,
            "Your {$hour->hours} hrs for {$hour->activity} were " . strtolower($data['status']),
            'hours'
        );

        return $hour->load('user')->toFrontend();
    }

    // DELETE /api/hours/{hour}  (members can delete their own pending logs)
    public function destroy(Request $request, VolunteerHour $hour)
    {
        $user = $request->user();
        $canDelete = $user->isOfficer() || ($hour->user_id === $user->id && $hour->status === 'Pending');
        abort_unless($canDelete, 403, 'You can only delete your own pending logs.');

        $hour->delete();

        return ['ok' => true];
    }

    // GET /api/leaderboard  -> top members by approved hours
    // Only people still on this org's roster (active or inactive); one query for names and totals
    public function leaderboard()
    {
        return VolunteerHour::query()
            ->join('users', 'users.id', '=', 'volunteer_hours.user_id')
            ->join('membership_records as m', fn ($join) => $join
                ->on('m.user_id', '=', 'users.id')
                ->where('m.organization_id', Organization::current()->id)
                ->whereIn('m.status', ['Active', 'Inactive']))
            ->where('volunteer_hours.status', 'Approved')
            ->groupBy('volunteer_hours.user_id', 'users.name')
            ->selectRaw('volunteer_hours.user_id as id, users.name as name, SUM(volunteer_hours.hours) as total')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'hours' => (float) $row->total]);
    }
}
