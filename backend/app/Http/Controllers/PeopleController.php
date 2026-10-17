<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ListsOrPages;
use App\Models\EventRegistration;
use App\Models\Friendship;
use App\Models\MembershipRecord;
use App\Models\Organization;
use App\Models\TutoringRequest;
use App\Models\TutoringSession;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;

// People in the selected org: the directory, each person's profile, the most helpful tutors,
// and your friends (friend requests are between accounts, so friends stay friends across orgs).
class PeopleController extends Controller
{
    use ListsOrPages;

    // GET /api/people?search=&page=  -> active members: your friends first (newest first), then friend
    // requests waiting for you, then ones you sent, then everyone else (officers first), and you last
    public function index(Request $request)
    {
        $me = $request->user();
        $states = $this->friendStates($me->id);   // ordered newest first
        // A position for each person you have a friendship row with (ids are integers from the database)
        $order = collect(['friends', 'received', 'sent'])
            ->flatMap(fn ($state) => array_keys(array_filter($states, fn ($s) => $s === $state)))
            ->map(fn ($id, $i) => 'WHEN '.(int) $id.' THEN '.$i)
            ->implode(' ');
        $query = User::withMembershipStatus(['Active'])
            ->with('membership')
            ->orderByRaw('CASE WHEN users.id = ? THEN 2 '.($order ? 'WHEN users.id IN ('.implode(',', array_map('intval', array_keys($states))).') THEN 0 ' : '').'ELSE 1 END', [$me->id])
            ->when($order, fn ($q) => $q->orderByRaw("CASE users.id {$order} ELSE 0 END"))
            ->orderBy(MembershipRecord::rankIn(Organization::current()->id))
            ->orderBy('name');
        $this->search($request, $query, ['name', 'course'], ['membership' => 'position']);

        return $this->listOrPage($request, $query, fn (User $u) => $this->card($u) + [
            'friendship' => $u->id === $me->id ? 'self' : ($states[$u->id] ?? 'none'),
        ]);
    }

    // GET /api/people/{person}  -> their profile in this org
    public function show(Request $request, User $person)
    {
        $me = $request->user();
        abort_unless(in_array($person->membership->status, ['Active', 'Inactive'], true), 404, 'This person is not in your organization.');
        $friendship = $person->id === $me->id ? 'self' : Friendship::stateFor(Friendship::between($me->id, $person->id), $me->id);
        $taught = fn () => TutoringRequest::where('status', 'Completed')
            ->whereHas('session', fn ($q) => $q->where('tutor_id', $person->id));

        return $this->card($person) + [
            'friendship' => $friendship,
            'status' => $person->membership->status,
            'joinDate' => optional($person->membership->join_date ?? $person->created_at)->format('Y-m-d'),
            // Email only for friends, officers and yourself
            'email' => in_array($friendship, ['self', 'friends'], true) || $me->isOfficer() ? $person->email : null,
            'stats' => [
                'hours' => $person->approvedHours(),
                'eventsAttended' => EventRegistration::where('user_id', $person->id)->where('status', 'attended')->whereHas('event')->count(),
                'sessionsTaught' => $taught()->count(),
                'studentsHelped' => $taught()->distinct()->count('user_id'),
            ],
            'tutoring' => TutoringSession::where('tutor_id', $person->id)->orderBy('subject')->get()
                ->map(fn (TutoringSession $s) => ['id' => $s->id, 'subject' => $s->subject, 'area' => $s->area])->values(),
        ];
    }

    // GET /api/people/helpful  -> { tutors, mine, subjects }
    //   tutors: who taught the most completed sessions in this org (top 10)
    //   mine: your own sessions taught, students helped and place in the ranking (null rank: not ranked yet)
    //   subjects: the tutoring sessions students ask for most (top 5)
    public function helpful(Request $request)
    {
        $me = $request->user()->id;
        $all = TutoringRequest::query()
            ->where('tutoring_requests.status', 'Completed')
            ->join('tutoring_sessions as s', 's.id', '=', 'tutoring_requests.tutoring_session_id')
            ->groupBy('s.tutor_id')
            ->selectRaw('s.tutor_id as id, COUNT(*) as sessions, COUNT(DISTINCT tutoring_requests.user_id) as students')
            ->orderByDesc('sessions')->orderByDesc('students')
            ->get();
        $people = User::withMembershipStatus(['Active', 'Inactive'])->with('membership')
            ->whereIn('users.id', $all->pluck('id'))->get()->keyBy('id');
        $ranked = $all->filter(fn ($row) => isset($people[$row->id]))->values();
        $myRow = $ranked->firstWhere('id', $me);

        $subjects = TutoringRequest::query()
            ->where('tutoring_requests.status', '!=', 'Rejected')
            ->join('tutoring_sessions as s', 's.id', '=', 'tutoring_requests.tutoring_session_id')
            ->join('users as t', 't.id', '=', 's.tutor_id')
            ->groupBy('s.id', 's.subject', 's.area', 't.name')
            ->selectRaw('s.id as id, s.subject as subject, s.area as area, t.name as tutor, COUNT(*) as requests')
            ->orderByDesc('requests')->orderBy('s.subject')
            ->limit(5)
            ->get()
            ->map(fn ($row) => ['id' => (int) $row->id, 'subject' => $row->subject, 'area' => $row->area, 'tutor' => $row->tutor, 'requests' => (int) $row->requests]);

        return [
            'tutors' => $ranked->take(10)
                ->map(fn ($row) => $this->card($people[$row->id]) + ['sessions' => (int) $row->sessions, 'students' => (int) $row->students])
                ->values(),
            'mine' => [
                'sessions' => (int) ($myRow->sessions ?? 0),
                'students' => (int) ($myRow->students ?? 0),
                'rank' => $myRow ? $ranked->search(fn ($row) => $row->id === $me) + 1 : null,
                'of' => $ranked->count(),
                'teaching' => TutoringSession::where('tutor_id', $me)->count(),
            ],
            'subjects' => $subjects,
        ];
    }

