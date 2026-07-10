<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Illuminate\Support\Facades\DB;

class HandleInertiaRequests extends Middleware
{
    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user ? array_merge($user->toArray(), [
                    // Extract just the names of the roles into an array
                    'roles' => $user->roles->pluck('name'),

                    // Extract all permissions from all roles, remove duplicates, and return as an array
                    'permissions' => $user->roles->flatMap->permissions->pluck('name')->unique()->values()->all(),
                ]) : null,
            ],
            'flash' => [
                'message' => fn() => $request->session()->get('message'),
                'error' => fn() => $request->session()->get('error'),
            ],
        ]);
    }


}