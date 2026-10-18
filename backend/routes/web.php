<?php

use Illuminate\Support\Facades\Route;

// The backend is only an API (the React app is the website). Opening the backend's own address
// shows that it's running and where the API is.
Route::get('/', fn () => response()->json(['name' => 'OrgConnect API', 'status' => 'ok', 'api' => url('/api')]));
