<?php

namespace App\Http\Requests;

use App\Models\Organization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'studentId' => 'required|string|max:50|unique:users,student_id',
            'email' => 'required|email|max:255|unique:users,email',
            'course' => ['required', 'string', 'max:50', ...$this->courseRule()],
            'yearLevel' => 'required|string|max:50',
            'password' => 'required|string|min:8|confirmed',
            // Signing up to register a new org: no application to the selected org
            'registerOrg' => 'sometimes|boolean',
        ];
    }

    // Only courses the selected org accepts (no rule if the org hasn't listed any)
    private function courseRule(): array
    {
        $courses = $this->boolean('registerOrg') ? null : Organization::current()?->courses;

        return $courses ? [Rule::in($courses)] : [];
    }

    public function messages(): array
    {
        return [
            'course.in' => 'This organization is only open to '.implode(', ', Organization::current()?->courses ?? []).' students.',
            'email.unique' => 'An account with this email already exists.',
            'studentId.unique' => 'This student ID is already registered.',
        ];
    }
}
