import React, { useState, useEffect } from 'react';
import { MDBBtn, MDBIcon } from 'mdb-react-ui-kit';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../Layouts/DashboardLayout.jsx';

export default function SubsidyListModule() {
    const navigate = useNavigate();
    const [subsidies, setSubsidies] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Server-side Pagination & Sorting States
    const [pagination, setPagination] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState('student.studentidpk');
    const [sortDirection, setSortDirection] = useState('desc');

    useEffect(() => {
        fetchSubsidies();
    }, [currentPage, perPage, sortColumn, sortDirection]);

    const fetchSubsidies = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `/api/subsidies?page=${currentPage}&per_page=${perPage}&search=${searchTerm}&sort=${sortColumn}&direction=${sortDirection}`
            );
            
            const fetchedData = response.data?.data || response.data;
            setSubsidies(Array.isArray(fetchedData) ? fetchedData : []);
            
            setPagination({
                current_page: response.data?.current_page || 1,
                last_page: response.data?.last_page || 1,
                total: response.data?.total || 0,
                from: response.data?.from || 0,
                to: response.data?.to || 0,
            });
        } catch (error) {
            console.error("Error fetching subsidies", error);
            setSubsidies([]); 
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setCurrentPage(1);
            fetchSubsidies();
        }
    };

    const handleSort = (column) => {
        if (sortColumn === column) { 
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); 
        } else { 
            setSortColumn(column); 
            setSortDirection('asc'); 
        }
    };

    const SortableHeader = ({ label, column, align = "center" }) => {
        const isCurrentSort = sortColumn === column;
        const icon = isCurrentSort ? (sortDirection === 'asc' ? 'sort-up' : 'sort-down') : 'sort';
        return (
            <th className={`fw-bold py-2 text-${align}`} style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.75rem' }} onClick={() => handleSort(column)}>
                {label} <MDBIcon fas icon={icon} className={`ms-1 ${isCurrentSort ? 'text-warning' : 'opacity-50'}`} />
            </th>
        );
    };

    // --- UNIVERSAL STATUS COLOR MAPPING ---
    const getStatusTheme = (status) => {
        switch(status) {
            case 'UNDER REVIEW': return { bgHex: '#0d6efd', textClass: 'text-white' }; // Blue
            case 'PENDING APPROVAL': return { bgHex: '#fd7e14', textClass: 'text-dark' }; // Orange
            case 'APPROVED': return { bgHex: '#198754', textClass: 'text-white' }; // Green
            case 'DECLINE': 
            case 'DECLINED': return { bgHex: '#dc3545', textClass: 'text-white' }; // Red
            default: return { bgHex: '#6c757d', textClass: 'text-white' }; // Gray
        }
    };

    const getStudentStatusBadgeStyle = (status) => {
        if (status === 'Enable' || status === 'Allocated') {
            return { backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
        }
        return { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };
    };

    const formatCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        return `K${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const renderPageNumbers = () => {
        const lastPage = pagination.last_page || 1;
        const current = currentPage;
        const range = [];
        const rangeWithDots = [];
        let l;

        range.push(1);
        for (let i = current - 1; i <= current + 1; i++) {
            if (i > 1 && i < lastPage) range.push(i);
        }
        if (lastPage > 1) range.push(lastPage);

        for (let i of range) {
            if (l) {
                if (i - l === 2) rangeWithDots.push(l + 1); 
                else if (i - l !== 1) rangeWithDots.push('...');
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots.map((page, index) => {
            if (page === '...') return <span key={`ellipsis-${index}`} className="px-2 text-muted fw-bold" style={{ userSelect: 'none' }}>...</span>;
            return <MDBBtn key={page} size="sm" color={current === page ? 'primary' : 'light'} className="shadow-0 px-3 py-1 mx-1" style={{ backgroundColor: current === page ? '#8b0000' : '' }} onClick={() => setCurrentPage(page)}>{page}</MDBBtn>;
        });
    };

    return (
        <DashboardLayout 
            pageTitle="Subsidy Management" 
            breadcrumbs={[{ label: "Home", url: "/" }, "Subsidy Management"]}
        >
            <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
                    
                    {/* Top Controls */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="d-flex align-items-center">
                            <select 
                                className="form-select form-select-sm me-2" 
                                style={{ width: '70px', cursor: 'pointer' }}
                                value={perPage} 
                                onChange={(e) => {
                                    setPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                            <span className="text-muted small">entries per page</span>
                        </div>
                        <div className="d-flex align-items-center">
                            <span className="me-2 text-muted small">Search:</span>
                            <input 
                                type="text" 
                                className="form-control form-control-sm" 
                                style={{ width: '200px' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearch}
                                placeholder="Press Enter..."
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="table-responsive">
                        <table className="table table-sm table-hover align-middle" style={{ borderBottom: '1px solid #dee2e6' }}>
                            <thead style={{ backgroundColor: '#8b0000', color: 'white', borderBottom: '3px solid #ffc107' }}>
                                <tr>
                                    <SortableHeader label="Student Status" column="student.studentIsActive" />
                                    <SortableHeader label="Reg Year" column="student.year_register" />
                                    <SortableHeader label="Fullname" column="fullname" align="start" />
                                    <SortableHeader label="Gender" column="persons.gender" align="start" />
                                    <SortableHeader label="Student ID" column="student.studentnumber" align="start" />
                                    <SortableHeader label="Institution" column="organization.organizationName" align="start" />
                                    <SortableHeader label="Course Name" column="course.coursename" align="start" />
                                    <SortableHeader label="Subsidy Allocated" column="student_subsidytype.student_subsidy_status" />
                                    <SortableHeader label="Total Amount" column="student_subsidytype.financial_value_subsidize" align="end" />
                                    <th className="fw-bold py-2 text-center" style={{ fontSize: '0.75rem' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody style={{ fontSize: '0.8rem' }}>
                                {loading ? (
                                    <tr><td colSpan="10" className="text-center py-4">Loading data...</td></tr>
                                ) : subsidies?.length > 0 ? subsidies.map((item, index) => (
                                    <tr key={index}>
                                        <td className="text-center">
                                            <span className="badge rounded-pill px-2 py-1 fw-bold" style={getStudentStatusBadgeStyle(item.studentStatus)}>
                                                {item.studentStatus}
                                            </span>
                                        </td>
                                        <td className="text-center fw-bold">{item.regYear}</td>
                                        <td>{item.fullname}</td>
                                        <td>{item.gender}</td>
                                        <td>{item.studentId}</td>
                                        <td>{item.institution}</td>
                                        <td className="text-muted">{item.courseName}</td>
                                        <td className="text-center">
                                            {item.allocations?.length > 0 ? (
                                                <div className="d-flex flex-wrap gap-1 justify-content-center">
                                                    {item.allocations.map((alloc, idx) => {
                                                        const theme = getStatusTheme(alloc.student_subsidy_status);
                                                        return (
                                                            <span 
                                                                key={idx} 
                                                                className={`badge ${theme.textClass} rounded-pill shadow-sm`} 
                                                                style={{ backgroundColor: theme.bgHex, fontSize: '0.7rem', padding: '0.25em 0.5em', letterSpacing: '0.2px' }}
                                                            >
                                                                {alloc.studying_year}: {alloc.student_subsidy_status} {alloc.subsidy_year}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="badge bg-light text-muted border rounded-pill" style={{ fontSize: '0.7rem', padding: '0.25em 0.5em' }}>
                                                    Not Allocated
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-end fw-bold">{formatCurrency(item.totalAmount)}</td>
                                        <td className="text-center">
                                            <MDBBtn 
                                                size="sm" 
                                                className="shadow-sm px-2 py-1 hover-lift" 
                                                style={{ backgroundColor: item.studentStatus === 'Enable' ? '#28a745' : '#dc3545', fontSize: '0.7rem' }}
                                                onClick={() => navigate(`/subsidies/manage/${item.id}`)}
                                            >
                                                <MDBIcon fas icon="briefcase" />
                                            </MDBBtn>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="10" className="text-center py-4 text-muted">No records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom Controls */}
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                        <span className="text-muted small">
                            Showing {pagination.from || 0} to {pagination.to || 0} of {pagination.total || 0} entries
                        </span>
                        <div className="d-flex align-items-center">
                            <MDBBtn size="sm" color="light" className="shadow-0 px-2 py-1 me-1" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>&laquo;</MDBBtn>
                            <MDBBtn size="sm" color="light" className="shadow-0 px-2 py-1 me-1" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>&lsaquo;</MDBBtn>
                            {renderPageNumbers()}
                            <MDBBtn size="sm" color="light" className="shadow-0 px-2 py-1 ms-1" disabled={currentPage === pagination.last_page || !pagination.last_page} onClick={() => setCurrentPage(currentPage + 1)}>&rsaquo;</MDBBtn>
                            <MDBBtn size="sm" color="light" className="shadow-0 px-2 py-1 ms-1" disabled={currentPage === pagination.last_page || !pagination.last_page} onClick={() => setCurrentPage(pagination.last_page)}>&raquo;</MDBBtn>
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}