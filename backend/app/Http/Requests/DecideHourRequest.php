<?php

namespace App\Http\Requests;

use App\Rules\TextFormat;
use Illuminate\Foundation\Http\FormRequest;

class DecideHourRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'status' => 'required|in:Approved,Rejected',
            // Rejecting needs a reason, so the member knows why
            'reason' => ['required_if:status,Rejected', 'nullable', 'string', 'max:500', TextFormat::words('The reason')],
        ];
    }
}
