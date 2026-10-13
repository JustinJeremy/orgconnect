<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Reads the org the app is showing from the X-Organization header (its slug)
// and makes it available as Organization::current().
class ResolveOrganization
{
    public function handle(Request $request, Closure $next): Response
    {
        $slug = $request->header('X-Organization');
        Organization::setCurrent($slug ? Organization::where('slug', $slug)->first() : null);

        return $next($request);
    }
}
