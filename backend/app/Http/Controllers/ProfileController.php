<?php

namespace App\Http\Controllers;

use App\Http\Requests\PasswordRequest;
use App\Http\Requests\ProfileRequest;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\Setting;
use App\Models\User;
use App\Models\VolunteerHour;
use App\Support\Uploads;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

// The signed-in user's own account (Profile & settings page)
class ProfileController extends Controller
{
    // PUT /api/user  -> updated user
    public function update(ProfileRequest $request)
    {
        $user = $request->user();
        abort_unless($user->is_admin || Setting::flag(Setting::DETAILS_OPEN), 403,
            'Your details are locked. They can be updated when the admin opens updates for the new school year.');
        $data = $request->validated();

        $user->update(array_filter([
            'name' => $data['name'],
            'email' => $data['email'],
            'student_id' => $data['studentId'] ?? null,
            'course' => $data['course'] ?? null,
            'year_level' => $data['yearLevel'] ?? null,
        ], fn ($v) => $v !== null));

        return $user->toFrontend();
    }

    // PUT /api/user/avatar  { avatar }  -> updated user ("initials" = no picture, just their initials)
    public function avatar(Request $request)
    {
        $data = $request->validate(['avatar' => ['required', Rule::in([...User::AVATARS, 'initials'])]]);
        $user = $request->user();
        $this->deletePhoto($user);
        $user->update(['avatar' => $data['avatar'], 'avatar_path' => null]);

        return $user->toFrontend();
    }

    // POST /api/user/avatar/photo  (multipart: photo) -> updated user, with their own photo as avatar
    public function avatarPhoto(Request $request)
    {
        // No SVG: it can carry scripts
        Uploads::ensureArrived($request, 'photo', 'Photos can be up to 2 MB.');
        $request->validate(['photo' => ['required', 'image', 'mimes:png,jpg,jpeg', 'max:2048']],
            ['photo.max' => 'Your photo must be 2 MB or smaller.', 'photo.uploaded' => 'That photo is too large to upload. Photos can be up to 2 MB.']);
        $user = $request->user();
        $this->deletePhoto($user);
        $user->update(['avatar' => 'photo', 'avatar_path' => $request->file('photo')->store('avatars', 'public')]);

        return $user->toFrontend();
    }

    // GET /api/users/{user}/avatar  (public, so <img> tags can load it) -> the user's uploaded photo
    public function avatarImage(User $user)
    {
        $disk = Storage::disk('public');
        abort_unless($user->avatar_path && $disk->exists($user->avatar_path), 404);

        return response()->file($disk->path($user->avatar_path), ['Cache-Control' => 'public, max-age=31536000']);
    }

    private function deletePhoto(User $user): void
    {
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }
    }

    // GET /api/my-history -> your own record in the selected org, for the history pages on Profile:
    //   hours: every log you submitted, with who reviewed it
    //   events: every event you signed up for (attended, missed, or still to come)
    //   certificates: the ones you earned
    public function history(Request $request)
    {
        $user = $request->user();

        $hours = VolunteerHour::with('reviewer')->where('user_id', $user->id)
            ->orderByDesc('date')->orderByDesc('id')->get()
            ->map(fn (VolunteerHour $h) => [
                'id' => $h->id,
                'activity' => $h->activity,
                'date' => $h->date->format('Y-m-d'),
                'hours' => $h->hours,
                'status' => $h->status,
                'rejectionReason' => $h->rejection_reason,
                'reviewedBy' => $h->reviewer?->name,
            ]);

        $certified = Certificate::where('user_id', $user->id)->pluck('event_id')->all();
        $events = Event::whereHas('registrations', fn ($q) => $q->where('user_id', $user->id))
            ->with(['registrations' => fn ($q) => $q->where('user_id', $user->id)])
            ->orderByDesc('date')->get()
            // Ones still to come first (soonest first), then the ones already done (most recent first)
            ->sortBy(fn (Event $e) => $e->status !== 'completed' ? '0'.$e->date->format('Y-m-d') : '1'.(99999999 - (int) $e->date->format('Ymd')))
            ->values()
            ->map(fn (Event $e) => [
                'id' => $e->id,
                'title' => $e->title,
                'category' => $e->category,
                'date' => $e->date->format('Y-m-d'),
                'time' => $e->time,
                'location' => $e->location,
                // attended | missed (a completed event they signed up for but didn't attend) | going
                'result' => $e->status !== 'completed' ? 'going' : ($e->registrations->first()?->status === 'attended' ? 'attended' : 'missed'),
                'hasCertificate' => in_array($e->id, $certified, true),
            ]);

        $certificates = Certificate::with('event')->where('user_id', $user->id)
            ->whereHas('event')   // only this org's (events are scoped to the selected org)
            ->get()
            ->sortByDesc(fn (Certificate $c) => $c->event->date)
            ->values()
            ->map->toFrontend();

        return ['hours' => $hours, 'events' => $events, 'certificates' => $certificates];
    }

    // PUT /api/user/password
    // Signs out every other device; this one stays signed in.
    public function password(PasswordRequest $request)
    {
        $user = $request->user();
        $user->update(['password' => $request->validated('password')]);   // hashed by the User model
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return ['ok' => true];
    }
}
