import React, { useState, useEffect } from 'react';
import { MDBIcon } from 'mdb-react-ui-kit';
import DashboardLayout from '../../Layouts/DashboardLayout';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function DashboardModule() {
    const [loading, setLoading] = useState(true);
    
    // Filters State
    const [filters, setFilters] = useState({ academicYear: '', llg: '', ward: '', status: '' });

    // Dynamic Data States
    const [kpiData, setKpiData] = useState({ totalApprovedFunds: 'K 0.00', totalStudents: 0, totalInstitutions: 0, pendingApplications: 0 });
    const [activityFeed, setActivityFeed] = useState([]);
    const [wards, setWards] = useState([]);
    
    // Chart States
    const [genderChartData, setGenderChartData] = useState({ labels: [], datasets: [] });
    const [institutionChartData, setInstitutionChartData] = useState({ labels: [], datasets: [] });

    // Dropdown hardcoded base options
    const years = ['2026', '2025', '2024', '2012'];
    const llgs = [{ id: 1, name: 'Arabaka Rural' }, { id: 2, name: 'Josephstaal Rural' }, { id: 3, name: 'Simbai Rural' }, { id: 4, name: 'Kovon Rural' }];
    const statuses = ['UNDER REVIEW', 'PENDING APPROVAL', 'APPROVED', 'DECLINE'];

    // Fetch Wards when LLG changes
    useEffect(() => {
        if (filters.llg) {
            axios.get(`/api/reports/wards?llg_id=${filters.llg}`)
                .then(res => setWards(res.data))
                .catch(err => console.error("Error fetching wards:", err));
        } else {
            setWards([]);
            setFilters(prev => ({ ...prev, ward: '' }));
        }
    }, [filters.llg]);

    // Fetch main dashboard data when filters change
    useEffect(() => {
        fetchDashboardData();
    }, [filters]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/dashboard/summary', { params: filters });
            const data = res.data;

            setKpiData(data.kpi);
            setActivityFeed(data.activity);

            setGenderChartData({
                labels: data.charts.gender.labels,
                datasets: [{
                    data: data.charts.gender.data,
                    backgroundColor: ['#0d6efd', '#e4a11b', '#9fa6b2'], // Blue for Male, Yellow for Female, Grey for Unspecified
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            });

            setInstitutionChartData({
                labels: data.charts.institutions.labels,
                datasets: [{
                    label: 'Enrolled Students',
                    data: data.charts.institutions.data,
                    backgroundColor: '#198754', // Success Green
                    borderRadius: 4,
                }]
            });
            
        } catch (error) {
            console.error("Failed to fetch dashboard summary:", error);
        }
        setLoading(false);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } };
    const barOptions = { ...pieOptions, indexAxis: 'y', scales: { x: { beginAtZero: true, grid: { display: false } }, y: { grid: { display: false } } } };

    // Format Timestamp helper
    const timeAgo = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // --- UNIVERSAL STATUS COLOR MAPPING ---
    const getStatusTheme = (op, details = '') => {
        const textStr = (op + ' ' + details).toUpperCase();

        // 1. Under Review (Background: Blue, Font: White)
        if (textStr.includes('UNDER REVIEW')) return { bg: '#0d6efd', text: 'text-white', label: 'REVIEW' };
        
        // 2. Pending Approval (Background: Orange, Font: Black)
        if (textStr.includes('PENDING APPROVAL')) return { bg: '#fd7e14', text: 'text-dark', label: 'PENDING' };
        
        // 3. Approved (Background: Green, Font: White)
        if (textStr.includes('APPROVED')) return { bg: '#198754', text: 'text-white', label: 'APPROVED' };
        
        // 4. Decline (Background: Red, Font: White)
        if (textStr.includes('DECLINE')) return { bg: '#dc3545', text: 'text-white', label: 'DECLINED' };
        
        // System Operation Fallbacks
        if (op === 'INSERT') return { bg: '#198754', text: 'text-white', label: 'CREATED' };
        if (op === 'DELETE') return { bg: '#dc3545', text: 'text-white', label: 'DELETED' };
        if (op === 'UPDATE') return { bg: '#0dcaf0', text: 'text-dark', label: 'UPDATED' };
        if (op === 'EXPORT') return { bg: '#6f42c1', text: 'text-white', label: 'EXPORT' };
        if (op.includes('LOGIN') || op.includes('LOGOUT')) return { bg: '#6c757d', text: 'text-white', label: 'AUTH' };
        
        return { bg: '#6c757d', text: 'text-white', label: op || 'SYSTEM' };
    };

    return (
        <DashboardLayout pageTitle="Main Dashboard" breadcrumbs={[{ label: 'Home', url: '/' }, 'Dashboard']}>
            <div className="fade-in pb-4">
                
                {/* 1. FILTER CONTROLS */}
                <div className="card shadow-sm border-0 rounded-3 mb-3">
                    <div className="card-body p-2 px-3 d-flex flex-column flex-lg-row align-items-lg-center gap-3">
                        <div className="d-flex align-items-center">
                            <MDBIcon fas icon="filter" className="text-primary me-2 fs-5" />
                            <span className="fw-bold text-dark" style={{fontSize: '0.85rem'}}>Dashboard Filters</span>
                        </div>
                        
                        <div className="d-flex flex-wrap gap-2">
                            <select name="academicYear" className="form-select form-select-sm border-secondary shadow-none w-auto" value={filters.academicYear} onChange={handleFilterChange}>
                                <option value="">All Years</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            
                            <select name="llg" className="form-select form-select-sm border-secondary shadow-none w-auto" value={filters.llg} onChange={handleFilterChange}>
                                <option value="">All LLGs</option>
                                {llgs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>

                            <select 
                                name="ward" 
                                className="form-select form-select-sm border-secondary shadow-none w-auto" 
                                value={filters.ward} 
                                onChange={handleFilterChange}
                                disabled={!filters.llg}
                            >
                                <option value="">All Wards</option>
                                {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>

                            <select name="status" className="form-select form-select-sm border-secondary shadow-none w-auto" value={filters.status} onChange={handleFilterChange}>
                                <option value="">Payment Status Filter</option>
                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-5"><MDBIcon fas icon="spinner" spin size="3x" className="text-primary"/></div>
                ) : (
                    <>
                        {/* 2. 360 KPI CARDS */}
                        <div className="row g-3 mb-3">
                            <div className="col-6 col-lg-3">
                                {/* APPROVED (Green) */}
                                <div className="card border-0 rounded-3 shadow-sm text-white h-100 hover-lift" style={{ backgroundColor: '#198754' }}>
                                    <div className="card-body p-3 d-flex align-items-center">
                                        <MDBIcon fas icon="check-circle" size="2x" className="opacity-50 me-3" />
                                        <div>
                                            <h4 className="fw-bold mb-0">{kpiData.totalApprovedFunds}</h4>
                                            <span className="small text-uppercase" style={{letterSpacing:'0.5px'}}>Approved Funds</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-lg-3">
                                {/* DEFAULT BLUE */}
                                <div className="card border-0 rounded-3 shadow-sm text-white h-100 hover-lift" style={{ backgroundColor: '#0d6efd' }}>
                                    <div className="card-body p-3 d-flex align-items-center">
                                        <MDBIcon fas icon="users" size="2x" className="opacity-50 me-3" />
                                        <div>
                                            <h4 className="fw-bold mb-0">{kpiData.totalStudents}</h4>
                                            <span className="small text-uppercase" style={{letterSpacing:'0.5px'}}>Total Students</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-lg-3">
                                {/* DEFAULT CYAN */}
                                <div className="card border-0 rounded-3 shadow-sm text-white h-100 hover-lift" style={{ backgroundColor: '#0dcaf0' }}>
                                    <div className="card-body p-3 d-flex align-items-center">
                                        <MDBIcon fas icon="school" size="2x" className="opacity-50 me-3" />
                                        <div>
                                            <h4 className="fw-bold mb-0">{kpiData.totalInstitutions}</h4>
                                            <span className="small text-uppercase" style={{letterSpacing:'0.5px'}}>Active Institutions</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-lg-3">
                                {/* PENDING APPROVAL (Orange) */}
                                <div className="card border-0 rounded-3 shadow-sm text-dark h-100 hover-lift" style={{ backgroundColor: '#fd7e14' }}>
                                    <div className="card-body p-3 d-flex align-items-center">
                                        <MDBIcon fas icon="clock" size="2x" className="opacity-50 me-3" />
                                        <div>
                                            <h4 className="fw-bold mb-0">{kpiData.pendingApplications}</h4>
                                            <span className="small text-uppercase" style={{letterSpacing:'0.5px'}}>Pending Apps</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. CHARTS & RECENT ACTIVITY */}
                        <div className="row g-3">
                            
                            {/* Left Column: Charts */}
                            <div className="col-12 col-lg-7 d-flex flex-column gap-3">
                                {/* Top Institutions Bar Chart */}
                                <div className="card border-0 rounded-3 shadow-sm flex-grow-1">
                                    <div className="card-body p-3">
                                        <h6 className="fw-bold text-dark border-bottom pb-2 mb-3" style={{ fontSize: '0.85rem' }}>Top 5 Institutions by Enrollment</h6>
                                        <div style={{ height: '200px' }}>
                                            {institutionChartData.labels.length > 0 ? <Bar data={institutionChartData} options={barOptions} /> : <p className="text-muted text-center mt-5">No Data Available</p>}
                                        </div>
                                    </div>
                                </div>
                                {/* Gender Demographics Pie Chart */}
                                <div className="card border-0 rounded-3 shadow-sm flex-grow-1">
                                    <div className="card-body p-3">
                                        <h6 className="fw-bold text-dark border-bottom pb-2 mb-3" style={{ fontSize: '0.85rem' }}>Student Gender Demographics</h6>
                                        <div style={{ height: '200px' }}>
                                            {genderChartData.labels.length > 0 ? <Pie data={genderChartData} options={pieOptions} /> : <p className="text-muted text-center mt-5">No Data Available</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Live Activity Feed */}
                            <div className="col-12 col-lg-5">
                                <div className="card border-0 rounded-3 shadow-sm h-100">
                                    <div className="card-body p-3">
                                        <h6 className="fw-bold text-dark border-bottom pb-2 mb-3" style={{ fontSize: '0.85rem' }}>
                                            <MDBIcon fas icon="bolt" className="text-warning me-2" /> Recent System Activity
                                        </h6>
                                        <div className="activity-feed">
                                            {activityFeed.length > 0 ? activityFeed.map((activity, idx) => {
                                                const theme = getStatusTheme(activity.operationType, activity.details);
                                                return (
                                                    <div key={idx} className="d-flex mb-3 border-bottom pb-2 align-items-start">
                                                        <div className="me-3 mt-1">
                                                            {/* Dynamic Status Badge */}
                                                            <span className={`badge ${theme.text} shadow-sm`} style={{ backgroundColor: theme.bg, fontSize: '0.65rem', padding: '0.4em 0.6em', width: '65px', textAlign: 'center' }}>
                                                                {theme.label}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="mb-1 text-dark fw-medium" style={{fontSize: '0.8rem', lineHeight: '1.2'}}>{activity.details}</p>
                                                            <small className="text-muted d-block" style={{fontSize: '0.7rem'}}>
                                                                <MDBIcon far icon="clock" className="me-1" />
                                                                {timeAgo(activity.changeTimestamp)} &bull; {activity.username || 'System'}
                                                            </small>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <p className="text-muted text-center mt-4">No recent activity recorded.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}