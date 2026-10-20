<?php

namespace App\Http\Requests;

use App\Models\MembershipRecord;
use App\Models\User;
use App\Rules\TextFormat;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

// Used to add (POST) and edit (PUT) a member on the roster
class MemberRequest extends FormRequest
{
    public function rules(): array
    {
        // Adding: name and email (an existing account is fine: that person is added to this org).
        // Editing: only position and status. Name and email are locked to the person's account.
        $adding = ! $this->route('member');

        return [
            'name' => $adding ? ['required', 'string', 'max:255', TextFormat::personName('Full name')] : 'prohibited',
            'email' => $adding ? 'required|email|max:255' : 'prohibited',
            'position' => ['required', Rule::in(MembershipRecord::POSITIONS)],
            'status' => 'required|in:Active,Inactive',
            // Shown to the member when they open the org, so they know why and can ask to be reactivated
            'inactiveReason' => ['required_if:status,Inactive', 'nullable', 'string', 'max:500', TextFormat::words('The reason')],
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
