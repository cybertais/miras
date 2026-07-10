<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Auth\Notifications\ResetPassword;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    public function hasRole($roleName)
    {
        return $this->roles()->where('name', $roleName)->exists();
    }

    /**
     * Check if the user has a specific permission through their assigned roles
     */
    public function hasPermission(string $permissionName): bool
    {
        // Super Admins automatically pass all permission checks
        if ($this->hasRole('Super Admin')) {
            return true;
        }

        return $this->roles()->whereHas('permissions', function ($query) use ($permissionName) {
            $query->where('name', $permissionName);
        })->exists();
    }

    public function sendPasswordResetNotification($token): void
    {
        ResetPassword::createUrlUsing(function ($notifiable, $token) {
            return env('APP_URL') . '/password-reset?token=' . $token . '&email=' . urlencode($notifiable->email);
        });

        $this->notify(new ResetPassword($token));
    }
}