<?php

namespace App\Http\Requests;

use App\Models\Organization;
use App\Models\TutoringSession;
use App\Rules\TextFormat;
use App\Support\Conflicts;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

// Used to post (POST) and edit (PUT) a tutoring session: it meets once, on a date and time
class TutoringSessionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'max:255', TextFormat::words('Subject')],
            'area' => ['required', Rule::in(Organization::current()->tutoringAreas())],   // the org's own areas
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|date_format:H:i',
            'mode' => ['required', Rule::in(EventRequest::MODES)],
            'location' => ['required', 'string', 'max:255', TextFormat::words('Location')],
            'slots' => 'required|integer|min:1|max:100',
            'description' => ['nullable', 'string', 'max:2000', TextFormat::words('Description')],
            // What it covers, e.g. ["Blockchain", "Smart contracts"]
            'topics' => 'nullable|array|max:8',
            'topics.*' => ['string', 'distinct', 'max:40', TextFormat::words('A topic')],
        ];
    }

    // Not in the past (unless an older session is edited without moving it), not the same subject twice
    // on one day, and not in a room something else uses at that date and time
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->hasAny(['subject', 'date', 'time', 'mode', 'location'])) {
                    return;
                }
                /** @var TutoringSession|null $session */
                $session = $this->route('session');
                $date = $this->input('date');
                $time = $this->input('time');
                $rescheduled = ! $session || $date !== $session->date?->format('Y-m-d') || $time !== $session->time;

                if ($rescheduled && Carbon::parse("{$date} {$time}")->isPast()) {
                    $validator->errors()->add('date', 'Pick a date and time that has not passed yet.');
                } elseif (Conflicts::sameTitle(TutoringSession::class, 'subject', $this->input('subject'), $date, $session?->id)) {
                    $validator->errors()->add('subject', 'A tutoring session on this subject is already posted for that date.');
                } elseif ($taken = Conflicts::roomTakenBy($this->input('location'), $this->input('mode'), $date, $time, session: $session)) {
                    $validator->errors()->add('location', "That room is already used at that date and time by {$taken}.");
                }
            },
        ];
    }
}
