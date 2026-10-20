<?php

namespace App\Http\Requests;

use App\Models\LearningResource;
use App\Models\Organization;
use App\Rules\TextFormat;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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

    // Not a link or title that's already shared in the org
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->hasAny(['title', 'url'])) {
                    return;
                }
                $resource = $this->route('resource');
                $others = LearningResource::when($resource, fn ($q) => $q->whereKeyNot($resource->id));
                if ((clone $others)->where('url', trim($this->input('url')))->exists()) {
                    $validator->errors()->add('url', 'This link is already shared.');
                } elseif ($others->whereRaw('LOWER(TRIM(title)) = ?', [mb_strtolower(trim($this->input('title')))])->exists()) {
                    $validator->errors()->add('title', 'A resource with this title is already shared.');
                }
            },
        ];
    }

    public function messages(): array
    {
        return ['url.url' => 'Enter a full link starting with http:// or https://'];
    }
}
