<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

// Used to post (POST) and edit (PUT) an announcement.
// On edit every field is optional so the app can pin / unpin with just { pinned }.
class AnnouncementRequest extends FormRequest
{
    public const CATEGORIES = ['General', 'Event', 'Deadline', 'Urgent'];

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes|required';

        return [
            'title' => "$required|string|max:255",
            'category' => "$required|in:".implode(',', self::CATEGORIES),
            'content' => "$required|string|max:1000",
            'pinned' => 'sometimes|boolean',
        ];
    }
}
