<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DecideTutoringRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'status' => 'required|in:Confirmed,Rejected,Completed',
            // Completed: how long the session was (logged as the tutor's volunteer hours)
            'hours' => 'nullable|numeric|min:0.5|max:8',
            // Rejecting needs a reason, so the member knows why
            'reason' => 'required_if:status,Rejected|nullable|string|max:500',
        ];
    }
}
