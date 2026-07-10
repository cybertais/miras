import React, { useState, useEffect } from 'react';
import { MDBBtn, MDBIcon, MDBTooltip } from 'mdb-react-ui-kit';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Select from 'react-select';
import DashboardLayout from '../../Layouts/DashboardLayout.jsx';
import useAbility from '../../Hooks/useAbility'; // <-- 1. Import the Hook

export default function ManageSubsidyModule() {
    const navigate = useNavigate();
    const { id } = useParams();
    
    // <-- 2. Initialize the Hook
    const { hasPermission } = useAbility(); 

    const [profile, setProfile] = useState(null);
    const [subsidies, setSubsidies] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form States
    const [showModal, setShowModal] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    
    const [serverError, setServerError] = useState('');
    const currentYear = new Date().getFullYear().toString();

    const [formData, setFormData] = useState({
        studying_year: null,
        subsidy_year: currentYear,
        total_academic_cost: '',
        student_idcard: null,
        student_transcript: null
    });

    const [studyingYearOptions, setStudyingYearOptions] = useState([]);

    const [pagination, setPagination] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState('student_subsidytype_idPk');
    const [sortDirection, setSortDirection] = useState('desc');

    const authHeaders = { headers: { Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}` } };

    useEffect(() => {
        const fetchStudyPeriods = async () => {
            try {
                const res = await axios.get('/api/system-settings/udc/values?system_code=SYS&udc_type=STD_WILLDO', authHeaders);
                const options = res.data.map(period => ({
                    value: period.udc_code,
                    label: period.description_1
                }));
                setStudyingYearOptions(options);
            } catch (err) {
                console.error("Failed to fetch study periods", err);
            }
        };
        fetchStudyPeriods();
    }, []);

    useEffect(() => {
        fetchData();
    }, [id, currentPage, perPage, sortColumn, sortDirection]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `/api/subsidies/${id}?page=${currentPage}&per_page=${perPage}&search=${searchTerm}&sort=${sortColumn}&direction=${sortDirection}`,
                authHeaders
            );
            setProfile(response.data.profile);
            setSubsidies(response.data.subsidies.data);
            setPagination({
                current_page: response.data.subsidies.current_page,
                last_page: response.data.subsidies.last_page,
                total: response.data.subsidies.total,
                from: response.data.subsidies.from,
                to: response.data.subsidies.to,
            });
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setCurrentPage(1);
            fetchData();
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

    const handleInputChange = (e) => {
        setServerError('');
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubsidyYearChange = (e) => {
        setServerError('');
        const value = e.target.value.replace(/\D/g, ''); 
        if (value.length <= 4) {
            setFormData({ ...formData, subsidy_year: value });
        }
    };

    const handleStudyingYearChange = (selectedOption) => {
        setServerError('');
        setFormData({ ...formData, studying_year: selectedOption });
    };

    const handleFileChange = (e) => {
        setServerError('');
        setFormData({ ...formData, [e.target.name]: e.target.files[0] });
    };

    const openModal = () => {
        setFormData({ studying_year: null, subsidy_year: currentYear, total_academic_cost: '', student_idcard: null, student_transcript: null });
        setErrors({});
        setServerError('');
        setPreviewMode(false);
        setShowModal(true);
    };

    const handlePreview = () => {
        const newErrors = {};
        if (!formData.studying_year) newErrors.studying_year = "Please select an option.";
        if (!formData.subsidy_year) {
            newErrors.subsidy_year = "Subsidy Year is required.";
        } else if (formData.subsidy_year.length !== 4) {
            newErrors.subsidy_year = "Subsidy Year must be exactly 4 digits.";
        }
        if (!formData.total_academic_cost || isNaN(formData.total_academic_cost)) newErrors.total_academic_cost = "Valid amount is required.";
        if (!formData.student_idcard) newErrors.student_idcard = "ID Card attachment is required.";
        if (!formData.student_transcript) newErrors.student_transcript = "Transcript attachment is required.";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
        } else {
            setErrors({});
            setPreviewMode(true);
        }
    };

    const submitAllocation = async () => {
        setIsSubmitting(true);
        setServerError(''); 
        
        const payload = new FormData();
        payload.append('studying_year', formData.studying_year.value);
        payload.append('subsidy_year', formData.subsidy_year);
        payload.append('total_academic_cost', formData.total_academic_cost);
        payload.append('student_idcard', formData.student_idcard);
        payload.append('student_transcript', formData.student_transcript);

        try {
            await axios.post(`/api/subsidies/${id}/allocate`, payload, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}`
                }
            });
            setShowModal(false);
            setPreviewMode(false);
            fetchData();
        } catch (error) {
            if (error.response && error.response.status === 422) {
                if (error.response.data.errors) {
                    const errorMessages = Object.values(error.response.data.errors).flat().join(' | ');
                    setServerError(`Validation Error: ${errorMessages}`);
                } else {
                    setServerError(error.response.data.message || "Unprocessable Content");
                }
            } else {
                console.error(error);
                setServerError("Error allocating subsidy. Please try again or check server logs.");
            }
            setPreviewMode(false);
        }
        setIsSubmitting(false);
    };

    const getDurationDescription = (code) => {
        if (!code) return 'N/A';
        const option = studyingYearOptions.find(opt => opt.value === code);
        return option ? option.label : code;
    };

    const getStatusTheme = (status) => {
        switch(status) {
            case 'UNDER REVIEW': return { bgHex: '#0d6efd', textClass: 'text-white' }; 
            case 'PENDING APPROVAL': return { bgHex: '#fd7e14', textClass: 'text-dark' }; 
            case 'APPROVED': return { bgHex: '#198754', textClass: 'text-white' }; 
            case 'DECLINE': return { bgHex: '#dc3545', textClass: 'text-white' }; 
            default: return { bgHex: '#6c757d', textClass: 'text-white' }; 
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        const [year, month, day] = parts;
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return `${day} ${monthNames[parseInt(month, 10) - 1]} ${year}`;
    };

    const formatCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        return `K${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const SortableHeader = ({ label, column, align = "left" }) => {
        const isCurrentSort = sortColumn === column;
        const icon = isCurrentSort ? (sortDirection === 'asc' ? 'sort-up' : 'sort-down') : 'sort';
        return (
            <th className={`fw-bold py-3 text-${align}`} style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem' }} onClick={() => handleSort(column)}>
                {label} <MDBIcon fas icon={icon} className={`ms-1 ${isCurrentSort ? 'text-warning' : 'opacity-50'}`} />
            </th>
        );
    };

    const InfoBlock = ({ icon, title, value }) => (
        <div className="d-flex align-items-center mb-3">
            <div className="rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '38px', height: '38px', backgroundColor: '#f8f9fa', color: '#8b0000' }}>
                <MDBIcon fas icon={icon} />
            </div>
            <div className="lh-sm">
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>{title}</small>
                <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>{value || 'N/A'}</div>
            </div>
        </div>
    );

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

    if (loading) return <DashboardLayout pageTitle="Manage Subsidy"><div className="text-center mt-5"><MDBIcon fas icon="spinner" spin size="2x" className="text-primary" /></div></DashboardLayout>;
    if (!profile) return <DashboardLayout pageTitle="Not Found"><div className="text-center mt-5 text-danger">Record not found.</div></DashboardLayout>;

    const isActive = profile.studentIsActive === 1;

    return (
        <DashboardLayout
            pageTitle={isActive ? "MIRAS Manage Student Subsidy" : "MIRAS Manage Student Subsidy - Student Disabled"}
            breadcrumbs={[{ label: "Home", url: "/" }, { label: "Manage Student Subsidy", url: "/subsidies" }, isActive ? "Manage" : "Student Disabled"]}
        >
            {/* Modal Logic Remains the Same */}
            {showModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                                {/* ... [Modal Content omitted for brevity, it is identical to previous] ... */}
                                <div className="p-3 d-flex justify-content-between align-items-center bg-white border-bottom">
                                    <h5 className="mb-0 fw-bold text-dark">Preparing Draft Subsidy Allocation</h5>
                                    <MDBIcon fas icon="times" style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowModal(false)} />
                                </div>

                                <div className="modal-body p-4 bg-white">
                                    {serverError && (
                                        <div className="alert d-flex align-items-center p-3 mb-4 rounded-3 shadow-sm border-0" style={{ backgroundColor: '#f8d7da', color: '#842029' }}>
                                            <MDBIcon fas icon="exclamation-circle" className="me-3 fs-5" />
                                            <div className="fw-bold">{serverError}</div>
                                        </div>
                                    )}

                                    {!previewMode ? (
                                        <div className="row g-4 align-items-start">
                                            <div className="col-md-4">
                                                <label className="text-muted small fw-bold mb-1">Studying Year <span className="text-danger">*</span></label>
                                                <Select
                                                    options={studyingYearOptions}
                                                    value={formData.studying_year}
                                                    onChange={handleStudyingYearChange}
                                                    placeholder="Select Study Period..."
                                                    className={errors.studying_year ? 'border border-danger rounded' : ''}
                                                    isSearchable
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, height: '45px' }) }}
                                                />
                                                {errors.studying_year && <div className="text-danger small mt-1">{errors.studying_year}</div>}
                                            </div>

                                            <div className="col-md-4">
                                                <label className="text-muted small fw-bold mb-1">Subsidy Year <span className="text-danger">*</span></label>
                                                <input 
                                                    type="text" name="subsidy_year" className={`form-control ${errors.subsidy_year ? 'is-invalid' : ''}`} 
                                                    placeholder="e.g. 2026" value={formData.subsidy_year} onChange={handleSubsidyYearChange} style={{ height: '45px' }} 
                                                />
                                                {errors.subsidy_year && <div className="invalid-feedback">{errors.subsidy_year}</div>}
                                            </div>

                                            <div className="col-md-4">
                                                <label className="text-muted small fw-bold mb-1">Total Academic Cost <span className="text-danger">*</span></label>
                                                <input type="number" name="total_academic_cost" className={`form-control ${errors.total_academic_cost ? 'is-invalid' : ''}`} placeholder="e.g. 5000" value={formData.total_academic_cost} onChange={handleInputChange} style={{ height: '45px' }} />
                                                {errors.total_academic_cost && <div className="invalid-feedback">{errors.total_academic_cost}</div>}
                                            </div>

                                            <div className="col-12 text-center mt-4 mb-2"><span className="text-muted small align-middle px-3">Student Transcript & Verification</span></div>

                                            <div className="col-md-6 text-center">
                                                <input type="file" name="student_idcard" className={`form-control ${errors.student_idcard ? 'is-invalid' : ''}`} onChange={handleFileChange} accept=".pdf,.jpg,.png,.jpeg" />
                                                <label className="small text-muted mt-1">Choose File (ID Card)</label>
                                                {errors.student_idcard && <div className="invalid-feedback">{errors.student_idcard}</div>}
                                            </div>

                                            <div className="col-md-6 text-center">
                                                <input type="file" name="student_transcript" className={`form-control ${errors.student_transcript ? 'is-invalid' : ''}`} onChange={handleFileChange} accept=".pdf,.jpg,.png,.jpeg" />
                                                <label className="small text-muted mt-1">Choose File (Transcript/Acceptance)</label>
                                                {errors.student_transcript && <div className="invalid-feedback">{errors.student_transcript}</div>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <MDBIcon fas icon="search" size="3x" className="text-primary mb-3" />
                                            <h6 className="fw-bold mb-4">Review Subsidy Allocation</h6>
                                            <div className="text-start bg-light p-4 rounded border shadow-sm mx-auto" style={{ maxWidth: '400px' }}>
                                                <div className="d-flex justify-content-between mb-3 pb-2 border-bottom"><span className="text-muted fw-bold small">Studying Year:</span><span className="fw-bold">{formData.studying_year.label}</span></div>
                                                <div className="d-flex justify-content-between mb-3 pb-2 border-bottom"><span className="text-muted fw-bold small">Subsidy Year:</span><span className="fw-bold">{formData.subsidy_year}</span></div>
                                                <div className="d-flex justify-content-between mb-3 pb-2 border-bottom"><span className="text-muted fw-bold small">Total Cost:</span><span className="fw-bold text-danger">{formatCurrency(formData.total_academic_cost)}</span></div>
                                                <div className="d-flex justify-content-between mb-3 pb-2 border-bottom"><span className="text-muted fw-bold small">ID Card:</span><span className="fw-bold text-success"><MDBIcon fas icon="check" className="me-1" /> Attached</span></div>
                                                <div className="d-flex justify-content-between"><span className="text-muted fw-bold small">Transcript:</span><span className="fw-bold text-success"><MDBIcon fas icon="check" className="me-1" /> Attached</span></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-white border-top d-flex justify-content-end gap-3">
                                    {!previewMode ? (
                                        <>
                                            <MDBBtn color="danger" className="shadow-0 fw-bold px-4" style={{ backgroundColor: '#e84a5f', borderRadius: '5px' }} onClick={() => setShowModal(false)}>CLOSE</MDBBtn>
                                            <MDBBtn color="success" className="shadow-0 fw-bold px-4" style={{ backgroundColor: '#28a745', borderRadius: '5px' }} onClick={handlePreview}>
                                                <MDBIcon fas icon="user-check" className="me-2" /> ALLOCATE
                                            </MDBBtn>
                                        </>
                                    ) : (
                                        <>
                                            <MDBBtn color="warning" className="shadow-0 fw-bold px-4 text-white" style={{ backgroundColor: '#d39e00' }} onClick={() => setPreviewMode(false)} disabled={isSubmitting}>EDIT</MDBBtn>
                                            <MDBBtn color="success" className="shadow-0 fw-bold px-4" style={{ backgroundColor: '#28a745', borderRadius: '5px' }} onClick={submitAllocation} disabled={isSubmitting}>
                                                {isSubmitting ? <><MDBIcon fas icon="spinner" spin className="me-2" /> SAVING...</> : <><MDBIcon fas icon="check" className="me-2" /> CONFIRM ALLOCATION</>}
                                            </MDBBtn>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="d-flex justify-content-between align-items-center mb-4 fade-in-up" style={{ animationDelay: '0s' }}>
                <MDBBtn color="light" className="shadow-0 border fw-bold text-dark px-3 py-2 hover-lift" onClick={() => navigate('/subsidies')} style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    <MDBIcon fas icon="arrow-left" className="me-2" /> BACK
                </MDBBtn>

                {/* --- 3. Component-Level Protection: Only users with permission see this button --- */}
                {hasPermission('manage_subsidies') && isActive && (
                    <MDBBtn
                        className="shadow-sm fw-bold px-3 py-2 btn-magic"
                        style={{ backgroundColor: '#28a745', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                        onClick={openModal}
                    >
                        <MDBIcon fas icon="hand-holding-usd" className="me-2" />
                        ALLOCATE SUBSIDY
                    </MDBBtn>
                )}
            </div>

            {/* Profile Information Block */}
            {/* ... [Profile Info Block omitted for brevity, it is identical to previous] ... */}
            <div className="row g-4 mb-4">
                <div className="col-xl-3 col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 data-card fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <div className="card-body text-center d-flex flex-column justify-content-center p-4">
                            {profile.personimage ? (
                                <img src={`/storage/student_images/${profile.personimage}`} alt="Profile" className="rounded-circle shadow-sm mx-auto mb-3" style={{ width: '110px', height: '110px', objectFit: 'cover', border: '3px solid #8b0000' }} />
                            ) : (
                                <div className="rounded-circle shadow-sm d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '110px', height: '110px', backgroundColor: '#f8f9fa', border: '3px solid #8b0000', color: '#8b0000' }}>
                                    <MDBIcon fas icon="user" size="3x" />
                                </div>
                            )}
                            <h5 className="fw-bold text-dark mb-1">{profile.givenName} {profile.surName}</h5>
                            <p className="text-muted small mb-3">System ID: #{profile.studentidpk}</p>

                            <div>
                                {isActive ? (
                                    <span className="badge bg-success rounded-pill px-3 py-2 fw-bold shadow-sm"><MDBIcon fas icon="check-circle" className="me-1" /> Active Student</span>
                                ) : (
                                    <span className="badge bg-danger rounded-pill px-3 py-2 fw-bold shadow-sm"><MDBIcon fas icon="times-circle" className="me-1" /> Inactive Student</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-xl-9 col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4 h-100 fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="card-header bg-white border-bottom p-3">
                            <h6 className="mb-0 fw-bold" style={{ color: '#8b0000' }}><MDBIcon fas icon="address-card" className="me-2" /> Comprehensive Profile</h6>
                        </div>
                        <div className="card-body p-4 bg-light">
                            <div className="row g-4">
                                <div className="col-md-4">
                                    <h6 className="fw-bold text-uppercase mb-3" style={{ color: '#8b0000', fontSize: '0.75rem', letterSpacing: '1px' }}>Personal</h6>
                                    <InfoBlock icon="venus-mars" title="Gender" value={profile.gender} />
                                    <InfoBlock icon="calendar-day" title="Date of Birth" value={formatDate(profile.dob)} />
                                    <InfoBlock icon="ring" title="Marital Status" value={profile.maritalStatus || 'Single'} />
                                </div>
                                <div className="col-md-4">
                                    <h6 className="fw-bold text-uppercase mb-3" style={{ color: '#8b0000', fontSize: '0.75rem', letterSpacing: '1px' }}>Contact</h6>
                                    <InfoBlock icon="envelope" title="Email" value={profile.email} />
                                    <InfoBlock icon="phone" title="Phone" value={profile.phone1} />
                                    <InfoBlock icon="map-marker-alt" title="Address" value={profile.postalAddress} />
                                </div>
                                <div className="col-md-4">
                                    <h6 className="fw-bold text-uppercase mb-3" style={{ color: '#8b0000', fontSize: '0.75rem', letterSpacing: '1px' }}>Academic</h6>
                                    <InfoBlock icon="id-badge" title="Student #" value={profile.studentnumber} />
                                    <InfoBlock 
                                        icon="graduation-cap" 
                                        title="Course" 
                                        value={
                                            <>
                                                <div>{profile.coursename}</div>
                                                <div className="text-muted fw-normal mt-1" style={{fontSize: '0.75rem'}}>
                                                    {getDurationDescription(profile.studyduration)}
                                                </div>
                                            </>
                                        } 
                                    />
                                    <InfoBlock icon="university" title="Institution" value={`${profile.organizationName} (${profile.organizationCode || 'N/A'})`} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4 overflow-hidden fade-in-up" style={{ animationDelay: '0.3s' }}>
                <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold" style={{ color: '#8b0000' }}><MDBIcon fas icon="file-invoice-dollar" className="me-2" /> Subsidy History</h6>
                </div>

                <div className="card-body p-4">
                    {/* ... [Table content omitted for brevity, identical to previous] ... */}
                    <div className="table-responsive rounded border shadow-sm">
                        <table className="table table-hover align-middle mb-0">
                            <thead style={{ backgroundColor: '#8b0000', color: 'white', borderBottom: '3px solid #ffc107' }}>
                                <tr>
                                    <SortableHeader label="Studying Year" column="studying_year" />
                                    <SortableHeader label="Subsidy Year" column="subsidy_year" align="center" />
                                    <SortableHeader label="Amount Subsidized" column="financial_value_subsidize" align="end" />
                                    <SortableHeader label="Academic Cost" column="total_academic_cost" align="end" />
                                    <SortableHeader label="Subsidy Status" column="student_subsidy_status" align="center" />
                                    <th className="fw-bold py-3 text-center" style={{ fontSize: '0.85rem' }}>Documents</th>
                                </tr>
                            </thead>
                            <tbody style={{ fontSize: '0.9rem', backgroundColor: 'white' }}>
                                {subsidies.length > 0 ? subsidies.map((item, index) => {
                                    const theme = getStatusTheme(item.student_subsidy_status);
                                    return (
                                        <tr key={index} className="data-card">
                                            <td className="py-3 px-3 fw-bold">{getDurationDescription(item.studying_year)}</td>
                                            <td className="text-center">{item.subsidy_year || '-'}</td>
                                            <td className="text-end fw-bold text-success">{formatCurrency(item.financial_value_subsidize)}</td>
                                            <td className="text-end fw-bold text-danger">{formatCurrency(item.total_academic_cost)}</td>
                                            <td className="text-center">
                                                <span 
                                                    className={`badge rounded-pill px-3 py-2 ${theme.textClass} shadow-sm`}
                                                    style={{ backgroundColor: theme.bgHex }}
                                                >
                                                    {item.student_subsidy_status}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center gap-1">
                                                    {item.student_idcard && (
                                                        <MDBTooltip tag="span" title="View ID Card">
                                                            <a href={`/storage/${item.student_idcard}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-light border shadow-0 px-2 py-1 text-primary">
                                                                <MDBIcon fas icon="id-card" />
                                                            </a>
                                                        </MDBTooltip>
                                                    )}
                                                    {item.student_transcript && (
                                                        <MDBTooltip tag="span" title="View Transcript">
                                                            <a href={`/storage/${item.student_transcript}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-light border shadow-0 px-2 py-1 text-secondary">
                                                                <MDBIcon fas icon="file-alt" />
                                                            </a>
                                                        </MDBTooltip>
                                                    )}
                                                    {item.paymentscanneddocs && (
                                                        <MDBTooltip tag="span" title="View Payment Receipt">
                                                            <a href={`/storage/${item.paymentscanneddocs}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-light border shadow-0 px-2 py-1 text-success">
                                                                <MDBIcon fas icon="receipt" />
                                                            </a>
                                                        </MDBTooltip>
                                                    )}
                                                    {(!item.student_idcard && !item.student_transcript && !item.paymentscanneddocs) && <span className="text-muted small">-</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="6" className="text-center py-5 text-muted">
                                            <MDBIcon fas icon="box-open" size="2x" className="mb-3 opacity-50" />
                                            <p className="mb-0">No subsidy records found.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>
                {`
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .fade-in-up {
                    opacity: 0;
                    animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                
                @keyframes pulse-glow {
                    0% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.6); transform: scale(1); }
                    70% { box-shadow: 0 0 0 10px rgba(40, 167, 69, 0); transform: scale(1.02); }
                    100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); transform: scale(1); }
                }
                .btn-magic {
                    animation: pulse-glow 2s infinite;
                    transition: all 0.3s ease;
                }
                .btn-magic:hover {
                    animation: none;
                    transform: scale(1.05);
                    box-shadow: 0 0 15px rgba(40, 167, 69, 0.8) !important;
                }
                `}
            </style>
        </DashboardLayout>
    );
}