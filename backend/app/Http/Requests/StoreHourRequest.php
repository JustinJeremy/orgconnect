<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHourRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'activity' => 'required|string|max:255',
            'date' => 'required|date|before_or_equal:today',
            'hours' => 'required|numeric|min:0.5|max:24',
        ];
    }
}
