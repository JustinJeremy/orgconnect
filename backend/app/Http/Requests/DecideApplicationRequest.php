<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DecideApplicationRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'status' => 'required|in:Approved,Rejected',
            // Shown to the applicant, so they know what to fix before applying again
            'reason' => 'required_if:status,Rejected|nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return ['reason.required_if' => 'Give the applicant a reason.'];
    }
}
