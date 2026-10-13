<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'studentId' => 'required|string|max:50|unique:users,student_id',
            'email' => 'required|email|max:255|unique:users,email',
            'course' => 'required|string|max:50',
            'yearLevel' => 'required|string|max:50',
            'password' => 'required|string|min:8|confirmed',
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
