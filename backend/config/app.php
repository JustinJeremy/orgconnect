<?php

return [
    'name' => env('APP_NAME', 'Laravel'),

    'env' => env('APP_ENV', 'production'),

    'debug' => (bool) env('APP_DEBUG', false),

    'url' => env('APP_URL', 'http://localhost'),

    // OrgConnect: where the React app runs (links in emails), and the day the sample data is built
    // around (the presentation). Read here so they still work when the config is cached in production.
    'frontend_url' => collect(explode(',', (string) env('FRONTEND_URL', '')))
        ->map(fn ($u) => trim($u))->first(fn ($u) => $u !== '' && $u !== '*') ?? 'http://localhost:5173',
    'demo_day' => env('DEMO_DAY', '2026-10-20'),

    'timezone' => env('APP_TIMEZONE', 'Asia/Manila'),   // event days, check-in windows and "today" follow Philippine time

    'locale' => env('APP_LOCALE', 'en'),

    'fallback_locale' => env('APP_FALLBACK_LOCALE', 'en'),

    'faker_locale' => env('APP_FAKER_LOCALE', 'en_US'),

    'cipher' => 'AES-256-CBC',

    'key' => env('APP_KEY'),

    'previous_keys' => [
        ...array_filter(
            explode(',', (string) env('APP_PREVIOUS_KEYS', ''))
        ),
    ],

    'maintenance' => [
        'driver' => env('APP_MAINTENANCE_DRIVER', 'file'),
        'store' => env('APP_MAINTENANCE_STORE', 'database'),
    ],
];
