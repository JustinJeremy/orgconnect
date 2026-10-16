<?php

namespace App\Http\Controllers;

use App\Http\Requests\PasswordRequest;
use App\Http\Requests\ProfileRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

// The signed-in user's own account (Profile & settings page)
class ProfileController extends Controller
{
    // PUT /api/user  -> updated user
    public function update(ProfileRequest $request)
    {
        $data = $request->validated();
        $user = $request->user();

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'student_id' => $data['studentId'],
            'course' => $data['course'],
            'year_level' => $data['yearLevel'],
        ]);

        return $user->toFrontend();
    }

    // PUT /api/user/avatar  { avatar }  -> updated user
    public function avatar(Request $request)
    {
        $data = $request->validate(['avatar' => ['required', Rule::in(User::AVATARS)]]);
        $user = $request->user();
        $this->deletePhoto($user);
        $user->update(['avatar' => $data['avatar'], 'avatar_path' => null]);

        return $user->toFrontend();
    }

    // POST /api/user/avatar/photo  (multipart: photo) -> updated user, with their own photo as avatar
    public function avatarPhoto(Request $request)
    {
        // No SVG: it can carry scripts
        $request->validate(['photo' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048']]);
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
