<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Rules\TextFormat;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Used to edit your own profile (PUT /api/user)
class ProfileRequest extends FormRequest
{
    public function rules(): array
    {
        $id = $this->user()->id;
        // The platform admin isn't a student: only name and email
        $student = $this->user()->is_admin ? 'sometimes' : 'required';
        // A new or changed student ID must match the format; an older saved one can be kept as it is
        $user = $this->user();
        $changed = fn ($field, $column) => $this->input($field) !== $user->{$column};

        return [
            'name' => ['required', 'string', 'max:255', Rule::when($changed('name', 'name'), TextFormat::personName('Full name'))],
            'studentId' => [$student, 'string', 'max:50', Rule::when($changed('studentId', 'student_id'), 'regex:'.User::STUDENT_ID_FORMAT), Rule::unique('users', 'student_id')->ignore($id)],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($id)],
            'course' => [$student, 'string', 'max:50', Rule::when($changed('course', 'course'), TextFormat::course())],
            'yearLevel' => [$student, 'string', 'max:50', Rule::when($changed('yearLevel', 'year_level'), Rule::in(TextFormat::YEAR_LEVELS))],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'An account with this email already exists.',
            'studentId.unique' => 'This student ID is already registered.',
            'studentId.regex' => User::STUDENT_ID_MESSAGE,
        ];
    }
}
