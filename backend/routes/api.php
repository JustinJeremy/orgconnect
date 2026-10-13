<?php

use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\HourController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TutoringController;
use Illuminate\Support\Facades\Route;

// The app sends the selected org in the X-Organization header (its slug).

// Public: org picker, sign in and sign up
Route::get('/organizations', [OrganizationController::class, 'index']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Signed in, any org (or none)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/user', [ProfileController::class, 'update']);
    Route::put('/user/password', [ProfileController::class, 'password']);
    Route::get('/my-organizations', [OrganizationController::class, 'mine']);
    Route::post('/organizations/{organization:slug}/join', [OrganizationController::class, 'join']);
});

// Signed in AND a member of the selected org
Route::middleware(['auth:sanctum', 'org.member'])->group(function () {

    // Events & attendance
    Route::get('/events', [EventController::class, 'index']);
    Route::post('/events', [EventController::class, 'store']);
    Route::put('/events/{event}', [EventController::class, 'update']);
    Route::delete('/events/{event}', [EventController::class, 'destroy']);
    Route::post('/events/{event}/rsvp', [EventController::class, 'rsvp']);
    Route::delete('/events/{event}/rsvp', [EventController::class, 'cancelRsvp']);
    Route::put('/events/{event}/attendance', [EventController::class, 'attendance']);
    Route::get('/events/{event}/certificate', [EventController::class, 'certificate']);
    Route::get('/certificates', [EventController::class, 'certificates']);

    // Volunteer hours
    Route::get('/hours', [HourController::class, 'index']);
    Route::post('/hours', [HourController::class, 'store']);
    Route::patch('/hours/{hour}', [HourController::class, 'decide']);
    Route::delete('/hours/{hour}', [HourController::class, 'destroy']);
    Route::get('/leaderboard', [HourController::class, 'leaderboard']);

    // Members & applications (officers)
    Route::get('/members', [MemberController::class, 'index']);
    Route::post('/members', [MemberController::class, 'store']);
    Route::put('/members/{member}', [MemberController::class, 'update']);
    Route::delete('/members/{member}', [MemberController::class, 'destroy']);
    Route::get('/applications', [MemberController::class, 'applications']);
    Route::patch('/applications/{applicant}', [MemberController::class, 'decideApplication']);

    // Peer tutoring
    Route::get('/tutoring-sessions', [TutoringController::class, 'sessions']);
    Route::post('/tutoring-sessions', [TutoringController::class, 'storeSession']);
    Route::put('/tutoring-sessions/{session}', [TutoringController::class, 'updateSession']);
    Route::delete('/tutoring-sessions/{session}', [TutoringController::class, 'destroySession']);
    Route::get('/tutoring-requests', [TutoringController::class, 'requests']);
    Route::post('/tutoring-requests', [TutoringController::class, 'storeRequest']);
    Route::patch('/tutoring-requests/{tutoringRequest}', [TutoringController::class, 'decideRequest']);
    Route::get('/resources', [TutoringController::class, 'resources']);
    Route::post('/resources', [TutoringController::class, 'storeResource']);
    Route::put('/resources/{resource}', [TutoringController::class, 'updateResource']);
    Route::delete('/resources/{resource}', [TutoringController::class, 'destroyResource']);

    // Announcements (read-all must come before {announcement})
    Route::get('/announcements', [AnnouncementController::class, 'index']);
    Route::post('/announcements', [AnnouncementController::class, 'store']);
    Route::post('/announcements/read-all', [AnnouncementController::class, 'markAllRead']);
    Route::put('/announcements/{announcement}', [AnnouncementController::class, 'update']);
    Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy']);
    Route::post('/announcements/{announcement}/read', [AnnouncementController::class, 'markRead']);

    // In-app notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);
});
