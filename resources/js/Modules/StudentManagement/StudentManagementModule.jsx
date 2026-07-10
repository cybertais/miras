import React, { useState, useEffect } from 'react';
import { MDBBtn, MDBIcon } from 'mdb-react-ui-kit';
import axios from 'axios';
import DashboardLayout from '../../Layouts/DashboardLayout.jsx';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function StudentManagementModule() {
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination, Filter, & Sorting States
    const [pagination, setPagination] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState('persons.personIdPk');
    const [sortDirection, setSortDirection] = useState('desc');

    // Modal States
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '', isDeleting: false });
    const [viewModal, setViewModal] = useState({ show: false, data: null });

    // Fetch data
    useEffect(() => {
        fetchStudents();
    }, [currentPage, perPage, sortColumn, sortDirection]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `/api/students?page=${currentPage}&per_page=${perPage}&search=${searchTerm}&sort=${sortColumn}&direction=${sortDirection}`
            );
            setStudents(response.data.data);
            setPagination({
                current_page: response.data.current_page,
                last_page: response.data.last_page,
                total: response.data.total,
                from: response.data.from,
                to: response.data.to,
            });
        } catch (error) {
            console.error("Error fetching students", error);
        }
        setLoading(false);
    };

    const handleSearch = (e) => { if (e.key === 'Enter') { setCurrentPage(1); fetchStudents(); } };
    const handlePerPageChange = (e) => { setPerPage(e.target.value); setCurrentPage(1); };
    const handleSort = (column) => {
        if (sortColumn === column) { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }
        else { setSortColumn(column); setSortDirection('asc'); }
    };

    // --- DELETE LOGIC ---
    const initiateDelete = (id, name) => setDeleteModal({ show: true, id, name, isDeleting: false });
    const confirmDelete = async () => {
        setDeleteModal(prev => ({ ...prev, isDeleting: true }));
        try {
            const response = await axios.delete(`/api/students/${deleteModal.id}`);
            if (response.data.success) {
                setDeleteModal({ show: false, id: null, name: '', isDeleting: false });
                fetchStudents();
            }
        } catch (error) {
            console.error("Error deleting student", error);
            alert("Failed to delete the applicant.");
            setDeleteModal(prev => ({ ...prev, isDeleting: false }));
        }
    };

    // --- VIEW & PDF LOGIC ---
    const initiateView = (studentData) => {
        setViewModal({ show: true, data: studentData });
    };

    const generatePDF = () => {
        const input = document.getElementById('infographic-record');

        // Hide the close button during PDF generation to keep the PDF clean
        const btnRow = document.getElementById('pdf-actions');
        btnRow.style.display = 'none';

        html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${viewModal.data.fullnameStudent.replace(/\s+/g, '_')}_Record.pdf`);

            // Restore buttons
            btnRow.style.display = 'flex';
        });
    };

    const SortableHeader = ({ label, column }) => {
        const isCurrentSort = sortColumn === column;
        const icon = isCurrentSort ? (sortDirection === 'asc' ? 'sort-up' : 'sort-down') : 'sort';
        return (
            <th className="fw-bold py-2" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(column)}>
                <MDBIcon fas icon={icon} className="me-1" /> {label}
            </th>
        );
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
            return <MDBBtn key={page} size="sm" color={current === page ? 'primary' : 'light'} className="shadow-0 px-3 py-1 mx-1" onClick={() => setCurrentPage(page)}>{page}</MDBBtn>;
        });
    };

    // Helper component for View Modal fields
    const InfoField = ({ label, value, col = "col-md-4" }) => (
        <div className={`${col} mb-2`}>
            <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>{value || '-'}</div>
        </div>
    );

    return (
        <DashboardLayout pageTitle="MIRAS Students Management" breadcrumbs={[{ label: "Home", url: "/#" }, "Students Management"]}>

            {/* --- DELETE MODAL --- */}
            {deleteModal.show && (
                <>
                    <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                <div style={{ backgroundColor: '#dc3545', height: '6px' }}></div>
                                <div className="modal-body p-4 p-md-5 text-center">
                                    <div className="mb-4 d-flex justify-content-center">
                                        <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: '80px', height: '80px', backgroundColor: '#ffeaea' }}>
                                            <MDBIcon fas icon="trash-alt" className="text-danger" style={{ fontSize: '2.5rem' }} />
                                        </div>
                                    </div>
                                    <h4 className="fw-bold text-dark mb-3">Delete Applicant?</h4>
                                    <p className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                                        Are you sure you want to delete <strong>{deleteModal.name}</strong>? <br />
                                        This will perform a soft-delete and the action will be securely recorded in the <strong>Audit Trail</strong>.
                                    </p>
                                    <div className="d-flex justify-content-center gap-3 mt-4">
                                        <MDBBtn color="light" className="shadow-0 fw-bold px-4 py-2 border" onClick={() => setDeleteModal({ show: false, id: null, name: '', isDeleting: false })} disabled={deleteModal.isDeleting}>CANCEL</MDBBtn>
                                        <MDBBtn color="danger" className="shadow-0 fw-bold px-4 py-2" onClick={confirmDelete} disabled={deleteModal.isDeleting}>
                                            {deleteModal.isDeleting ? <><MDBIcon fas icon="spinner" spin className="me-2" /> DELETING...</> : <><MDBIcon fas icon="check" className="me-2" /> YES, DELETE</>}
                                        </MDBBtn>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* --- COMPREHENSIVE INFOGRAPHIC VIEW MODAL --- */}
            {viewModal.show && viewModal.data && (
                <>
                    <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                        <div className="modal-dialog modal-xl modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ animation: 'fadeIn 0.3s ease-out' }}>

                                {/* Target ID for PDF Generator */}
                                <div id="infographic-record" className="bg-white">

                                    {/* Modal Header & Actions */}
                                    <div id="pdf-actions" className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
                                        <span className="fw-bold text-muted text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>
                                            <MDBIcon fas icon="id-card" className="me-2 text-primary" />
                                            MIRAS Applicant Record
                                        </span>
                                        <div>
                                            <MDBBtn size="sm" color="danger" className="shadow-0 me-2 px-3" onClick={generatePDF}>
                                                <MDBIcon fas icon="file-pdf" className="me-2" /> DOWNLOAD PDF
                                            </MDBBtn>
                                            <MDBBtn size="sm" color="light" className="shadow-0 border px-3" onClick={() => setViewModal({ show: false, data: null })}>
                                                <MDBIcon fas icon="times" />
                                            </MDBBtn>
                                        </div>
                                    </div>

                                    {/* --- 4 EXPLICIT CATEGORIES --- */}
                                    <div className="row g-0">

                                        {/* Category 4: Photo & Summary (Left Sidebar) */}
                                        <div className="col-md-3 p-4 text-center" style={{ backgroundColor: '#f8f9fa', borderRight: '1px solid #eee' }}>
                                            <div className="mb-2 text-start">
                                                <span className="badge bg-secondary text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Face Photo</span>
                                            </div>
                                            <div className="mb-3 mt-3">
                                                {viewModal.data.personimage ? (
                                                    <img src={`/storage/student_images/${viewModal.data.personimage}`} alt="Profile" className="rounded shadow-sm" style={{ width: '150px', height: '150px', objectFit: 'cover', border: '4px solid white' }} />
                                                ) : (
                                                    <div className="rounded shadow-sm d-flex align-items-center justify-content-center mx-auto" style={{ width: '150px', height: '150px', backgroundColor: '#e9ecef', color: '#adb5bd', border: '4px solid white' }}>
                                                        <MDBIcon fas icon="user" size="4x" />
                                                    </div>
                                                )}
                                            </div>
                                            <h5 className="fw-bold mb-1" style={{ color: '#800000' }}>{viewModal.data.fullnameStudent}</h5>
                                            <p className="text-muted small mb-3">Applicant ID: #{viewModal.data.personIdPk}</p>
                                            <span className="badge rounded-pill badge-success px-3 py-2 w-100" style={{ backgroundColor: '#14a44d' }}>
                                                <MDBIcon fas icon="check-circle" className="me-1" /> Active Record
                                            </span>
                                        </div>

                                        {/* Categories 1, 2, & 3 (Right Content Area) */}
                                        <div className="col-md-9 p-4">

                                            {/* Category 1: Personal Information */}
                                            <div className="mb-4">
                                                <h6 className="fw-bold text-primary border-bottom pb-2 mb-3 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>
                                                    <MDBIcon fas icon="user-circle" className="me-2" /> Personal Information
                                                </h6>
                                                <div className="row">
                                                    <InfoField label="Given Name" value={viewModal.data.givenName} />
                                                    <InfoField label="Middle Name" value={viewModal.data.middleName} />
                                                    <InfoField label="Surname" value={viewModal.data.surName} />

                                                    <InfoField label="Gender" value={viewModal.data.gender} />
                                                    <InfoField label="Date of Birth" value={viewModal.data.dob} />
                                                    <InfoField label="Last School Attended" value={viewModal.data.lastschoolattended} />

                                                    <InfoField label="Primary Phone" value={viewModal.data.phone1} />
                                                    <InfoField label="Alternate Phone" value={viewModal.data.phone2} />
                                                    <InfoField label="Email Address" value={viewModal.data.email} />
                                                </div>
                                            </div>

                                            {/* Category 2: Location & Address */}
                                            <div className="mb-4">
                                                <h6 className="fw-bold text-warning border-bottom pb-2 mb-3 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>
                                                    <MDBIcon fas icon="map-marker-alt" className="me-2" /> Location & Address Details
                                                </h6>
                                                <div className="row">
                                                    <InfoField label="Origin Province" value={viewModal.data.provinceName || 'Middle Ramu (Default)'} />
                                                    <InfoField label="LLG (Local Level Gov)" value={viewModal.data.provinceName ? 'N/A' : viewModal.data.llgName} />
                                                    <InfoField label="Ward" value={viewModal.data.provinceName ? 'N/A' : viewModal.data.wardName} />

                                                    <InfoField label="Postal Address" value={viewModal.data.postalAddress} col="col-md-6" />
                                                    <InfoField label="Secondary Residential Address" value={viewModal.data.current_resident} col="col-md-6" />
                                                </div>
                                            </div>

                                            {/* Category 3: Guardian / Dependent Information */}
                                            <div>
                                                <h6 className="fw-bold text-success border-bottom pb-2 mb-3 text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>
                                                    <MDBIcon fas icon="user-shield" className="me-2" /> Guardian / Dependent Information
                                                </h6>
                                                <div className="row">
                                                    <InfoField label="Guardian Given Name" value={viewModal.data.givenName_dependent} />
                                                    <InfoField label="Guardian Surname" value={viewModal.data.surName_dependent} />
                                                    <InfoField label="Gender" value={viewModal.data.gender_dependent} />

                                                    <InfoField label="Relationship" value={viewModal.data.addrelationshiptostudent} />
                                                    <InfoField label="Guardian Email" value={viewModal.data.email_dependent} />
                                                    <InfoField label="Guardian Phone 1" value={viewModal.data.phone1_dependent} />

                                                    <InfoField label="Guardian Phone 2" value={viewModal.data.phone2_dependent} />
                                                    <InfoField label="Guardian Residential Address" value={viewModal.data.guardianresidentaladdress} col="col-md-8" />
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Footer Watermark for PDF */}
                                    <div className="bg-dark text-white text-center py-2" style={{ fontSize: '0.65rem', opacity: 0.9 }}>
                                        MIRAS Application System • Document Generated on {new Date().toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* --- MAIN PAGE CONTENT --- */}
            <div className="card shadow-sm border-0" style={{ fontSize: '0.85rem' }}>
                <div className="card-body p-3">

                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-3">
                        <MDBBtn
                            color="success"
                            className="shadow-sm fw-bold px-3 py-2 hover-lift"
                            style={{ backgroundColor: '#28a745', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                            onClick={() => navigate('/students/register')}
                        >
                            <MDBIcon fas icon="user-plus" className="me-2" />
                            REGISTER
                        </MDBBtn>

                        <div className="d-flex align-items-center w-100 w-md-auto justify-content-between justify-content-md-end">
                            <div className="d-flex align-items-center me-4">
                                <select className="form-select form-select-sm me-2" style={{ width: '70px', fontSize: '0.8rem', cursor: 'pointer' }} value={perPage} onChange={handlePerPageChange}>
                                    <option value="5">5</option>
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                </select>
                                <span className="text-muted text-nowrap">entries per page</span>
                            </div>

                            <div className="d-flex align-items-center">
                                <span className="me-2 text-muted">Search:</span>
                                <input type="text" className="form-control form-control-sm" style={{ width: '180px', fontSize: '0.8rem' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleSearch} placeholder="Press Enter..." />
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="table-responsive border rounded-3 shadow-sm mb-3">
                        {/* Added table-sm and text-nowrap */}
                        <table className="table table-sm table-striped table-hover align-middle mb-0 text-nowrap">
                            {/* Shrunk Header Text */}
                            <thead className="bg-primary text-warning" style={{ fontSize: '0.75rem' }}>
                                <tr>
                                    <SortableHeader label="Fullname" column="fullnameStudent" />
                                    <SortableHeader label="Gender" column="persons.gender" />
                                    <SortableHeader label="Location ( Ward | LLG | Province )" column="provinceName" />
                                    <SortableHeader label="Current Resident" column="current_resident" />
                                    <th className="fw-bold py-2">Action</th>
                                </tr>
                            </thead>
                            {/* Shrunk Body Text */}
                            <tbody style={{ fontSize: '0.8rem' }}>
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-4">Loading data...</td></tr>
                                ) : students.length > 0 ? (
                                    students.map((student, index) => (
                                        <tr key={index}>
                                            <td className="py-1 fw-bold">{student.fullnameStudent}</td>
                                            <td className="py-1">{student.gender}</td>
                                            <td className="py-1">
                                                {student.provinceName ? (
                                                    <span className="badge px-2 py-1" style={{ backgroundColor: '#fdf0d5', color: '#8a6d3b', border: '1px solid #faebcc' }}>
                                                        Province: {student.provinceName}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted small">
                                                        LLG: <span className="text-dark fw-bold">{student.llgName}</span> | Ward: <span className="text-dark fw-bold">{student.wardName}</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-1 text-muted small">{student.current_resident || 'N/A'}</td>
                                            <td className="py-1">
                                                <MDBBtn size="sm" color="warning" className="px-2 py-1 me-1 shadow-0 rounded" onClick={() => navigate(`/students/edit/${student.personIdPk}`)}>
                                                    <MDBIcon fas icon="edit" />
                                                </MDBBtn>
                                                <MDBBtn size="sm" color="danger" className="px-2 py-1 me-1 shadow-0 rounded" onClick={() => initiateDelete(student.personIdPk, student.fullnameStudent)}>
                                                    <MDBIcon fas icon="trash" />
                                                </MDBBtn>
                                                <MDBBtn size="sm" style={{ backgroundColor: '#3b71ca' }} className="px-2 py-1 me-1 shadow-0 rounded text-white" onClick={() => initiateView(student)} >
                                                    <MDBIcon fas icon="eye" />
                                                </MDBBtn>
                                                <MDBBtn size="sm" style={{ backgroundColor: '#3b71ca' }} className="px-2 py-1 shadow-0 rounded text-white" onClick={() => navigate(`/students/manage/${student.personIdPk}`)}>
                                                    <MDBIcon fas icon="briefcase" />
                                                </MDBBtn>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" className="text-center py-4">No students found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                        <span className="text-muted">Showing {pagination.from || 0} to {pagination.to || 0} of {pagination.total || 0} entries</span>
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

            <style>
                {`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                `}
            </style>
        </DashboardLayout>
    );
}