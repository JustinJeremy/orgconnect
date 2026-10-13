<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

// Used to change your own password (PUT /api/user/password)
class PasswordRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'currentPassword' => 'required|current_password:sanctum',
            'password' => 'required|string|min:8|confirmed|different:currentPassword',
        ];
    }

    public function messages(): array
    {
        return [
            'currentPassword.current_password' => 'Your current password is incorrect.',
            'password.different' => 'Choose a password different from your current one.',
        ];
    }
}
