<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Stop password guessing: a few tries per minute, then wait
        $tooMany = fn () => response()->json(['message' => 'Too many attempts. Please wait a minute and try again.'], 429);

        // 5 tries per minute for one email from one device
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip())
            ->response($tooMany));

        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(5)->by($request->ip())->response($tooMany));

        RateLimiter::for('password', fn (Request $request) => Limit::perMinute(5)->by($request->user()?->id ?: $request->ip())->response($tooMany));
    }
}
