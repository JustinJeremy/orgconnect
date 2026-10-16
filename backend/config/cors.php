<?php

// Which websites may call the API from the browser.
// Locally every origin is allowed; when deployed, set FRONTEND_URL to the frontend's address
// (e.g. https://orgconnect.vercel.app; several can be separated by commas).
// Sign-in uses tokens in the Authorization header, not cookies, so no credentials are shared.
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_map('trim', explode(',', env('FRONTEND_URL', '*'))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['Content-Disposition'],
    'max_age' => 0,
    'supports_credentials' => false,
];
