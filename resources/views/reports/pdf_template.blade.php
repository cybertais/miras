<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>DDA System Report</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            font-size: 11px; /* Slightly smaller to fit 10 columns */
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #8b0000;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .header h2 {
            margin: 0;
            color: #8b0000;
            text-transform: uppercase;
        }
        .meta-data {
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 4px;
        }
        .meta-data span {
            display: inline-block;
            margin-right: 15px;
            font-weight: bold;
            color: #555;
            font-size: 11px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th {
            background-color: #8b0000;
            color: #ffffff;
            text-align: left;
            padding: 8px 6px;
            font-size: 10px;
            text-transform: uppercase;
        }
        td {
            padding: 8px 6px;
            border-bottom: 1px solid #eee;
            font-size: 10px;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .badge {
            padding: 3px 6px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: bold;
        }
        .status-approved { color: #198754; }
        .status-pending { color: #d39e00; }
        .status-declined { color: #dc3545; }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
    </style>
</head>
<body>

    <div class="header">
        <h2>Middle Ramu DDA Subsidy Report</h2>
        <p style="margin: 5px 0 0 0; color: #666;">Generated on: {{ $date }}</p>
    </div>

    <div class="meta-data">
        <span>Report Audience: {{ strtoupper($filters['reportType'] ?? 'Executive Summary') }}</span>
        <span>Academic Year: {{ $filters['academicYear'] ?? 'ALL' }}</span>
        @if(!empty($filters['llg'])) <span>LLG Filter: Active</span> @endif
        @if(!empty($filters['status'])) <span>Status: {{ $filters['status'] }}</span> @endif
    </div>

    <table>
        <thead>
            <tr>
                <th>STUDENT ID</th>
                <th>STUDENT NAME</th>
                <th>LLG / PROVINCE</th>
                <th>WARD</th>
                <th>INSTITUTION</th>
                <th>SUBSIDY TYPE</th>
                <th>STUDY YEAR</th>
                <th class="text-right">SUBSIDIZED AMT</th>
                <th class="text-right">ACADEMIC COST</th>
                <th class="text-center">STATUS</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data as $row)
            <tr>
                <td style="color: #666;">{{ $row->studentnumber ?? '-' }}</td>
                <td style="font-weight: bold;">{{ $row->fullname }}</td>
                <td>{{ $row->llg ?? '-' }}</td>
                <td>{{ $row->ward ?? '-' }}</td>
                <td>{{ $row->institution ?? '-' }}</td>
                <td>{{ $row->subsidy_type ?? '-' }}</td>
                <td>{{ $row->study_year ?? '-' }}</td>
                <td class="text-right" style="font-weight: bold; color: #198754;">K {{ number_format((float)$row->subsidy, 2) }}</td>
                <td class="text-right">K {{ number_format((float)$row->cost, 2) }}</td>
                <td class="text-center">
                    <span class="badge 
                        @if($row->status == 'APPROVED') status-approved 
                        @elseif($row->status == 'DECLINE') status-declined 
                        @else status-pending @endif">
                        {{ $row->status }}
                    </span>
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="10" class="text-center">No data matches current filters.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Confidential Data &bull; DDA School Fee Subsidiary Management System
    </div>

</body>
</html>