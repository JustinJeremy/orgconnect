<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ListsOrPages;
use App\Http\Controllers\Concerns\OfficerOnly;
use App\Http\Requests\AttendanceRequest;
use App\Http\Requests\EventRequest;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\User;
use App\Models\UserNotification;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class EventController extends Controller
{
    use ListsOrPages, OfficerOnly;

    // GET /api/events
    // List filters: ?tab=upcoming|past|mine &category= &search= &sort=date|popular (+ ?page, see ListsOrPages)
    public function index(Request $request)
    {
        $tab = $request->input('tab');
        $query = Event::with('registrations.user')
            ->when($tab === 'upcoming' || $tab === 'mine', fn ($q) => $q->where('status', '!=', 'completed'))
            ->when($tab === 'past', fn ($q) => $q->where('status', 'completed'))
            ->when($tab === 'mine', fn ($q) => $q->whereHas('registrations', fn ($r) => $r->where('user_id', $request->user()->id)))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->input('category')));
        $this->search($request, $query, ['title', 'location', 'description']);

        if ($request->input('sort') === 'popular') {
            $query->withCount('registrations')->orderByDesc('registrations_count');
        }
        $query->orderBy('date', $tab === 'past' ? 'desc' : 'asc')->orderBy('id');

        return $this->listOrPage($request, $query, fn (Event $e) => $e->toFrontend());
    }

    // POST /api/events  (officers)
    public function store(EventRequest $request)
    {
        $this->officerOnly($request);
        $data = $request->validated();

        $event = Event::create($data + [
            'status' => 'upcoming',
            'created_by' => $request->user()->id,
        ]);

        UserNotification::send(
            User::where('id', '!=', $request->user()->id)->withMembershipStatus(['Active', 'Pending'])->pluck('id'),
            "New event: {$event->title}"
        );

        return response()->json($event->toFrontend(), 201);
    }

    // PUT /api/events/{event}  (officers)
    public function update(EventRequest $request, Event $event)
    {
        $this->officerOnly($request);
        $data = $request->validated();

        $registered = $event->registrations()->count();
        if ($data['capacity'] < $registered) {
            throw ValidationException::withMessages(['capacity' => "{$registered} people have already registered."]);
        }

        $event->update($data);

        return $event->fresh()->toFrontend();
    }

    // DELETE /api/events/{event}  (officers)
    public function destroy(Request $request, Event $event)
    {
        $this->officerOnly($request);
        $this->removeCertificates($event->certificates);
        $event->delete();

        return ['ok' => true];
    }

    // POST /api/events/{event}/rsvp
    public function rsvp(Request $request, Event $event)
    {
        if ($event->status === 'completed') {
            throw ValidationException::withMessages(['event' => 'This event has already ended.']);
        }
        if ($event->registrations()->count() >= $event->capacity) {
            throw ValidationException::withMessages(['event' => 'This event is full.']);
        }

        $event->registrations()->firstOrCreate(
            ['user_id' => $request->user()->id],
            ['status' => 'registered']
        );

        return $event->fresh()->toFrontend();
    }

    // DELETE /api/events/{event}/rsvp
    public function cancelRsvp(Request $request, Event $event)
    {
        $event->registrations()
            ->where('user_id', $request->user()->id)
            ->where('status', 'registered')
            ->delete();

        return $event->fresh()->toFrontend();
    }

    // PUT /api/events/{event}/attendance  (officers)
    // attendees = ids of the registrations marked present
    public function attendance(AttendanceRequest $request, Event $event)
    {
        $this->officerOnly($request);
        $data = $request->validated();

        // Certificates only after the event has started
        $starts = Carbon::parse($event->date->format('Y-m-d').' '.$event->time);
        abort_if($data['completed'] && $starts->isFuture(), 422, "This event hasn't happened yet. Mark it completed once it has started.");

        $present = collect($data['attendees']);

        foreach ($event->registrations as $registration) {
            $registration->update([
                'status' => $present->contains($registration->id) ? 'attended' : 'registered',
            ]);
        }

        $event->update(['status' => $data['completed'] ? 'completed' : 'upcoming']);

        // Certificates go to everyone marked present on a completed event
        $attendees = $data['completed'] ? $event->registrations()->where('status', 'attended')->pluck('user_id') : collect();
        $this->removeCertificates($event->certificates()->whereNotIn('user_id', $attendees)->get());

        $newlyIssued = $attendees->diff($event->certificates()->pluck('user_id'));
        foreach ($newlyIssued as $userId) {
            $event->certificates()->create(['user_id' => $userId, 'issued_at' => now()]);
        }

        if ($newlyIssued->isNotEmpty()) {
            UserNotification::send($newlyIssued, "Your certificate for {$event->title} is ready");
        }

        return $event->fresh()->toFrontend();
    }

    // GET /api/certificates  -> the signed-in member's certificates
    public function certificates(Request $request)
    {
        return $request->user()->certificates()
            ->with('event')
            ->latest('issued_at')
            ->get()
            ->map->toFrontend();
    }

    // GET /api/events/{event}/certificate  -> PDF download
    // The PDF is made on the first download and saved, so later downloads reuse the same file.
    public function certificate(Request $request, Event $event)
    {
        $user = $request->user();
        $certificate = $event->certificates()->where('user_id', $user->id)->first();

        abort_unless($certificate, 403, 'You can only download certificates for events you attended.');

        $disk = Storage::disk('local');
        if (! $certificate->file_path || ! $disk->exists($certificate->file_path)) {
            $html = view()->exists('certificate')
                ? view('certificate', ['user' => $user, 'event' => $event])->render()
                : $this->certificateHtml($user, $event);

            $path = "certificates/event-{$event->id}-user-{$user->id}.pdf";
            $disk->put($path, Pdf::loadHTML($html)->setPaper('a4', 'landscape')->output());
            $certificate->update(['file_path' => $path]);
        }

        return $disk->download($certificate->file_path, "certificate-{$event->id}.pdf");
    }

    private function removeCertificates($certificates): void
    {
        foreach ($certificates as $certificate) {
            if ($certificate->file_path) {
                Storage::disk('local')->delete($certificate->file_path);
            }
            $certificate->delete();
        }
    }

    private function certificateHtml(User $user, Event $event): string
    {
        $name = e($user->name);
        $title = e($event->title);
        $date = $event->date->format('F j, Y');

        return <<<HTML
<html><body style="font-family: DejaVu Sans, sans-serif; text-align: center; padding: 60px; color: #18264a;">
  <div style="border: 6px solid #1e3a6e; padding: 50px;">
    <p style="letter-spacing: 4px; color: #c95f15; font-size: 14px;">CERTIFICATE OF PARTICIPATION</p>
    <p style="margin-top: 30px; font-size: 16px;">This certifies that</p>
    <h1 style="font-size: 40px; margin: 10px 0; color: #1e3a6e;">{$name}</h1>
    <p style="font-size: 16px;">attended</p>
    <h2 style="font-size: 26px; margin: 10px 0;">{$title}</h2>
    <p style="font-size: 14px; color: #5d6882;">held on {$date}</p>
    <p style="margin-top: 50px; font-size: 13px; color: #5d6882;">OrgConnect</p>
  </div>
</body></html>
HTML;
    }
}
