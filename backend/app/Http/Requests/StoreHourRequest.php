<?php

namespace App\Http\Requests;

use App\Models\VolunteerHour;
use App\Rules\TextFormat;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreHourRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'activity' => ['required', 'string', 'max:255', TextFormat::words('Activity')],
            'date' => 'required|date|before_or_equal:today',
            // Hours and minutes, e.g. 1 hr 15 min = 1.25 (at least 5 minutes)
            'hours' => 'required|numeric|decimal:0,2|min:0.08|max:24',
        ];
    }

    // A day has 24 hours: this log plus your other logs for the same date can't go over that
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->hasAny(['date', 'hours'])) {
                    return;
                }
                $logged = (float) VolunteerHour::where('user_id', $this->user()->id)
                    ->whereDate('date', $this->input('date'))
                    ->where('status', '!=', 'Rejected')
                    ->sum('hours');
                if ($logged + (float) $this->input('hours') > 24) {
                    $left = max(0, 24 - $logged);
                    $validator->errors()->add('hours', "You already logged {$logged} hrs on this date, so at most {$left} more can be added.");
                }
            },
        ];
    }
}
