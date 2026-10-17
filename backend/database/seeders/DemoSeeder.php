<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\AnnouncementComment;
use App\Models\Certificate;
use App\Models\Conversation;
use App\Models\Event;
use App\Models\Friendship;
use App\Models\LearningResource;
use App\Models\MembershipRecord;
use App\Models\Organization;
use App\Models\PlatformAnnouncement;
use App\Models\TutoringRequest;
use App\Models\TutoringSession;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\VolunteerHour;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

// A semester of history for the live demo: past events with attendance and certificates, volunteer
// hours spread over the months, events on the demo day itself so something is "today", reads,
// likes and comments on the announcements, and a notification history.
//   Officers attend every past event but one or two; members register for most and attend most.
//   Pending and inactive members are left out.
// Dates count back from DEMO_DAY (default: the presentation, 2026-10-20), so they don't move when
// the seeder runs again. Safe to run more than once. Also attaches the posters in seeders/posters/.
class DemoSeeder extends Seeder
{
    private const EVENTS = [
        'computer-society' => [
            // title, category, days from the demo day, time, location, mode, capacity, description
            ['General Assembly: A.Y. 2026–2027 Kickoff', 'Seminar', -98, '14:00', 'CCS Auditorium', 'F2F', 150,
                'Meet the new officers, hear the plans for the year and sign up for committees.'],
            ['Python Fundamentals Bootcamp', 'Workshop', -84, '09:00', 'CCS Computer Lab 1', 'F2F', 40,
                'Variables, loops, functions and files in one hands-on morning. No experience needed.'],
            ['Coastal Cleanup with Manila Bay Advocates', 'Community Service', -70, '06:30', 'Baseco Beach, Manila', 'F2F', 30,
                'A morning cleanup with a local environmental group. Gloves and sacks provided. Counts toward volunteer hours.'],
            ['Freshmen Org Fair Booth', 'Social', -63, '10:00', 'CCS Lobby', 'F2F', 50,
                'Welcome the freshmen, demo past projects and help them sign up for CompSoc.'],
            ['Intro to Cloud Computing with AWS', 'Seminar', -49, '15:00', 'Zoom', 'Online', 100,
                'What the cloud is, the core AWS services and how students can use the free tier.'],
            ['Code for a Cause: Website for a Local NGO', 'Community Service', -42, '09:00', 'CCS Computer Lab 2', 'F2F', 20,
                'Build a simple website for a partner NGO in teams. Counts toward volunteer hours.'],
            ['Mock Technical Interviews', 'Workshop', -35, '13:00', 'CCS Building, Room 304', 'F2F', 30,
                'Practice coding and behavioral interviews with alumni from local tech companies.'],
            ['Blood Donation Drive', 'Community Service', -21, '08:00', 'CCS Lobby', 'F2F', 60,
                'With the Philippine Red Cross. Volunteers help with registration and snacks. Counts toward volunteer hours.'],
            // The demo day
            ['Tech Talk: AI in Everyday Apps', 'Seminar', 0, '09:00', 'CCS Audio-Visual Room + Zoom', 'Hybrid', 120,
                'How recommendation feeds, photo filters and chat assistants work, explained without the math.'],
            ['Hackathon Mentoring Clinic', 'Workshop', 0, '13:00', 'CCS Building, Room 304', 'F2F', 40,
                'Bring your hackathon idea and get feedback from mentors on scope, tech stack and pitch.'],
            ['CompSoc Org Day Booth', 'Social', 0, '15:00', 'CCS Lobby', 'F2F', 80,
                'Games, project demos and freebies at the CompSoc booth. Drop by between classes!'],
        ],
        'data-science-society' => [
            ['DSS General Assembly and Orientation', 'Seminar', -95, '15:00', 'CCS Auditorium', 'F2F', 120,
                'The year ahead, committees and how DSS projects work. New members welcome.'],
            ['Excel to Python: Data Cleaning Workshop', 'Workshop', -81, '13:00', 'Analytics Lab (Room 210)', 'F2F', 35,
                'Clean a messy real-world spreadsheet in Excel, then do the same in pandas.'],
            ['Data for Good: Barangay Census Encoding', 'Community Service', -67, '08:00', 'Barangay 649 Hall, Manila', 'F2F', 20,
                'Help the barangay encode its household census so it can plan services. Counts toward volunteer hours.'],
            ['Kaggle Study Group: Titanic Challenge', 'Workshop', -56, '16:00', 'Google Meet', 'Online', 60,
                'Work through your first Kaggle competition together, from loading data to submitting.'],
            ['Women in Data Science Talk', 'Seminar', -46, '14:00', 'CCS Audio-Visual Room + Zoom', 'Hybrid', 100,
                'Data scientists from local companies share their paths into the field.'],
            ['Tree Planting at La Mesa Watershed', 'Community Service', -38, '06:00', 'La Mesa Watershed, Quezon City', 'F2F', 30,
                'Plant native seedlings with the watershed rangers. Counts toward volunteer hours.'],
            ['Power BI Dashboard Sprint', 'Workshop', -28, '10:00', 'Analytics Lab (Room 210)', 'F2F', 30,
                'Build a dashboard from public school data in three hours, then present it.'],
            ['DSS Movie and Board Game Night', 'Social', -17, '18:00', 'CCS Student Lounge', 'F2F', 50,
                'A data-themed movie, board games and pizza. Bring a friend!'],
            // The demo day
            ['Data Visualization Showcase', 'Seminar', 0, '10:00', 'Analytics Lab + Zoom', 'Hybrid', 80,
                'Members present the dashboards and charts they built this semester. Vote for your favorite.'],
            ['SQL Speedrun Challenge', 'Workshop', 0, '13:00', 'CCS Building, Room 305', 'F2F', 40,
                'Race against the clock on SQL puzzles in pairs. Prizes for the fastest correct queries.'],
            ['DSS Org Day Booth', 'Social', 0, '15:00', 'CCS Lobby', 'F2F', 80,
                'Mini data games, project demos and freebies at the DSS booth.'],
        ],
    ];

