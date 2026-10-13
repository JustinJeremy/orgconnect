<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\LearningResource;
use App\Models\Organization;
use App\Models\TutoringSession;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\VolunteerHour;
use Illuminate\Database\Seeder;

// Sample members, events, hours, tutoring sessions, resources and announcements for Computer Society,
// so the org doesn't look empty. Safe to run more than once.
// All sample accounts use the password: password123
class ComputerSocietySeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::where('slug', 'computer-society')->firstOrFail();
        Organization::setCurrent($org);

        // ---- People ----
        $people = [
            // email, name, student id, course, year, role, position, status
            ['leo.manalo@orgconnect.test', 'Leo Manalo', '2023-00215', 'BSCS', '4th year', 'officer', 'VP Academics'],
            ['angela.rivera@orgconnect.test', 'Angela Rivera', '2023-00388', 'BSIT', '3rd year', 'officer', 'Secretary'],
            ['nico.fernandez@orgconnect.test', 'Nico Fernandez', '2023-00412', 'BSIS', '3rd year', 'officer', 'Treasurer'],
            ['joanna.uy@orgconnect.test', 'Joanna Uy', '2024-00133', 'BSIT', '2nd year', 'member', 'Member'],
            ['mark.delarosa@orgconnect.test', 'Mark Dela Rosa', '2024-00257', 'BSCS', '2nd year', 'member', 'Member'],
            ['patricia.lim@orgconnect.test', 'Patricia Lim', '2024-00319', 'BSEMC', '2nd year', 'member', 'Member'],
            ['ryan.castillo@orgconnect.test', 'Ryan Castillo', '2025-00092', 'BSIT', '1st year', 'member', 'Member'],
            ['bianca.torres@orgconnect.test', 'Bianca Torres', '2025-00146', 'BSCS', '1st year', 'member', 'Member'],
            ['enzo.villanueva@orgconnect.test', 'Enzo Villanueva', '2022-00508', 'BSIT', '4th year', 'member', 'Member', 'Inactive'],
            ['carla.mendez@orgconnect.test', 'Carla Mendez', '2025-00274', 'BSIT', '1st year', 'member', 'Member', 'Pending'],
            ['jerome.santiago@orgconnect.test', 'Jerome Santiago', '2025-00311', 'BSCS', '1st year', 'member', 'Member', 'Pending'],
        ];
        $u = [];
        foreach ($people as $p) {
            $u[$p[0]] = DatabaseSeeder::account($org, $p[0], [
                'name' => $p[1], 'student_id' => $p[2], 'course' => $p[3], 'year_level' => $p[4],
            ], $p[5], $p[6], $p[7] ?? 'Active');
        }
        foreach (['officer@orgconnect.test', 'member@orgconnect.test'] as $email) {
            $u[$email] = User::where('email', $email)->firstOrFail();
        }
        $id = fn (string $key) => $u[str_contains($key, '@') ? $key : "$key@orgconnect.test"]->id;
        $president = $id('officer@orgconnect.test');

        // ---- Events ----
        $events = [
            ['Laravel + React Full-Stack Workshop', 'Workshop', 5, '13:00', 'CCS Building, Room 304', 'F2F', 40,
                'Build a small to-do app with a Laravel API and a React frontend. Bring a laptop with PHP, Composer and Node installed.'],
            ['CCS Hackathon 2026 Orientation', 'Seminar', 9, '16:00', 'Google Meet', 'Online', 120,
                'Rules, themes, judging and team formation for this year\'s 24-hour hackathon. Recording will be posted after.'],
            ['Cybersecurity Basics: Staying Safe Online', 'Seminar', 14, '15:00', 'CCS Audio-Visual Room + Zoom', 'Hybrid', 80,
                'Passwords, phishing and two-factor authentication, with live demos of common scams targeting students.'],
            ['Tech4Schools: Computer Literacy Outreach', 'Community Service', 21, '08:00', 'Sta. Ana Elementary School, Manila', 'F2F', 15,
                'Teach Grade 5 pupils basic computer skills: typing, saving files and safe internet use. Counts toward volunteer hours.'],
            ['CompSoc Movie Night', 'Social', 27, '18:00', 'CCS Student Lounge', 'F2F', 60,
                'A tech movie, popcorn and a short trivia round. Bring your blockmates!'],
            ['Git and GitHub Crash Course', 'Workshop', -15, '10:00', 'CCS Building, Room 304', 'F2F', 35,
                'Commits, branches, pull requests and resolving merge conflicts, practiced on a shared class repository.'],
            ['Intro to UI/UX with Figma', 'Workshop', -29, '14:00', 'Google Meet', 'Online', 60,
                'Wireframes to a clickable prototype in Figma, with tips on layout, color and accessibility.'],
        ];
        $going = ['joanna.uy', 'mark.delarosa', 'patricia.lim', 'ryan.castillo', 'bianca.torres', 'member@orgconnect.test', 'leo.manalo'];
        foreach ($events as $i => [$title, $category, $days, $time, $location, $mode, $capacity, $description]) {
            $done = $days < 0;
            $event = Event::updateOrCreate(['title' => $title], [
                'category' => $category,
                'date' => now()->addDays($days)->toDateString(),
                'time' => $time,
                'location' => $location,
                'mode' => $mode,
                'capacity' => $capacity,
                'description' => $description,
                'status' => $done ? 'completed' : 'upcoming',
                'created_by' => $president,
            ]);

            // A different handful of members RSVP'd to each event
            foreach (array_slice($going, $i % 3, 4 + $i % 3) as $j => $who) {
                $attended = $done && $j !== 2;   // one person missed each past event
                $event->registrations()->updateOrCreate(['user_id' => $id($who)], ['status' => $attended ? 'attended' : 'registered']);
                if ($attended) {
                    Certificate::firstOrCreate(['user_id' => $id($who), 'event_id' => $event->id], ['issued_at' => now()->addDays($days + 1)]);
                }
            }
        }

        // ---- Volunteer hours ----
        $hours = [
            ['leo.manalo', 'Git and GitHub Crash Course facilitator', -15, 5, 'Approved'],
            ['angela.rivera', 'Membership drive booth', -35, 3, 'Approved'],
            ['joanna.uy', 'Membership drive booth', -35, 2.5, 'Approved'],
            ['joanna.uy', 'Figma workshop tech support', -29, 2, 'Approved'],
            ['mark.delarosa', 'CCS laboratory computer cleanup', -22, 4, 'Approved'],
            ['mark.delarosa', 'Hackathon venue preparation', -2, 3, 'Pending'],
            ['patricia.lim', 'Event poster designs', -12, 2, 'Approved'],
            ['ryan.castillo', 'Membership drive booth', -35, 1, 'Rejected'],
            ['bianca.torres', 'Peer tutoring: Python basics', -6, 1.5, 'Pending'],
            ['member@orgconnect.test', 'Git and GitHub Crash Course registration desk', -15, 3, 'Approved'],
            ['member@orgconnect.test', 'CCS laboratory computer cleanup', -22, 2, 'Approved'],
            ['member@orgconnect.test', 'Hackathon venue preparation', -2, 2.5, 'Pending'],
        ];
        foreach ($hours as [$who, $activity, $days, $amount, $status]) {
            VolunteerHour::updateOrCreate(['user_id' => $id($who), 'activity' => $activity], [
                'date' => now()->addDays($days)->toDateString(),
                'hours' => $amount,
                'status' => $status,
                'reviewed_by' => $status === 'Pending' ? null : $id('angela.rivera'),
            ]);
        }

        // ---- Peer tutoring ----
        $sessions = [
            ['leo.manalo', 'Java OOP: classes and inheritance', 'Programming', 'Mondays, 3:00 PM', 'Room 304', 5,
                'Classes, objects, inheritance and interfaces, with short exercises. Good for CS 102 students.'],
            ['angela.rivera', 'HTML, CSS and responsive layouts', 'Web Development', 'Wednesdays, 1:00 PM', 'Google Meet', 6,
                'Flexbox, grid and media queries. Bring a page you want to make mobile-friendly.'],
            ['nico.fernandez', 'SQL for beginners', 'Databases', 'Thursdays, 4:00 PM', 'Room 302', 4,
                'SELECT, WHERE, JOIN and GROUP BY using a sample school database.'],
            ['mark.delarosa', 'Subnetting made easy', 'Networking', 'Fridays, 10:00 AM', 'Networking Lab', 3,
                'IP addressing and subnetting step by step, with practice problems for the networking midterm.'],
        ];
        foreach ($sessions as [$tutor, $subject, $area, $schedule, $location, $slots, $description]) {
            TutoringSession::updateOrCreate(['subject' => $subject], [
                'tutor_id' => $id($tutor), 'area' => $area, 'schedule' => $schedule,
                'location' => $location, 'slots' => $slots, 'description' => $description,
            ]);
        }
        $requests = [
            ['Java OOP: classes and inheritance', 'ryan.castillo', 'Confirmed'],
            ['Java OOP: classes and inheritance', 'bianca.torres', 'Pending'],
            ['HTML, CSS and responsive layouts', 'patricia.lim', 'Completed'],
            ['SQL for beginners', 'member@orgconnect.test', 'Pending'],
            ['Subnetting made easy', 'joanna.uy', 'Pending'],
        ];
        foreach ($requests as [$subject, $who, $status]) {
            TutoringSession::where('subject', $subject)->first()
                ->requests()->updateOrCreate(['user_id' => $id($who)], ['status' => $status]);
        }

        // ---- Shared resources (DatabaseSeeder adds three more) ----
        $resources = [
            ['angela.rivera', 'MDN Web Docs: Learn web development', 'Web Development', 'Link', 'https://developer.mozilla.org/en-US/docs/Learn', 'Free, beginner-friendly HTML, CSS and JavaScript lessons.'],
            ['leo.manalo', 'CS50x: Introduction to Computer Science', 'Programming', 'Video', 'https://cs50.harvard.edu/x/', 'Harvard\'s free intro course. The lectures are great for reviewing C and Python.'],
            ['nico.fernandez', 'SQLZoo interactive tutorial', 'Databases', 'Link', 'https://sqlzoo.net/', 'Practice SQL queries right in the browser.'],
            ['mark.delarosa', 'Subnetting practice questions', 'Networking', 'Link', 'https://subnettingpractice.com/', 'Unlimited subnetting drills with answers.'],
        ];
        foreach ($resources as [$who, $title, $subject, $type, $url, $description]) {
            LearningResource::updateOrCreate(['url' => $url], [
                'user_id' => $id($who), 'title' => $title, 'subject' => $subject, 'type' => $type, 'description' => $description,
            ]);
        }

        // ---- Announcements ----
        $posts = [
            ['Welcome to CompSoc, A.Y. 2026–2027!', 'General', true, -14,
                'Welcome, new and returning members! Our general assembly is every first Friday at 4:00 PM in CCS Room 304. Meet the officers and see this semester\'s workshops.'],
            ['Hackathon team registration closes next week', 'Deadline', false, -3,
                'Teams of 3 to 5. RSVP for the orientation on the Events page and send your team name to the Secretary.'],
            ['Volunteers needed for Tech4Schools', 'Event', false, -6,
                'We need 15 volunteers to teach computer basics at Sta. Ana Elementary School. You will earn volunteer hours and a certificate.'],
            ['Room 304 under maintenance on Monday', 'Urgent', false, -1,
                'The aircon is being repaired. Monday tutoring sessions move to Room 302.'],
        ];
        foreach ($posts as [$title, $category, $pinned, $days, $content]) {
            $post = Announcement::updateOrCreate(['title' => $title], [
                'user_id' => $id('angela.rivera'), 'category' => $category, 'content' => $content, 'pinned' => $pinned,
            ]);
            $post->timestamps = false;
            $post->forceFill(['created_at' => now()->addDays($days)])->save();
        }

        // ---- A few notifications so the bell isn't empty ----
        $notes = [
            ['member@orgconnect.test', 'New event: Laravel + React Full-Stack Workshop'],
            ['member@orgconnect.test', 'Your 3 hrs for Git and GitHub Crash Course registration desk were approved'],
            ['member@orgconnect.test', 'Your certificate for Git and GitHub Crash Course is ready'],
            ['officer@orgconnect.test', 'Carla Mendez applied to join CompSoc'],
            ['officer@orgconnect.test', 'Jerome Santiago applied to join CompSoc'],
        ];
        foreach ($notes as [$who, $message]) {
            UserNotification::firstOrCreate(['user_id' => $id($who), 'message' => $message]);
        }
    }
}
