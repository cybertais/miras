<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function getSummary(Request $request)
    {
        // 1. Base Query reflecting all critical relationships
        $query = DB::table('student_subsidytype')
            ->join('student', 'student_subsidytype.studentIdFk', '=', 'student.studentidpk')
            ->join('persons', 'student.personidfk', '=', 'persons.personIdPk')
            ->leftJoin('ward', 'persons.wardidfk', '=', 'ward.wardIdPk')
            ->leftJoin('llg', 'ward.llgIdFk', '=', 'llg.llgIdPk')
            ->leftJoin('province', 'persons.provinceidfk', '=', 'province.provinceId')
            ->leftJoin('course', 'student.courseidfk', '=', 'course.courseidpk')
            ->leftJoin('organization', 'course.instutionsidfk', '=', 'organization.organizationIdPk');

        // 2. Apply Filters (Same as reports, minus Report Type)
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

        // Clone query for specific aggregations
        $kpiQuery = clone $query;
        $genderQuery = clone $query;
        $institutionQuery = clone $query;

        // 3. 360-View KPIs
        // Only count approved funds for the main 'Total Approved' KPI
        $totalApprovedFunds = (clone $kpiQuery)
            ->where('student_subsidytype.student_subsidy_status', 'APPROVED')
            ->sum('student_subsidytype.financial_value_subsidize');
            
        $totalStudents = (clone $query)->distinct()->count('student.studentidpk');
        $totalInstitutions = (clone $query)->distinct()->count('organization.organizationIdPk');
        $pendingApplications = (clone $query)->whereIn('student_subsidytype.student_subsidy_status', ['UNDER REVIEW', 'PENDING APPROVAL'])->count();

        // 4. Demographic Chart: Gender Distribution (Strict mode safe)
        $genderDistribution = $genderQuery->selectRaw("COALESCE(persons.gender, 'Unspecified') as gender, count(DISTINCT student.studentidpk) as count")
            ->groupBy('persons.gender')
            ->get();

        // 5. Academic Chart: Top 5 Institutions by Student Count
        $topInstitutions = $institutionQuery->selectRaw("COALESCE(organization.organizationName, 'Unknown Institution') as institution, count(DISTINCT student.studentidpk) as count")
            ->groupBy('organization.organizationName')
            ->orderBy('count', 'desc')
            ->limit(5)
            ->get();

        // 6. Live Activity Feed (Latest 8 system actions)
        $recentActivity = DB::table('system_auditlog')
            ->leftJoin('userprofile', 'system_auditlog.sysuserid', '=', 'userprofile.userIdPk')
            ->select('system_auditlog.operationType', 'system_auditlog.details', 'system_auditlog.changeTimestamp', 'userprofile.username')
            ->orderBy('system_auditlog.changeTimestamp', 'desc')
            ->limit(8)
            ->get();

        return response()->json([
            'kpi' => [
                'totalApprovedFunds' => 'K ' . number_format((float)$totalApprovedFunds, 2),
                'totalStudents' => $totalStudents,
                'totalInstitutions' => $totalInstitutions,
                'pendingApplications' => $pendingApplications
            ],
            'charts' => [
                'gender' => [
                    'labels' => $genderDistribution->pluck('gender'),
                    'data' => $genderDistribution->pluck('count')
                ],
                'institutions' => [
                    'labels' => $topInstitutions->pluck('institution'),
                    'data' => $topInstitutions->pluck('count')
                ]
            ],
            'activity' => $recentActivity
        ]);
    }
}