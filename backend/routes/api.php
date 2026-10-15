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
Route::get('/organizations/{organization:slug}/logo', [OrganizationController::class, 'logo']);
Route::get('/events/{event}/poster', [EventController::class, 'poster'])->whereNumber('event');
// Limited attempts per minute (see AppServiceProvider)
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');

// Signed in, any org (or none)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/user', [ProfileController::class, 'update']);
    Route::put('/user/password', [ProfileController::class, 'password'])->middleware('throttle:password');
    Route::get('/my-organizations', [OrganizationController::class, 'mine']);
    Route::post('/organizations/{organization:slug}/join', [OrganizationController::class, 'join']);
});

// Signed in AND a member of the selected org
Route::middleware(['auth:sanctum', 'org.member'])->group(function () {

    // Organization logo (officers)
    Route::post('/organization/logo', [OrganizationController::class, 'uploadLogo']);
    Route::delete('/organization/logo', [OrganizationController::class, 'removeLogo']);

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
    Route::post('/events/{event}/poster', [EventController::class, 'uploadPoster']);
    Route::delete('/events/{event}/poster', [EventController::class, 'removePoster']);

    // Volunteer hours
    Route::get('/hours', [HourController::class, 'index']);
    Route::post('/hours', [HourController::class, 'store']);
    Route::patch('/hours/{hour}', [HourController::class, 'decide']);
    Route::delete('/hours/{hour}', [HourController::class, 'destroy']);
    Route::get('/leaderboard', [HourController::class, 'leaderboard']);

    // Members & applications (officers)
    Route::get('/members', [MemberController::class, 'index']);
    Route::get('/members/export', [MemberController::class, 'export']);
    Route::post('/members', [MemberController::class, 'store']);
    Route::put('/members/{member}', [MemberController::class, 'update']);
    Route::delete('/members/{member}', [MemberController::class, 'destroy']);
    Route::post('/members/{member}/reset-password', [MemberController::class, 'resetPassword']);
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
    Route::post('/announcements/{announcement}/like', [AnnouncementController::class, 'like']);
    Route::delete('/announcements/{announcement}/like', [AnnouncementController::class, 'unlike']);
    Route::get('/announcements/{announcement}/comments', [AnnouncementController::class, 'comments']);
    Route::post('/announcements/{announcement}/comments', [AnnouncementController::class, 'addComment']);

    // In-app notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'read'])->whereNumber('id');
});
