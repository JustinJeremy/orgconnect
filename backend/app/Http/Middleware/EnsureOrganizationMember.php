<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// For org pages: an org must be selected and the user must have joined it.
// Pending applicants can already browse, as before; rejected ones can't.
class EnsureOrganizationMember
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(Organization::current(), 400, 'Pick an organization first.');

        $status = $request->user()->membership->status;
        abort_if($status === null, 403, "You're not a member of this organization yet.");
        abort_if($status === 'Rejected', 403, 'Your membership application to this organization was not approved.');

        return $next($request);
    }
}
