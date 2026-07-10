<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Define Default Permissions
        $permissions = [
            'view_dashboard',
            'manage_users',
            'manage_roles',
            'manage_students',
            'manage_subsidies',
            'approve_subsidies',
            'view_reports',
            'manage_settings',
        ];

        // Create the permissions
        foreach ($permissions as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName]);
        }

        // 2. Create Roles
        $superAdminRole = Role::firstOrCreate([
            'name' => 'Super Admin',
            'description' => 'Has absolute access to everything in the system.'
        ]);

        $ddaStaffRole = Role::firstOrCreate([
            'name' => 'DDA Staff',
            'description' => 'Manages students and subsidies but cannot change system settings.'
        ]);

        $studentRole = Role::firstOrCreate([
            'name' => 'Student',
            'description' => 'Can view their own profile and subsidy status.'
        ]);

        // 3. Assign Permissions to Roles
        
        // Super Admin gets all permissions
        $superAdminRole->permissions()->sync(Permission::all());

        // DDA Staff gets specific operational permissions
        $ddaStaffPermissions = Permission::whereIn('name', [
            'view_dashboard',
            'manage_students',
            'manage_subsidies',
            'approve_subsidies',
            'view_reports'
        ])->get();
        $ddaStaffRole->permissions()->sync($ddaStaffPermissions);

        // Student gets minimal permissions
        $studentPermissions = Permission::whereIn('name', [
            'view_dashboard', // Assuming they have a limited dashboard
        ])->get();
        $studentRole->permissions()->sync($studentPermissions);

        // 4. (Optional) Create a default Super Admin User
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@miras.com'], // Ensure no duplicates by email
            [
                'name' => 'System Administrator',
                'password' => Hash::make('password'), // Change this in production!
            ]
        );

        // Assign the Super Admin role to the default user
        if (!$adminUser->hasRole('Super Admin')) {
            $adminUser->roles()->attach($superAdminRole->id);
        }
    }
}