    public function run(): void
    {
        $day = Carbon::parse(config('app.demo_day'))->startOfDay();

        foreach (self::EVENTS as $slug => $events) {
            $org = Organization::where('slug', $slug)->first();
            if (! $org) {
                continue;
            }
            Organization::setCurrent($org);
            $this->seedOrg($org, $events, $day);
            $this->feedActivity($org);
            $this->tutoring($org);
            $this->notifications($org, $day);
        }
        Organization::setCurrent(null);

        $this->friends();
        $this->officerFriends();
        $this->topics();
        $this->rejectionReasons();
        $this->platformAnnouncement($day);
        $this->messages($day);
        $this->extras($day);
        $this->attachPosters();
    }

    // Sample conversations, each inside its org: members chatting (Juan has unread ones), officers
    // planning, and each org's officers with the OrgConnect admin. Each is only written once, so
    // running this again changes nothing.
    private const CONVERSATIONS = [
        // [org slug, first person, second person ('admin': the org's conversation with the admin)],
        // then [who, message, days before the demo day, hour]
        [['computer-society', 'member@orgconnect.test', 'joanna.uy@orgconnect.test'], [
            ['joanna.uy@orgconnect.test', 'Are you going to the Tech Talk on Tuesday?', 6, 19],
            ['member@orgconnect.test', 'Yes! I already RSVPd. Want to sit together?', 6, 20],
            ['joanna.uy@orgconnect.test', 'Sure, see you at the AVR 15 minutes early', 5, 8],
        ]],
        [['computer-society', 'member@orgconnect.test', 'mark.delarosa@orgconnect.test'], [
            ['mark.delarosa@orgconnect.test', 'Juan, you still need help with subnetting before the quiz?', 3, 16],
            ['member@orgconnect.test', 'Yes please. Can I join your Friday session?', 3, 17],
            ['mark.delarosa@orgconnect.test', 'Sure, request a slot on Peer Tutoring and I will approve it', 3, 17],
        ]],
        [['computer-society', 'officer@orgconnect.test', 'leo.manalo@orgconnect.test'], [
            ['officer@orgconnect.test', 'Can you check the hackathon venue booking for the 22nd?', 3, 10],
            ['leo.manalo@orgconnect.test', 'Booked Room 304 and the AVR. I will send the confirmation to Angela', 3, 13],
        ]],
        [['computer-society', 'angela.rivera@orgconnect.test', 'nico.fernandez@orgconnect.test'], [
            ['angela.rivera@orgconnect.test', 'Nico, how much is left in the budget for Org Day giveaways?', 4, 11],
            ['nico.fernandez@orgconnect.test', 'About ₱2,500 after the booth materials. Enough for stickers and snacks', 4, 12],
            ['angela.rivera@orgconnect.test', "Perfect, I'll post the volunteer call tonight", 4, 12],
        ]],
        [['computer-society', 'bianca.torres@orgconnect.test', 'ryan.castillo@orgconnect.test'], [
            ['bianca.torres@orgconnect.test', 'Do you have the Java OOP notes from Leo’s session?', 2, 18],
            ['ryan.castillo@orgconnect.test', 'Yup, they’re in Peer Tutoring → Resources. Look for “Java OOP cheat sheet”', 2, 19],
        ]],
        [['data-science-society', 'member@orgconnect.test', 'isabel.cruz@orgconnect.test'], [
            ['member@orgconnect.test', 'Thanks for the pandas notes last week, they helped a lot', 5, 21],
            ['isabel.cruz@orgconnect.test', 'Glad they did! Are you joining the SQL Speedrun on the 20th?', 4, 9],
            ['isabel.cruz@orgconnect.test', 'We need one more person for our pair-up team', 4, 9],
        ]],
        [['data-science-society', 'andrea.lim@orgconnect.test', 'paolo.reyes@orgconnect.test'], [
            ['andrea.lim@orgconnect.test', 'Paolo, can you judge the Data Viz Showcase with me on the 20th?', 5, 10],
            ['paolo.reyes@orgconnect.test', "Of course. I'll prepare the scoring sheet tonight", 5, 11],
            ['andrea.lim@orgconnect.test', 'Thanks! Bea will print the ballots', 5, 11],
        ]],
        [['data-science-society', 'sofia.garcia@orgconnect.test', 'carlo.mendoza@orgconnect.test'], [
            ['sofia.garcia@orgconnect.test', 'Carlo, is your SQL joins session still open for this Monday?', 2, 15],
            ['carlo.mendoza@orgconnect.test', 'Yes, 3 slots left. Bring your laptop with MySQL installed', 2, 16],
        ]],
        [['computer-society', 'admin', 'admin'], [
            ['officer@orgconnect.test', 'Good day! Can we use the CCS Lobby for our Org Day booth on Oct 20?', 7, 9],
            ['admin', 'Yes, the lobby is reserved for CompSoc from 3 to 5 PM. Please keep the walkway clear.', 6, 14],
        ]],
        [['data-science-society', 'admin', 'admin'], [
            ['admin', 'Hi DSS officers! Your Data Visualization Showcase is featured on the OrgConnect homepage this week.', 3, 10],
            ['andrea.lim@orgconnect.test', 'Thank you! We will share the winning dashboards after the event.', 3, 14],
        ]],
    ];

