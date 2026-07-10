<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class ReportsController extends Controller
{
    /**
     * Fetch Wards dynamically based on LLG ID
     */
    public function getWards(Request $request)
    {
        if ($request->filled('llg_id')) {
            $wards = DB::table('ward')
                ->where('llgIdFk', $request->llg_id)
                ->select('wardIdPk as id', 'wardName as name')
                ->orderBy('wardName', 'asc')
                ->get();
            return response()->json($wards);
        }
        return response()->json([]);
    }

    public function getDashboardData(Request $request)
    {
        $query = DB::table('student_subsidytype')
            ->join('student', 'student_subsidytype.studentIdFk', '=', 'student.studentidpk')
            ->join('persons', 'student.personidfk', '=', 'persons.personIdPk')
            ->leftJoin('subsidytype', 'student_subsidytype.subsidy_idFk', '=', 'subsidytype.subsidy_idPk')
            ->leftJoin('ward', 'persons.wardidfk', '=', 'ward.wardIdPk')
            ->leftJoin('llg', 'ward.llgIdFk', '=', 'llg.llgIdPk')
            ->leftJoin('province', 'persons.provinceidfk', '=', 'province.provinceId')
            ->leftJoin('course', 'student.courseidfk', '=', 'course.courseidpk')
            ->leftJoin('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk');

        // Apply Filters dynamically
        if ($request->filled('academicYear')) {
            $query->where(function($q) use ($request) {
                $q->where('student.year_register', $request->academicYear)
                  ->orWhere('student_subsidytype.subsidy_year', $request->academicYear);
            });
        }
        if ($request->filled('llg')) {
            $query->where('llg.llgIdPk', $request->llg);
        }
        if ($request->filled('ward')) {
            $query->where('ward.wardIdPk', $request->ward);
        }
        if ($request->filled('status')) {
            $query->where('student_subsidytype.student_subsidy_status', $request->status);
        }

        $kpiQuery = clone $query;
        $statusQuery = clone $query;
        $llgQuery = clone $query;
        $tableQuery = clone $query;

        // 3. Calculate KPIs
        $totalSubsidy = $kpiQuery->sum('student_subsidytype.financial_value_subsidize');
        
        // FIXED: Only count distinct students who are explicitly 'APPROVED'
        $studentsAssisted = (clone $query)
            ->where('student_subsidytype.student_subsidy_status', 'APPROVED')
            ->distinct()
            ->count('student.studentidpk');
            
        $institutionsCount = (clone $query)->distinct()->count('organization.organizationIdPk');
        $pendingReview = (clone $query)->whereIn('student_subsidytype.student_subsidy_status', ['UNDER REVIEW', 'PENDING APPROVAL'])->count();

        $statuses = $statusQuery->select('student_subsidytype.student_subsidy_status as status', DB::raw('count(*) as count'))
            ->groupBy('student_subsidytype.student_subsidy_status')
            ->get();

        $llgDistribution = $llgQuery->selectRaw("COALESCE(llg.llgName, province.pro_name, 'Outside Province') as location_name, count(*) as count")
            ->groupBy('llg.llgName', 'province.pro_name') 
            ->get();

        $ledger = $tableQuery->distinct()->select(
                DB::raw("CONCAT_WS(' ', persons.givenName, persons.surName) as fullname"),
                'student.studentnumber',
                DB::raw("CASE WHEN subsidytype.calculation_type = 'PERCENTAGE' THEN 'Percentage' WHEN subsidytype.calculation_type = 'FIXED' THEN 'Fixed' ELSE subsidytype.calculation_type END as subsidy_type"),
                'student_subsidytype.studying_year as study_year',
                'student_subsidytype.financial_value_subsidize as subsidy',
                'student_subsidytype.total_academic_cost as cost',
                'student_subsidytype.student_subsidy_status as status',
                'organization.organizationName as institution',
                DB::raw("COALESCE(ward.wardName, 'Special Circumstance') as ward"),
                DB::raw("COALESCE(llg.llgName, province.pro_name, 'Outside Province') as llg"),
                'student_subsidytype.created_at_student_subsidytype' 
            )
            ->orderBy('student_subsidytype.created_at_student_subsidytype', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'kpi' => [
                'totalSubsidy' => 'K ' . number_format((float)$totalSubsidy, 2),
                'studentsAssisted' => $studentsAssisted,
                'institutions' => $institutionsCount,
                'pendingReview' => $pendingReview
            ],
            'charts' => [
                'status' => [
                    'labels' => $statuses->pluck('status'),
                    'data' => $statuses->pluck('count')
                ],
                'llg' => [
                    'labels' => $llgDistribution->pluck('location_name'),
                    'data' => $llgDistribution->pluck('count')
                ]
            ],
            'table' => $ledger
        ]);
    }

    public function export(Request $request, $format)
    {
        $query = DB::table('student_subsidytype')
            ->join('student', 'student_subsidytype.studentIdFk', '=', 'student.studentidpk')
            ->join('persons', 'student.personidfk', '=', 'persons.personIdPk')
            ->leftJoin('subsidytype', 'student_subsidytype.subsidy_idFk', '=', 'subsidytype.subsidy_idPk')
            ->leftJoin('ward', 'persons.wardidfk', '=', 'ward.wardIdPk')
            ->leftJoin('llg', 'ward.llgIdFk', '=', 'llg.llgIdPk')
            ->leftJoin('province', 'persons.provinceidfk', '=', 'province.provinceId')
            ->leftJoin('course', 'student.courseidfk', '=', 'course.courseidpk')
            ->leftJoin('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk');

        if ($request->filled('academicYear')) {
            $query->where(function($q) use ($request) {
                $q->where('student.year_register', $request->academicYear)
                  ->orWhere('student_subsidytype.subsidy_year', $request->academicYear);
            });
        }
        if ($request->filled('llg')) {
            $query->where('llg.llgIdPk', $request->llg);
        }
        if ($request->filled('ward')) {
            $query->where('ward.wardIdPk', $request->ward);
        }
        if ($request->filled('status')) {
            $query->where('student_subsidytype.student_subsidy_status', $request->status);
        }

        $data = $query->distinct()->select(
                DB::raw("CONCAT_WS(' ', persons.givenName, persons.surName) as fullname"),
                'student.studentnumber',
                DB::raw("CASE WHEN subsidytype.calculation_type = 'PERCENTAGE' THEN 'Percentage' WHEN subsidytype.calculation_type = 'FIXED' THEN 'Fixed' ELSE subsidytype.calculation_type END as subsidy_type"),
                'student_subsidytype.studying_year as study_year',
                'course.coursename as course',
                'student_subsidytype.total_academic_cost as cost',
                'student_subsidytype.financial_value_subsidize as subsidy',
                'student_subsidytype.student_subsidy_status as status',
                'organization.organizationName as institution',
                DB::raw("COALESCE(ward.wardName, 'Special Circumstance') as ward"),
                DB::raw("COALESCE(llg.llgName, province.pro_name, 'Outside Province') as llg"),
                'student_subsidytype.created_at_student_subsidytype' 
            )
            ->orderBy('student_subsidytype.created_at_student_subsidytype', 'desc')
            ->get();

        $fileName = 'DDA_Report_' . date('Y-m-d_His');

        if ($format === 'excel') {
            $headers = [
                "Content-type"        => "text/csv",
                "Content-Disposition" => "attachment; filename={$fileName}.csv",
                "Pragma"              => "no-cache",
                "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
                "Expires"             => "0"
            ];

            $callback = function() use ($data) {
                $file = fopen('php://output', 'w');
                fputcsv($file, ['Student ID', 'Student Name', 'LLG / Province', 'Ward', 'Institution', 'Course', 'Subsidy Type', 'Study Year', 'Subsidized Amt (K)', 'Academic Cost (K)', 'Status']);

                foreach ($data as $row) {
                    fputcsv($file, [
                        $row->studentnumber ?? '-',
                        $row->fullname,
                        $row->llg,
                        $row->ward,
                        $row->institution ?? '-',
                        $row->course ?? '-',
                        $row->subsidy_type ?? '-',
                        $row->study_year ?? '-',
                        number_format((float)$row->subsidy, 2),
                        number_format((float)$row->cost, 2),
                        $row->status
                    ]);
                }
                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        }

        if ($format === 'pdf') {
            $pdf = Pdf::loadView('reports.pdf_template', [
                'data' => $data,
                'filters' => $request->all(),
                'date' => date('d M Y, h:i A')
            ])->setPaper('a4', 'landscape');

            return $pdf->download("{$fileName}.pdf");
        }

        return response()->json(['error' => 'Invalid format'], 400);
    }
}