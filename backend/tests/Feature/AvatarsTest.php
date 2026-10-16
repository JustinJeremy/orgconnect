<?php

namespace Tests\Feature;

use App\Models\VolunteerHour;
use Tests\TestCase;

// Batch 16: lists carry each person's avatar; the admin's own profile has no student fields
class AvatarsTest extends TestCase
{
    public function test_lists_carry_each_persons_avatar(): void
    {
        $org = $this->compSoc();
        $officer = $this->person($org, 'officer');
        $member = $this->person($org, 'member', 'Active', ['avatar' => 'cap']);
        $this->inOrg($org, fn () => VolunteerHour::create([
            'user_id' => $member->id, 'activity' => 'Booth', 'date' => now()->toDateString(), 'hours' => 2, 'status' => 'Approved', 'reviewed_by' => $officer->id,
        ]));

        $members = collect($this->actingIn($officer, $org)->getJson('/api/members')->json());
        $this->assertSame('cap', $members->firstWhere('id', $member->id)['avatar']);
        $this->actingIn($officer, $org)->getJson('/api/hours')->assertJsonPath('0.memberAvatar.avatar', 'cap');
        $this->actingIn($officer, $org)->getJson('/api/leaderboard')->assertJsonPath('0.avatar', 'cap');
    }

    public function test_rosters_list_officers_first_in_rank_order(): void
    {
        $org = $this->compSoc();
        $this->person($org, 'member', 'Active', ['name' => 'Aaron Member']);
        $this->person($org, 'officer', 'Active', ['name' => 'Zed Treasurer'], 'Treasurer');
        $president = $this->person($org, 'officer', 'Active', ['name' => 'Yna President']);
        $this->person($org, 'officer', 'Active', ['name' => 'Xia Secretary'], 'Secretary');
        $this->person($org, 'officer', 'Active', ['name' => 'Wes VP'], 'VP Academics');

        $names = collect($this->actingIn($president, $org)->getJson('/api/members')->json())->pluck('name')->all();
        $this->assertSame(['Yna President', 'Wes VP', 'Xia Secretary', 'Zed Treasurer', 'Aaron Member'], $names);

        $admin = $this->person($this->secondOrg());
        $admin->forceFill(['is_admin' => true])->save();
        $page = $this->actingIn($admin, $org)->getJson("/api/admin/users?org={$org->id}")->json('data');
        $this->assertSame(['Yna President', 'Wes VP', 'Xia Secretary', 'Zed Treasurer', 'Aaron Member'], collect($page)->pluck('name')->all());
    }

    public function test_the_admin_updates_their_profile_without_student_fields(): void
    {
        $org = $this->compSoc();
        $admin = $this->person($org);
        $admin->forceFill(['is_admin' => true])->save();

        $this->actingIn($admin, $org)->putJson('/api/user', ['name' => 'Platform Admin', 'email' => 'admin@school.edu.ph'])->assertOk();
        $this->assertSame('Platform Admin', $admin->fresh()->name);

        // Students still need theirs
        $student = $this->person($org);
        $this->actingIn($student, $org)->putJson('/api/user', ['name' => 'X', 'email' => 'x@school.edu.ph'])->assertStatus(422);
    }
}
