<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // POST /api/login  -> { token, user }
    public function login(LoginRequest $request)
    {
        $data = $request->validated();

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Incorrect email or password.']);
        }

        return [
            'token' => $user->createToken('web')->plainTextToken,
            'user' => $user->toFrontend(),
        ];
    }

    // POST /api/register  -> { token, user }
    // New accounts are always members with a Pending application to the selected org.
    public function register(RegisterRequest $request)
    {
        $data = $request->validated();
        $org = Organization::current();
        if (! $org) {
            throw ValidationException::withMessages(['organization' => 'Pick the organization you want to join.']);
        }

        $user = DB::transaction(function () use ($data, $org) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],   // hashed automatically by the User model
                'student_id' => $data['studentId'],
                'course' => $data['course'],
                'year_level' => $data['yearLevel'],
            ]);
            $user->memberships()->create([
                'organization_id' => $org->id,
                'role' => 'member',
                'position' => 'Member',
                'status' => 'Pending',
            ]);

            return $user;
        });

        return response()->json([
            'token' => $user->createToken('web')->plainTextToken,
            'user' => $user->toFrontend(),
        ], 201);
    }

    // GET /api/user
    public function me(Request $request)
    {
        return $request->user()->toFrontend();
    }

    // POST /api/logout
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return ['ok' => true];
    }
}
