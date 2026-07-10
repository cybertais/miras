<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Notifications\ResetPassword; // <-- 1. Add this import

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 2. Override the default password reset link to point to your React SPA
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            // This constructs the URL: http://localhost:8000/password-reset?token=...&email=...
            return config('app.url') . '/password-reset?token=' . $token . '&email=' . urlencode($notifiable->getEmailForPasswordReset());
        });
    }
}