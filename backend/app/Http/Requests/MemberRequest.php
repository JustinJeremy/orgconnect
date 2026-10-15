<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

// Used to add (POST) and edit (PUT) a member on the roster
class MemberRequest extends FormRequest
{
    public function rules(): array
    {
        $email = ['required', 'email', 'max:255'];

        // When editing, the new email can't belong to a different account.
        // When adding, an existing account is fine: that person is added to this org.
        if ($this->route('member')) {
            $email[] = Rule::unique('users', 'email')->ignore($this->route('member'));
        }

        return [
            'name' => 'required|string|max:255',
            'email' => $email,
            'position' => 'required|string|max:50',
            'status' => 'required|in:Active,Inactive',
            // Shown to the member when they open the org, so they know why and can ask to be reactivated
            'inactiveReason' => 'required_if:status,Inactive|nullable|string|max:500',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($this->route('member') || $validator->errors()->has('email')) {
                    return;
                }
                $existing = User::where('email', $this->input('email'))->first();
                if ($existing?->membership->status) {
                    $validator->errors()->add('email', "{$existing->name} is already in this organization.");
                }
            },
        ];
    }
}
