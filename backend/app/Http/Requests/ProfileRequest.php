<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Used to edit your own profile (PUT /api/user)
class ProfileRequest extends FormRequest
{
    public function rules(): array
    {
        $id = $this->user()->id;

        return [
            'name' => 'required|string|max:255',
            'studentId' => ['required', 'string', 'max:50', Rule::unique('users', 'student_id')->ignore($id)],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($id)],
            'course' => 'required|string|max:50',
            'yearLevel' => 'required|string|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'An account with this email already exists.',
            'studentId.unique' => 'This student ID is already registered.',
        ];
    }
}
