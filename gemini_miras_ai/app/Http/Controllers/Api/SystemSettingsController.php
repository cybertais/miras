<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Services\AuditLogger;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;

class SystemSettingsController extends Controller
{

// =========================================================================
    // 1. ROLES & USER MANAGEMENT (RBAC)
    // =========================================================================

    public function getRbacData()
    {
        try {
            // 1. Fetch Persons who DO NOT have a modern user account yet
            $existingUserEmails = User::pluck('email')->toArray();
            $persons = DB::table('persons')
                ->whereNotNull('email')
                ->whereNotIn('email', $existingUserEmails)
                ->where('ispersonRecDeleted', 0)
                ->select('personIdPk as id', DB::raw("CONCAT_WS(' ', givenName, surName) as name"))
                ->orderBy('givenName', 'ASC')
                ->get();

            // 2. Fetch active users & their roles using Eloquent
            $users = User::with('roles')->get()->map(function ($user) {
                return [
                    'id' => $user->id,
                    'personName' => $user->name,
                    'username' => $user->email,
                    'roleName' => $user->roles->first()->name ?? 'Unassigned',
                    'accountStatus' => 'Active', 
                ];
            });

            // 3. Fetch matrix headers (Roles & Permissions) and matrix data mapping the modern tables to the React Prop names
            $roles = DB::table('roles')->select('id', 'name as roleName')->get();
            $permissions = DB::table('permissions')->select('id', 'name', 'description')->get();
            
            // Map the modern permission_role pivot to the legacy keys React is expecting
            $rolePermissions = DB::table('permission_role')->select('role_id as roleIdFk', 'permission_id as permissionIdFk')->get();

            return response()->json([
                'success' => true,
                'persons' => $persons,
                'users' => $users,
                'roles' => $roles,
                'permissions' => $permissions,
                'rolePermissions' => $rolePermissions
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

   public function createUserProfile(Request $request)
    {
        // Require fields conditionally based on the toggle switch
        $request->validate([
            'isNewPerson' => 'required',
            'personId'    => 'required_if:isNewPerson,0,false',
            'givenName'   => 'required_if:isNewPerson,1,true|string|max:255',
            'surName'     => 'required_if:isNewPerson,1,true|string|max:255',
            'username'    => 'required|string|email|unique:users,email|max:100',
            'password'    => 'required|string|min:6',
            'roleId'      => 'required|integer',
            'status'      => 'required|string',
            'photo'       => 'nullable|file|mimes:jpeg,png,jpg|max:5120' // Enforce image parameters
        ], [
            'username.unique' => 'This email address is already assigned to an existing user.'
        ]);

        try {
            DB::transaction(function () use ($request) {
                $personId = $request->personId;
                $fullName = '';

                // Convert string/numeric boolean from FormData back to strict boolean
                $isNewPerson = filter_var($request->isNewPerson, FILTER_VALIDATE_BOOLEAN);

                // 1. Check if we need to create a new Person
                if ($isNewPerson) {
                    $imageName = null;
                    
                    // Upload logic for the Face Photo
                    if ($request->hasFile('photo')) {
                        $file = $request->file('photo');
                        $imageName = 'staff_' . time() . '.' . $file->getClientOriginalExtension();
                        $file->storeAs('student_images', $imageName, 'public'); 
                    }

                    $personId = DB::table('persons')->insertGetId([
                        'givenName' => $request->givenName,
                        'surName' => $request->surName,
                        'email' => $request->username,
                        'personimage' => $imageName,
                        'createdStamp' => now(),
                        'ispersonRecDeleted' => 0,
                    ]);
                    
                    $fullName = trim($request->givenName . ' ' . $request->surName);
                    AuditLogger::log('persons', 'INSERT', $personId, "Created staff/admin profile for {$fullName}");
                } else {
                    $person = DB::table('persons')->where('personIdPk', $personId)->first();
                    if (!$person) throw new \Exception("Person not found.");
                    $fullName = trim($person->givenName . ' ' . $person->surName);
                }

                // 2. Create User in the modern `users` table for Laravel Sanctum Auth
                $user = User::create([
                    'name' => $fullName,
                    'email' => $request->username,
                    'password' => Hash::make($request->password),
                ]);

                // 3. Assign Role to the modern pivot
                $user->roles()->attach($request->roleId);

                // 4. Fallback for legacy userprofile table (Keeps older queries happy)
                DB::table('userprofile')->insert([
                    'personIdFk'    => $personId,
                    'username'      => $request->username,
                    'passwordHash'  => hash('sha256', $request->password), 
                    'accountStatus' => $request->status,
                    'createdStamp'  => now(),
                    'modStamp'      => now()
                ]);

                // 5. Enforce Strict Audit Trail
                $roleName = DB::table('roles')->where('id', $request->roleId)->value('name');
                AuditLogger::log('users', 'INSERT', $user->id, "Provisioned new user '{$user->email}' and assigned Role '{$roleName}'");
            });

            return response()->json(['success' => true, 'message' => 'User provisioned successfully.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Provisioning Error: ' . $e->getMessage()], 500);
        }
    }

    // --- NEW: Update User Account Status ---
    public function updateUserStatus(Request $request)
    {
        $request->validate([
            'userId' => 'required|integer', 
            'status' => 'required|string|in:Active,Inactive,Suspended'
        ]);

        try {
            $user = User::findOrFail($request->userId);
            
            // Safely update legacy userprofile table using the email mapping
            DB::table('userprofile')
                ->where('username', $user->email)
                ->update([
                    'accountStatus' => $request->status,
                    'modStamp' => now()
                ]);

            AuditLogger::log('users', 'UPDATE', $user->id, "Updated user account status to {$request->status}");

            return response()->json(['success' => true, 'message' => 'Status updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Update Error: ' . $e->getMessage()], 500);
        }
    }

    public function updateRolePermission(Request $request)
    {
        $request->validate([
            'roleId'       => 'required|integer',
            'permissionId' => 'required|integer',
            'action'       => 'required|in:grant,revoke'
        ]);

        try {
            DB::transaction(function () use ($request) {
                $role = Role::findOrFail($request->roleId);
                $permDesc = DB::table('permissions')->where('id', $request->permissionId)->value('description');

                if ($request->action === 'grant') {
                    // Grant Permission (syncWithoutDetaching prevents duplicates)
                    $role->permissions()->syncWithoutDetaching([$request->permissionId]);
                    AuditLogger::log('permission_role', 'INSERT', 0, "Escalated Privileges: Granted '{$permDesc}' to Role '{$role->name}'");
                } else {
                    // Revoke Permission
                    $role->permissions()->detach($request->permissionId);
                    AuditLogger::log('permission_role', 'DELETE', 0, "Revoked Privileges: Removed '{$permDesc}' from Role '{$role->name}'");
                }
            });

            return response()->json(['success' => true, 'message' => 'Security matrix updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Matrix Update Error: ' . $e->getMessage()], 500);
        }
    }



    // =========================================================================
    // 2. DDA PROFILE MANAGEMENT
    // =========================================================================

    public function getDdaProfile()
    {
        try {
            // Fetch the first (and usually only) record in the global variable table
            $profile = DB::table('define_global_variable')->where('gvid', 1)->first();
            return response()->json($profile);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch profile: ' . $e->getMessage()], 500);
        }
    }

    public function saveDdaProfile(Request $request)
    {
        try {
            // Strip out empty string values and prepare the update array
            $updateData = $request->only([
                'longname', 'shortname', 'initial', 'slogan', 
                'postaladdress', 'office_location', 'email',
                'phone1', 'phone2', 'landline1', 'landline2', 'whatsappnumber',
                'fblink', 'linkedin', 'tiktoklink',
                'bank_name', 'bank_branch_code', 'bank_account_name', 'bank_account_number'
            ]);

            // FIX: Prevent Laravel from passing NULL to a NOT NULL database column
            if (array_key_exists('fblink', $updateData) && is_null($updateData['fblink'])) {
                $updateData['fblink'] = '';
            }

            $userId = auth()->id() ?? 10; // Fallback to admin ID

            // Start Database Transaction to ensure Audit Trail is enforced
            DB::beginTransaction();

            // 1. Update the global configuration row (gvid = 1)
            DB::table('define_global_variable')->where('gvid', 1)->update($updateData);
            
            // 2. Enforce Audit Trail directly using DB builder
            DB::table('system_auditlog')->insert([
                'tableName' => 'define_global_variable',
                'operationType' => 'UPDATE',
                'recordId' => 1,
                'changeTimestamp' => now(),
                'sysuserid' => $userId,
                'details' => 'Updated DDA Profile & System Global Variables.'
            ]);

            // Commit changes if both queries succeed
            DB::commit();

            return response()->json(['success' => true, 'message' => 'DDA Profile successfully updated.']);
            
        } catch (\Exception $e) {
            // Rollback if something crashes
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

    // =========================================================================
    // 3. DATABASE BACKUP & RESTORE
    // =========================================================================

    public function getBackups()
    {
        try {
            // Fetch records from your new server_files table
            $backups = \App\Models\ServerFile::where('file_category', 'system_backup')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($file) {
                    return [
                        'filename' => $file->filename,
                        'size' => $file->readable_size, // Uses the model's accessor
                        'last_modified' => $file->created_at->format('d-M-Y h:i A'),
                    ];
                });

            return response()->json(['success' => true, 'data' => $backups]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function createBackup()
    {
        try {
            $date = now()->format('d-M-Y_H-i-s');
            $timestamp = time();
            $filename = "{$date}_{$timestamp}_miras_backup.sql";
            
            $storagePath = storage_path('app/backups');
            if (!\Illuminate\Support\Facades\File::exists($storagePath)) {
                \Illuminate\Support\Facades\File::makeDirectory($storagePath, 0755, true);
            }

            $filePath = $storagePath . DIRECTORY_SEPARATOR . $filename;

            $dbName = env('DB_DATABASE');
            $userName = env('DB_USERNAME');
            $password = env('DB_PASSWORD');
            $host = env('DB_HOST', '127.0.0.1');
            $dumpPath = env('DUMP_BINARY_PATH', '');

            $passwordStr = empty($password) ? '' : "-p\"{$password}\"";
            $command = "{$dumpPath}mysqldump -h {$host} -u {$userName} {$passwordStr} {$dbName} > \"{$filePath}\" 2>&1";

            exec($command, $output, $returnVar);

            if ($returnVar !== 0) {
                $errorLog = implode("\n", $output);
                throw new \Exception("Backup command failed. Error: " . $errorLog);
            }

            // --- SAVE RECORD TO SERVER_FILES TABLE ---
            $fileSize = \Illuminate\Support\Facades\File::size($filePath);
            \App\Models\ServerFile::create([
                'filename'      => $filename,
                'original_name' => $filename,
                'file_path'     => "backups/{$filename}",
                'disk'          => 'local',
                'mime_type'     => 'application/sql',
                'size_bytes'    => $fileSize,
                'file_category' => 'system_backup'
            ]);

            \App\Services\AuditLogger::log('system_backup', 'EXPORT', 0, "Created system backup: {$filename}");

            return response()->json(['success' => true, 'message' => 'Backup created successfully.', 'filename' => $filename]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Backup Error: ' . $e->getMessage()], 500);
        }
    }

    public function restoreBackup($filename)
    {
        try {
            $filePath = storage_path('app/backups/' . $filename);

            if (!\Illuminate\Support\Facades\File::exists($filePath)) {
                return response()->json(['success' => false, 'message' => 'Backup file not found.'], 404);
            }

            $dbName = env('DB_DATABASE');
            $userName = env('DB_USERNAME');
            $password = env('DB_PASSWORD');
            $host = env('DB_HOST', '127.0.0.1');
            $dumpPath = env('DUMP_BINARY_PATH', '');

            $passwordStr = empty($password) ? '' : "-p\"{$password}\"";
            $command = "{$dumpPath}mysql -h {$host} -u {$userName} {$passwordStr} {$dbName} < \"{$filePath}\" 2>&1";

            exec($command, $output, $returnVar);

            if ($returnVar !== 0) {
                $errorLog = implode("\n", $output);
                throw new \Exception("Restore command failed. Error: " . $errorLog);
            }

            \App\Services\AuditLogger::log('system_backup', 'UPDATE', 0, "Restored system from backup: {$filename}");

            return response()->json(['success' => true, 'message' => 'System restored successfully from backup.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Restore Error: ' . $e->getMessage()], 500);
        }
    }

    public function deleteBackup($filename)
    {
        try {
            // Remove from the disk
            $disk = \Illuminate\Support\Facades\Storage::disk('local');
            if ($disk->exists('backups/' . $filename)) {
                $disk->delete('backups/' . $filename);
            }

            // Remove from the database table
            \App\Models\ServerFile::where('filename', $filename)->delete();

            \App\Services\AuditLogger::log('system_backup', 'DELETE', 0, "Deleted backup file: {$filename}");
            return response()->json(['success' => true, 'message' => 'Backup deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Delete Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Fetch System Audit Logs
     */
    public function getAuditLogs()
    {
        $logs = \Illuminate\Support\Facades\DB::table('system_auditlog')
            ->leftJoin('userprofile', 'system_auditlog.sysuserid', '=', 'userprofile.userIdPk')
            ->select('system_auditlog.*', 'userprofile.username')
            ->orderBy('changeTimestamp', 'desc')
            ->limit(200) // Keep the UI snappy by limiting to recent 200 logs
            ->get();
            
        return response()->json($logs);
    }
    
    // =========================================================================
    // 4. GEOPOLITICAL AREA MANAGEMENT
    // =========================================================================

    public function saveGeopolitical(Request $request, $level)
    {
        try {
            DB::transaction(function () use ($request, $level) {
                if ($level === 'province') {
                    $table = 'province';
                    $pk = 'provinceId';
                    $data = ['pro_name' => $request->input('name'), 'provcode' => $request->input('code')];
                    $auditName = $request->input('name');
                } elseif ($level === 'district') {
                    $table = 'district';
                    $pk = 'districtIdPk';
                    $data = ['districtName' => $request->input('name'), 'provinceId' => $request->input('parentId')];
                    $auditName = $request->input('name');
                } elseif ($level === 'llg') {
                    $table = 'llg';
                    $pk = 'llgIdPk';
                    $data = ['llgName' => $request->input('name'), 'llgCode' => $request->input('code'), 'districtIdFk' => $request->input('parentId')];
                    $auditName = $request->input('name');
                } elseif ($level === 'ward') {
                    $table = 'ward';
                    $pk = 'wardIdPk';
                    $data = ['wardName' => $request->input('name'), 'wardCode' => $request->input('code'), 'llgIdFk' => $request->input('parentId')];
                    $auditName = $request->input('name');
                } else {
                    throw new \Exception("Invalid Geopolitical Level.");
                }

                if ($request->filled('id')) {
                    $id = $request->input('id');
                    DB::table($table)->where($pk, $id)->update($data);
                    AuditLogger::log($table, 'UPDATE', $id, "Updated {$level}: {$auditName}");
                } else {
                    $id = DB::table($table)->insertGetId($data);
                    AuditLogger::log($table, 'INSERT', $id, "Created new {$level}: {$auditName}");
                }
            });
            return response()->json(['success' => true, 'message' => ucfirst($level) . ' saved successfully.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

    public function getGeopolitical(Request $request, $level)
    {
        try {
            if ($level === 'Provinces') {
                $data = DB::table('province')
                    ->select('provinceId as id', 'pro_name as name', 'provcode as code', DB::raw('NULL as parentId'), DB::raw('NULL as parentName'), DB::raw('(SELECT COUNT(*) FROM district WHERE district.provinceId = province.provinceId) as linkedRecords'))
                    ->orderBy('pro_name', 'ASC')->get();
            } elseif ($level === 'Districts') {
                $query = DB::table('district')
                    ->leftJoin('province', 'district.provinceId', '=', 'province.provinceId')
                    ->select('district.districtIdPk as id', 'district.districtName as name', DB::raw('NULL as code'), 'district.provinceId as parentId', 'province.pro_name as parentName', DB::raw('(SELECT COUNT(*) FROM llg WHERE llg.districtIdFk = district.districtIdPk) as linkedRecords'));
                if ($request->filled('provinceId')) $query->where('district.provinceId', $request->input('provinceId'));
                $data = $query->orderBy('district.districtName', 'ASC')->get();
            } elseif ($level === 'LLGs') {
                $query = DB::table('llg')
                    ->leftJoin('district', 'llg.districtIdFk', '=', 'district.districtIdPk')
                    ->select('llg.llgIdPk as id', 'llg.llgName as name', 'llg.llgCode as code', 'llg.districtIdFk as parentId', 'district.districtName as parentName', DB::raw('(SELECT COUNT(*) FROM ward WHERE ward.llgIdFk = llg.llgIdPk) as linkedRecords'));
                if ($request->filled('districtId')) $query->where('llg.districtIdFk', $request->input('districtId'));
                elseif ($request->filled('provinceId')) $query->where('district.provinceId', $request->input('provinceId'));
                $data = $query->orderBy('llg.llgName', 'ASC')->get();
            } elseif ($level === 'Wards') {
                $query = DB::table('ward')
                    ->leftJoin('llg', 'ward.llgIdFk', '=', 'llg.llgIdPk')
                    ->leftJoin('district', 'llg.districtIdFk', '=', 'district.districtIdPk')
                    ->select('ward.wardIdPk as id', 'ward.wardName as name', 'ward.wardCode as code', 'ward.llgIdFk as parentId', 'llg.llgName as parentName', DB::raw('0 as linkedRecords'));
                if ($request->filled('llgId')) $query->where('ward.llgIdFk', $request->input('llgId'));
                elseif ($request->filled('districtId')) $query->where('llg.districtIdFk', $request->input('districtId'));
                elseif ($request->filled('provinceId')) $query->where('district.provinceId', $request->input('provinceId'));
                $data = $query->orderBy('ward.wardName', 'ASC')->get();
            } else {
                return response()->json([], 400);
            }
            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

    public function deleteGeopolitical($level, $id)
    {
        try {
            if ($level === 'province') {
                $table = 'province'; $pk = 'provinceId';
                $hasChildren = DB::table('district')->where('provinceId', $id)->exists(); $childName = 'Districts';
            } elseif ($level === 'district') {
                $table = 'district'; $pk = 'districtIdPk';
                $hasChildren = DB::table('llg')->where('districtIdFk', $id)->exists(); $childName = 'LLGs';
            } elseif ($level === 'llg') {
                $table = 'llg'; $pk = 'llgIdPk';
                $hasChildren = DB::table('ward')->where('llgIdFk', $id)->exists(); $childName = 'Wards';
            } elseif ($level === 'ward') {
                $table = 'ward'; $pk = 'wardIdPk'; $hasChildren = false; 
            } else {
                throw new \Exception("Invalid Geopolitical Level.");
            }

            if ($hasChildren) {
                return response()->json(['success' => false, 'has_children' => true, 'message' => "Cannot delete this record because it is actively linked to one or more {$childName}."], 409);
            }

            DB::transaction(function () use ($table, $pk, $level, $id) {
                DB::table($table)->where($pk, $id)->delete();
                AuditLogger::log($table, 'DELETE', $id, "Deleted {$level} record ID: {$id}");
            });

            return response()->json(['success' => true, 'message' => ucfirst($level) . ' deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

    public function exportGeopolitical(Request $request, $level)
    {
        try {
            $filterSummary = [];
            if ($request->filled('provinceId')) {
                $provName = DB::table('province')->where('provinceId', $request->input('provinceId'))->value('pro_name');
                if ($provName) $filterSummary[] = "Province: {$provName}";
            }
            if ($request->filled('districtId')) {
                $distName = DB::table('district')->where('districtIdPk', $request->input('districtId'))->value('districtName');
                if ($distName) $filterSummary[] = "District: {$distName}";
            }
            if ($request->filled('llgId')) {
                $llgName = DB::table('llg')->where('llgIdPk', $request->input('llgId'))->value('llgName');
                if ($llgName) $filterSummary[] = "LLG: {$llgName}";
            }
            $filterSummaryText = empty($filterSummary) ? "All Records (No Filters Applied)" : implode(' &nbsp;|&nbsp; ', $filterSummary);

            if ($level === 'Provinces') {
                $data = DB::table('province')->select('pro_name as name', 'provcode as code', DB::raw('NULL as parentName'))->orderBy('pro_name', 'ASC')->get();
            } elseif ($level === 'Districts') {
                $query = DB::table('district')->leftJoin('province', 'district.provinceId', '=', 'province.provinceId')->select('district.districtName as name', DB::raw('NULL as code'), 'province.pro_name as parentName');
                if ($request->filled('provinceId')) $query->where('district.provinceId', $request->input('provinceId'));
                $data = $query->orderBy('district.districtName', 'ASC')->get();
            } elseif ($level === 'LLGs') {
                $query = DB::table('llg')->leftJoin('district', 'llg.districtIdFk', '=', 'district.districtIdPk')->select('llg.llgName as name', 'llg.llgCode as code', 'district.districtName as parentName');
                if ($request->filled('districtId')) $query->where('llg.districtIdFk', $request->input('districtId'));
                elseif ($request->filled('provinceId')) $query->where('district.provinceId', $request->input('provinceId'));
                $data = $query->orderBy('llg.llgName', 'ASC')->get();
            } elseif ($level === 'Wards') {
                $query = DB::table('ward')->leftJoin('llg', 'ward.llgIdFk', '=', 'llg.llgIdPk')->leftJoin('district', 'llg.districtIdFk', '=', 'district.districtIdPk')->select('ward.wardName as name', 'ward.wardCode as code', 'llg.llgName as parentName');
                if ($request->filled('llgId')) $query->where('ward.llgIdFk', $request->input('llgId'));
                elseif ($request->filled('districtId')) $query->where('llg.districtIdFk', $request->input('districtId'));
                elseif ($request->filled('provinceId')) $query->where('district.provinceId', $request->input('provinceId'));
                $data = $query->orderBy('ward.wardName', 'ASC')->get();
            } else {
                return response()->json(['error' => 'Invalid level'], 400);
            }

            $format = $request->query('format', 'csv');
            $timestamp = date('Y_m_d_His');
            $fileName = "{$level}_Export_{$timestamp}";

            if ($format === 'csv') {
                $headers = [
                    "Content-type"        => "text/csv",
                    "Content-Disposition" => "attachment; filename={$fileName}.csv",
                    "Pragma"              => "no-cache",
                    "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
                    "Expires"             => "0"
                ];

                $callback = function () use ($data, $level) {
                    $file = fopen('php://output', 'w');
                    $headerRow = ($level === 'Provinces') ? ['#', 'Name', 'Code'] : ['#', 'Name', 'Code', 'Belongs To'];
                    fputcsv($file, $headerRow);
                    
                    $count = 1;
                    foreach ($data as $row) {
                        $rowData = ($level === 'Provinces') ? [$count++, $row->name, $row->code ?? '-'] : [$count++, $row->name, $row->code ?? '-', $row->parentName ?? 'Orphaned'];
                        fputcsv($file, $rowData);
                    }
                    fclose($file);
                };

                AuditLogger::log('system_export', 'EXPORT', 0, "Exported {$level} data to CSV.");
                return response()->stream($callback, 200, $headers);
            }

            if ($format === 'pdf') {
                $generatedTime = now()->format('d-M-Y h:i A');
                $year = date('Y');
                $titleLevel = strtoupper($level);
                $totalRecords = count($data);

                $html = <<<HTML
                <!DOCTYPE html>
                <html><head><meta charset="utf-8"><title>{$fileName}</title>
                    <style>
                        @page { margin: 100px 30px 60px 30px; }
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 0; }
                        header { position: fixed; top: -70px; left: 0; right: 0; height: 50px; border-bottom: 2px solid #8b0000; padding-bottom: 10px; }
                        .header-table { width: 100%; border: none; }
                        .header-title { font-size: 16px; font-weight: bold; color: #8b0000; margin: 0; padding: 0; }
                        .header-subtitle { font-size: 11px; color: #666; margin: 3px 0 0 0; text-transform: uppercase; }
                        .header-meta { font-size: 10px; color: #888; text-align: right; vertical-align: bottom; }
                        footer { position: fixed; bottom: -40px; left: 0; right: 0; height: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
                        .footer-table { width: 100%; border: none; font-size: 9px; color: #888; }
                        .page-number:after { content: counter(page); }
                        .filter-summary { background-color: #f8f9fa; border-left: 3px solid #8b0000; padding: 8px 12px; margin-bottom: 15px; font-size: 10px; color: #444; border-radius: 0 4px 4px 0; }
                        .data-table { width: 100%; border-collapse: collapse; }
                        .data-table th, .data-table td { padding: 6px 8px; border: 1px solid #e0e0e0; }
                        .data-table th { background-color: #f8f9fa; color: #444; font-weight: bold; text-transform: uppercase; font-size: 10px; text-align: left; }
                        .data-table tbody tr:nth-child(even) { background-color: #fafafa; }
                        .text-center { text-align: center !important; }
                        .text-bold { font-weight: bold; }
                    </style>
                </head><body>
                    <header><table class="header-table"><tr><td><div class="header-title">Middle Ramu DDA MIRAS</div><div class="header-subtitle">Geopolitical Export - {$titleLevel}</div></td><td class="header-meta">Generated: {$generatedTime}<br>Format: PDF Document</td></tr></table></header>
                    <footer><table class="footer-table"><tr><td style="text-align: left;">&copy; {$year} DDA School Fee Subsidiary Management System. All rights reserved.</td><td style="text-align: right;">Page <span class="page-number"></span></td></tr></table></footer>
                    <main>
                        <div class="filter-summary"><table style="width: 100%; border: none; font-size: 10px;"><tr><td><strong>Filters Applied:</strong> {$filterSummaryText}</td><td style="text-align: right;"><strong>Total Records:</strong> {$totalRecords}</td></tr></table></div>
                        <table class="data-table"><thead><tr><th style="width: 30px;" class="text-center">#</th><th>Name</th><th class="text-center">Code</th>
HTML;
                if ($level !== 'Provinces') {
                    $parentLabel = ($level === 'Districts') ? 'Province' : (($level === 'LLGs') ? 'District' : 'LLG');
                    $html .= "<th>Belongs To ({$parentLabel})</th>";
                }
                $html .= "</tr></thead><tbody>";

                $count = 1;
                foreach ($data as $row) {
                    $html .= "<tr><td class=\"text-center\">" . $count++ . "</td><td class=\"text-bold\">" . htmlspecialchars($row->name) . "</td><td class=\"text-center\" style=\"color:#666;\">" . htmlspecialchars($row->code ?: '-') . "</td>";
                    if ($level !== 'Provinces') $html .= "<td>" . htmlspecialchars($row->parentName ?? 'Orphaned') . "</td>";
                    $html .= "</tr>";
                }
                $html .= "</tbody></table></main></body></html>";

                AuditLogger::log('system_export', 'EXPORT', 0, "Exported {$level} data to PDF.");
                $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
                return $pdf->download("{$fileName}.pdf");
            }
            return response()->json(['error' => 'Invalid format requested'], 400);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Export Error: ' . $e->getMessage()], 500);
        }
    }

    // =========================================================================
    // 5. INSTITUTIONS & COURSES (ACADEMICS) MANAGEMENT
    // =========================================================================

    public function saveAcademics(Request $request, $level)
    {
        try {
            DB::transaction(function () use ($request, $level) {
                // FIXED: Accepts 'Institutions' or 'institution'
                if ($level === 'Institutions' || $level === 'institution') {
                    $table = 'organization';
                    $pk = 'organizationIdPk';
                    $data = [
                        'organizationName' => $request->input('name'),
                        'organizationCode' => $request->input('code'),
                        'organizationLocation' => $request->input('location'),
                        'organizationEmail' => $request->input('email'),
                        'isAnInstitution' => 1,
                        'datemodified' => now()
                    ];
                    if (!$request->filled('id')) $data['datecreated'] = now();
                    $auditName = $request->input('name');

                // FIXED: Accepts 'Courses' or 'course'
                } elseif ($level === 'Courses' || $level === 'course') {
                    $table = 'course';
                    $pk = 'courseidpk';
                    $data = [
                        'coursename' => $request->input('name'),
                        'coursecode' => $request->input('code'),
                        'studyduration' => $request->input('duration'),
                        'instutionsidfk' => $request->input('parentId') 
                    ];
                    $auditName = $request->input('name');
                } else {
                    throw new \Exception("Invalid Academic Level.");
                }

                if ($request->filled('id')) {
                    $id = $request->input('id');
                    DB::table($table)->where($pk, $id)->update($data);
                    AuditLogger::log($table, 'UPDATE', $id, "Updated {$level}: {$auditName}");
                } else {
                    $id = DB::table($table)->insertGetId($data);
                    AuditLogger::log($table, 'INSERT', $id, "Created new {$level}: {$auditName}");
                }
            });

            return response()->json(['success' => true, 'message' => ucfirst($level) . ' saved successfully.']);
            
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

    public function getAcademics(Request $request, $level)
    {
        try {
            if ($level === 'Institutions') {
                $data = DB::table('organization')
                    ->where('isAnInstitution', 1)
                    ->select(
                        'organizationIdPk as id', 'organizationName as name', 'organizationCode as code', 
                        'organizationLocation as location', 'organizationEmail as email', 
                        DB::raw('(SELECT COUNT(*) FROM course WHERE course.instutionsidfk = organization.organizationIdPk) as linkedRecords')
                    )
                    ->orderBy('organizationName', 'ASC')->get();
            } elseif ($level === 'Courses') {
                $query = DB::table('course')
                    ->leftJoin('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk')
                    ->select(
                        'course.courseidpk as id', 'course.coursename as name', 'course.coursecode as code', 
                        'course.studyduration as duration', 'course.instutionsidfk as parentId', 
                        'organization.organizationName as parentName', DB::raw('0 as linkedRecords')
                    );
                
                // FILTER BY INSTITUTION
                if ($request->filled('institutionId')) {
                    $query->where('course.instutionsidfk', $request->input('institutionId'));
                }
                $data = $query->orderBy('course.coursename', 'ASC')->get();
            } else {
                return response()->json([], 400);
            }
            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

    public function deleteAcademics($level, $id)
    {
        try {
            // FIXED: Accepts 'Institutions' or 'institution'
            if ($level === 'Institutions' || $level === 'institution') {
                $table = 'organization'; $pk = 'organizationIdPk';
                $hasChildren = DB::table('course')->where('instutionsidfk', $id)->exists();
                $childName = 'Courses';
            // FIXED: Accepts 'Courses' or 'course'
            } elseif ($level === 'Courses' || $level === 'course') {
                $table = 'course'; $pk = 'courseidpk'; $hasChildren = false; 
            } else {
                throw new \Exception("Invalid Academic Level.");
            }

            if ($hasChildren) {
                return response()->json(['success' => false, 'has_children' => true, 'message' => "Cannot delete this record because it is actively linked to one or more {$childName}."], 409);
            }

            DB::transaction(function () use ($table, $pk, $level, $id) {
                DB::table($table)->where($pk, $id)->delete();
                AuditLogger::log($table, 'DELETE', $id, "Deleted {$level} record ID: {$id}");
            });

            return response()->json(['success' => true, 'message' => ucfirst($level) . ' deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

    // =========================================================================
    // 6. SUBSIDY CONFIGURATION MANAGEMENT
    // =========================================================================

    public function getSubsidyTypes()
    {
        $types = DB::table('subsidytype')->orderBy('subsidy_idPk', 'desc')->get();
        return response()->json($types);
    }

    public function saveSubsidyType(Request $request)
    {
        $request->validate([
            'subsidy_idPk'               => 'nullable|integer',
            'subsidy_name'               => 'required|string|max:256',
            'description'                => 'required|string|max:256',
            'calculation_type'           => 'required|in:PERCENTAGE,FIXED',
            'global_percent_fixed_value' => 'required|numeric|min:0',
            'subsidytype_isActive'       => 'required|boolean'
        ]);

        try {
            DB::transaction(function () use ($request) {
                $isActive = $request->input('subsidytype_isActive') ? 1 : 0;
                if ($isActive === 1) {
                    DB::table('subsidytype')->update(['subsidytype_isActive' => 0]);
                }

                $data = [
                    'subsidy_name'               => $request->input('subsidy_name'),
                    'description'                => $request->input('description'),
                    'calculation_type'           => $request->input('calculation_type'),
                    'global_percent_fixed_value' => $request->input('global_percent_fixed_value'),
                    'subsidytype_isActive'       => $isActive,
                    'last_updated'               => now()
                ];

                if ($request->filled('subsidy_idPk')) {
                    $id = $request->input('subsidy_idPk');
                    DB::table('subsidytype')->where('subsidy_idPk', $id)->update($data);
                    AuditLogger::log('subsidytype', 'UPDATE', $id, "Updated Subsidy Config: {$data['subsidy_name']}");
                } else {
                    $id = DB::table('subsidytype')->insertGetId($data);
                    AuditLogger::log('subsidytype', 'INSERT', $id, "Created new Subsidy Config: {$data['subsidy_name']}");
                }
            });

            return response()->json(['success' => true, 'message' => 'Subsidy Configuration saved successfully.']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

    // =========================================================================
    // 7. UDC TYPE & VALUE MANAGEMENT (SYSTEM PARAMETERS)
    // =========================================================================

    public function getUdcTypes()
    {
        $types = DB::table('udc_types')->orderBy('system_code')->orderBy('udc_type')->get();
        return response()->json($types);
    }

    public function getUdcValues(Request $request)
    {
        $values = DB::table('udc_values')
            ->where('system_code', $request->system_code)
            ->where('udc_type', $request->udc_type)
            ->orderBy('sort_order', 'asc')
            ->get();
            
        return response()->json($values);
    }

    public function saveUdcType(Request $request)
    {
        $validated = $request->validate([
            'system_code' => 'required|string|max:10',
            'udc_type' => 'required|string|max:10',
            'type_description' => 'required|string|max:150',
        ]);

        DB::table('udc_types')->updateOrInsert(
            ['system_code' => $validated['system_code'], 'udc_type' => $validated['udc_type']],
            ['type_description' => $validated['type_description'], 'updated_at' => now()]
        );

        return response()->json(['message' => 'UDC Type saved successfully']);
    }

    public function saveUdcValue(Request $request)
    {
        $validated = $request->validate([
            'id' => 'nullable|integer',
            'system_code' => 'required|string|max:10',
            'udc_type' => 'required|string|max:10',
            'udc_code' => 'required|string|max:20',
            'description_1' => 'required|string|max:150',
            'special_handling_code' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['id'])) {
            DB::table('udc_values')->where('id', $validated['id'])->update([
                'description_1' => $validated['description_1'],
                'special_handling_code' => $validated['special_handling_code'],
                'sort_order' => $validated['sort_order'] ?? 0,
                'is_active' => $validated['is_active'] ?? 1,
                'updated_at' => now()
            ]);
        } else {
            DB::table('udc_values')->insert([
                'system_code' => $validated['system_code'],
                'udc_type' => $validated['udc_type'],
                'udc_code' => $validated['udc_code'],
                'description_1' => $validated['description_1'],
                'special_handling_code' => $validated['special_handling_code'],
                'sort_order' => $validated['sort_order'] ?? 0,
                'is_active' => $validated['is_active'] ?? 1,
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        return response()->json(['message' => 'UDC Value saved successfully']);
    }

    public function deleteUdcValue($id)
    {
        DB::table('udc_values')->where('id', $id)->where('is_hardcoded', 0)->delete();
        return response()->json(['message' => 'UDC Value deleted successfully']);
    }
    
}