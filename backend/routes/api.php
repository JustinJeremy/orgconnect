<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CheckinController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\HourController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\OrgChangeController;
use App\Http\Controllers\OrgRequestController;
use App\Http\Controllers\PeopleController;
use App\Http\Controllers\PlatformAnnouncementController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\TutoringController;
use App\Models\Organization;
use App\Support\OrgThemes;
use Illuminate\Support\Facades\Route;

// The app sends the selected org in the X-Organization header (its slug).

// Public: org picker, sign in and sign up
Route::get('/organizations', [OrganizationController::class, 'index']);
Route::get('/organizations/{organization:slug}/logo', [OrganizationController::class, 'logo']);
Route::get('/events/{event}/poster', [EventController::class, 'poster'])->whereNumber('event');
Route::get('/users/{user}/avatar', [ProfileController::class, 'avatarImage'])->whereNumber('user');
// Photos and files on messages and announcements: signed links (see HasAttachment), no sign-in needed
Route::get('/files/messages/{id}', [FileController::class, 'message'])->whereNumber('id')->middleware('signed:relative')->name('files.message');
Route::get('/files/announcements/{id}', [FileController::class, 'announcement'])->whereNumber('id')->middleware('signed:relative')->name('files.announcement');
// Limited attempts per minute (see AppServiceProvider)
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');

// Signed in, any org (or none)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/user', [ProfileController::class, 'update']);
    Route::put('/user/avatar', [ProfileController::class, 'avatar']);
    Route::post('/user/avatar/photo', [ProfileController::class, 'avatarPhoto']);
    Route::put('/user/password', [ProfileController::class, 'password'])->middleware('throttle:password');
    Route::get('/my-organizations', [OrganizationController::class, 'mine']);
    Route::post('/organizations/{organization:slug}/join', [OrganizationController::class, 'join']);
    Route::put('/organizations/{organization:slug}/application', [OrganizationController::class, 'updateApplication']);
    Route::delete('/organizations/{organization:slug}/application', [OrganizationController::class, 'withdraw']);
    Route::post('/organizations/{organization:slug}/reactivation', [OrganizationController::class, 'requestReactivation']);
    Route::delete('/organizations/{organization:slug}/membership', [OrganizationController::class, 'leave']);   // leave, with a reason
    // Ask to register a new org (reviewed by a platform admin)
    Route::get('/org-requests', [OrgRequestController::class, 'index']);
    Route::put('/org-requests/{organization}', [OrgRequestController::class, 'update']);   // edit your pending request

    // Messages: friends, an org's officers and the admin, a requester and the admin
    Route::get('/conversations', [MessageController::class, 'index']);
    Route::get('/messages/unread', [MessageController::class, 'unread']);
    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'show']);
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'send'])->middleware('throttle:60,1');
    Route::patch('/conversations/{conversation}/messages/{message}', [MessageController::class, 'update']);   // your own: edit
    Route::delete('/conversations/{conversation}/messages/{message}', [MessageController::class, 'destroy']);   // your own: delete
    Route::post('/conversations/org/{organization}', [MessageController::class, 'org']);
    Route::post('/conversations/request/{organization}', [MessageController::class, 'request']);
    Route::get('/conversations/{conversation}/status', [MessageController::class, 'status']);   // who's typing, who has seen
    Route::post('/conversations/{conversation}/typing', [MessageController::class, 'typing'])->middleware('throttle:60,1');
    // QR check-in: the scanned link says which org, so this works whichever org is selected
    Route::post('/checkin', [CheckinController::class, 'scan'])->middleware('throttle:30,1');
    // Org colors to pick from, and which ones other orgs already have
    Route::get('/org-themes', fn () => OrgThemes::options(Organization::current()?->id));
    Route::post('/org-requests', [OrgRequestController::class, 'store'])->middleware('throttle:register');
});

// Platform admin: org registrations and suspensions
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/overview', [AdminController::class, 'overview']);
    Route::patch('/org-requests/{organization}', [AdminController::class, 'decide']);
    Route::post('/org-requests/{organization}/ask-changes', [MessageController::class, 'askChanges']);
    Route::patch('/organizations/{organization}', [AdminController::class, 'setStatus']);
    Route::get('/organizations/{organization}', [AdminController::class, 'organization']);
    // Announcements to presidents, officers, members or every account, and each org's replies
    Route::get('/announcements', [PlatformAnnouncementController::class, 'adminIndex']);
    Route::post('/announcements', [PlatformAnnouncementController::class, 'store']);
    Route::delete('/announcements/{announcement}', [PlatformAnnouncementController::class, 'destroy']);
    Route::get('/announcements/{announcement}/replies', [PlatformAnnouncementController::class, 'adminReplies']);
    Route::post('/announcements/{announcement}/replies', [PlatformAnnouncementController::class, 'adminReply']);
    Route::patch('/change-requests/{change}', [OrgChangeController::class, 'decide']);
    // Accounts: look anyone up, reset a forgotten password (only the admin can)
    Route::get('/users', [AdminController::class, 'users']);
    Route::post('/users/{user}/reset-password', [AdminController::class, 'resetPassword']);
    // Students' details are locked; the admin corrects them, or opens updates for a new school year
    Route::put('/users/{user}', [AdminController::class, 'updateUser']);
    Route::get('/settings', [AdminController::class, 'settings']);
    Route::put('/settings', [AdminController::class, 'updateSettings']);
});

