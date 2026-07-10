<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Call your newly created seeder
        $this->call([
            RolesAndPermissionsSeeder::class,
            // Add other seeders here later (e.g., GeopoliticalSeeder, etc.)
        ]);
    }
}