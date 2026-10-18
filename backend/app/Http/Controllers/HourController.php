<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ListsOrPages;
use App\Http\Controllers\Concerns\OfficerOnly;
use App\Http\Requests\DecideHourRequest;
use App\Http\Requests\StoreHourRequest;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\VolunteerHour;
use Illuminate\Http\Request;

class HourController extends Controller
{
    use ListsOrPages, OfficerOnly;

    // GET /api/hours  (officers get every log, members get their own; ?mine=1: just your own)
    public function index(Request $request)
    {
        $user = $request->user();

        // List filters: ?status= &search= (+ ?page)
        $query = VolunteerHour::with('user.membership')
            ->when(! $user->isOfficer() || $request->boolean('mine'), fn ($q) => $q->where('user_id', $user->id))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->latest('date')
            ->latest('id');
        $this->search($request, $query, ['activity'], ['user' => 'name']);

        return $this->listOrPage($request, $query, fn (VolunteerHour $h) => $h->toFrontend());
    }

    // POST /api/hours
    public function store(StoreHourRequest $request)
    {
        $user = $request->user();
        $log = $user->hourLogs()->create($request->validated() + ['status' => 'Pending']);

        // The officers who review it hear about it (an officer's own hours: the President, VPs and Secretary)
        UserNotification::send(VolunteerHour::reviewersFor($user->id, Organization::current()->id), "{$user->name} logged {$log->hours} hrs for {$log->activity}", "hours/{$log->id}");

        return response()->json($log->load('user.membership')->toFrontend(), 201);
    }

    // PATCH /api/hours/{hour}  (officers approve or reject)
    public function decide(DecideHourRequest $request, VolunteerHour $hour)
    {
        $this->officerOnly($request);
        abort_if($hour->user_id === $request->user()->id, 403, 'Another officer has to review your own hours.');
        abort_unless(VolunteerHour::reviewersFor($hour->user_id, Organization::current()->id)->contains($request->user()->id), 403,
            "Only the President, VPs and Secretary review an officer's hours.");
        abort_unless($hour->status === 'Pending', 422, "This log was already {$hour->status}.");
        $data = $request->validated();

        $rejected = $data['status'] === 'Rejected';
        $reason = $rejected ? trim($data['reason']) : null;
        $hour->update([
            'status' => $data['status'],
            'reviewed_by' => $request->user()->id,
            'rejection_reason' => $reason,
        ]);

        UserNotification::send(
            $hour->user_id,
            "Your {$hour->hours} hrs for {$hour->activity} were ".strtolower($data['status']).($rejected ? ". Reason: {$reason}" : ''),
            "hours/{$hour->id}"
        );

        return $hour->load('user.membership')->toFrontend();
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
            ->pipe(function ($rows) {
                $people = User::whereIn('id', $rows->pluck('id'))->get()->keyBy('id');

                return $rows->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'hours' => (float) $row->total] + ($people[$row->id]?->avatarData() ?? []));
            });
    }
}