    private function messages(Carbon $day): void
    {
        $user = fn ($email) => $email === 'admin' ? User::where('is_admin', true)->orderBy('id')->first() : User::where('email', $email)->first();
        foreach (self::CONVERSATIONS as [[$slug, $a, $b], $lines]) {
            $org = Organization::where('slug', $slug)->first();
            if (! $org) {
                continue;
            }
            if ($a === 'admin') {
                $conversation = Conversation::forOrg('org', $org->id);
            } else {
                [$one, $two] = [$user($a), $user($b)];
                $conversation = $one && $two ? Conversation::direct($org->id, $one->id, $two->id) : null;
            }
            if (! $conversation) {
                continue;
            }
            foreach ($conversation->messages()->exists() ? [] : $lines as [$from, $body, $daysBefore, $hour]) {
                $sender = $user($from);
                if (! $sender) {
                    continue;
                }
                $at = $day->copy()->subDays($daysBefore)->setTime($hour, 0);
                $message = $conversation->messages()->create(['user_id' => $sender->id, 'body' => $body]);
                $message->timestamps = false;
                $message->forceFill(['created_at' => $at, 'updated_at' => $at])->save();
                $conversation->update(['last_message_at' => $at]);
                $conversation->markRead($sender);   // senders have read up to their own message
            }
            // The other person hasn't read the last message: the notification the app would have sent
            $last = $conversation->messages()->latest('id')->first();
            if ($conversation->kind === 'direct' && $last) {
                $to = $last->user_id === $conversation->user_one_id ? $conversation->user_two_id : $conversation->user_one_id;
                $note = UserNotification::firstOrNew(['user_id' => $to, 'organization_id' => $org->id, 'link' => "messages/{$conversation->id}"]);
                $note->forceFill(['message' => 'New message from '.User::find($last->user_id)?->name, 'is_read' => false, 'created_at' => $last->created_at, 'updated_at' => $last->created_at]);
                $note->timestamps = false;
                UserNotification::withoutEvents(fn () => $note->save());
            }
        }
    }

    // A bit more for both orgs, added once (by title): announcements with comments and a reply,
    // tutoring sessions with requests, and shared resources
    private const EXTRAS = [
        'computer-society' => [
            'announcements' => [
                // author, title, category, content, days before the demo day, [commenter, text, reply by, reply text]
                ['officer@orgconnect.test', 'Hackathon teams: final call', 'Deadline',
                    "Team registration for the CCS Hackathon closes on Friday at 5 PM. Teams of 3 to 5; send your team name and members to Angela. Solo? Reply here and we'll match you with a team.", 2,
                    [['joanna.uy@orgconnect.test', 'Our team is complete! Team Byte Club with Juan and Mark.', 'officer@orgconnect.test', 'Great name! See you at the orientation.'],
                        ['ryan.castillo@orgconnect.test', "I'm solo, can I be matched?", 'angela.rivera@orgconnect.test', "Yes! I'll message you the team that has a slot."]]],
                ['angela.rivera@orgconnect.test', 'Photos from the Coastal Cleanup are up', 'General',
                    'Thank you to the 22 volunteers who joined the Manila Bay cleanup! The photos are in the CompSoc Drive. Volunteer hours for it are approved.', 9,
                    [['bianca.torres@orgconnect.test', 'That was so fun, let us do it again next semester!', null, null]]],
            ],
            'sessions' => [
                // tutor, subject, area, schedule, location, slots, description, topics, [requester, status]
                ['joanna.uy@orgconnect.test', 'Git and GitHub for group projects', 'Programming', 'Tuesdays, 4:00 PM', 'Room 302', 4,
                    'Branches, pull requests and fixing merge conflicts, using a real group project repo.', ['Git', 'GitHub', 'Branches', 'Pull requests'],
                    [['bianca.torres@orgconnect.test', 'Confirmed'], ['ryan.castillo@orgconnect.test', 'Pending']]],
                ['ryan.castillo@orgconnect.test', 'Intro to Python for first years', 'Programming', 'Saturdays, 10:00 AM', 'Google Meet', 6,
                    'Variables, if-else, loops and functions, with short exercises each week.', ['Python', 'Programming basics', 'Loops'],
                    [['patricia.lim@orgconnect.test', 'Confirmed']]],
            ],
            'resources' => [
                // sharer, title, subject, type, url, description
                ['joanna.uy@orgconnect.test', 'GitHub Git cheat sheet', 'Programming', 'Document', 'https://education.github.com/git-cheat-sheet-education.pdf', 'The common Git commands on one page.'],
                ['leo.manalo@orgconnect.test', 'Java OOP cheat sheet', 'Programming', 'Link', 'https://www.w3schools.com/java/java_oop.asp', 'Classes, objects, inheritance and polymorphism with short examples.'],
            ],
        ],
        'data-science-society' => [
            'announcements' => [
                ['bea.navarro@orgconnect.test', 'Showcase voting opens at 10 AM', 'Event',
                    'Vote for your favorite dashboard at the Data Visualization Showcase on Tuesday. Each member gets one vote; scan the QR code at the Analytics Lab door.', 1,
                    [['isabel.cruz@orgconnect.test', 'Can we vote for our own team? 😄', 'bea.navarro@orgconnect.test', 'Nope! But you can cheer for them.'],
                        ['gabriel.aquino@orgconnect.test', 'Will the Zoom attendees get to vote too?', 'andrea.lim@orgconnect.test', "Yes, we'll post a link in the chat."]]],
                ['andrea.lim@orgconnect.test', 'Free DataCamp licenses for members', 'General',
                    'We have 15 free DataCamp licenses until December. Reply here with the course you want to take and we will send the invite to your school email.', 7,
                    [['sofia.garcia@orgconnect.test', 'Intro to Power BI please!', null, null],
                        ['carlo.mendoza@orgconnect.test', 'Joining Data in SQL for me', null, null]]],
            ],
            'sessions' => [
                ['sofia.garcia@orgconnect.test', 'Charts with matplotlib and seaborn', 'Data Visualization', 'Wednesdays, 2:00 PM', 'Analytics Lab', 5,
                    'Bar, line and scatter charts, then making them readable: labels, colors and annotations.', ['matplotlib', 'seaborn', 'Charts', 'Data visualization'],
                    [['gabriel.aquino@orgconnect.test', 'Confirmed'], ['denise.tan@orgconnect.test', 'Pending']]],
                ['bea.navarro@orgconnect.test', 'Excel PivotTables for data analysis', 'Statistics', 'Thursdays, 4:00 PM', 'Room 210', 4,
                    'Summarize a big spreadsheet in minutes with PivotTables and PivotCharts.', ['Excel', 'PivotTables', 'Summaries'],
                    [['isabel.cruz@orgconnect.test', 'Confirmed']]],
            ],
            'resources' => [
                ['miguel.ramos@orgconnect.test', 'Kaggle Learn: Intro to Machine Learning', 'Machine Learning', 'Link', 'https://www.kaggle.com/learn/intro-to-machine-learning', 'Free short lessons with hands-on exercises.'],
                ['andrea.lim@orgconnect.test', 'Seeing Theory: probability, visually', 'Statistics', 'Link', 'https://seeing-theory.brown.edu', 'Interactive visual explanations of probability and statistics.'],
            ],
        ],
    ];

