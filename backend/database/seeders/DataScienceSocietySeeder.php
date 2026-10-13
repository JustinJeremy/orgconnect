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

// A second College of Computer Studies org with sample members, events, hours,
// tutoring sessions, resources and announcements. Safe to run more than once.
// All sample accounts use the password: password123
class DataScienceSocietySeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::updateOrCreate(['slug' => 'data-science-society'], [
            'name' => 'Data Science Society',
            'short_name' => 'DSS',
            'college' => 'College of Computer Studies',
            'tagline' => 'Turning data into decisions.',
            'description' => 'The Data Science Society is the College of Computer Studies\' community for students who love working with data. We run hands-on workshops on Python, SQL and machine learning, join Kaggle competitions as a team, and build data projects for partner barangays and school offices.',
            'mission' => 'To build data literacy among CCS students through peer learning, real-world projects and responsible use of data.',
            'vision' => 'Every CCS graduate able to ask good questions of data and answer them honestly.',
            'founded_year' => 2019,
            'adviser' => 'Dr. Liza Manalastas',
            'email' => 'dss.ccs@school.edu.ph',
            'facebook_url' => 'https://facebook.com/ccs.datascience',
            'office' => 'CCS Building, Analytics Lab (Room 210)',
            'meeting_schedule' => 'Every other Wednesday, 5:00 PM (hybrid)',
            'membership_fee' => '₱100 per semester',
            'courses' => ['BSCS', 'BSIT', 'BSIS'],
            'tutoring_areas' => ['Python', 'SQL & Databases', 'Statistics', 'Machine Learning', 'Data Visualization', 'Other'],
            // Deep teal + coral
            'theme' => [
                'navy' => '#0f4c4f', 'navyDark' => '#0a3638', 'navy2' => '#17666a', 'brand' => '#0b7676',
                'accent' => '#d1462f', 'accentDark' => '#b23a26', 'highlight' => '#ff8a65',
                'bg' => '#f4f8f7', 'tint' => '#e6f3f1', 'primarySoft' => '#e2f0ee', 'primaryLine' => '#b9dad5',
                'accentSoft' => '#fde9e4', 'sidebarMuted' => '#a9d1cc', 'ring1' => '#1f7a77', 'ring2' => '#155f5d',
            ],
        ]);
        Organization::setCurrent($org);

        // ---- People ----
        $people = [
            // email, name, student id, course, year, role, position, status
            ['andrea.lim@orgconnect.test', 'Andrea Lim', '2022-00318', 'BSCS', '4th year', 'officer', 'President'],
            ['paolo.reyes@orgconnect.test', 'Paolo Reyes', '2022-00451', 'BSCS', '4th year', 'officer', 'VP Academics'],
            ['bea.navarro@orgconnect.test', 'Bea Navarro', '2023-00127', 'BSIT', '3rd year', 'officer', 'Secretary'],
            ['marco.villareal@orgconnect.test', 'Marco Villareal', '2023-00209', 'BSIS', '3rd year', 'officer', 'Treasurer'],
            ['carlo.mendoza@orgconnect.test', 'Carlo Mendoza', '2023-00544', 'BSCS', '3rd year', 'member', 'Member'],
            ['denise.tan@orgconnect.test', 'Denise Tan', '2024-00102', 'BSIT', '2nd year', 'member', 'Member'],
            ['miguel.ramos@orgconnect.test', 'Miguel Ramos', '2024-00376', 'BSCS', '2nd year', 'member', 'Member'],
            ['sofia.garcia@orgconnect.test', 'Sofia Garcia', '2024-00481', 'BSIS', '2nd year', 'member', 'Member'],
            ['gabriel.aquino@orgconnect.test', 'Gabriel Aquino', '2025-00063', 'BSCS', '1st year', 'member', 'Member'],
            ['isabel.cruz@orgconnect.test', 'Isabel Cruz', '2025-00218', 'BSIT', '1st year', 'member', 'Member'],
            ['rafael.santos@orgconnect.test', 'Rafael Santos', '2023-00690', 'BSIT', '3rd year', 'member', 'Member', 'Inactive'],
            ['kyle.bautista@orgconnect.test', 'Kyle Bautista', '2025-00301', 'BSCS', '1st year', 'member', 'Member', 'Pending'],
            ['trisha.domingo@orgconnect.test', 'Trisha Domingo', '2025-00347', 'BSIS', '1st year', 'member', 'Member', 'Pending'],
        ];
        $u = [];
        foreach ($people as $p) {
            $u[$p[0]] = DatabaseSeeder::account($org, $p[0], [
                'name' => $p[1], 'student_id' => $p[2], 'course' => $p[3], 'year_level' => $p[4],
            ], $p[5], $p[6], $p[7] ?? 'Active');
        }
        // Juan from Computer Society is also a DSS member, to show switching between orgs
        $juan = User::where('email', 'member@orgconnect.test')->first();
        if ($juan) {
            $u[$juan->email] = DatabaseSeeder::account($org, $juan->email, [], 'member', 'Member');
        }
        $id = fn (string $key) => $u[str_contains($key, '@') ? $key : "$key@orgconnect.test"]->id;
        $president = $id('andrea.lim');

        // ---- Events ----
        $events = [
            ['Intro to Python for Data Analysis', 'Workshop', 6, '13:00', 'CCS Analytics Lab (Room 210)', 'F2F', 35,
                'Bring your laptop. We will install Anaconda, load a real dataset with pandas and make our first charts. No experience needed.'],
            ['Kaggle Kickoff: Titanic Challenge', 'Workshop', 11, '16:00', 'Room 210 + Google Meet', 'Hybrid', 40,
                'Form teams, explore the Titanic dataset and submit your first prediction. Join on site or online.'],
            ['Careers in Data: Alumni Talk', 'Seminar', 16, '18:00', 'Zoom (link sent to registrants)', 'Online', 150,
                'Three DSS alumni working as a data analyst, a data engineer and an ML engineer share how they got there. Open Q&A after.'],
            ['Data for Good: Barangay Dashboard Build', 'Community Service', 23, '08:00', 'Barangay 648 Hall, Manila', 'F2F', 20,
                'We will help Barangay 648 turn their paper health records into a simple dashboard. Counts toward volunteer hours.'],
            ['DSS Game Night', 'Social', 29, '17:30', 'CCS Student Lounge', 'F2F', 50,
                'Board games, pizza and a data trivia round. Bring a friend from CCS!'],
            ['CRISP-DM Bootcamp', 'Workshop', -18, '09:00', 'CCS Analytics Lab (Room 210)', 'F2F', 30,
                'A one-day walk through all six CRISP-DM phases using a telco churn dataset.'],
            ['Data Visualization with Tableau Public', 'Seminar', -32, '15:00', 'Google Meet', 'Online', 80,
                'Design principles for clear charts, then a live build of an interactive dashboard in Tableau Public.'],
        ];
        $going = ['carlo.mendoza', 'denise.tan', 'miguel.ramos', 'sofia.garcia', 'gabriel.aquino', 'isabel.cruz', 'member@orgconnect.test'];
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
                $attended = $done && $j !== 1;   // one person missed each past event
                $event->registrations()->updateOrCreate(['user_id' => $id($who)], ['status' => $attended ? 'attended' : 'registered']);
                if ($attended) {
                    Certificate::firstOrCreate(['user_id' => $id($who), 'event_id' => $event->id], ['issued_at' => now()->addDays($days + 1)]);
                }
            }
        }

        // ---- Volunteer hours ----
        $hours = [
            ['carlo.mendoza', 'Barangay health data encoding', -40, 4, 'Approved'],
            ['carlo.mendoza', 'CRISP-DM Bootcamp facilitator', -18, 6, 'Approved'],
            ['denise.tan', 'Tutoring: SQL basics for 1st years', -25, 2, 'Approved'],
            ['denise.tan', 'Library survey data cleaning', -9, 3, 'Pending'],
            ['miguel.ramos', 'CCS enrollment dashboard', -30, 5, 'Approved'],
            ['sofia.garcia', 'Tableau seminar tech support', -32, 3, 'Approved'],
            ['sofia.garcia', 'Org website data update', -4, 1.5, 'Pending'],
            ['gabriel.aquino', 'Recruitment booth', -20, 2, 'Rejected'],
            ['isabel.cruz', 'Recruitment booth', -20, 2.5, 'Approved'],
            ['member@orgconnect.test', 'CRISP-DM Bootcamp registration desk', -18, 3, 'Approved'],
            ['member@orgconnect.test', 'Kaggle team data cleaning', -3, 2, 'Pending'],
        ];
        foreach ($hours as [$who, $activity, $days, $amount, $status]) {
            VolunteerHour::updateOrCreate(['user_id' => $id($who), 'activity' => $activity], [
                'date' => now()->addDays($days)->toDateString(),
                'hours' => $amount,
                'status' => $status,
                'reviewed_by' => $status === 'Pending' ? null : $id('bea.navarro'),
            ]);
        }

        // ---- Peer tutoring ----
        $sessions = [
            ['paolo.reyes', 'Pandas & NumPy basics', 'Python', 'Tuesdays, 3:00 PM', 'Analytics Lab', 4,
                'Dataframes, filtering, groupby and merging. Bring a laptop with Python installed.'],
            ['andrea.lim', 'Statistics for Data Science', 'Statistics', 'Thursdays, 1:00 PM', 'Google Meet', 6,
                'Descriptive stats, distributions and hypothesis testing, with examples in Python.'],
            ['carlo.mendoza', 'SQL joins and aggregates', 'SQL & Databases', 'Mondays, 4:30 PM', 'Room 305', 3,
                'Practice INNER/LEFT joins, GROUP BY and HAVING on a sample sales database.'],
            ['miguel.ramos', 'Intro to machine learning with scikit-learn', 'Machine Learning', 'Fridays, 2:00 PM', 'Analytics Lab', 5,
                'Train and evaluate your first classification model. Basic Python required.'],
        ];
        foreach ($sessions as [$tutor, $subject, $area, $schedule, $location, $slots, $description]) {
            TutoringSession::updateOrCreate(['subject' => $subject], [
                'tutor_id' => $id($tutor), 'area' => $area, 'schedule' => $schedule,
                'location' => $location, 'slots' => $slots, 'description' => $description,
            ]);
        }
        $requests = [
            ['Pandas & NumPy basics', 'gabriel.aquino', 'Confirmed'],
            ['Pandas & NumPy basics', 'isabel.cruz', 'Pending'],
            ['Statistics for Data Science', 'denise.tan', 'Completed'],
            ['SQL joins and aggregates', 'member@orgconnect.test', 'Pending'],
            ['Intro to machine learning with scikit-learn', 'sofia.garcia', 'Pending'],
        ];
        foreach ($requests as [$subject, $who, $status]) {
            TutoringSession::where('subject', $subject)->first()
                ->requests()->updateOrCreate(['user_id' => $id($who)], ['status' => $status]);
        }

        // ---- Shared resources ----
        $resources = [
            ['paolo.reyes', 'pandas: Getting started', 'Python', 'Link', 'https://pandas.pydata.org/docs/getting_started/index.html', 'The official 10-minute intro and tutorials.'],
            ['miguel.ramos', 'scikit-learn tutorials', 'Machine Learning', 'Link', 'https://scikit-learn.org/stable/tutorial/index.html', null],
            ['andrea.lim', 'Kaggle Learn: free micro-courses', 'Machine Learning', 'Link', 'https://www.kaggle.com/learn', 'Short courses on Python, pandas, SQL and ML. Good before the Kaggle Kickoff.'],
            ['andrea.lim', 'StatQuest with Josh Starmer', 'Statistics', 'Video', 'https://www.youtube.com/@statquest', 'Clear video explanations of statistics and ML concepts.'],
            ['bea.navarro', 'Python for Data Analysis, 3rd ed. (free online)', 'Python', 'Document', 'https://wesmckinney.com/book/', 'The pandas book, by the creator of pandas.'],
            ['carlo.mendoza', 'SQLBolt: interactive SQL lessons', 'SQL & Databases', 'Link', 'https://sqlbolt.com/', 'Used in the SQL joins tutoring session.'],
        ];
        foreach ($resources as [$who, $title, $subject, $type, $url, $description]) {
            LearningResource::updateOrCreate(['url' => $url], [
                'user_id' => $id($who), 'title' => $title, 'subject' => $subject, 'type' => $type, 'description' => $description,
            ]);
        }

        // ---- Announcements ----
        $posts = [
            ['Welcome to DSS, A.Y. 2026–2027!', 'General', true, -12,
                'Welcome, new and returning members! Our first general assembly is on Wednesday, 5:00 PM at the Analytics Lab (also on Google Meet). We will introduce the officers, the semester calendar and our Kaggle teams.'],
            ['Kaggle Kickoff registration closes Friday', 'Deadline', false, -2,
                'Teams of 3–4 only. RSVP on the Events page and list your teammates in the description. Solo members will be grouped by the officers.'],
            ['Barangay Dashboard volunteers needed', 'Event', false, -5,
                'We need 20 volunteers for the Data for Good build. You will earn volunteer hours and a certificate. Basic spreadsheet skills are enough.'],
            ['Analytics Lab closed this Thursday', 'Urgent', false, -1,
                'The lab is reserved for the CCS faculty meeting. Thursday tutoring sessions will move to Google Meet.'],
        ];
        foreach ($posts as [$title, $category, $pinned, $days, $content]) {
            $post = Announcement::updateOrCreate(['title' => $title], [
                'user_id' => $id('bea.navarro'), 'category' => $category, 'content' => $content, 'pinned' => $pinned,
            ]);
            $post->timestamps = false;
            $post->forceFill(['created_at' => now()->addDays($days)])->save();
        }

        // ---- A few notifications for Juan, so the bell isn't empty in this org ----
        if ($juan && ! UserNotification::where('user_id', $juan->id)->exists()) {
            UserNotification::send($juan->id, 'Welcome to the Data Science Society!');
            UserNotification::send($juan->id, 'New event: Kaggle Kickoff: Titanic Challenge');
            UserNotification::send($juan->id, 'Your 3 hrs for CRISP-DM Bootcamp registration desk were approved');
        }
    }
}
