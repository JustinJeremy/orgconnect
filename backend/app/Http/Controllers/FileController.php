<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Message;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

// Photos and files on messages and announcements. The links are signed (see HasAttachment), so the
// route needs no sign-in: <img> tags can load them, and a link only works for the people it was given to.
class FileController extends Controller
{
    // GET /api/files/messages/{id}?expires=&signature=
    public function message(int $id)
    {
        return $this->serve(Message::find($id));
    }

    // GET /api/files/announcements/{id}?expires=&signature=
    public function announcement(int $id)
    {
        return $this->serve(Announcement::withoutGlobalScopes()->find($id));
    }

    private function serve(?Model $item)
    {
        $disk = Storage::disk('public');
        abort_unless($item?->attachment_path && $disk->exists($item->attachment_path), 404);
        $headers = ['Cache-Control' => 'private, max-age=86400', 'X-Content-Type-Options' => 'nosniff'];

        // Photos show in place; everything else downloads under its original name
        return $item->attachment_type === 'image'
            ? response()->file($disk->path($item->attachment_path), $headers)
            : response()->download($disk->path($item->attachment_path), $item->attachment_name, $headers);
    }
}
