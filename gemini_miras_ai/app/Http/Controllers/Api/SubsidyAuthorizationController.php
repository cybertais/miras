<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubsidyAuthorizationController extends Controller
{
    /**
     * 1. FETCH RECORDS (Populates the Authorization Data Table)
     */
    public function index(Request $request)
    {
        $status = $request->query('status', 'UNDER REVIEW');
        $perPage = $request->query('per_page', 10);
        $search = $request->query('search', '');
        $sortColumn = $request->query('sort', 'student_subsidytype.modify_at_student_subsidytype');
        $sortDirection = $request->query('direction', 'desc');

        $query = DB::table('student_subsidytype')
            ->join('student', 'student_subsidytype.studentIdFk', '=', 'student.studentidpk')
            ->join('persons', 'student.personidfk', '=', 'persons.personIdPk')
            ->leftJoin('course', 'student.courseidfk', '=', 'course.courseidpk')
            ->leftJoin('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk')
            ->leftJoin('ward', 'persons.wardidfk', '=', 'ward.wardIdPk')
            ->leftJoin('llg', 'ward.llgIdFk', '=', 'llg.llgIdPk')
            ->leftJoin('province', 'persons.provinceidfk', '=', 'province.provinceId')
            ->where('student_subsidytype.student_subsidy_status', $status);

        if (!empty($search)) {
            $query->where(function($q) use ($search) {
                $q->where('persons.givenName', 'like', "%{$search}%")
                  ->orWhere('persons.surName', 'like', "%{$search}%")
                  ->orWhere('student.studentnumber', 'like', "%{$search}%");
            });
        }

        $paginator = $query->distinct()->select([
            'student_subsidytype.student_subsidytype_idPk as id',
            DB::raw("CONCAT_WS(' ', persons.givenName, persons.surName) as fullname"),
            DB::raw("COALESCE(ward.wardName, llg.llgName, province.pro_name, 'Unknown') as belongsTo"),
            'student_subsidytype.total_academic_cost as academicCost',
            'student_subsidytype.financial_value_subsidize as totalAmount',
            'student_subsidytype.student_subsidy_status as status',
            'student.studentnumber as studentId',
            'course.coursename as courseName',
            'student_subsidytype.subsidy_year',
            'student_subsidytype.studying_year',
            'organization.organizationName as institution',
            'student_subsidytype.chequenumber as cheque',
            'student_subsidytype.bankdepositrefnumber as bankRef',
            'student_subsidytype.student_subsidytype_comment as comment',
            $sortColumn // Required for distinct sorting
        ])
        ->orderBy($sortColumn, $sortDirection)
        ->paginate($perPage);

        return response()->json($paginator);
    }

    /**
     * 2. BATCH POST SUBSIDIES (Moves from Level 1 -> Level 2 -> Level 3)
     */
    public function submitBatch(Request $request)
    {
        $request->validate([
            'phase' => 'required|integer',
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:student_subsidytype,student_subsidytype_idPk'
        ]);

        $phase = $request->phase;
        $ids = $request->ids;
        $userId = auth()->id() ?? 10;

        DB::beginTransaction();
        try {
            $newStatus = '';
            
            if ($phase == 1) {
                $newStatus = 'PENDING APPROVAL';
                $activeSubsidy = DB::table('subsidytype')->where('subsidytype_isActive', 1)->first();
                
                if (!$activeSubsidy) {
                    throw new \Exception('No Active Subsidy Rule is configured. Please activate one in Settings.');
                }
                
                foreach($ids as $id) {
                    $record = DB::table('student_subsidytype')->where('student_subsidytype_idPk', $id)->first();
                    $cost = floatval($record->total_academic_cost);
                    $subsidyAmt = 0;
                    
                    if ($activeSubsidy->calculation_type === 'PERCENTAGE') {
                        $subsidyAmt = $cost * (floatval($activeSubsidy->global_percent_fixed_value) / 100);
                    } else {
                        $fixed = floatval($activeSubsidy->global_percent_fixed_value);
                        $subsidyAmt = $fixed > $cost ? $cost : $fixed;
                    }
                    
                    DB::table('student_subsidytype')->where('student_subsidytype_idPk', $id)->update([
                        'student_subsidy_status' => $newStatus,
                        'financial_value_subsidize' => $subsidyAmt,
                        'subsidy_idFk' => $activeSubsidy->subsidy_idPk,
                        'modify_at_student_subsidytype' => now()
                    ]);
                }
            } else if ($phase == 2) {
                $newStatus = 'APPROVED';
                $updateData = [
                    'student_subsidy_status' => $newStatus,
                    'modify_at_student_subsidytype' => now()
                ];
                
                if ($request->has('chequenumber')) $updateData['chequenumber'] = $request->chequenumber;
                if ($request->has('bankdepositrefnumber')) $updateData['bankdepositrefnumber'] = $request->bankdepositrefnumber;
                if ($request->has('comment')) $updateData['student_subsidytype_comment'] = $request->comment;
                
                if ($request->hasFile('paymentscanneddoc')) {
                    $updateData['paymentscanneddocs'] = $request->file('paymentscanneddoc')->store('subsidy_docs/payments', 'public');
                }
                
                DB::table('student_subsidytype')->whereIn('student_subsidytype_idPk', $ids)->update($updateData);
            }

            // Enforce Audit Trail
            $auditLogs = [];
            foreach ($ids as $id) {
                $auditLogs[] = [
                    'tableName' => 'student_subsidytype',
                    'operationType' => 'UPDATE',
                    'recordId' => $id,
                    'changeTimestamp' => now(),
                    'sysuserid' => $userId,
                    'details' => "Batch posted: Processed to {$newStatus} phase."
                ];
            }
            DB::table('system_auditlog')->insert($auditLogs);

            DB::commit();
            return response()->json(['message' => 'Batch processed successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * 3. DECLINE BATCH (Your New Method)
     */
    public function declineBatch(Request $request)
    {
        $request->validate([
            'subsidy_ids' => 'required|array',
            'subsidy_ids.*' => 'integer|exists:student_subsidytype,student_subsidytype_idPk'
        ]);

        $ids = $request->subsidy_ids;
        $userId = auth()->id() ?? 10; 

        DB::beginTransaction();
        try {
            DB::table('student_subsidytype')
                ->whereIn('student_subsidytype_idPk', $ids)
                ->update([
                    'student_subsidy_status' => 'DECLINE',
                    'modify_at_student_subsidytype' => now()
                ]);

            $auditLogs = [];
            foreach ($ids as $id) {
                $auditLogs[] = [
                    'tableName' => 'student_subsidytype',
                    'operationType' => 'DECLINE',
                    'recordId' => $id,
                    'changeTimestamp' => now(),
                    'sysuserid' => $userId,
                    'details' => 'Subsidy declined during authorization phase.'
                ];
            }
            DB::table('system_auditlog')->insert($auditLogs);

            DB::commit();
            return response()->json(['success' => true, 'message' => count($ids) . ' records successfully declined.']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to decline records: ' . $e->getMessage()], 500);
        }
    }

    /**
     * 4. EXPORT TO EXCEL (Dumps all records for the active phase)
     */
    public function export(Request $request)
    {
        $status = $request->input('status', 'UNDER REVIEW');

        $query = DB::table('student_subsidytype')
            ->join('student', 'student_subsidytype.studentIdFk', '=', 'student.studentidpk')
            ->join('persons', 'student.personidfk', '=', 'persons.personIdPk')
            ->leftJoin('course', 'student.courseidfk', '=', 'course.courseidpk')
            ->leftJoin('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk')
            ->leftJoin('ward', 'persons.wardidfk', '=', 'ward.wardIdPk')
            ->leftJoin('llg', 'ward.llgIdFk', '=', 'llg.llgIdPk')
            ->leftJoin('province', 'persons.provinceidfk', '=', 'province.provinceId')
            ->where('student_subsidytype.student_subsidy_status', $status);

        // Fetch all matching records for the current status phase
        $data = $query->distinct()->select(
                DB::raw("CONCAT_WS(' ', persons.givenName, persons.surName) as fullname"),
                'student.studentnumber',
                'student_subsidytype.total_academic_cost',
                'student_subsidytype.financial_value_subsidize',
                'student_subsidytype.student_subsidy_status',
                'course.coursename',
                'organization.organizationName',
                'student_subsidytype.studying_year',
                'student_subsidytype.subsidy_year',
                DB::raw("COALESCE(ward.wardName, llg.llgName, province.pro_name, 'Unknown') as belongsTo")
            )->get();

        $callback = function() use ($data) {
            $file = fopen('php://output', 'w');
            
            // Add Header Row
            fputcsv($file, ['#', 'Fullname', 'Belongs To', 'Academic Cost (K)', 'Amt Subsidized (K)', 'Status', 'Student ID', 'Course', 'Subsidy Year', 'Studying Year', 'Institution']);
            
            $count = 1;
            foreach ($data as $row) {
                fputcsv($file, [
                    $count++,
                    $row->fullname,
                    $row->belongsTo,
                    number_format((float)$row->total_academic_cost, 2),
                    number_format((float)$row->financial_value_subsidize, 2),
                    $row->student_subsidy_status,
                    $row->studentnumber,
                    $row->coursename,
                    $row->subsidy_year,
                    $row->studying_year,
                    $row->organizationName
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=Authorization_Phase_Export_" . date('Ymd_His') . ".csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ]);
    }

  
}