    private function extras(Carbon $day): void
    {
        $id = fn ($email) => User::where('email', $email)->value('id');
        foreach (self::EXTRAS as $slug => $content) {
            $org = Organization::where('slug', $slug)->first();
            if (! $org) {
                continue;
            }
            Organization::setCurrent($org);

            foreach ($content['announcements'] as [$author, $title, $category, $text, $daysBefore, $comments]) {
                if (Announcement::where('title', $title)->exists() || ! $id($author)) {
                    continue;
                }
                $at = $day->copy()->subDays($daysBefore)->setTime(9, 0);
                $post = Announcement::create(['user_id' => $id($author), 'title' => $title, 'category' => $category, 'content' => $text, 'pinned' => false]);
                $post->timestamps = false;
                $post->forceFill(['created_at' => $at, 'updated_at' => $at])->save();
                foreach ($comments as $i => [$who, $comment, $replyBy, $reply]) {
                    $c = $post->comments()->create(['user_id' => $id($who), 'text' => $comment]);
                    $c->timestamps = false;
                    $c->forceFill(['created_at' => $at->copy()->addHours(2 + $i), 'updated_at' => $at->copy()->addHours(2 + $i)])->save();
                    if ($replyBy) {
                        $r = $post->comments()->create(['user_id' => $id($replyBy), 'parent_id' => $c->id, 'text' => $reply]);
                        $r->timestamps = false;
                        $r->forceFill(['created_at' => $at->copy()->addHours(4 + $i), 'updated_at' => $at->copy()->addHours(4 + $i)])->save();
                    }
                }
            }

            foreach ($content['sessions'] as [$tutor, $subject, $area, $schedule, $location, $slots, $description, $topics, $requests]) {
                if (TutoringSession::where('subject', $subject)->exists() || ! $id($tutor)) {
                    continue;
                }
                $session = TutoringSession::create([
                    'tutor_id' => $id($tutor), 'subject' => $subject, 'area' => $area, 'schedule' => $schedule,
                    'location' => $location, 'slots' => $slots, 'description' => $description, 'topics' => $topics,
                ]);
                foreach ($requests as [$who, $status]) {
                    if ($id($who)) {
                        $session->requests()->create(['user_id' => $id($who), 'status' => $status]);
                        if ($status === 'Confirmed') {
                            $session->decrement('slots');
                        }
                    }
                }
            }

            foreach ($content['resources'] as [$who, $title, $subject, $type, $url, $description]) {
                if (! LearningResource::where('title', $title)->exists() && $id($who)) {
                    LearningResource::create(['user_id' => $id($who), 'title' => $title, 'subject' => $subject, 'type' => $type, 'url' => $url, 'description' => $description]);
                }
            }
        }
        Organization::setCurrent(null);
    }

    // Why the sample rejected hour logs were rejected
    private function rejectionReasons(): void
    {
        VolunteerHour::withoutGlobalScopes()->where('status', 'Rejected')->whereNull('rejection_reason')
            ->whereIn('activity', ['Membership drive booth', 'Recruitment booth'])
            ->update(['rejection_reason' => "There's no sign-in sheet for this booth shift. Ask the booth head to confirm it, then log it again."]);
    }

    // One announcement from the OrgConnect admin to every org's officers, and CompSoc's thread with the admin
    private function platformAnnouncement(Carbon $day): void
    {
        $admin = User::where('is_admin', true)->orderBy('id')->first();
        $compsoc = Organization::where('slug', 'computer-society')->first();
        $president = User::where('email', 'officer@orgconnect.test')->first();
        if (! $admin || ! $compsoc || ! $president) {
            return;
        }
        $at = $day->copy()->subDays(4)->setTime(9, 0);
        $announcement = PlatformAnnouncement::firstOrCreate(['title' => 'Org renewal for A.Y. 2026–2027'], [
            'user_id' => $admin->id,
            'content' => "All organizations need to renew by October 30. Upload your adviser's endorsement and your updated officer list on OrgConnect, then reply here once it's done. Message me here if you have questions.",
            'audience' => 'officers',
            'organization_ids' => null,
        ]);
        $announcement->timestamps = false;
        $announcement->forceFill(['created_at' => $at, 'updated_at' => $at])->save();

        if (! $announcement->replies()->exists()) {
            foreach ([
                [$president->id, 'Hi! Our adviser is signing the endorsement this week. Can we upload it by Friday?', 4, 15],
                [$admin->id, 'Friday is fine. Thanks for the update!', 3, 9],
            ] as [$userId, $text, $daysAgo, $hour]) {
                $reply = $announcement->replies()->create(['organization_id' => $compsoc->id, 'user_id' => $userId, 'text' => $text]);
                $when = $day->copy()->subDays($daysAgo)->setTime($hour, 0);
                $reply->timestamps = false;
                $reply->forceFill(['created_at' => $when, 'updated_at' => $when])->save();
            }
        }
    }

