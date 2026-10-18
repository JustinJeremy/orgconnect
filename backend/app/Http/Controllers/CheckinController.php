<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\MembershipRecord;
use App\Models\Organization;
use App\Models\TutoringCheckin;
use App\Models\TutoringRequest;
use App\Models\TutoringSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// QR check-in. Officers (events) or the tutor (tutoring sessions) show a QR code at the venue; members
// scan it with their phone camera, which opens OrgConnect and marks them present.
//   Events: from a day before the event starts until it's finished (completed, or the end of its
//     day). Walk-ins who didn't RSVP are added. Officers can still tick names in Attendance.
//   Tutoring: on the session's meeting day, for students with a confirmed (or completed) request.
// The code is tied to one event or session; showing a new code makes the old one stop working.
class CheckinController extends Controller
{
    // ---------- The QR code (officers / the tutor, in the selected org) ----------

    // GET /api/events/{event}/checkin -> { code, open, opensAt, checkedIn: [...] }
    public function event(Request $request, Event $event)
    {
        abort_unless($request->user()->isOfficer(), 403, 'Only officers can show the check-in code.');

        return $this->eventInfo($this->code($event));
    }

    // POST /api/events/{event}/checkin/reset -> a new code (the old QR stops working)
    public function resetEvent(Request $request, Event $event)
    {
        abort_unless($request->user()->isOfficer(), 403, 'Only officers can change the check-in code.');
        $event->update(['checkin_code' => Str::random(32)]);

        return $this->eventInfo($event);
    }

    // GET /api/tutoring-sessions/{session}/checkin -> { code, open, checkedIn: [...] } for today
    public function session(Request $request, TutoringSession $session)
    {
        $this->tutorOrOfficer($request->user(), $session);

        return $this->sessionInfo($this->code($session));
    }

    // POST /api/tutoring-sessions/{session}/checkin/reset
    public function resetSession(Request $request, TutoringSession $session)
    {
        $this->tutorOrOfficer($request->user(), $session);
        $session->update(['checkin_code' => Str::random(32)]);

        return $this->sessionInfo($session);
    }

    // ---------- Scanning (any signed-in member; the QR's link says which org) ----------

    // POST /api/checkin  { type: event | session, id, code }
    public function scan(Request $request)
    {
        $data = $request->validate(['type' => 'required|in:event,session', 'id' => 'required|integer', 'code' => 'required|string|max:64']);
        $user = $request->user();
        abort_if($user->is_admin, 422, "The OrgConnect admin doesn't check in to events.");

        return $data['type'] === 'event'
            ? $this->scanEvent($user, $data['id'], $data['code'])
            : $this->scanSession($user, $data['id'], $data['code']);
    }

    private function scanEvent(User $user, int $id, string $code)
    {
        $event = Event::withoutGlobalScopes()->with('organization')->find($id);
        $this->checkCode($event?->checkin_code, $code);
        $this->checkMember($user, $event->organization);
        abort_if($closed = $event->checkinClosed(), 422, $closed);

        $registration = EventRegistration::firstOrNew(['event_id' => $event->id, 'user_id' => $user->id]);
        $already = $registration->exists && $registration->status === 'attended';
        $registration->status = 'attended';
        $registration->save();

        return $this->result($already, $event->title, $event->organization, $already ? "You're already checked in." : "You're checked in. Enjoy the event!", "events/{$event->id}");
    }

    private function scanSession(User $user, int $id, string $code)
    {
        $session = TutoringSession::withoutGlobalScopes()->with(['organization', 'tutor'])->find($id);
        $this->checkCode($session?->checkin_code, $code);
        $this->checkMember($user, $session->organization);
        abort_if($session->tutor_id === $user->id, 422, "You're the tutor of this session.");
        abort_unless($session->meetsToday(), 422, "This session doesn't meet today ({$session->schedule}).");
        $booked = TutoringRequest::withoutGlobalScopes()->where('tutoring_session_id', $session->id)->where('user_id', $user->id)
            ->whereIn('status', ['Confirmed', 'Completed'])->exists();
        abort_unless($booked, 422, 'Only students with a confirmed request for this session can check in. Request a slot on Peer Tutoring first.');

        $already = TutoringCheckin::where('tutoring_session_id', $session->id)->where('user_id', $user->id)->whereDate('date', now()->toDateString())->exists();
        if (! $already) {
            TutoringCheckin::create(['tutoring_session_id' => $session->id, 'user_id' => $user->id, 'date' => now()->toDateString()]);
        }

        return $this->result($already, $session->subject, $session->organization,
            $already ? "You're already checked in for today." : "You're checked in with {$session->tutor?->name}. Happy studying!", 'tutoring');
    }

    // ---------- Helpers ----------

    private function code(Event|TutoringSession $item): Event|TutoringSession
    {
        if (! $item->checkin_code) {
            $item->update(['checkin_code' => Str::random(32)]);
        }

        return $item;
    }

    private function eventInfo(Event $event): array
    {
        return [
            'code' => $event->checkin_code,
            'open' => $event->checkinClosed() === null,
            'closed' => $event->checkinClosed(),
            'checkedIn' => $event->registrations()->with('user')->where('status', 'attended')->latest('updated_at')->get()
                ->map(fn ($r) => ['id' => $r->user_id, 'name' => $r->user?->name, ...($r->user?->avatarData() ?? []), 'at' => $r->updated_at->format('Y-m-d\TH:i:s')])->values(),
        ];
    }

    private function sessionInfo(TutoringSession $session): array
    {
        return [
            'code' => $session->checkin_code,
            'open' => $session->meetsToday(),
            'checkedIn' => TutoringCheckin::with('user')->where('tutoring_session_id', $session->id)->whereDate('date', now()->toDateString())->latest()->get()
                ->map(fn ($c) => ['id' => $c->user_id, 'name' => $c->user?->name, ...($c->user?->avatarData() ?? []), 'at' => $c->created_at->format('Y-m-d\TH:i:s')])->values(),
        ];
    }

    private function checkCode(?string $expected, string $given): void
    {
        abort_unless($expected && hash_equals($expected, $given), 404, "This check-in code isn't valid anymore. Ask the officer to show the current QR code.");
    }

    private function checkMember(User $user, ?Organization $org): void
    {
        $member = $org && MembershipRecord::where('organization_id', $org->id)->where('user_id', $user->id)->where('status', 'Active')->exists();
        abort_unless($member, 403, "Only active members of {$org?->short_name} can check in here.");
    }

    private function tutorOrOfficer(User $user, TutoringSession $session): void
    {
        abort_unless($user->isOfficer() || $session->tutor_id === $user->id, 403, 'Only the tutor or an officer can show the check-in code.');
    }

    private function result(bool $already, string $title, Organization $org, string $message, string $link): array
    {
        return ['ok' => true, 'already' => $already, 'title' => $title, 'message' => $message, 'link' => $link,
            'organization' => ['slug' => $org->slug, 'shortName' => $org->short_name, 'name' => $org->name]];
    }
}
