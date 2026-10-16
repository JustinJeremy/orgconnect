<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\AnnouncementComment;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\MembershipRecord;
use App\Models\Organization;
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
        $day = Carbon::parse(env('DEMO_DAY', '2026-10-20'))->startOfDay();

        foreach (self::EVENTS as $slug => $events) {
            $org = Organization::where('slug', $slug)->first();
            if (! $org) {
                continue;
            }
            Organization::setCurrent($org);
            $this->seedOrg($org, $events, $day);
            $this->feedActivity($org);
            $this->notifications($org, $day);
        }
        Organization::setCurrent(null);

        $this->attachPosters();
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