    // What each sample event and tutoring session covers (shown as tags in its details)
    private const TOPICS = [
        // Computer Society events
        'Laravel + React Full-Stack Workshop' => ['Laravel', 'React', 'REST APIs', 'Full-stack'],
        'CCS Hackathon 2026 Orientation' => ['Hackathon', 'Team building', 'Project pitching'],
        'Cybersecurity Basics: Staying Safe Online' => ['Cybersecurity', 'Passwords', 'Phishing'],
        'Tech4Schools: Computer Literacy Outreach' => ['Computer literacy', 'Teaching', 'Outreach'],
        'CompSoc Movie Night' => ['Social', 'Tech movies'],
        'Git and GitHub Crash Course' => ['Git', 'GitHub', 'Version control'],
        'Intro to UI/UX with Figma' => ['UI/UX', 'Figma', 'Prototyping'],
        'General Assembly: A.Y. 2026–2027 Kickoff' => ['Org plans', 'Committees', 'Officers'],
        'Python Fundamentals Bootcamp' => ['Python', 'Programming basics', 'Loops & functions'],
        'Coastal Cleanup with Manila Bay Advocates' => ['Environment', 'Volunteering'],
        'Freshmen Org Fair Booth' => ['Recruitment', 'Project demos'],
        'Intro to Cloud Computing with AWS' => ['Cloud computing', 'AWS', 'Free tier'],
        'Code for a Cause: Website for a Local NGO' => ['Web development', 'Volunteering', 'Teamwork'],
        'Mock Technical Interviews' => ['Careers', 'Coding interviews', 'Data structures'],
        'Blood Donation Drive' => ['Health', 'Volunteering'],
        'Tech Talk: AI in Everyday Apps' => ['Artificial intelligence', 'Recommendation systems', 'Chatbots'],
        'Hackathon Mentoring Clinic' => ['Hackathon', 'Tech stack', 'Pitching'],
        'CompSoc Org Day Booth' => ['Social', 'Project demos', 'Games'],
        // Data Science Society events
        'Intro to Python for Data Analysis' => ['Python', 'Data analysis', 'pandas'],
        'Kaggle Kickoff: Titanic Challenge' => ['Kaggle', 'Machine learning', 'Classification'],
        'Careers in Data: Alumni Talk' => ['Careers', 'Data science', 'Analytics'],
        'Data for Good: Barangay Dashboard Build' => ['Dashboards', 'Data for good', 'Volunteering'],
        'DSS Game Night' => ['Social', 'Board games'],
        'CRISP-DM Bootcamp' => ['CRISP-DM', 'Data mining', 'Project workflow'],
        'Data Visualization with Tableau Public' => ['Tableau', 'Data visualization', 'Storytelling'],
        'DSS General Assembly and Orientation' => ['Org plans', 'Committees', 'Projects'],
        'Excel to Python: Data Cleaning Workshop' => ['Data cleaning', 'Excel', 'pandas'],
        'Data for Good: Barangay Census Encoding' => ['Data encoding', 'Data for good', 'Volunteering'],
        'Kaggle Study Group: Titanic Challenge' => ['Kaggle', 'Machine learning', 'Feature engineering'],
        'Women in Data Science Talk' => ['Careers', 'Women in tech', 'Data science'],
        'Tree Planting at La Mesa Watershed' => ['Environment', 'Volunteering'],
        'Power BI Dashboard Sprint' => ['Power BI', 'Dashboards', 'Business analytics'],
        'DSS Movie and Board Game Night' => ['Social', 'Board games'],
        'Data Visualization Showcase' => ['Data visualization', 'Dashboards', 'Presenting'],
        'SQL Speedrun Challenge' => ['SQL', 'Queries', 'Databases'],
        'DSS Org Day Booth' => ['Social', 'Project demos', 'Games'],
        // Tutoring sessions
        'Java OOP: classes and inheritance' => ['Java', 'Classes & objects', 'Inheritance', 'Polymorphism'],
        'HTML, CSS and responsive layouts' => ['HTML', 'CSS', 'Flexbox & grid', 'Responsive design'],
        'SQL for beginners' => ['SQL', 'SELECT queries', 'Filtering', 'Databases'],
        'Subnetting made easy' => ['Networking', 'IP addressing', 'Subnetting'],
        'Pandas & NumPy basics' => ['Python', 'pandas', 'NumPy', 'Data analysis'],
        'Statistics for Data Science' => ['Statistics', 'Probability', 'Hypothesis testing'],
        'SQL joins and aggregates' => ['SQL', 'Joins', 'GROUP BY', 'Analytics'],
        'Intro to machine learning with scikit-learn' => ['Machine learning', 'scikit-learn', 'Regression', 'Classification'],
    ];

    private function topics(): void
    {
        foreach (self::TOPICS as $title => $topics) {
            Event::withoutGlobalScopes()->where('title', $title)->update(['topics' => json_encode($topics)]);
            TutoringSession::withoutGlobalScopes()->where('subject', $title)->update(['topics' => json_encode($topics)]);
        }
    }