    // GET /api/friends  -> { friends, received, sent }  (across every org you're in)
    public function friends(Request $request)
    {
        $me = $request->user()->id;
        $rows = Friendship::with(['sender.memberships.organization', 'receiver.memberships.organization'])
            ->involving($me)->latest('updated_at')->get();
        $other = fn (Friendship $f) => $f->user_id === $me ? $f->receiver : $f->sender;
        $row = fn (Friendship $f) => $this->friendCard($other($f)) + ['since' => ($f->accepted_at ?? $f->created_at)->format('Y-m-d')];

        return [
            // Newest friends first, so someone you just accepted is at the top
            'friends' => $rows->where('status', 'Accepted')->sortByDesc(fn ($f) => $f->accepted_at?->timestamp ?? 0)->map($row)->values(),
            'received' => $rows->where('status', 'Pending')->where('friend_id', $me)->map($row)->values(),
            'sent' => $rows->where('status', 'Pending')->where('user_id', $me)->map($row)->values(),
        ];
    }

    // POST /api/friends/{person}  -> send a request (or accept theirs, if they already sent you one)
    public function add(Request $request, User $person)
    {
        $me = $request->user();
        abort_if($person->id === $me->id, 422, "You can't add yourself.");
        abort_unless($person->membership->status === 'Active', 404, 'This person is not in your organization.');
        $existing = Friendship::between($me->id, $person->id);
        abort_if($existing?->status === 'Accepted', 422, "You're already friends.");
        abort_if($existing && $existing->user_id === $me->id, 422, 'Your friend request is still waiting.');

        if ($existing) {
            return $this->accept($request, $person);
        }

        Friendship::create(['user_id' => $me->id, 'friend_id' => $person->id]);
        UserNotification::platform($person->id, "{$me->name} sent you a friend request", 'people/friends');

        return ['friendship' => 'sent'];
    }

    // PATCH /api/friends/{person}  -> accept their request
    public function accept(Request $request, User $person)
    {
        $me = $request->user();
        $row = Friendship::where('user_id', $person->id)->where('friend_id', $me->id)->where('status', 'Pending')->first();
        abort_unless($row, 404, 'No friend request from this person.');
        $row->update(['status' => 'Accepted', 'accepted_at' => now()]);
        UserNotification::platform($person->id, "{$me->name} accepted your friend request", 'people/friends');

        return ['friendship' => 'friends'];
    }

    // DELETE /api/friends/{person}  -> decline their request, cancel yours, or unfriend
    public function remove(Request $request, User $person)
    {
        $row = Friendship::between($request->user()->id, $person->id);
        abort_unless($row, 404, 'You are not friends with this person.');
        $row->delete();

        return ['friendship' => 'none'];
    }

    // Name, avatar and where they stand in this org
    private function card(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            ...$u->avatarData(),
            'position' => $u->membership->position,
            'role' => $u->membership->role,
            'course' => $u->course,
            'yearLevel' => $u->year_level,
        ];
    }

    // A friend can be in other orgs: show which ones they're in and whether they're in this one
    private function friendCard(User $u): array
    {
        $live = $u->memberships->filter(fn ($m) => in_array($m->status, ['Active', 'Inactive'], true) && $m->organization);
        $here = $live->firstWhere('organization_id', Organization::current()->id);

        return [
            'id' => $u->id,
            'name' => $u->name,
            ...$u->avatarData(),
            'course' => $u->course,
            'yearLevel' => $u->year_level,
            'inThisOrg' => (bool) $here,
            'position' => $here?->position,
            'orgs' => $live->map(fn ($m) => $m->organization->short_name)->values(),
        ];
    }

    // user id => friends | sent | received, for everyone you have a row with (newest first)
    private function friendStates(int $me): array
    {
        return Friendship::involving($me)->orderByRaw('COALESCE(accepted_at, created_at) DESC')->orderByDesc('id')->get()
            ->mapWithKeys(fn (Friendship $f) => [($f->user_id === $me ? $f->friend_id : $f->user_id) => Friendship::stateFor($f, $me)])
            ->all();
    }
}
