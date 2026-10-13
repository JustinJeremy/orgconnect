<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

// A member asking for a slot in a tutoring session
class StoreTutoringRequest extends FormRequest
{
    public function rules(): array
    {
        return ['sessionId' => 'required|integer|exists:tutoring_sessions,id'];
    }
}