    // Friends for the sample accounts, including requests waiting for Juan (member@) and Maria (officer@)
    private const FRIENDS = [
        // sender, receiver, accepted?
        ['member@orgconnect.test', 'joanna.uy@orgconnect.test', true],
        ['mark.delarosa@orgconnect.test', 'member@orgconnect.test', true],
        ['member@orgconnect.test', 'leo.manalo@orgconnect.test', true],
        ['isabel.cruz@orgconnect.test', 'member@orgconnect.test', true],
        ['member@orgconnect.test', 'carlo.mendoza@orgconnect.test', true],
        ['officer@orgconnect.test', 'leo.manalo@orgconnect.test', true],
        ['angela.rivera@orgconnect.test', 'officer@orgconnect.test', true],
        ['officer@orgconnect.test', 'nico.fernandez@orgconnect.test', true],
        ['isabel.cruz@orgconnect.test', 'denise.tan@orgconnect.test', true],
        ['gabriel.aquino@orgconnect.test', 'isabel.cruz@orgconnect.test', true],
        ['bianca.torres@orgconnect.test', 'member@orgconnect.test', false],
        ['sofia.garcia@orgconnect.test', 'member@orgconnect.test', false],
        ['member@orgconnect.test', 'ryan.castillo@orgconnect.test', false],
        ['patricia.lim@orgconnect.test', 'officer@orgconnect.test', false],
    ];

    // Every org's officers are friends with each other (they work together); kept as is when a row exists
    private function officerFriends(): void
    {
        foreach (Organization::where('status', 'Active')->pluck('id') as $orgId) {
            $officers = MembershipRecord::where('organization_id', $orgId)->where('role', 'officer')->where('status', 'Active')
                ->whereHas('user', fn ($q) => $q->where('email', 'like', '%@orgconnect.test'))->orderBy('user_id')->pluck('user_id')->values();
            foreach ($officers as $i => $a) {
                foreach ($officers->slice($i + 1) as $b) {
                    if (! Friendship::between($a, $b)) {
                        Friendship::create(['user_id' => $a, 'friend_id' => $b, 'status' => 'Accepted', 'accepted_at' => Carbon::parse(config('app.demo_day'))->subDays(90)]);
                    }
                }
            }
        }
    }

    private function friends(): void
    {
        $ids = User::whereIn('email', collect(self::FRIENDS)->flatMap(fn ($f) => [$f[0], $f[1]]))->pluck('id', 'email');
        foreach (self::FRIENDS as $i => [$from, $to, $accepted]) {
            if (! isset($ids[$from], $ids[$to])) {
                continue;
            }
            $since = Carbon::parse(config('app.demo_day'))->subDays(60 - $i * 4);
            Friendship::updateOrCreate(['user_id' => $ids[$from], 'friend_id' => $ids[$to]], [
                'status' => $accepted ? 'Accepted' : 'Pending',
                'accepted_at' => $accepted ? $since : null,
            ]);

            // The notifications the app would have sent: a request waiting (unread),
            // or the sender being told it was accepted (read)
            $names = User::whereIn('id', [$ids[$from], $ids[$to]])->pluck('name', 'id');
            [$userId, $message] = $accepted
                ? [$ids[$from], "{$names[$ids[$to]]} accepted your friend request"]
                : [$ids[$to], "{$names[$ids[$from]]} sent you a friend request"];
            $note = UserNotification::firstOrNew(['user_id' => $userId, 'message' => $message, 'organization_id' => null]);
            $note->forceFill(['link' => 'people/friends', 'is_read' => $accepted, 'created_at' => $since, 'updated_at' => $since]);
            $note->timestamps = false;
            UserNotification::withoutEvents(fn () => $note->save());   // no org: shows in every org
        }
    }

    private function seedOrg(Organization $org, array $events, Carbon $day): void
    {
        $members = MembershipRecord::where('organization_id', $org->id)->where('status', 'Active')
            ->with('user')->get()
            ->filter(fn ($m) => $m->user && str_ends_with($m->user->email, '@orgconnect.test'));
        $officers = $members->where('role', 'officer');
        $president = $officers->firstWhere('position', 'President')?->user_id;
        $secretary = $officers->firstWhere('position', 'Secretary')?->user_id ?? $president;
        $past = collect($events)->filter(fn ($e) => $e[2] < 0)->values();

        foreach ($events as $i => [$title, $category, $days, $time, $location, $mode, $capacity, $description]) {
            $done = $days < 0;
            $date = $day->copy()->addDays($days);
            $event = Event::updateOrCreate(['title' => $title], [
                'category' => $category, 'date' => $date->toDateString(), 'time' => $time,
                'location' => $location, 'mode' => $mode, 'capacity' => $capacity, 'description' => $description,
                'status' => $done ? 'completed' : 'upcoming', 'created_by' => $president,
            ]);
            $pastIndex = $done ? $past->search(fn ($e) => $e[0] === $title) : null;

            foreach ($members as $m) {
                $email = $m->user->email;
                $isOfficer = $m->role === 'officer';
                // Members sign up for about 3 in 4 events; officers for all of them
                if (! $isOfficer && $this->hash($email, $title) % 4 === 0) {
                    $event->registrations()->where('user_id', $m->user_id)->delete();   // from an older run
                    Certificate::where(['user_id' => $m->user_id, 'event_id' => $event->id])->delete();
                    VolunteerHour::where(['user_id' => $m->user_id, 'activity' => $title])->delete();

                    continue;
                }
                $attended = $done && ($isOfficer
                    ? ! in_array($pastIndex, $this->officerMisses($email, $past->count()), true)
                    : $this->hash($email, "$title/attend") % 10 < 7 + $this->hash($email) % 3);   // 70–90% of the time

                $event->registrations()->updateOrCreate(['user_id' => $m->user_id], ['status' => $attended ? 'attended' : 'registered']);
                $activity = $isOfficer ? "Event committee: {$title}" : $title;
                if (! $attended) {
                    // Keeps reruns consistent: no certificate or hours for an event they missed
                    Certificate::where(['user_id' => $m->user_id, 'event_id' => $event->id])->delete();
                    VolunteerHour::where(['user_id' => $m->user_id, 'activity' => $activity])->delete();

                    continue;
                }

                // Issued the morning after (also repairs one re-issued later, e.g. by re-saving attendance)
                Certificate::updateOrCreate(['user_id' => $m->user_id, 'event_id' => $event->id], [
                    'issued_at' => $date->copy()->addDay()->setTime(9, 0),
                ]);

                // Officers run the events; members earn hours at community service
                $hours = $isOfficer ? 2 + $this->hash($email, $title) % 3 : ($category === 'Community Service' ? 3 + $this->hash($email, $title) % 2 : 0);
                if ($hours) {
                    VolunteerHour::updateOrCreate(['user_id' => $m->user_id, 'activity' => $activity], [
                        'date' => $date->toDateString(),
                        'hours' => $hours,
                        'status' => 'Approved',
                        // Officers never approve their own hours
                        'reviewed_by' => $m->user_id === $secretary ? $president : $secretary,
                    ]);
                }
            }
        }
    }

