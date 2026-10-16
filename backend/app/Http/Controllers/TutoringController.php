<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ListsOrPages;
use App\Http\Requests\DecideTutoringRequest;
use App\Http\Requests\ResourceRequest;
use App\Http\Requests\StoreTutoringRequest;
use App\Http\Requests\TutoringSessionRequest;
use App\Models\LearningResource;
use App\Models\TutoringRequest;
use App\Models\TutoringSession;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TutoringController extends Controller
{
    use ListsOrPages;

    // GET /api/tutoring-sessions
    // List filters: ?area= &search= subject, area or tutor (+ ?page)
    public function sessions(Request $request)
    {
        $query = TutoringSession::with('tutor')
            ->when($request->filled('area'), fn ($q) => $q->where('area', $request->input('area')))
            ->latest()
            ->latest('id');
        $this->search($request, $query, ['subject', 'area'], ['tutor' => 'name']);

        return $this->listOrPage($request, $query, fn (TutoringSession $s) => $s->toFrontend());
    }

    // POST /api/tutoring-sessions  (anyone can offer to tutor)
    public function storeSession(TutoringSessionRequest $request)
    {
        $session = TutoringSession::create($request->validated() + ['tutor_id' => $request->user()->id]);

        return response()->json($session->load('tutor')->toFrontend(), 201);
    }

    // PUT /api/tutoring-sessions/{session}  (officers or the tutor)
    public function updateSession(TutoringSessionRequest $request, TutoringSession $session)
    {
        $this->ownerOrOfficer($request->user(), $session->tutor_id, 'change this session');
        $session->update($request->validated());

        return $session->load('tutor')->toFrontend();
    }

    // DELETE /api/tutoring-sessions/{session}  (officers or the tutor)
    public function destroySession(Request $request, TutoringSession $session)
    {
        $this->ownerOrOfficer($request->user(), $session->tutor_id, 'delete this session');
        $session->delete();

        return ['ok' => true];
    }

    // GET /api/tutoring-requests
    // Officers get all requests. Members get their own plus the ones sent to sessions they tutor.
    public function requests(Request $request)
    {
        $user = $request->user();
        $view = $request->input('view');   // received: requests I answer (all of them, for officers) · sent: my own

        // List filters: ?view=received|sent &status= (+ ?page)
        $query = TutoringRequest::with('user')
            ->whereHas('session')   // only this org's sessions
            ->when(! $user->isOfficer(), fn ($q) => $q->where(fn ($q) => $q
                ->where('user_id', $user->id)
                ->orWhereHas('session', fn ($q) => $q->where('tutor_id', $user->id))))
            ->when($view === 'sent', fn ($q) => $q->where('user_id', $user->id))
            ->when($view === 'received', fn ($q) => $q
                ->where('user_id', '!=', $user->id)
                ->when(! $user->isOfficer(), fn ($q) => $q->whereHas('session', fn ($s) => $s->where('tutor_id', $user->id))))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            // Ones still waiting for an answer first, then newest first
            ->orderByRaw("CASE WHEN status = 'Pending' THEN 0 ELSE 1 END")
            ->latest()
            ->latest('id');

        return $this->listOrPage($request, $query, fn (TutoringRequest $r) => $r->toFrontend());
    }

    // POST /api/tutoring-requests  { sessionId }
    public function storeRequest(StoreTutoringRequest $request)
    {
        $session = TutoringSession::findOrFail($request->validated('sessionId'));
        $user = $request->user();

        if ($session->tutor_id === $user->id) {
            throw ValidationException::withMessages(['sessionId' => "You can't request your own session."]);
        }
        if ($session->slots < 1) {
            throw ValidationException::withMessages(['sessionId' => 'This session has no open slots.']);
        }
        if ($session->requests()->where('user_id', $user->id)->exists()) {
            throw ValidationException::withMessages(['sessionId' => 'You already requested this session.']);
        }

        $tutoringRequest = $session->requests()->create(['user_id' => $user->id, 'status' => 'Pending']);

        UserNotification::send($session->tutor_id, "{$user->name} requested your tutoring session: {$session->subject}", "tutoring/received/{$tutoringRequest->id}");

        return response()->json($tutoringRequest->load('user')->toFrontend(), 201);
    }

    // PATCH /api/tutoring-requests/{tutoringRequest}  (officers or the session's tutor)
    public function decideRequest(DecideTutoringRequest $request, TutoringRequest $tutoringRequest)
    {
        $session = $tutoringRequest->session;
        $this->ownerOrOfficer($request->user(), $session->tutor_id, 'answer this request');
        abort_if($tutoringRequest->user_id === $request->user()->id, 403, "You can't answer your own tutoring request.");

        $status = $request->validated('status');
        $allowed = [
            'Pending' => ['Confirmed', 'Rejected'],
            'Confirmed' => ['Completed'],
        ][$tutoringRequest->status] ?? [];
        if (! in_array($status, $allowed, true)) {
            throw ValidationException::withMessages(['status' => "A {$tutoringRequest->status} request can't be changed to {$status}."]);
        }

        // Approving takes one slot
        if ($status === 'Confirmed') {
            if ($session->slots < 1) {
                throw ValidationException::withMessages(['status' => 'This session has no open slots left.']);
            }
            $session->decrement('slots');
        }

        $tutoringRequest->update(['status' => $status]);

        $word = ['Confirmed' => 'approved', 'Rejected' => 'rejected', 'Completed' => 'marked as completed'][$status];
        UserNotification::send($tutoringRequest->user_id, "Your tutoring request for {$session->subject} was {$word}", "tutoring/sent/{$tutoringRequest->id}");
        // Both sides of the session know: the student (above) and the tutor, when someone else decided
        $decider = $request->user();
        if ($decider->id !== $session->tutor_id) {
            $student = $tutoringRequest->user->name;
            $message = $status === 'Completed'
                ? "{$decider->name} marked your session with {$student} as completed: {$session->subject}"
                : "{$decider->name} {$word} {$student}'s request for your tutoring session: {$session->subject}";
            UserNotification::send($session->tutor_id, $message, "tutoring/received/{$tutoringRequest->id}");
        }

        return $tutoringRequest->load('user')->toFrontend();
    }

    // GET /api/resources
    // List filters: ?subject= &type= &search= title, description or who shared it (+ ?page)
    public function resources(Request $request)
    {
        $query = LearningResource::with('uploader')
            ->when($request->filled('subject'), fn ($q) => $q->where('subject', $request->input('subject')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->input('type')))
            ->latest()
            ->latest('id');
        $this->search($request, $query, ['title', 'description'], ['uploader' => 'name']);

        return $this->listOrPage($request, $query, fn (LearningResource $r) => $r->toFrontend());
    }

    // POST /api/resources  (any member can share a resource)
    public function storeResource(ResourceRequest $request)
    {
        $resource = LearningResource::create($request->validated() + ['user_id' => $request->user()->id]);

        return response()->json($resource->load('uploader')->toFrontend(), 201);
    }

    // PUT /api/resources/{resource}  (officers or whoever shared it)
    public function updateResource(ResourceRequest $request, LearningResource $resource)
    {
        $this->ownerOrOfficer($request->user(), $resource->user_id, 'change this resource');
        $resource->update($request->validated());

        return $resource->load('uploader')->toFrontend();
    }

    // DELETE /api/resources/{resource}  (officers or whoever shared it)
    public function destroyResource(Request $request, LearningResource $resource)
    {
        $this->ownerOrOfficer($request->user(), $resource->user_id, 'delete this resource');
        $resource->delete();

        return ['ok' => true];
    }

    private function ownerOrOfficer(User $user, ?int $ownerId, string $action): void
    {
        abort_unless($user->isOfficer() || $ownerId === $user->id, 403, "Only officers or the owner can {$action}.");
    }
}
