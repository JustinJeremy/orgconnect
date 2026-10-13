<?php

use App\Http\Middleware\EnsureOrganizationMember;
use App\Http\Middleware\ResolveOrganization;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [ResolveOrganization::class]);
        $middleware->alias(['org.member' => EnsureOrganizationMember::class]);

        // Pick the org before route model binding, so /api/events/{id} only finds this org's events
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: ResolveOrganization::class);
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: EnsureOrganizationMember::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
