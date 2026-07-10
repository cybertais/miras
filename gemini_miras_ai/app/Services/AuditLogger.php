<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class AuditLogger
{
    /**
     * Log an action to the system_auditlog table.
     *
     * @param string $tableName The table being affected (e.g., 'persons', 'student')
     * @param string $operationType The action performed (e.g., 'INSERT', 'UPDATE', 'DELETE')
     * @param int $recordId The ID of the record that was changed
     * @param string|null $details A short description (Max 256 characters)
     */
    public static function log($tableName, $operationType, $recordId, $details = null)
    {
        // Get the currently authenticated user ID. 
        // NOTE: Defaulting to 10 (your Administrator ID from userprofile) until your login session is fully wired.
        $sysUserId = Auth::id() ?? 10; 

        // Enforce the 256 character limit on the details column to prevent SQL truncation errors
        $safeDetails = $details ? substr($details, 0, 256) : null;

        DB::table('system_auditlog')->insert([
            'tableName'       => $tableName,
            'operationType'   => $operationType,
            'recordId'        => $recordId,
            'changeTimestamp' => now(),
            'sysuserid'       => $sysUserId,
            'details'         => $safeDetails,
        ]);
    }
}