// Signed in AND a member of the selected org
Route::middleware(['auth:sanctum', 'org.member'])->group(function () {

    // Organization logo (officers)
    Route::post('/organization/logo', [OrganizationController::class, 'uploadLogo']);
    // Changing the org's details: the President asks, the platform admin approves
    Route::get('/organization/change-requests', [OrgChangeController::class, 'latest']);
    Route::post('/organization/change-requests', [OrgChangeController::class, 'store']);
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
    Route::get('/events/{event}/checkin', [CheckinController::class, 'event']);   // the QR code and who has checked in
    Route::post('/events/{event}/checkin/reset', [CheckinController::class, 'resetEvent']);
    Route::get('/certificates', [EventController::class, 'certificates']);
    Route::get('/my-history', [ProfileController::class, 'history']);   // Profile: your hours, events and certificates
    Route::post('/events/{event}/poster', [EventController::class, 'uploadPoster']);
    Route::delete('/events/{event}/poster', [EventController::class, 'removePoster']);

    // Volunteer hours
    Route::get('/hours', [HourController::class, 'index']);
    Route::post('/hours', [HourController::class, 'store']);
    Route::patch('/hours/{hour}', [HourController::class, 'decide']);
    Route::delete('/hours/{hour}', [HourController::class, 'destroy']);
    Route::get('/leaderboard', [HourController::class, 'leaderboard']);

    // Messages with people in this org: who you can message, and your chat with one of them
    Route::get('/messages/contacts', [MessageController::class, 'contacts']);
    Route::post('/conversations/direct/{person}', [MessageController::class, 'direct']);
    // Group chats in this org
    Route::post('/groups', [GroupController::class, 'store'])->middleware('throttle:20,1');
    Route::put('/groups/{conversation}', [GroupController::class, 'rename']);
    Route::get('/groups/{conversation}/members', [GroupController::class, 'members']);
    Route::post('/groups/{conversation}/members', [GroupController::class, 'add']);
    Route::delete('/groups/{conversation}/members/me', [GroupController::class, 'leave']);

    // Announcements from the OrgConnect admin, and this org's replies to them
    Route::get('/platform-announcements', [PlatformAnnouncementController::class, 'index']);
    Route::get('/platform-announcements/{announcement}/replies', [PlatformAnnouncementController::class, 'replies']);
    Route::post('/platform-announcements/{announcement}/replies', [PlatformAnnouncementController::class, 'reply']);

    // People: the directory, profiles, the most helpful tutors, and friends
    // Search everything in this org (sidebar search, Ctrl+K)
    Route::get('/search', [SearchController::class, 'index'])->middleware('throttle:60,1');
    Route::get('/people', [PeopleController::class, 'index']);
    Route::get('/people/helpful', [PeopleController::class, 'helpful']);
    Route::get('/people/{person}', [PeopleController::class, 'show'])->whereNumber('person');
    Route::get('/friends', [PeopleController::class, 'friends']);
    Route::post('/friends/{person}', [PeopleController::class, 'add']);
    Route::patch('/friends/{person}', [PeopleController::class, 'accept']);
    Route::delete('/friends/{person}', [PeopleController::class, 'remove']);

    // Members & applications (officers)
    Route::get('/members', [MemberController::class, 'index']);
    Route::get('/members/export', [MemberController::class, 'export']);
    Route::post('/members', [MemberController::class, 'store']);
    Route::put('/members/{member}', [MemberController::class, 'update']);
    Route::delete('/members/{member}', [MemberController::class, 'destroy']);
    Route::get('/applications', [MemberController::class, 'applications']);
    Route::patch('/applications/{applicant}', [MemberController::class, 'decideApplication']);
    Route::get('/reactivations', [MemberController::class, 'reactivations']);
    Route::patch('/reactivations/{member}', [MemberController::class, 'decideReactivation']);

    // Peer tutoring
    Route::get('/tutoring-sessions', [TutoringController::class, 'sessions']);
    Route::post('/tutoring-sessions', [TutoringController::class, 'storeSession']);
    Route::put('/tutoring-sessions/{session}', [TutoringController::class, 'updateSession']);
    Route::delete('/tutoring-sessions/{session}', [TutoringController::class, 'destroySession']);
    Route::get('/tutoring-sessions/{session}/checkin', [CheckinController::class, 'session']);
    Route::post('/tutoring-sessions/{session}/checkin/reset', [CheckinController::class, 'resetSession']);
    Route::get('/tutoring-requests', [TutoringController::class, 'requests']);
    Route::post('/tutoring-requests', [TutoringController::class, 'storeRequest']);
    Route::patch('/tutoring-requests/{tutoringRequest}', [TutoringController::class, 'decideRequest']);
    Route::delete('/tutoring-requests/{tutoringRequest}', [TutoringController::class, 'cancelRequest']);   // your own, with a reason
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
    Route::post('/announcements/{announcement}/attachment', [AnnouncementController::class, 'attach']);   // a photo or file
    Route::delete('/announcements/{announcement}/attachment', [AnnouncementController::class, 'detach']);
    Route::post('/announcements/{announcement}/read', [AnnouncementController::class, 'markRead']);
    Route::post('/announcements/{announcement}/like', [AnnouncementController::class, 'like']);
    Route::delete('/announcements/{announcement}/like', [AnnouncementController::class, 'unlike']);
    Route::get('/announcements/{announcement}/comments', [AnnouncementController::class, 'comments']);
    Route::post('/announcements/{announcement}/comments', [AnnouncementController::class, 'addComment']);
    Route::put('/announcements/{announcement}/comments/{comment}', [AnnouncementController::class, 'updateComment']);
    Route::delete('/announcements/{announcement}/comments/{comment}', [AnnouncementController::class, 'deleteComment']);

    // In-app notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'read'])->whereNumber('id');
});
