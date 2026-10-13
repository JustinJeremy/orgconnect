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
