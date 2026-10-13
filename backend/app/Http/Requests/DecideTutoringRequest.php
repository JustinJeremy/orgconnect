<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DecideTutoringRequest extends FormRequest
{
    public function rules(): array
    {
        return ['status' => 'required|in:Confirmed,Rejected,Completed'];
    }
}
