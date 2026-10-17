<?php

namespace App\Http\Requests;

use App\Models\Organization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Used to post (POST) and edit (PUT) a tutoring session
class TutoringSessionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'subject' => 'required|string|max:255',
            'area' => ['required', Rule::in(Organization::current()->tutoringAreas())],   // the org's own areas
            'schedule' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'slots' => 'required|integer|min:1|max:100',
            'description' => 'nullable|string|max:2000',
            // What it covers, e.g. ["Blockchain", "Smart contracts"]
            'topics' => 'nullable|array|max:8',
            'topics.*' => 'string|distinct|max:40',
        ];
    }
}
