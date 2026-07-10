<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        // Ensure user is logged in
        if (! $request->user()) {
            abort(401, 'Unauthenticated.');
        }

        // Handle multiple roles separated by a pipe (e.g., 'Super Admin|DDA Staff')
        $roles = is_array($role) ? $role : explode('|', $role);

        foreach ($roles as $r) {
            if ($request->user()->hasRole($r)) {
                return $next($request);
            }
        }

        // If the loop finishes without returning, they don't have the role
        abort(403, 'Unauthorized access. Insufficient role privileges.');
    }
}