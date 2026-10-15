<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// For org pages: an org must be selected and the user must be an active member of it.
// Pending applicants and inactive members see their own screen in the app instead
// (application under review / reason + reactivation request), and can't use the org.
class EnsureOrganizationMember
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Organization::current()) {
            $slug = $request->header('X-Organization');
            abort_if($slug && Organization::where('slug', $slug)->value('status') === 'Suspended', 403, 'This organization is suspended on OrgConnect.');
            abort(400, 'Pick an organization first.');
        }

        $status = $request->user()->membership->status;
        abort_if($status === null, 403, "You're not a member of this organization yet.");
        abort_if($status === 'Rejected', 403, 'Your membership application to this organization was not approved.');
        abort_if($status === 'Pending', 403, 'Your application is still being reviewed by an officer.');
        abort_if($status === 'Inactive', 403, 'Your membership in this organization is inactive.');

        return $next($request);
    }
}
