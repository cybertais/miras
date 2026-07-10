<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubsidyController extends Controller
{
    /**
     * Export selected records to Excel (CSV format)
     */
    public function exportExcel(Request $request)
    {
        $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'integer'
        ]);

        $ids = $request->input('ids');

        $records = DB::table('student_subsidytype')
            ->join('student', 'student_subsidytype.studentIdFk', '=', 'student.studentidpk')
            ->join('persons', 'student.personidfk', '=', 'persons.personIdPk')
            ->leftJoin('course', 'student.courseidfk', '=', 'course.courseidpk')
            ->leftJoin('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk')
            ->leftJoin('ward', 'persons.wardidfk', '=', 'ward.wardIdPk')
            ->leftJoin('province', 'persons.provinceidfk', '=', 'province.provinceId')
            ->whereIn('student_subsidytype.student_subsidytype_idPk', $ids)
            ->select(
                'student_subsidytype.student_subsidytype_idPk as Subsidy_Ref_ID',
                'student.studentnumber as Student_ID',
                'persons.givenName as First_Name',
                'persons.surName as Last_Name',
                'persons.gender as Gender',
                'persons.dob as Date_Of_Birth',
                'persons.phone1 as Phone',
                'persons.email as Email',
                'persons.postalAddress as Address',
                'ward.wardName as Ward',
                'province.pro_name as Province',
                'organization.organizationName as Institution',
                'course.coursename as Course',
                'course.studyduration as Duration',
                'student_subsidytype.studying_year as Studying_Year',
                'student_subsidytype.subsidy_year as Subsidy_Year',
                'student_subsidytype.total_academic_cost as Total_Academic_Cost',
                'student_subsidytype.financial_value_subsidize as Amount_Subsidized',
                'student_subsidytype.student_subsidy_status as Status',
                'student_subsidytype.chequenumber as Cheque_Number',
                'student_subsidytype.bankdepositrefnumber as Bank_Ref'
            )->get();

        if ($records->isEmpty()) {
            return response()->json(['message' => 'No records found to export.'], 404);
        }

        $fileName = 'Subsidy_Export_' . date('Y-m-d_H-i-s') . '.csv';
        $headers = array(
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        );

        $columns = array_keys((array)$records->first());

        $callback = function() use($records, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);
            foreach ($records as $row) {
                fputcsv($file, (array)$row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Process a batch of subsidies (Level 1 -> Level 2, or Level 2 -> Level 3)
     */
    public function batchPost(Request $request)
    {
        try {
            $phase = $request->input('phase');

            if ($phase == 1) {
                // LEVEL 1 -> LEVEL 2 (Calculation & Allocation Phase)
                $request->validate([
                    'ids' => 'required|array',
                    'ids.*' => 'integer',
                ]);

                // 1. Fetch the globally ACTIVE Subsidy Type
                $activeSubsidy = DB::table('subsidytype')->where('subsidytype_isActive', 1)->first();
                
                if (!$activeSubsidy) {
                    throw new \Exception("CRITICAL ERROR: No Active Subsidy Configuration found in System Settings. Cannot process batch.");
                }

                $subsidyObjectJson = json_encode($activeSubsidy);

                // 2. Safely Process Bulk Allocations inside a Transaction
                DB::transaction(function () use ($request, $activeSubsidy, $subsidyObjectJson) {
                    $ids = $request->input('ids');
                    
                    foreach ($ids as $id) {
                        $record = DB::table('student_subsidytype')->where('student_subsidytype_idPk', $id)->first();
                        if (!$record) continue;

                        $cost = floatval($record->total_academic_cost ?: 0);
                        $subsidyValue = 0;

                        // 3. Gracefully Handle Calculation Formulas
                        if (strtoupper($activeSubsidy->calculation_type) === 'PERCENTAGE') {
                            $percent = floatval($activeSubsidy->global_percent_fixed_value) / 100;
                            $subsidyValue = $cost * $percent;
                        } elseif (strtoupper($activeSubsidy->calculation_type) === 'FIXED') {
                            $subsidyValue = floatval($activeSubsidy->global_percent_fixed_value);
                        }

                        if ($subsidyValue > $cost) {
                            $subsidyValue = $cost;
                        }

                        DB::table('student_subsidytype')
                            ->where('student_subsidytype_idPk', $id)
                            ->update([
                                'subsidy_idFk' => $activeSubsidy->subsidy_idPk,
                                'financial_value_subsidize' => $subsidyValue,
                                'subsidytype_object' => $subsidyObjectJson,
                                'student_subsidy_status' => 'PENDING APPROVAL',
                                'modify_at_student_subsidytype' => now(),
                            ]);

                        \App\Services\AuditLogger::log('student_subsidytype', 'UPDATE', $id, 'Batch posted: Processed to PENDING APPROVAL. Subsidized K' . number_format($subsidyValue, 2));
                    }
                });

                return response()->json(['success' => true, 'message' => 'Batch processed and Subsidies strictly allocated.']);

            } elseif ($phase == 2) {
                // LEVEL 2 -> LEVEL 3
                $request->validate([
                    'ids' => 'required|array',
                    'ids.*' => 'integer',
                    'chequenumber' => 'required|string|max:255',
                    'bankdepositrefnumber' => 'required|string|max:255',
                    'paymentscanneddoc' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
                    'comment' => 'nullable|string|max:255',
                ]);

                $docPath = $request->file('paymentscanneddoc')->store('subsidy_docs/payments', 'public');

                DB::transaction(function () use ($request, $docPath) {
                    $ids = $request->input('ids');
                    DB::table('student_subsidytype')
                        ->whereIn('student_subsidytype_idPk', $ids)
                        ->update([
                            'chequenumber' => $request->input('chequenumber'),
                            'bankdepositrefnumber' => $request->input('bankdepositrefnumber'),
                            'paymentscanneddocs' => $docPath,
                            'student_subsidytype_comment' => $request->input('comment'),
                            'student_subsidy_status' => 'APPROVED',
                            'modify_at_student_subsidytype' => now(),
                        ]);

                    foreach ($ids as $id) {
                        \App\Services\AuditLogger::log('student_subsidytype', 'UPDATE', $id, 'Batch posted: Processed to APPROVED phase with payment details.');
                    }
                });
                return response()->json(['success' => true, 'message' => 'Batch completely approved.']);
            } else {
                return response()->json(['success' => false, 'message' => 'Invalid phase provided.'], 400);
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Processing Error: ' . $e->getMessage()], 500);
        }
    }

    public function authorizations(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search', '');
        $status = $request->input('status', 'UNDER REVIEW');
        $sortColumn = $request->input('sort', 'student_subsidytype.modify_at_student_subsidytype');
        $sortDirection = $request->input('direction', 'desc');

        $query = DB::table('student_subsidytype')
            ->join('student', 'student_subsidytype.studentIdFk', '=', 'student.studentidpk')
            ->join('persons', 'student.personidfk', '=', 'persons.personIdPk')
            ->leftJoin('course', 'student.courseidfk', '=', 'course.courseidpk')
            ->leftJoin('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk')
            ->leftJoin('ward', 'persons.wardidfk', '=', 'ward.wardIdPk')
            ->leftJoin('province', 'persons.provinceidfk', '=', 'province.provinceId')
            ->where('student.is_delete', 0)
            ->where('student_subsidytype.student_subsidy_status', $status)
            ->select(
                'student_subsidytype.student_subsidytype_idPk as id',
                'student_subsidytype.studying_year',
                'student_subsidytype.subsidy_year',
                'student_subsidytype.financial_value_subsidize as totalAmount',
                'student_subsidytype.total_academic_cost as academicCost',
                'student_subsidytype.student_subsidy_status as status',
                'student_subsidytype.chequenumber',
                'student_subsidytype.bankdepositrefnumber',
                'student_subsidytype.student_subsidytype_comment as comment',
                'student.studentnumber as studentId',
                'course.coursename as courseName',
                'organization.organizationName as institution',
                'ward.wardName',
                'province.pro_name as provinceName',
                DB::raw('CONCAT_WS(" ", persons.givenName, persons.surName) AS fullname')
            );

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where(DB::raw('CONCAT_WS(" ", persons.givenName, persons.surName)'), 'like', "%{$search}%")
                    ->orWhere('student.studentnumber', 'like', "%{$search}%")
                    ->orWhere('organization.organizationName', 'like', "%{$search}%")
                    ->orWhere('course.coursename', 'like', "%{$search}%");
            });
        }

        $paginator = $query->orderBy($sortColumn, $sortDirection)->paginate($perPage);

        $paginator->getCollection()->transform(function ($item) {
            $item->belongsTo = $item->wardName ?: ($item->provinceName ?: 'N/A');
            $item->institution = $item->institution ?: 'N/A';
            $item->courseName = $item->courseName ?: 'N/A';
            return $item;
        });

        return response()->json($paginator);
    }

    public function getTypes()
    {
        $types = DB::table('subsidytype')->where('subsidytype_isActive', 1)->get();
        return response()->json($types);
    }

    public function allocate(Request $request, $id)
    {
        try {
            $request->validate([
                'studying_year' => 'required|string',
                'subsidy_year' => 'required|integer|digits:4',
                'total_academic_cost' => 'required|numeric|min:0',
                'student_idcard' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
                'student_transcript' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            ]);

            $idCardPath = $request->file('student_idcard')->store('subsidy_docs/id_cards', 'public');
            $transcriptPath = $request->file('student_transcript')->store('subsidy_docs/transcripts', 'public');

            DB::transaction(function () use ($request, $id, $idCardPath, $transcriptPath) {
                $subsidyTypeId = DB::table('student_subsidytype')->insertGetId([
                    'studentIdFk' => $id,
                    'studying_year' => $request->input('studying_year'),
                    'subsidy_year' => $request->input('subsidy_year'),
                    'total_academic_cost' => $request->input('total_academic_cost'),
                    'student_idcard' => $idCardPath,
                    'student_transcript' => $transcriptPath,
                    'student_subsidy_status' => 'UNDER REVIEW',
                    'created_at_student_subsidytype' => now(),
                    'modify_at_student_subsidytype' => now(),
                ]);
                \App\Services\AuditLogger::log('student_subsidytype', 'INSERT', $subsidyTypeId, 'Created draft subsidy allocation for student ID: ' . $id);
            });

            return response()->json(['success' => true, 'message' => 'Draft subsidy allocated successfully.']);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id)
    {
        $profile = DB::table('student')
            ->join('persons', 'student.personidfk', '=', 'persons.personIdPk')
            ->leftJoin('course', 'student.courseidfk', '=', 'course.courseidpk')
            ->leftJoin('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk')
            ->where('student.studentidpk', $id)
            ->select(
                'student.studentidpk', 'student.studentnumber', 'student.studentIsActive',
                'student.student_datecreated', 'student.student_datemodify',
                'persons.givenName', 'persons.surName', 'persons.gender', 'persons.dob',
                'persons.maritalStatus', 'persons.email', 'persons.phone1', 'persons.postalAddress', 'persons.personimage',
                'course.coursename', 'course.studyduration', 'organization.organizationName',
                'organization.organizationCode', 'organization.organizationLocation'
            )->first();

        if (!$profile) return response()->json(['success' => false, 'message' => 'Record not found'], 404);

        $perPage = $request->input('per_page', 10);
        $search = $request->input('search', '');
        $sortColumn = $request->input('sort', 'student_subsidytype_idPk');
        $sortDirection = $request->input('direction', 'desc');

        $allowedSorts = ['student_subsidytype_idPk', 'studying_year', 'subsidy_year', 'financial_value_subsidize', 'total_academic_cost', 'student_subsidy_status'];
        if (!in_array($sortColumn, $allowedSorts)) $sortColumn = 'student_subsidytype_idPk';

        $query = DB::table('student_subsidytype')->where('studentIdFk', $id);

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('studying_year', 'like', "%{$search}%")
                    ->orWhere('subsidy_year', 'like', "%{$search}%")
                    ->orWhere('student_subsidy_status', 'like', "%{$search}%");
            });
        }

        $subsidies = $query->orderBy($sortColumn, $sortDirection)->paginate($perPage);

        return response()->json(['profile' => $profile, 'subsidies' => $subsidies]);
    }

    /**
     * Fetch Main Student Register With Dynamic Badges
     */
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search', '');
        $sortColumn = $request->input('sort', 'student.studentidpk');
        $sortDirection = $request->input('direction', 'desc');

        $allowedSorts = [
            'student.studentidpk', 'student.studentIsActive', 'student.year_register', 'fullname',
            'persons.gender', 'student.studentnumber', 'organization.organizationName', 'course.coursename',
            'totalAmount'
        ];

        if (!in_array($sortColumn, $allowedSorts)) {
            $sortColumn = 'student.studentidpk';
            $sortDirection = 'desc';
        }

        $query = DB::table('student')
            ->join('persons', 'student.personidfk', '=', 'persons.personIdPk')
            ->leftJoin('course', 'student.courseidfk', '=', 'course.courseidpk')
            ->leftJoin('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk')
            ->where('student.is_delete', 0)
            ->select(
                'student.studentidpk as id', 'student.studentIsActive', 'student.year_register as regYear',
                DB::raw('CONCAT_WS(" ", persons.givenName, persons.surName) AS fullname'),
                'persons.gender', 'student.studentnumber as studentId', 'organization.organizationName as institution',
                'course.coursename as courseName'
            )
            // Aggregated Financial Value Subselect
            ->addSelect([
                'totalAmount' => DB::table('student_subsidytype')
                    ->whereColumn('studentIdFk', 'student.studentidpk')
                    ->selectRaw('SUM(financial_value_subsidize)')
            ]);

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where(DB::raw('CONCAT_WS(" ", persons.givenName, persons.surName)'), 'like', "%{$search}%")
                    ->orWhere('student.studentnumber', 'like', "%{$search}%")
                    ->orWhere('organization.organizationName', 'like', "%{$search}%")
                    ->orWhere('course.coursename', 'like', "%{$search}%");
            });
        }

        $paginator = $query->orderBy($sortColumn, $sortDirection)->paginate($perPage);

        // Fetch Array of Individual Subsidy Badges for these specific students
        $studentIds = $paginator->getCollection()->pluck('id');
        $allocations = DB::table('student_subsidytype')
            ->whereIn('studentIdFk', $studentIds)
            ->select('studentIdFk', 'studying_year', 'subsidy_year', 'student_subsidy_status')
            ->orderBy('subsidy_year', 'asc')
            ->get();

        $paginator->getCollection()->transform(function ($item) use ($allocations) {
            $item->studentStatus = $item->studentIsActive ? 'Enable' : 'Disable';
            $item->institution = $item->institution ?: 'N/A';
            $item->courseName = $item->courseName ?: 'N/A';
            $item->totalAmount = $item->totalAmount ?: 0.00;
            
            // Map the badges array
            $item->allocations = $allocations->where('studentIdFk', $item->id)->values();
            
            return $item;
        });

        return response()->json($paginator);
    }

    
}