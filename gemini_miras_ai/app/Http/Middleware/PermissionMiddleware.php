<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        if (! $request->user()) {
            abort(401, 'Unauthenticated.');
        }

        $permissions = is_array($permission) ? $permission : explode('|', $permission);

        foreach ($permissions as $p) {
            if ($request->user()->hasPermission($p)) {
                return $next($request);
            }
        }

        abort(403, 'Unauthorized access. You lack the required permission to perform this action.');
    }
}