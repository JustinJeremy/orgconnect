<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // GET /api/notifications  -> the signed-in user's latest notifications
    public function index(Request $request)
    {
        return UserNotification::where('user_id', $request->user()->id)
            ->latest()
            ->limit(30)
            ->get()
            ->map->toFrontend();
    }

    // POST /api/notifications/read-all
    public function readAll(Request $request)
    {
        UserNotification::where('user_id', $request->user()->id)->update(['is_read' => true]);

        return ['ok' => true];
    }
}
