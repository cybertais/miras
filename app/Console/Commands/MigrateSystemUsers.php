<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MigrateSystemUsers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'migrate:system-users';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrates legacy users from userprofile/persons into the standard Laravel users table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting user migration to Laravel users table...');

        // Fetch all active profiles and join with their person data
        $legacyUsers = DB::table('userprofile')
            ->join('persons', 'userprofile.personIdFk', '=', 'persons.personIdPk')
            ->select(
                'userprofile.username',
                'userprofile.passwordHash',
                'userprofile.createdStamp',
                'userprofile.modStamp',
                'persons.givenName',
                'persons.surName',
                'persons.email'
            )
            ->get();

        $count = 0;

        foreach ($legacyUsers as $user) {
            // Laravel requires an email. If the person record lacks one, generate a placeholder.
            $email = !empty($user->email) ? $user->email : $user->username . '@system.local';
            
            // Construct the full name
            $fullName = trim($user->givenName . ' ' . $user->surName);
            if (empty($fullName)) {
                $fullName = $user->username;
            }

            // Check if user already exists to prevent duplicate key errors
            $exists = DB::table('users')->where('email', $email)->exists();

            if (!$exists) {
                DB::table('users')->insert([
                    'name'       => $fullName,
                    'email'      => $email,
                    'password'   => $user->passwordHash, // Note: Migrating legacy SHA-256 hash
                    'created_at' => $user->createdStamp ?? now(),
                    'updated_at' => $user->modStamp ?? now(),
                ]);
                
                $this->line("<fg=green>Migrated:</> {$user->username} ({$email})");
                $count++;
            } else {
                $this->line("<fg=yellow>Skipped (Email already exists):</> {$email}");
            }
        }

        $this->newLine();
        $this->info("Migration completed successfully! {$count} users migrated.");
    }
}