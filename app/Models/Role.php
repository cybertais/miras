<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
    ];

    /**
     * The permissions that belong to the role.
     */
    public function permissions(): BelongsToMany
    {
        // By default, Laravel expects a pivot table named 'permission_role'
        return $this->belongsToMany(Permission::class);
    }

    /**
     * The users that belong to the role.
     */
    public function users(): BelongsToMany
    {
        // By default, Laravel expects a pivot table named 'role_user'
        return $this->belongsToMany(User::class);
    }
}