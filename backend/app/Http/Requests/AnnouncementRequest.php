<?php

namespace App\Http\Requests;

use App\Models\Announcement;
use App\Rules\TextFormat;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

// Used to post (POST) and edit (PUT) an announcement.
// On edit every field is optional so the app can pin / unpin with just { pinned }.
class AnnouncementRequest extends FormRequest
{
    public const CATEGORIES = ['General', 'Event', 'Deadline', 'Urgent'];

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes|required';

        return [
            'title' => [$required, 'string', 'max:255', TextFormat::words('Title')],
            'category' => "$required|in:".implode(',', self::CATEGORIES),
            'content' => [$required, 'string', 'max:1000', TextFormat::words('The announcement')],
            'pinned' => 'sometimes|boolean',
        ];
    }

    // Not the same title as another announcement posted the same day (e.g. sent twice by accident)
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if (! $this->filled('title') || $validator->errors()->has('title')) {
                    return;
                }
                $announcement = $this->route('announcement');
                $day = $announcement?->created_at ?? now();
                $taken = Announcement::whereRaw('LOWER(TRIM(title)) = ?', [mb_strtolower(trim($this->input('title')))])
                    ->whereDate('created_at', $day->toDateString())
                    ->when($announcement, fn ($q) => $q->whereKeyNot($announcement->id))
                    ->exists();
                if ($taken) {
                    $validator->errors()->add('title', 'An announcement with this title was already posted that day.');
                }
            },
        ];
    }
}