    private const COMMENTS = [
        'See you there!', 'Thanks for the reminder!', 'Noted, thank you!', 'Count me in.',
        'Can freshmen join too?', 'Will there be a recording for those who can\'t make it?',
        'Thank you, officers!', 'Excited for this!', 'Is there a sign-up sheet?', 'Got it, thanks for the update.',
    ];

    // Most members have read most posts, about half liked them, and a few commented, so the feed
    // looks alive. Juan (member@orgconnect.test) is left out: he shows "unread" in the demo and the
    // click-through checks use him.
    private function feedActivity(Organization $org): void
    {
        $people = MembershipRecord::where('organization_id', $org->id)->where('status', 'Active')
            ->with('user')->get()->pluck('user')
            ->filter(fn ($u) => $u && str_ends_with($u->email, '@orgconnect.test') && $u->email !== 'member@orgconnect.test');

        foreach (Announcement::all() as $post) {
            $after = fn (int $minutes) => $post->created_at->copy()->addMinutes($minutes);
            foreach ($people as $u) {
                if ($u->id === $post->user_id) {
                    continue;
                }
                $h = $this->hash($u->email, "post{$post->id}");
                if ($h % 10 < 8) {
                    DB::table('announcement_reads')->insertOrIgnore([
                        'announcement_id' => $post->id, 'user_id' => $u->id, 'created_at' => $after(20 + $h % 600), 'updated_at' => $after(20 + $h % 600),
                    ]);
                }
                if ($h % 10 < 5) {
                    DB::table('announcement_likes')->insertOrIgnore([
                        'announcement_id' => $post->id, 'user_id' => $u->id, 'created_at' => $after(30 + $h % 600), 'updated_at' => $after(30 + $h % 600),
                    ]);
                }
            }
            // One to three comments per post
            foreach ($people->sortBy(fn ($u) => $this->hash($u->email, "c{$post->id}"))->take(1 + $post->id % 3)->values() as $i => $u) {
                if ($u->id === $post->user_id) {
                    continue;
                }
                $text = self::COMMENTS[$this->hash($u->email, "t{$post->id}") % count(self::COMMENTS)];
                $comment = AnnouncementComment::firstOrCreate(['announcement_id' => $post->id, 'user_id' => $u->id], ['text' => $text]);
                $comment->forceFill(['created_at' => $after(45 + $i * 90), 'updated_at' => $after(45 + $i * 90)])->save();
            }
        }
    }

    private const SAMPLE_SESSIONS = [
        'Java OOP: classes and inheritance', 'HTML, CSS and responsive layouts', 'SQL for beginners', 'Subnetting made easy',
        'Pandas & NumPy basics', 'Statistics for Data Science', 'SQL joins and aggregates', 'Intro to machine learning with scikit-learn',
    ];

    // Everyone gets one confirmed weekly tutoring session, so their calendar shows tutoring.
    // Always the same session per person (from their email), never one they teach or already
    // requested in the sample data, so running this again (or after testing) gives the same result.
    private function tutoring(Organization $org): void
    {
        // Only the sample sessions (not ones made while testing)
        $sessions = TutoringSession::whereIn('subject', self::SAMPLE_SESSIONS)->orderBy('id')->get();
        if ($sessions->isEmpty()) {
            return;
        }
        $members = MembershipRecord::where('organization_id', $org->id)->where('status', 'Active')->with('user')->get()
            ->filter(fn ($m) => $m->user && str_ends_with($m->user->email, '@orgconnect.test'));

        foreach ($members as $m) {
            $email = $m->user->email;
            $requested = self::SAMPLE_REQUESTS[$email] ?? [];
            $options = $sessions->filter(fn ($s) => $s->tutor_id !== $m->user_id && ! in_array($s->subject, $requested, true))->values();
            if ($options->isEmpty()) {
                continue;
            }
            $booked = $options[$this->hash($email, 'tutoring') % $options->count()];
            // The accounts used in the demo take a session that meets on the demo day's weekday (if the org
            // has one), so their calendar shows events and tutoring on the same day
            $weekday = Carbon::parse(config('app.demo_day'))->format('l');
            if (in_array($email, self::DEMO_ACCOUNTS, true)) {
                $booked = $options->first(fn ($s) => str_starts_with($s->schedule, "{$weekday}s")) ?? $booked;
            }
            $booked->requests()->updateOrCreate(['user_id' => $m->user_id], ['status' => 'Confirmed']);

            // Anything else this seeder booked them into before is removed (but not past sessions, below)
            TutoringRequest::where('user_id', $m->user_id)
                ->whereIn('tutoring_session_id', $options->pluck('id'))
                ->where('tutoring_session_id', '!=', $booked->id)
                ->where('status', '!=', 'Completed')
                ->delete();

            // One or two sessions they already finished this semester, for the "Most helpful" ranking
            $done = $options->reject(fn ($s) => $s->id === $booked->id)
                ->sortBy(fn ($s) => $this->hash($email, "done{$s->id}"))
                ->take(1 + $this->hash($email, 'done') % 2);
            foreach ($done as $s) {
                $row = $s->requests()->updateOrCreate(['user_id' => $m->user_id], ['status' => 'Completed']);
                // Earlier in the semester, so they list after current requests
                $when = Carbon::parse(config('app.demo_day'))->subDays(20 + $this->hash($email, "when{$s->id}") % 60);
                $row->timestamps = false;
                $row->forceFill(['created_at' => $when, 'updated_at' => $when])->save();
            }
        }
    }

