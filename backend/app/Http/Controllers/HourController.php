<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ListsOrPages;
use App\Http\Controllers\Concerns\OfficerOnly;
use App\Http\Requests\DecideHourRequest;
use App\Http\Requests\StoreHourRequest;
use App\Models\User;
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
        $data = $request->validated();

        $hour->update([
            'status' => $data['status'],
            'reviewed_by' => $request->user()->id,
        ]);

        UserNotification::send(
            $hour->user_id,
            "Your {$hour->hours} hrs for {$hour->activity} were " . strtolower($data['status'])
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
    public function leaderboard()
    {
        return VolunteerHour::selectRaw('user_id, SUM(hours) as total')
            ->where('status', 'Approved')
            ->groupBy('user_id')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'id' => $row->user_id,
                'name' => User::find($row->user_id)?->name,
                'hours' => (float) $row->total,
            ]);
    }
}
