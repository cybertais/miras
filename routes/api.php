<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\AcademicController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SubsidyAuthorizationController;
use App\Http\Controllers\Api\SubsidyController;
use App\Http\Controllers\Api\SystemSettingsController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ReportsController;

// ==========================================
// 1. PUBLIC ROUTES (No authentication needed)
// ==========================================
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);




// ==========================================
// 2. AUTHENTICATED ROUTES (Must be logged in)
// ==========================================
Route::middleware('auth:sanctum')->group(function () {

    // --- AUTHENTICATED USER ROUTE ---
    Route::get('/user', function (Request $request) {
        $user = $request->user();
        
        // Fetch the person's profile matching the user's email
        $person = DB::table('persons')->where('email', $user->email)->first();
        
        return response()->json([
            'user' => $user,
            'profile' => $person ? [
                'fullName' => trim($person->givenName . ' ' . $person->surName),
                'photo' => $person->personimage,
                'status' => $person->status,
                'email' => $person->email ?? $user->email,
                'phone' => $person->phone1,
                'gender' => $person->gender,
                'dob' => $person->dob,
                'address' => $person->postalAddress,
            ] : null
        ]);
    });

    // --- UTILITIES & DROPDOWNS (Available to any logged-in user) ---
    Route::get('/provinces', [LocationController::class, 'provinces']);
    Route::get('/llgs', [LocationController::class, 'llgs']);
    Route::get('/wards/{llgId}', [LocationController::class, 'wards']);
    Route::get('/institutions', [AcademicController::class, 'institutions']);
    Route::get('/institutions/{id}/courses', [AcademicController::class, 'courses']);
    Route::post('/upload-document', [DocumentController::class, 'uploadDocument']);
    Route::get('/dashboard/summary', [DashboardController::class, 'getSummary']);

    // ==========================================
    // 3. STUDENT MANAGEMENT (Requires Permission)
    // ==========================================
    Route::middleware('permission:manage_students')->group(function () {
        Route::get('/students', [StudentController::class, 'index']);
        Route::get('/students/{id}', [StudentController::class, 'show']);
        Route::post('/students/register', [StudentController::class, 'store']);
        Route::post('/students/update/{id}', [StudentController::class, 'update']); 
        Route::delete('/students/{id}', [StudentController::class, 'destroy']);
    });

    // ==========================================
    // 4. SUBSIDY MANAGEMENT (Requires Permission)
    // ==========================================
    Route::middleware('permission:manage_subsidies')->group(function () {
        Route::get('/subsidies', [SubsidyController::class, 'index']);
        Route::get('/subsidies/{id}', [SubsidyController::class, 'show']);
        Route::post('/subsidies/{id}/allocate', [SubsidyController::class, 'allocate']);
        
        // Academic allocations attached to students
        Route::post('/students/{personId}/allocate', [AcademicController::class, 'allocate']);
        Route::put('/students/{personId}/allocate', [AcademicController::class, 'updateAllocation']);
        
        // --- ADDED MISSING ROUTE HERE ---
        Route::put('/students/{personId}/toggle-status', [AcademicController::class, 'toggleStatus']); 
        
        Route::delete('/students/{personId}/allocate', [AcademicController::class, 'deleteAllocation']);
    });

    // ==========================================
    // 5. SUBSIDY AUTHORIZATION (Requires Permission)
    // ==========================================
    Route::middleware('permission:approve_subsidies')->group(function () {
        Route::get('/subsidy-authorizations', [SubsidyAuthorizationController::class, 'index']);
        Route::post('/subsidy-authorizations/batch-post', [SubsidyAuthorizationController::class, 'submitBatch']);
        Route::post('/authorizations/decline-batch', [SubsidyAuthorizationController::class, 'declineBatch']);
        Route::post('/subsidy-authorizations/export', [SubsidyAuthorizationController::class, 'export']);
    });

    // ==========================================
    // 6. REPORTS (Requires Permission)
    // ==========================================
    Route::middleware('permission:view_reports')->group(function () {
        Route::get('/reports/dashboard', [ReportsController::class, 'getDashboardData']);
        Route::get('/reports/export/{format}', [ReportsController::class, 'export']);
        Route::get('/reports/wards', [ReportsController::class, 'getWards']);
    });

    // ==========================================
    // 7. SYSTEM SETTINGS (Requires Super Admin Role)
    // ==========================================
    Route::middleware('role:Super Admin')->group(function () {
        // UDC (System Parameters)
        Route::get('/system-settings/udc/types', [SystemSettingsController::class, 'getUdcTypes']);
        Route::get('/system-settings/udc/values', [SystemSettingsController::class, 'getUdcValues']);
        Route::post('/system-settings/udc/type', [SystemSettingsController::class, 'saveUdcType']);
        Route::post('/system-settings/udc/value', [SystemSettingsController::class, 'saveUdcValue']);
        Route::delete('/system-settings/udc/value/{id}', [SystemSettingsController::class, 'deleteUdcValue']);

        // DDA Profile
        Route::get('/system-settings/dda-profile', [SystemSettingsController::class, 'getDdaProfile']);
        Route::post('/system-settings/dda-profile', [SystemSettingsController::class, 'saveDdaProfile']);

        // RBAC Management
        Route::get('/system-settings/rbac', [SystemSettingsController::class, 'getRbacData']);
        Route::post('/system-settings/rbac/user', [SystemSettingsController::class, 'createUserProfile']);
        Route::post('/system-settings/rbac/user/status', [SystemSettingsController::class, 'updateUserStatus']); // <-- NEW ENDPOINT
        Route::post('/system-settings/rbac/permission', [SystemSettingsController::class, 'updateRolePermission']);

        // Geopolitical
        Route::get('/system-settings/geo/{level}', [SystemSettingsController::class, 'getGeopolitical']);
        Route::post('/system-settings/geo/{level}', [SystemSettingsController::class, 'saveGeopolitical']);
        Route::delete('/system-settings/geo/{level}/{id}', [SystemSettingsController::class, 'deleteGeopolitical']);
        Route::get('/system-settings/geo/export/{level}', [SystemSettingsController::class, 'exportGeopolitical']);

        // Academics
        Route::get('/system-settings/academics/{level}', [SystemSettingsController::class, 'getAcademics']);
        Route::post('/system-settings/academics/{level}', [SystemSettingsController::class, 'saveAcademics']);
        Route::delete('/system-settings/academics/{level}/{id}', [SystemSettingsController::class, 'deleteAcademics']);

        // Subsidy Config
        Route::get('/system-settings/subsidy-types', [SystemSettingsController::class, 'getSubsidyTypes']);
        Route::post('/system-settings/subsidy-types', [SystemSettingsController::class, 'saveSubsidyType']);

        // Backups & Audit
        Route::get('/system-settings/backups', [SystemSettingsController::class, 'getBackups']);
        Route::post('/system-settings/backups/create', [SystemSettingsController::class, 'createBackup']);
        Route::post('/system-settings/backups/restore/{filename}', [SystemSettingsController::class, 'restoreBackup']);
        Route::delete('/system-settings/backups/{filename}', [SystemSettingsController::class, 'deleteBackup']);
        Route::get('/system-settings/audit-logs', [SystemSettingsController::class, 'getAuditLogs']);
    });

});