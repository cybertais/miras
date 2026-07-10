import React, { useState, useEffect } from 'react';
import { MDBIcon, MDBBtn } from 'mdb-react-ui-kit';
import DashboardLayout from '../../Layouts/DashboardLayout';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function ReportsModule() {
    const [loading, setLoading] = useState(true);
    
    // Filters State
    const [filters, setFilters] = useState({ reportType: 'executive', academicYear: '', llg: '', ward: '', status: '' });

    // Dynamic Data States
    const [kpiData, setKpiData] = useState({ totalSubsidy: 'K 0.00', studentsAssisted: 0, institutions: 0, pendingReview: 0 });
    const [tableData, setTableData] = useState([]);
    
    // Dynamic Dropdown States
    const [wards, setWards] = useState([]);
    
    // Chart States
    const [statusChartData, setStatusChartData] = useState({ labels: [], datasets: [] });
    const [llgChartData, setLlgChartData] = useState({ labels: [], datasets: [] });

    // Dropdown options
    const years = ['2026', '2025', '2024', '2012'];
    const llgs = [{ id: 1, name: 'Arabaka Rural' }, { id: 2, name: 'Josephstaal Rural' }, { id: 3, name: 'Simbai Rural' }, { id: 4, name: 'Kovon Rural' }];
    const statuses = ['UNDER REVIEW', 'PENDING APPROVAL', 'APPROVED', 'DECLINE'];

    // Universal Status Color Mapping
    const getStatusTheme = (status) => {
        switch(status) {
            case 'UNDER REVIEW': return { bgHex: '#0d6efd', textClass: 'text-white' }; // Blue
            case 'PENDING APPROVAL': return { bgHex: '#fd7e14', textClass: 'text-dark' }; // Orange
            case 'APPROVED': return { bgHex: '#198754', textClass: 'text-white' }; // Green
            case 'DECLINE': return { bgHex: '#dc3545', textClass: 'text-white' }; // Red
            default: return { bgHex: '#6c757d', textClass: 'text-white' }; // Gray (Fallback)
        }
    };

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

    // Fetch dashboard data whenever any filter changes
    useEffect(() => {
        fetchDashboardData();
    }, [filters]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/reports/dashboard', { params: filters });
            const data = res.data;

            setKpiData(data.kpi);

            // Dynamically assign correct colors to the pie chart based on the label returned
            const chartBgColors = data.charts.status.labels.map(label => getStatusTheme(label).bgHex);

            setStatusChartData({
                labels: data.charts.status.labels,
                datasets: [{
                    data: data.charts.status.data,
                    backgroundColor: chartBgColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            });

            setLlgChartData({
                labels: data.charts.llg.labels,
                datasets: [{
                    label: 'Students Subsidized',
                    data: data.charts.llg.data,
                    backgroundColor: '#3b71ca',
                    borderRadius: 4,
                }]
            });

            setTableData(data.table);
            
        } catch (error) {
            console.error("Failed to fetch report data:", error);
        }
        setLoading(false);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleExport = async (format) => {
        // Optional: Set a loading state here if you have an isExporting variable
        // setIsExporting(true); 

        try {
            const params = new URLSearchParams(filters).toString();
            
            // 1. Make the request using Axios so the token is automatically attached
            const response = await axios.get(`/api/reports/export/${format}?${params}`, {
                responseType: 'blob' // CRITICAL: Tells Axios to expect a binary file, not JSON
            });

            // 2. Create a temporary URL for the binary data
            const blob = new Blob([response.data]);
            const downloadUrl = window.URL.createObjectURL(blob);

            // 3. Create a hidden <a> tag, click it to trigger the download, and remove it
            const link = document.createElement('a');
            link.href = downloadUrl;
            
            // Name the file dynamically based on format
            link.setAttribute('download', `MIRAS_Report_${new Date().getTime()}.${format}`);
            
            document.body.appendChild(link);
            link.click();
            
            // 4. Cleanup the DOM and memory
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export the report. Please try again.");
        } finally {
            // setIsExporting(false);
        }
    };

    const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } };
    const barOptions = { ...chartOptions, scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } } };

    return (
        <DashboardLayout pageTitle="Analytics & Reports" breadcrumbs={[{ label: 'Home', url: '/' }, 'Reports']}>
            <div className="fade-in pb-4">
                
                {/* FILTER CONTROLS */}
                <div className="card shadow-sm border-0 rounded-3 mb-3">
                    <div className="card-body p-2 px-3 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2">
                        <div className="d-flex align-items-center me-3">
                            <MDBIcon fas icon="filter" className="text-primary me-2 fs-5" />
                            <span className="fw-bold text-dark" style={{fontSize: '0.85rem'}}>Parameters</span>
                        </div>
                        
                        <div className="d-flex flex-wrap gap-2 flex-grow-1">
                            <select name="reportType" className="form-select form-select-sm border-secondary shadow-none fw-bold text-primary w-auto" value={filters.reportType} onChange={handleFilterChange}>
                                <option value="executive">Executive Summary</option>
                                <option value="financial">Finance & Accounts</option>
                                <option value="ward">Ward Distribution</option>
                            </select>
                            
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
                                <option value="">All Wards Filter</option>
                                {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>

                            <select name="status" className="form-select form-select-sm border-secondary shadow-none w-auto" value={filters.status} onChange={handleFilterChange}>
                                <option value="">Payment Status Filter</option>
                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* EXPORT BUTTONS */}
                        <div className="d-flex gap-2 border-start ps-lg-3 mt-2 mt-lg-0">
                            <MDBBtn color="success" size="sm" className="shadow-sm fw-bold px-3 hover-lift d-flex align-items-center" onClick={() => handleExport('excel')}>
                                <MDBIcon fas icon="file-excel" className="me-2 fs-6" /> EXCEL
                            </MDBBtn>
                            <MDBBtn color="danger" size="sm" className="shadow-sm fw-bold px-3 hover-lift d-flex align-items-center" onClick={() => handleExport('pdf')}>
                                <MDBIcon fas icon="file-pdf" className="me-2 fs-6" /> PDF
                            </MDBBtn>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-5"><MDBIcon fas icon="spinner" spin size="3x" className="text-primary"/></div>
                ) : (
                    <>
                        {/* KPI SUMMARY CARDS */}
                        <div className="row g-3 mb-3">
                            <div className="col-6 col-lg-3">
                                <div className="card border-0 rounded-3 shadow-sm bg-primary text-white h-100 hover-lift">
                                    <div className="card-body p-3 d-flex align-items-center">
                                        <MDBIcon fas icon="hand-holding-usd" size="2x" className="opacity-50 me-3" />
                                        <div>
                                            <h4 className="fw-bold mb-0">{kpiData.totalSubsidy}</h4>
                                            <span className="small text-uppercase" style={{letterSpacing:'0.5px'}}>Total Allocated</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-lg-3">
                                <div className="card border-0 rounded-3 shadow-sm bg-success text-white h-100 hover-lift">
                                    <div className="card-body p-3 d-flex align-items-center">
                                        <MDBIcon fas icon="user-graduate" size="2x" className="opacity-50 me-3" />
                                        <div>
                                            <h4 className="fw-bold mb-0">{kpiData.studentsAssisted}</h4>
                                            <span className="small text-uppercase" style={{letterSpacing:'0.5px'}}>Students Assisted</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-lg-3">
                                <div className="card border-0 rounded-3 shadow-sm bg-info text-white h-100 hover-lift">
                                    <div className="card-body p-3 d-flex align-items-center">
                                        <MDBIcon fas icon="university" size="2x" className="opacity-50 me-3" />
                                        <div>
                                            <h4 className="fw-bold mb-0">{kpiData.institutions}</h4>
                                            <span className="small text-uppercase" style={{letterSpacing:'0.5px'}}>Institutions</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-lg-3">
                                <div className="card border-0 rounded-3 shadow-sm bg-warning text-dark h-100 hover-lift">
                                    <div className="card-body p-3 d-flex align-items-center">
                                        <MDBIcon fas icon="hourglass-half" size="2x" className="opacity-50 me-3" />
                                        <div>
                                            <h4 className="fw-bold mb-0">{kpiData.pendingReview}</h4>
                                            <span className="small text-uppercase" style={{letterSpacing:'0.5px'}}>Pending Review</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* DYNAMIC VISUALIZATIONS */}
                        <div className="row g-3 mb-3">
                            <div className="col-12 col-lg-4">
                                <div className="card border-0 rounded-3 shadow-sm h-100">
                                    <div className="card-body p-3">
                                        <h6 className="fw-bold text-dark border-bottom pb-2 mb-3" style={{ fontSize: '0.85rem' }}>Subsidy Status Distribution</h6>
                                        <div style={{ height: '220px' }}>
                                            {statusChartData.labels.length > 0 ? <Doughnut data={statusChartData} options={chartOptions} /> : <p className="text-muted text-center mt-5">No Data</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 col-lg-8">
                                <div className="card border-0 rounded-3 shadow-sm h-100">
                                    <div className="card-body p-3">
                                        <h6 className="fw-bold text-dark border-bottom pb-2 mb-3" style={{ fontSize: '0.85rem' }}>Geographical Distribution (Students per Location)</h6>
                                        <div style={{ height: '220px' }}>
                                            {llgChartData.labels.length > 0 ? <Bar data={llgChartData} options={barOptions} /> : <p className="text-muted text-center mt-5">No Data</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* DETAILED DATA GRID */}
                        <div className="bg-white rounded-3 shadow-sm border p-3">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '0.85rem' }}>Data Preview Ledger</h6>
                                <span className="badge bg-light text-secondary border px-2 py-1"><MDBIcon fas icon="info-circle" className="me-1"/>Top 50 Records shown</span>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-sm table-hover align-middle mb-0 border-top text-nowrap">
                                    <thead className="bg-light" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                                        <tr>
                                            <th className="fw-bold border-0 text-primary py-2">ID #</th>
                                            <th className="fw-bold border-0 text-primary py-2">STUDENT NAME</th>
                                            <th className="fw-bold border-0 text-primary py-2">LLG / PROVINCE</th>
                                            <th className="fw-bold border-0 text-primary py-2">WARD</th>
                                            <th className="fw-bold border-0 text-primary py-2">INSTITUTION</th>
                                            <th className="fw-bold border-0 text-primary py-2">SUBSIDY TYPE</th>
                                            <th className="fw-bold border-0 text-primary py-2 text-center">YR</th>
                                            <th className="fw-bold border-0 text-primary py-2 text-end">SUBSIDIZED AMT</th>
                                            <th className="fw-bold border-0 text-primary py-2 text-end">ACADEMIC COST</th>
                                            <th className="fw-bold border-0 text-primary py-2 text-center">STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ fontSize: '0.75rem' }}>
                                        {tableData.length > 0 ? tableData.map((row, idx) => {
                                            const theme = getStatusTheme(row.status);
                                            return (
                                                <tr key={idx} className="border-bottom hover-lift">
                                                    <td className="text-muted fw-bold py-1">{row.studentnumber || '-'}</td>
                                                    <td className="fw-bold text-dark py-1">{row.fullname}</td>
                                                    <td className="text-muted py-1">{row.llg || '-'}</td>
                                                    <td className="text-muted py-1">{row.ward || '-'}</td>
                                                    <td className="text-muted py-1">{row.institution || '-'}</td>
                                                    <td className="text-muted py-1">{row.subsidy_type || '-'}</td>
                                                    <td className="text-center text-muted py-1">{row.study_year || '-'}</td>
                                                    <td className="text-end fw-bold text-success py-1">K {row.subsidy ? parseFloat(row.subsidy).toFixed(2) : '0.00'}</td>
                                                    <td className="text-end fw-medium py-1">K {row.cost ? parseFloat(row.cost).toFixed(2) : '0.00'}</td>
                                                    <td className="text-center py-1">
                                                        <span 
                                                            className={`badge rounded-pill ${theme.textClass} shadow-sm border`} 
                                                            style={{ backgroundColor: theme.bgHex, fontSize: '0.65rem', padding: '0.4em 0.6em', letterSpacing: '0.3px' }}
                                                        >
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan="10" className="text-center py-4 text-muted" style={{ fontSize: '0.8rem' }}>No data matches current filters.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}