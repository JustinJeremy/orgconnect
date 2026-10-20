<?php

namespace App\Http\Requests;

use App\Rules\TextFormat;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Validator;

// Used to create (POST) and edit (PUT) an event
class EventRequest extends FormRequest
{
    public const CATEGORIES = ['Workshop', 'Seminar', 'Community Service', 'Social'];

    public const MODES = ['F2F', 'Online', 'Hybrid'];

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255', TextFormat::words('Title')],
            'date' => 'required|date_format:Y-m-d',
            'category' => 'required|in:'.implode(',', self::CATEGORIES),
            'time' => 'required|date_format:H:i',
            'location' => ['required', 'string', 'max:255', TextFormat::words('Location')],
            'mode' => 'required|in:'.implode(',', self::MODES),
            'capacity' => 'required|integer|min:1',
            'description' => ['nullable', 'string', 'max:2000', TextFormat::words('Description')],
            // What it covers, e.g. ["Blockchain", "Smart contracts"]
            'topics' => 'nullable|array|max:8',
            'topics.*' => ['string', 'distinct', 'max:40', TextFormat::words('A topic')],
        ];
    }

    // The event's date + time must still be ahead of us.
    // Past events can still be edited (e.g. fixing a typo) as long as the schedule is left alone.
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->hasAny(['date', 'time'])) {
                    return;
                }

                $event = $this->route('event');
                $rescheduled = ! $event
                    || $this->input('date') !== $event->date->format('Y-m-d')
                    || $this->input('time') !== substr($event->time, 0, 5);

                if ($rescheduled && Carbon::parse("{$this->input('date')} {$this->input('time')}")->isPast()) {
                    $validator->errors()->add('date', 'Pick a date and time that has not passed yet.');
                }
            },
        ];
    }
}
