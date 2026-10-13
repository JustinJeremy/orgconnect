<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttendanceRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'attendees' => 'present|array',
            'attendees.*' => 'integer',
            'completed' => 'required|boolean',
        ];
    }
}
