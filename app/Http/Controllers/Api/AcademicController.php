<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\AuditLogger;

class AcademicController extends Controller
{
    /**
     * Allocate a new course and institution to the student
     */
    public function allocate(Request $request, $personId)
    {
        try {
            $request->validate([
                'student_id_number' => 'required|string|max:100',
                'institution_id'    => 'required|integer',
                'course_id'         => 'required|integer',
                'year_register'     => 'required|integer|digits:4', // Strict 4 digit rule
            ]);

            $emptyStudent = DB::table('student')
                ->where('personidfk', $personId)
                ->whereNull('courseidfk')
                ->where('is_delete', 0)
                ->orderBy('studentidpk', 'desc')
                ->first();

            if ($emptyStudent) {
                DB::table('student')
                    ->where('studentidpk', $emptyStudent->studentidpk)
                    ->update([
                        'studentnumber'      => $request->input('student_id_number'),
                        'courseidfk'         => $request->input('course_id'),
                        'year_register'      => $request->input('year_register'), // Update DB
                        'studentIsActive'    => 1,
                        'student_datemodify' => now(),
                    ]);
                $studentId = $emptyStudent->studentidpk;
            } else {
                $studentId = DB::table('student')->insertGetId([
                    'personidfk'         => $personId,
                    'studentnumber'      => $request->input('student_id_number'),
                    'courseidfk'         => $request->input('course_id'),
                    'year_register'      => $request->input('year_register'), // Insert into DB
                    'studentIsActive'    => 1,
                    'is_delete'          => 0,
                    'student_datecreated'=> now(),
                ]);
            }

            AuditLogger::log('student', 'UPDATE', $studentId, 'Allocated course and institution');

            return response()->json(['success' => true, 'message' => 'Academic allocation saved successfully.']);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Edit the active allocation
     */
    public function updateAllocation(Request $request, $personId)
    {
        try {
            $request->validate([
                'student_id_number' => 'required|string|max:100',
                'institution_id'    => 'required|integer',
                'course_id'         => 'required|integer',
                'year_register'     => 'required|integer|digits:4', // Strict 4 digit rule
            ]);

            $activeStudent = DB::table('student')
                ->where('personidfk', $personId)
                ->where('studentIsActive', 1)
                ->where('is_delete', 0)
                ->first();

            if (!$activeStudent) {
                return response()->json(['success' => false, 'message' => 'No active allocation found to edit.'], 404);
            }

            // Check if they are trying to duplicate a course for the SAME year
            if ($activeStudent->courseidfk != $request->input('course_id') || $activeStudent->year_register != $request->input('year_register')) {
                $exists = DB::table('student')
                    ->where('personidfk', $personId)
                    ->where('courseidfk', $request->input('course_id'))
                    ->where('year_register', $request->input('year_register')) // Use the new input
                    ->where('is_delete', 0)
                    ->exists();

                if ($exists) {
                    return response()->json(['success' => false, 'message' => 'Cannot change to this course; it is already allocated for this year.'], 422);
                }
            }

            DB::table('student')
                ->where('studentidpk', $activeStudent->studentidpk)
                ->update([
                    'studentnumber'      => $request->input('student_id_number'),
                    'courseidfk'         => $request->input('course_id'),           
                    'year_register'      => $request->input('year_register'), // Update DB
                    'student_datemodify' => now(),
                ]);

            AuditLogger::log('student', 'UPDATE', $activeStudent->studentidpk, 'Updated course and institution allocation');

            return response()->json(['success' => true, 'message' => 'Allocation updated successfully.']);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Toggle the Active/Inactive status of the current allocation
     */
    public function toggleStatus(Request $request, $personId)
    {
        try {
            $status = $request->input('status'); 
            
            $latestStudent = DB::table('student')
                ->where('personidfk', $personId)
                ->where('is_delete', 0)
                ->orderBy('studentidpk', 'desc')
                ->first();

            if (!$latestStudent) {
                return response()->json(['success' => false, 'message' => 'No allocation found.'], 404);
            }

            DB::table('student')->where('studentidpk', $latestStudent->studentidpk)->update([
                'studentIsActive' => $status,
                'student_datemodify' => now()
            ]);

            $statusText = $status ? 'Enabled' : 'Disabled';
            AuditLogger::log('student', 'UPDATE', $latestStudent->studentidpk, "{$statusText} academic allocation");

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete the active allocation
     */
    public function deleteAllocation($personId)
    {
        try {
            $latestStudent = DB::table('student')
                ->where('personidfk', $personId)
                ->where('is_delete', 0)
                ->orderBy('studentidpk', 'desc')
                ->first();

            if (!$latestStudent) {
                return response()->json(['success' => false, 'message' => 'No active allocation found.'], 404);
            }

            $hasSubsidy = DB::table('student_subsidytype')
                ->where('studentIdFk', $latestStudent->studentidpk)
                ->exists();

            if ($hasSubsidy) {
                return response()->json([
                    'success' => false, 
                    'message' => 'This allocation cannot be removed because a subsidy has already been allocated or is in progress.',
                    'has_subsidy' => true
                ], 422);
            }

            DB::transaction(function () use ($latestStudent) {
                DB::table('student')->where('studentidpk', $latestStudent->studentidpk)->update([
                    'studentIsActive'    => 0,
                    'is_delete'          => 1,
                    'student_datemodify' => now(),
                ]);

                AuditLogger::log('student', 'DELETE', $latestStudent->studentidpk, 'Removed course and institution allocation');
            });

            return response()->json(['success' => true, 'message' => 'Allocation removed successfully.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }
 
    /**
     * Fetch all institutions for the dropdown
     */
    public function institutions()
    {
        $institutions = DB::table('organization')
            ->where('isAnInstitution', 1)
            ->select(
                'organizationIdPk as id',
                'organizationName as name' 
            )
            ->orderBy('organizationName')
            ->get();
            
        return response()->json($institutions);
    }

    /**
     * Fetch courses related to a specific institution
     */
    public function courses($institutionId)
    {
        $courses = DB::table('course')
            ->join('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk')
            ->where('course.instutionsidfk', $institutionId)
            ->select(
                'course.courseidpk as id',
                'course.coursename as name',
                'course.coursecode as code', 
                'course.studyduration as duration',
                'organization.organizationCode as inst_code' 
            )
            ->orderBy('course.coursename')
            ->get();
            
        return response()->json($courses);
    }
}