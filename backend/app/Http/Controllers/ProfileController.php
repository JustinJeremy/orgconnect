<?php

namespace App\Http\Controllers;

use App\Http\Requests\PasswordRequest;
use App\Http\Requests\ProfileRequest;

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
