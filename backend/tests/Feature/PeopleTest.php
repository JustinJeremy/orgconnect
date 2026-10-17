<?php

namespace Tests\Feature;

use App\Models\TutoringRequest;
use App\Models\TutoringSession;
use Tests\TestCase;

// Batch 17: the people directory, profiles, most helpful tutors and friends
class PeopleTest extends TestCase
{
    public function test_members_see_the_directory_officers_first_and_open_a_profile(): void
    {
        $org = $this->compSoc();
        $me = $this->person($org, 'member', 'Active', ['name' => 'Aaron Member']);
        $president = $this->person($org, 'officer', 'Active', ['name' => 'Yna President']);
        $this->person($org, 'member', 'Pending', ['name' => 'Pam Applicant']);
        $this->person($this->secondOrg(), 'member', 'Active', ['name' => 'Other Org']);

        $names = collect($this->actingIn($me, $org)->getJson('/api/people')->assertOk()->json())->pluck('name')->all();
        $this->assertSame(['Yna President', 'Aaron Member'], $names);

        // A member doesn't see a non-friend's email; an officer does
        $this->actingIn($me, $org)->getJson("/api/people/{$president->id}")->assertOk()
            ->assertJsonPath('position', 'President')->assertJsonPath('email', null)->assertJsonPath('friendship', 'none');
        $this->actingIn($president, $org)->getJson("/api/people/{$me->id}")->assertJsonPath('email', $me->email);
    }

    public function test_people_outside_the_org_have_no_profile_here(): void
    {
        $org = $this->compSoc();
        $me = $this->person($org);
        $outsider = $this->person($this->secondOrg());
        $applicant = $this->person($org, 'member', 'Pending');

        $this->actingIn($me, $org)->getJson("/api/people/{$outsider->id}")->assertNotFound();
        $this->actingIn($me, $org)->getJson("/api/people/{$applicant->id}")->assertNotFound();
        $this->actingIn($me, $org)->postJson("/api/friends/{$outsider->id}")->assertNotFound();
    }

    public function test_friend_requests_are_sent_accepted_and_removed(): void
    {
        $org = $this->compSoc();
        $me = $this->person($org, 'member', 'Active', ['name' => 'Juan']);
        $other = $this->person($org, 'member', 'Active', ['name' => 'Isabel']);

        $this->actingIn($me, $org)->postJson("/api/friends/{$me->id}")->assertStatus(422);
        $this->actingIn($me, $org)->postJson("/api/friends/{$other->id}")->assertOk()->assertJsonPath('friendship', 'sent');
        $this->actingIn($me, $org)->postJson("/api/friends/{$other->id}")->assertStatus(422);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $other->id, 'message' => 'Juan sent you a friend request', 'organization_id' => null]);

        $this->actingIn($other, $org)->getJson('/api/friends')->assertJsonPath('received.0.name', 'Juan');
        $this->actingIn($other, $org)->getJson("/api/people/{$me->id}")->assertJsonPath('friendship', 'received');
        $this->actingIn($other, $org)->patchJson("/api/friends/{$me->id}")->assertOk()->assertJsonPath('friendship', 'friends');
        $this->assertDatabaseHas('user_notifications', ['user_id' => $me->id, 'message' => 'Isabel accepted your friend request']);

        // Friends see each other's email, and each other in their lists
        $this->actingIn($me, $org)->getJson("/api/people/{$other->id}")->assertJsonPath('friendship', 'friends')->assertJsonPath('email', $other->email);
        $this->actingIn($me, $org)->getJson('/api/friends')->assertJsonPath('friends.0.name', 'Isabel')->assertJsonPath('friends.0.inThisOrg', true);
        $people = collect($this->actingIn($me, $org)->getJson('/api/people')->json());
        $this->assertSame('friends', $people->firstWhere('id', $other->id)['friendship']);
        $this->assertSame('self', $people->firstWhere('id', $me->id)['friendship']);

        // Unfriend
        $this->actingIn($other, $org)->deleteJson("/api/friends/{$me->id}")->assertOk();
        $this->actingIn($me, $org)->getJson('/api/friends')->assertJsonCount(0, 'friends');
    }

    public function test_adding_someone_who_already_asked_you_accepts_their_request(): void
    {
        $org = $this->compSoc();
        $me = $this->person($org);
        $other = $this->person($org);

        $this->actingIn($other, $org)->postJson("/api/friends/{$me->id}")->assertOk();
        $this->actingIn($me, $org)->postJson("/api/friends/{$other->id}")->assertOk()->assertJsonPath('friendship', 'friends');
    }

    public function test_most_helpful_ranks_tutors_by_completed_sessions(): void
    {
        $org = $this->compSoc();
        $ana = $this->person($org, 'member', 'Active', ['name' => 'Ana Tutor']);
        $ben = $this->person($org, 'member', 'Active', ['name' => 'Ben Tutor']);
        $students = collect(range(1, 3))->map(fn () => $this->person($org));
        $session = fn ($tutor) => $this->inOrg($org, fn () => TutoringSession::create([
            'tutor_id' => $tutor->id, 'subject' => 'Calculus', 'area' => 'Math', 'schedule' => 'Mon 3 PM', 'location' => 'Library', 'slots' => 5,
        ]));
        [$anaSession, $benSession] = [$session($ana), $session($ben)];
        $book = fn ($s, $student, $status = 'Completed') => $this->inOrg($org, fn () => TutoringRequest::create([
            'tutoring_session_id' => $s->id, 'user_id' => $student->id, 'status' => $status,
        ]));
        $book($benSession, $students[0]);
        $book($anaSession, $students[0]);
        $book($anaSession, $students[1]);
        $book($anaSession, $students[2], 'Pending');   // not completed: doesn't count

        $this->actingIn($students[0], $org)->getJson('/api/people/helpful')->assertOk()
            ->assertJsonPath('tutors.0.name', 'Ana Tutor')->assertJsonPath('tutors.0.sessions', 2)->assertJsonPath('tutors.0.students', 2)
            ->assertJsonPath('tutors.1.name', 'Ben Tutor')
            ->assertJsonPath('mine.rank', null)
            // Ana's session has 3 requests (2 completed, 1 pending): the most requested
            ->assertJsonPath('subjects.0.id', $anaSession->id)->assertJsonPath('subjects.0.requests', 3);
        $this->actingIn($ben, $org)->getJson('/api/people/helpful')
            ->assertJsonPath('mine.rank', 2)->assertJsonPath('mine.sessions', 1)->assertJsonPath('mine.teaching', 1);
        $this->actingIn($students[0], $org)->getJson("/api/people/{$ana->id}")
            ->assertJsonPath('stats.sessionsTaught', 2)->assertJsonPath('stats.studentsHelped', 2)->assertJsonPath('tutoring.0.subject', 'Calculus');
    }
}
