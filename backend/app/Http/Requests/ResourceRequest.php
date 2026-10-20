<?php

namespace App\Http\Requests;

use App\Models\Organization;
use App\Rules\TextFormat;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Used to share (POST) and edit (PUT) a learning resource
class ResourceRequest extends FormRequest
{
    public const TYPES = ['PDF', 'Link', 'Video', 'Document'];

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255', TextFormat::words('Title')],
            'subject' => ['required', Rule::in(Organization::current()->tutoringAreas())],
            'type' => 'required|in:'.implode(',', self::TYPES),
            'url' => 'required|url:http,https|max:2048',
            'description' => ['nullable', 'string', 'max:1000', TextFormat::words('Description')],
        ];
    }

    public function messages(): array
    {
        return ['url.url' => 'Enter a full link starting with http:// or https://'];
    }
}
