<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DecideApplicationRequest extends FormRequest
{
    public function rules(): array
    {
        return ['status' => 'required|in:Approved,Rejected'];
    }
}