    // The sample accounts the presentation signs in with
    private const DEMO_ACCOUNTS = ['member@orgconnect.test', 'officer@orgconnect.test', 'andrea.lim@orgconnect.test'];

    // Requests the org seeders already make (session subjects, by email): left as they are
    private const SAMPLE_REQUESTS = [
        'ryan.castillo@orgconnect.test' => ['Java OOP: classes and inheritance'],
        'bianca.torres@orgconnect.test' => ['Java OOP: classes and inheritance'],
        'patricia.lim@orgconnect.test' => ['HTML, CSS and responsive layouts'],
        'member@orgconnect.test' => ['SQL for beginners', 'SQL joins and aggregates'],
        'joanna.uy@orgconnect.test' => ['Subnetting made easy'],
        'gabriel.aquino@orgconnect.test' => ['Pandas & NumPy basics'],
        'isabel.cruz@orgconnect.test' => ['Pandas & NumPy basics'],
        'denise.tan@orgconnect.test' => ['Statistics for Data Science'],
        'sofia.garcia@orgconnect.test' => ['Intro to machine learning with scikit-learn'],
    ];

    // A notification history, worded like the app's own so clicking one opens its item:
    //   everyone: certificates ready, hours approved, the demo day's events, the latest announcement
    //   officers too: members' hour logs waiting for review, and new applications
    // Older ones are read; the newest few aren't.
    private function notifications(Organization $org, Carbon $day): void
    {
        $members = MembershipRecord::where('organization_id', $org->id)->where('status', 'Active')->with('user')->get()
            ->filter(fn ($m) => $m->user && str_ends_with($m->user->email, '@orgconnect.test'));
        $note = function (int $userId, string $message, string $link, $at, bool $read) use ($org) {
            $n = UserNotification::firstOrCreate(
                ['organization_id' => $org->id, 'user_id' => $userId, 'message' => $message],
                ['link' => $link, 'is_read' => $read]
            );
            $n->forceFill(['created_at' => $at, 'updated_at' => $at])->save();
        };
        $demoEvents = Event::whereDate('date', $day->toDateString())->get();
        $latestPost = Announcement::latest()->first();
        $pendingLogs = VolunteerHour::with('user')->where('status', 'Pending')->get();
        $applicants = MembershipRecord::where('organization_id', $org->id)->where('status', 'Pending')->with('user')->get();

        foreach ($members as $m) {
            $uid = $m->user_id;
            foreach (Certificate::with('event')->where('user_id', $uid)->whereHas('event')->get()
                ->sortByDesc(fn ($c) => $c->event->date)->take(3)->values() as $i => $c) {
                $note($uid, "Your certificate for {$c->event->title} is ready", "events/{$c->event_id}", $c->issued_at, $i > 0);
            }
            foreach (VolunteerHour::where('user_id', $uid)->where('status', 'Approved')->orderByDesc('date')->take(2)->get() as $log) {
                $note($uid, "Your {$log->hours} hrs for {$log->activity} were approved", "hours/{$log->id}", $log->date->copy()->addDay()->setTime(10, 0), true);
            }
            foreach ($demoEvents as $i => $e) {
                $note($uid, "New event: {$e->title}", "events/{$e->id}", $day->copy()->subDays(6)->setTime(9, $i), $i > 0);
            }
            if ($latestPost && $latestPost->user_id !== $uid) {
                $note($uid, "New announcement: {$latestPost->title}", "announcements/{$latestPost->id}", $latestPost->created_at, false);
            }
            if ($m->role !== 'officer') {
                continue;
            }
            foreach ($pendingLogs->where('user_id', '!=', $uid) as $log) {
                $note($uid, "{$log->user->name} logged {$log->hours} hrs for {$log->activity}", "hours/{$log->id}", $log->date->copy()->setTime(18, 0), false);
            }
            foreach ($applicants as $a) {
                $note($uid, "{$a->user->name} applied to join {$org->short_name}", 'applications', $a->created_at, true);
            }
        }
    }

    // Each officer misses one or two of the past events (always the same ones)
    private function officerMisses(string $email, int $count): array
    {
        $h = $this->hash($email);
        $first = $h % $count;
        $second = ($first + 1 + intdiv($h, $count) % ($count - 1)) % $count;

        return $h % 2 ? [$first, $second] : [$first];
    }

    // A stable "random" number for the same inputs (md5 spreads similar strings evenly; crc32 doesn't)
    private function hash(string ...$parts): int
    {
        return hexdec(substr(md5(implode('|', $parts)), 0, 7));
    }

    // Posters made for the sample events (seeders/posters/<title-slug>.jpg) on the public disk
    private function attachPosters(): void
    {
        $dir = database_path('seeders/posters');
        if (! File::isDirectory($dir)) {
            return;
        }
        $disk = Storage::disk('public');

        Event::withoutGlobalScopes()->get()->each(function (Event $event) use ($dir, $disk) {
            $file = $dir.'/'.Str::slug($event->title).'.jpg';
            if (! File::exists($file) || ($event->poster_path && $disk->exists($event->poster_path))) {
                return;   // no sample poster, or it already has one (never replaces an officer's upload)
            }
            $path = 'event-posters/sample-'.Str::slug($event->title).'.jpg';
            $disk->put($path, File::get($file));
            $event->update(['poster_path' => $path]);
        });
    }
}
