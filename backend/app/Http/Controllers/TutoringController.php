<?php

namespace App\Http\Controllers;

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
    // GET /api/tutoring-sessions
    public function sessions()
    {
        return TutoringSession::with('tutor')->latest()->get()->map->toFrontend();
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

        return TutoringRequest::with('user')
            ->when(! $user->isOfficer(), fn ($q) => $q->where(fn ($q) => $q
                ->where('user_id', $user->id)
                ->orWhereHas('session', fn ($q) => $q->where('tutor_id', $user->id))))
            ->latest()
            ->get()
            ->map->toFrontend();
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

        UserNotification::send($session->tutor_id, "{$user->name} requested your tutoring session: {$session->subject}");

        return response()->json($tutoringRequest->load('user')->toFrontend(), 201);
    }

    // PATCH /api/tutoring-requests/{tutoringRequest}  (officers or the session's tutor)
    public function decideRequest(DecideTutoringRequest $request, TutoringRequest $tutoringRequest)
    {
        $session = $tutoringRequest->session;
        $this->ownerOrOfficer($request->user(), $session->tutor_id, 'answer this request');

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
        UserNotification::send($tutoringRequest->user_id, "Your tutoring request for {$session->subject} was {$word}");

        return $tutoringRequest->load('user')->toFrontend();
    }

    // GET /api/resources
    public function resources()
    {
        return LearningResource::with('uploader')->latest()->get()->map->toFrontend();
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
