<?php

namespace Database\Seeders;

use App\Models\LearningResource;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    // Computer Society: the main officer and member accounts and a few shared resources,
    // then sample data for both orgs (ComputerSocietySeeder, DataScienceSocietySeeder).
    // Run with:  php artisan db:seed
    public function run(): void
    {
        $compsoc = Organization::where('slug', 'computer-society')->firstOrFail();
        Organization::setCurrent($compsoc);

        $officer = $this->account($compsoc, 'officer@orgconnect.test', [
            'name' => 'Maria Santos',
            'student_id' => '2023-00142',
            'course' => 'BSIT',
            'year_level' => '4th year',
        ], 'officer', 'President');

        $this->account($compsoc, 'member@orgconnect.test', [
            'name' => 'Juan Dela Cruz',
            'student_id' => '2025-01877',
            'course' => 'BSCS',
            'year_level' => '2nd year',
        ], 'member', 'Member');

        $resources = [
            ['title' => 'Laravel 13 documentation', 'subject' => 'Web Development', 'type' => 'Link', 'url' => 'https://laravel.com/docs'],
            ['title' => 'React: Quick Start', 'subject' => 'Web Development', 'type' => 'Link', 'url' => 'https://react.dev/learn'],
            ['title' => 'Khan Academy: Statistics and probability', 'subject' => 'Mathematics', 'type' => 'Video', 'url' => 'https://www.khanacademy.org/math/statistics-probability'],
        ];
        foreach ($resources as $resource) {
            LearningResource::updateOrCreate(['url' => $resource['url']], $resource + ['user_id' => $officer->id]);
        }

        $this->call([ComputerSocietySeeder::class, DataScienceSocietySeeder::class]);
        Organization::setCurrent(null);

        $this->platform();
        $this->sampleAvatars();
    }

    // Sample members get an avatar character, or (about a third of them) just their initials,
    // so signing in goes straight to the app (new sign-ups still see the avatar picker).
    // Never touches accounts that already chose one.
    private function sampleAvatars(): void
    {
        $choices = [...User::AVATARS, 'initials', 'initials', 'initials', 'initials'];
        User::where('email', 'like', '%@orgconnect.test')
            ->where('is_admin', false)
            ->whereNull('avatar')
            ->each(fn (User $user) => $user->update(['avatar' => $choices[crc32($user->email) % count($choices)]]));
    }

    // The platform admin, and one org registration waiting for review
    private function platform(): void
    {
        $admin = User::firstOrCreate(['email' => 'admin@orgconnect.test'], [
            'name' => 'OrgConnect Admin',
            'student_id' => 'ADMIN-0001',
            'course' => 'Staff',
            'year_level' => 'Staff',
            'password' => 'password123',
        ]);
        $admin->forceFill(['is_admin' => true])->save();

        $andrea = User::where('email', 'andrea.lim@orgconnect.test')->first();
        Organization::firstOrCreate(['slug' => 'jpcs'], [
            'status' => 'Pending',
            'requested_by' => $andrea?->id,
            'name' => 'Junior Philippine Computer Society – TIP',
            'short_name' => 'JPCS',
            'college' => 'College of Computer Studies',
            'tagline' => "Building tomorrow's IT leaders, together.",
            'description' => 'A student chapter of JPCS that runs coding bootcamps, industry talks and outreach for public schools.',
            'adviser' => 'Engr. Paolo Dizon',
            'email' => 'jpcs.tip@school.edu.ph',
            'courses' => ['BSIT', 'BSCS', 'BSIS'],
            'proof_url' => 'https://drive.google.com/file/d/osa-recognition-2026',
            'theme' => [],
        ]);
    }

    public static function account(Organization $org, string $email, array $fields, string $role, string $position, string $status = 'Active'): User
    {
        $user = User::firstOrCreate(['email' => $email], $fields + ['password' => 'password123']);
        $user->memberships()->updateOrCreate(['organization_id' => $org->id], [
            'role' => $role,
            'position' => $position,
            'status' => $status,
            'join_date' => $status === 'Active' ? now()->subMonths(crc32($email) % 14 + 1)->startOfDay() : null,
        ]);

        return $user;
    }
}
