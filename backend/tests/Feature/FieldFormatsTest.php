<?php

namespace Tests\Feature;

use App\Models\Setting;
use Tests\TestCase;

// Batch 23.7: each field only takes what it's for (app/Rules/TextFormat.php)
class FieldFormatsTest extends TestCase
{
    public function test_sign_up_rejects_numbers_in_the_name_and_unknown_year_levels(): void
    {
        $org = $this->compSoc();
        $body = [
            'name' => 'Ma. Clara Dela Cruz-O\'Neil', 'studentId' => '2025-00142', 'email' => 'clara@school.edu.ph', 'course' => 'BSIT',
            'yearLevel' => '1st year', 'password' => 'password123', 'password_confirmation' => 'password123',
        ];

        $this->withHeader('X-Organization', $org->slug)->postJson('/api/register', ['name' => '12133'] + $body)
            ->assertStatus(422)->assertJsonValidationErrors('name');
        $this->withHeader('X-Organization', $org->slug)->postJson('/api/register', ['name' => 'Juan2 @Cruz'] + $body)
            ->assertStatus(422)->assertJsonValidationErrors('name');
        $this->withHeader('X-Organization', $org->slug)->postJson('/api/register', ['yearLevel' => '9th year'] + $body)
            ->assertStatus(422)->assertJsonValidationErrors('yearLevel');

        $this->withHeader('X-Organization', $org->slug)->postJson('/api/register', $body)->assertCreated();
    }

    public function test_registering_an_org_checks_each_field(): void
    {
        $org = $this->compSoc();
        $student = $this->person($org);
        $form = [
            'name' => 'Robotics Club – TIP', 'shortName' => 'RC2', 'college' => 'College of Engineering & Architecture',
            'tagline' => 'Build.', 'description' => 'Robots.', 'adviser' => 'Engr. Ana Cruz', 'email' => 'rc@school.edu.ph', 'courses' => ['BSCpE'],
        ];

        $this->actingIn($student, $org)->postJson('/api/org-requests', [
            'name' => '12345', 'shortName' => '!!', 'college' => 'College 1', 'tagline' => '2025', 'description' => '...', 'adviser' => 'Engr. 007',
        ] + $form)->assertStatus(422)->assertJsonValidationErrors(['name', 'shortName', 'college', 'tagline', 'description', 'adviser']);
        $this->actingIn($student, $org)->postJson('/api/org-requests', ['courses' => ['BSIT2'], 'proofUrl' => 'not a link'] + $form)
            ->assertStatus(422)->assertJsonValidationErrors(['courses.0', 'proofUrl']);

        $this->actingIn($student, $org)->postJson('/api/org-requests', $form)->assertCreated();
    }

    public function test_titles_reasons_and_names_need_real_words(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $event = [
            'title' => 'Laravel Workshop', 'category' => 'Workshop', 'date' => now()->addWeek()->toDateString(), 'time' => '13:00',
            'location' => 'Room 304', 'mode' => 'F2F', 'capacity' => 2, 'description' => 'Bring a laptop.',
        ];

        $this->actingIn($officer, $org)->postJson('/api/events', ['title' => '2025', 'location' => '???'] + $event)
            ->assertStatus(422)->assertJsonValidationErrors(['title', 'location']);
        $this->actingIn($officer, $org)->postJson('/api/events', $event)->assertCreated();

        $this->actingIn($officer, $org)->postJson('/api/members', ['name' => 'Leo 123', 'email' => 'leo@school.edu.ph', 'position' => 'Member', 'status' => 'Active'])
            ->assertStatus(422)->assertJsonValidationErrors('name');
        $this->actingIn($officer, $org)->postJson('/api/members', ['name' => 'Leo Manalo', 'email' => 'leo@school.edu.ph', 'position' => 'Boss', 'status' => 'Active'])
            ->assertStatus(422)->assertJsonValidationErrors('position');

        $this->actingIn($officer, $org)->postJson('/api/hours', ['activity' => '123', 'date' => now()->toDateString(), 'hours' => 1])
            ->assertStatus(422)->assertJsonValidationErrors('activity');
    }

    public function test_details_saved_before_the_checks_can_be_kept_when_editing(): void
    {
        Setting::setFlag(Setting::DETAILS_OPEN, true);
        $org = $this->compSoc();
        $member = $this->person($org, 'member', 'Active', ['name' => 'Juan 2', 'course' => 'BS-IT', 'year_level' => '5th year']);
        $body = ['name' => 'Juan 2', 'email' => 'juan@school.edu.ph', 'studentId' => $member->student_id, 'course' => 'BS-IT', 'yearLevel' => '5th year'];

        $this->actingIn($member, $org)->putJson('/api/user', $body)->assertOk();
        $this->actingIn($member, $org)->putJson('/api/user', ['name' => 'Juan 3', 'course' => 'BSIT9', 'yearLevel' => '6th year'] + $body)
            ->assertStatus(422)->assertJsonValidationErrors(['name', 'course', 'yearLevel']);
        $this->actingIn($member, $org)->putJson('/api/user', ['name' => 'Juan Cruz', 'course' => 'BSIT', 'yearLevel' => '2nd year'] + $body)->assertOk();
    }
}
