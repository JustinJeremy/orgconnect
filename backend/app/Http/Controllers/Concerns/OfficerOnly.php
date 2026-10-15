<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

trait OfficerOnly
{
    // Stops the request with "403 Forbidden" unless the signed-in user is an officer
    protected function officerOnly(Request $request): void
    {
        abort_unless($request->user()->isOfficer(), 403, 'Only officers can do this.');
    }

    // President, Vice Presidents and Secretary (User::canManageMembers)
    protected function membersManagerOnly(Request $request): void
    {
        abort_unless($request->user()->canManageMembers(), 403, 'Only the President, Vice Presidents and Secretary can manage members.');
    }
}
