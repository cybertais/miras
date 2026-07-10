import React, { useState, useEffect } from 'react';
import { MDBBtn, MDBIcon } from 'mdb-react-ui-kit';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Select from 'react-select'; 
import DashboardLayout from '../../Layouts/DashboardLayout.jsx';

export default function ManageStudentModule() {
    const navigate = useNavigate();
    const { id } = useParams();
    
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showAllocateModal, setShowAllocateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSubsidyWarning, setShowSubsidyWarning] = useState(false);
    
    const [previewMode, setPreviewMode] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Update the state declaration
    const currentYear = new Date().getFullYear().toString();
    const [allocationData, setAllocationData] = useState({ 
        studentIdNumber: '', 
        institution: null, 
        course: null,
        yearRegistered: currentYear
    });
    const [errors, setErrors] = useState({});
    
    // --- NEW: State to catch Backend Validation/Business Rules ---
    const [serverError, setServerError] = useState('');
    
    const [institutions, setInstitutions] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(false);

    const authHeaders = { headers: { Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}` } };

    useEffect(() => {
        fetchStudentData();
    }, [id]);

    const fetchStudentData = async () => {
        try {
            const response = await axios.get(`/api/students/${id}`, authHeaders);
            setStudent(response.data);
        } catch (error) {
            console.error("Error fetching student details", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (showAllocateModal && institutions.length === 0) {
            axios.get('/api/institutions', authHeaders).then(res => {
                const options = res.data.map(inst => ({ value: inst.id, label: inst.name }));
                setInstitutions(options);
            }).catch(err => console.error("Error fetching institutions", err));
        }
    }, [showAllocateModal]);

    useEffect(() => {
        if (allocationData.institution) {
            setLoadingCourses(true);
            axios.get(`/api/institutions/${allocationData.institution.value}/courses`, authHeaders).then(res => {
                const options = res.data.map(course => ({ 
                    value: course.id, label: course.name, code: course.code, duration: course.duration
                }));
                setCourses(options);
                setLoadingCourses(false);
            }).catch(err => {
                console.error("Error fetching courses", err);
                setLoadingCourses(false);
            });
        } else {
            setCourses([]);
        }
    }, [allocationData.institution]);

    const formatCourseOptionLabel = (option, { context }) => {
        if (context === 'menu') {
            return (
                <div className="d-flex justify-content-between align-items-center w-100">
                    <span className="fw-bold text-dark">{option.label}</span>
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.75rem' }}>
                        {option.code && <span className="badge border text-dark rounded-pill px-2 bg-light">{option.code}</span>}
                        {option.duration && <span className="badge border text-dark rounded-pill px-2 bg-light"><MDBIcon far icon="clock" className="me-1"/> {option.duration}</span>}
                    </div>
                </div>
            );
        }
        return (
            <div className="d-flex align-items-center">
                <span className="fw-bold">{option.label}</span>
                {option.code && <span className="text-muted small ms-2">({option.code})</span>}
            </div>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        const [year, month, day] = parts;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${day} ${monthNames[parseInt(month, 10) - 1]} ${year}`;
    };

    const handleInputChange = (e) => {
        setServerError('');
        setAllocationData({ ...allocationData, studentIdNumber: e.target.value });
    };
    
    const handleInstitutionChange = (selectedOption) => {
        setServerError('');
        setAllocationData({ ...allocationData, institution: selectedOption, course: null });
    };
    
    const handleCourseChange = (selectedOption) => {
        setServerError('');
        setAllocationData({ ...allocationData, course: selectedOption });
    };

    const handleYearChange = (e) => {
        setServerError('');
        // Replace anything that is NOT a digit
        const value = e.target.value.replace(/\D/g, ''); 
        
        if (value.length <= 4) {
            setAllocationData({ ...allocationData, yearRegistered: value });
        }
    };

    const openAllocateModal = () => {
        setIsEditMode(false);
        setServerError('');
        setAllocationData({ 
            studentIdNumber: student?.studentnumber || '', 
            institution: null, 
            course: null,
            yearRegistered: currentYear // Default to current year
        });
        setShowAllocateModal(true);
    };

    const openEditModal = () => {
        setIsEditMode(true);
        setServerError('');
        const instId = student.institution_id || student.instutionsidfk;
        const crsId = student.course_id || student.courseidfk || student.courseidpk;

        setAllocationData({
            studentIdNumber: student.studentnumber || '',
            institution: instId ? { value: instId, label: student.organizationName } : null,
            course: crsId ? { value: crsId, label: student.coursename, code: student.coursecode, duration: student.studyduration } : null,
            yearRegistered: student.year_register || currentYear // Load existing or default
        });
        setShowAllocateModal(true);
    };

    const handlePreviewClick = () => {
        const newErrors = {};
        if (!allocationData.studentIdNumber?.trim()) newErrors.studentIdNumber = "Student ID Number is required.";
        if (!allocationData.institution) newErrors.institution = "Please select an Institution.";
        if (!allocationData.course) newErrors.course = "Please select a Course.";
        
        // New validation rule
        if (!allocationData.yearRegistered) {
            newErrors.yearRegistered = "Year Registered is required.";
        } else if (allocationData.yearRegistered.length !== 4) {
            newErrors.yearRegistered = "Year Registered must be exactly 4 digits.";
        }
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
        } else {
            setErrors({});
            setPreviewMode(true);
        }
    };

    const submitAllocation = async () => {
        setIsSubmitting(true);
        setServerError(''); // Clear previous backend errors

        try {
            const payload = {
                student_id_number: allocationData.studentIdNumber,
                institution_id: allocationData.institution?.value,
                course_id: allocationData.course?.value,
                year_register: allocationData.yearRegistered // Add this line
            };
            
            if (isEditMode) {
                await axios.put(`/api/students/${id}/allocate`, payload, authHeaders);
            } else {
                await axios.post(`/api/students/${id}/allocate`, payload, authHeaders);
            }
            
            closeModal();
            fetchStudentData(); 
        } catch (error) {
            if (error.response && error.response.status === 422) {
                if (error.response.data.errors) {
                    // It's a Laravel Validation Error
                    const errorMessages = Object.values(error.response.data.errors).flat().join(' | ');
                    setServerError(`Validation Error: ${errorMessages}`);
                } else {
                    // It's your Custom Business Logic Error from AcademicController
                    setServerError(error.response.data.message || "Unprocessable Content");
                }
            } else {
                console.error(error);
                setServerError("Error saving allocation. Please try again.");
            }
            // Kick them back to edit mode to fix the issue and see the error banner
            setPreviewMode(false);
        }
        setIsSubmitting(false);
    };

    const handleToggleStatus = async () => {
        setIsSubmitting(true);
        try {
            const newStatus = student.studentIsActive ? 0 : 1;
            await axios.put(`/api/students/${id}/toggle-status`, { status: newStatus }, authHeaders);
            fetchStudentData();
        } catch (error) {
            console.error("Error toggling status", error);
            alert("Failed to toggle status.");
        }
        setIsSubmitting(false);
    };

    const confirmDelete = async () => {
        setIsSubmitting(true);
        try {
            await axios.delete(`/api/students/${id}/allocate`, authHeaders);
            setShowDeleteModal(false);
            fetchStudentData();
        } catch (error) {
            if (error.response && error.response.status === 422 && error.response.data.has_subsidy) {
                setShowDeleteModal(false);
                setShowSubsidyWarning(true); 
            } else {
                console.error("Error deleting allocation", error);
                alert("Failed to delete the allocation.");
            }
        }
        setIsSubmitting(false);
    };

    const closeModal = () => {
        setShowAllocateModal(false);
        setPreviewMode(false);
        setErrors({});
        setServerError('');
    };

    if (loading) return <DashboardLayout pageTitle="Loading..."><div className="text-center mt-5"><MDBIcon fas icon="spinner" spin size="2x" className="text-primary"/></div></DashboardLayout>;
    if (!student) return <DashboardLayout pageTitle="Not Found"><div className="text-center mt-5 text-danger">Student not found.</div></DashboardLayout>;

    const CompactListItem = ({ icon, label, value }) => (
        <div className="d-flex justify-content-between align-items-center py-2 border-bottom" style={{ fontSize: '0.85rem' }}>
            <span className="text-muted"><MDBIcon fas icon={icon} className="me-2 text-primary" style={{ width: '16px' }} />{label}</span>
            <span className="fw-bold text-dark text-end">{value || '-'}</span>
        </div>
    );

    const GridItem = ({ icon, label, value }) => (
        <div className="d-flex align-items-start mb-3">
            <div className="bg-light text-primary rounded d-flex justify-content-center align-items-center me-3" style={{ width: '35px', height: '35px' }}>
                <MDBIcon fas icon={icon} />
            </div>
            <div>
                <div className="text-muted small text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>{label}</div>
                <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>{value || 'N/A'}</div>
            </div>
        </div>
    );

    const bannerColor = student.studentnumber ? (student.studentIsActive ? '#28a745' : '#8b0000') : '#8b0000';

    return (
        <DashboardLayout pageTitle="Manage Student" breadcrumbs={[{ label: "Home", url: "/" }, { label: "Students Management", url: "/students" }, "Manage Profile"]}>
            
            {/* Subsidy Prevention Warning Modal */}
            {showSubsidyWarning && (
                <>
                    <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                                <div style={{ backgroundColor: '#ffc107', height: '6px' }}></div>
                                <div className="modal-body p-4 text-center">
                                    <MDBIcon fas icon="info-circle" className="text-warning mb-3" style={{ fontSize: '3rem' }} />
                                    <h5 className="fw-bold text-dark mb-2">Cannot Remove Allocation</h5>
                                    <p className="text-muted small mb-4">
                                        This allocation cannot be removed because a subsidy has already been allocated or is currently in progress.
                                    </p>
                                    <div className="d-flex justify-content-center gap-2">
                                        <MDBBtn color="light" className="shadow-0 fw-bold border" onClick={() => setShowSubsidyWarning(false)}>OK, UNDERSTOOD</MDBBtn>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                                <div style={{ backgroundColor: '#dc3545', height: '6px' }}></div>
                                <div className="modal-body p-4 text-center">
                                    <MDBIcon fas icon="exclamation-triangle" className="text-danger mb-3" style={{ fontSize: '3rem' }} />
                                    <h5 className="fw-bold text-dark mb-2">Remove Allocation?</h5>
                                    <p className="text-muted small mb-4">
                                        Are you sure you want to remove the assigned course and institution for <strong>{student.givenName} {student.surName}</strong>? <br />
                                        This action is securely recorded in the Audit Trail.
                                    </p>
                                    <div className="d-flex justify-content-center gap-2">
                                        <MDBBtn color="light" className="shadow-0 fw-bold border" onClick={() => setShowDeleteModal(false)} disabled={isSubmitting}>CANCEL</MDBBtn>
                                        <MDBBtn color="danger" className="shadow-0 fw-bold" onClick={confirmDelete} disabled={isSubmitting}>
                                            {isSubmitting ? <MDBIcon fas icon="spinner" spin /> : 'YES, REMOVE'}
                                        </MDBBtn>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Allocate/Edit Modal */}
            {showAllocateModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                                <div className="text-white p-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#8b0000' }}>
                                    <h6 className="mb-0 fw-bold">{isEditMode ? 'Edit Academic Allocation' : 'Allocate Course & Institution'}</h6>
                                    <MDBIcon fas icon="times" style={{ cursor: 'pointer' }} onClick={closeModal} />
                                </div>

                                <div className="modal-body p-4 bg-light">
                                    
                                    {/* --- NEW: Server Error Alert Banner --- */}
                                    {serverError && (
                                        <div className="alert d-flex align-items-center p-3 mb-4 rounded-3 shadow-sm border-0" style={{ backgroundColor: '#f8d7da', color: '#842029' }}>
                                            <MDBIcon fas icon="exclamation-circle" className="me-3 fs-5" />
                                            <div className="fw-bold">{serverError}</div>
                                        </div>
                                    )}

                                    {!previewMode ? (
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="text-muted small fw-bold mb-1">Student ID Number <span className="text-danger">*</span></label>
                                                <input type="text" className={`form-control ${errors.studentIdNumber ? 'is-invalid' : ''}`} placeholder="e.g. 20241099" value={allocationData.studentIdNumber} onChange={handleInputChange} />
                                                {errors.studentIdNumber && <div className="invalid-feedback">{errors.studentIdNumber}</div>}
                                            </div>
                                            <div className="col-md-6">
                                                <label className="text-muted small fw-bold mb-1">Institution <span className="text-danger">*</span></label>
                                                <Select options={institutions} value={allocationData.institution} onChange={handleInstitutionChange} placeholder="Search institution..." className={errors.institution ? 'border border-danger rounded' : ''} isSearchable menuPortalTarget={document.body} styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} />
                                                {errors.institution && <div className="text-danger small mt-1">{errors.institution}</div>}
                                            </div>
                                            <div className="col-md-6">
                                                <label className="text-muted small fw-bold mb-1">Course <span className="text-danger">*</span></label>
                                                <Select options={courses} value={allocationData.course} onChange={handleCourseChange} formatOptionLabel={formatCourseOptionLabel} placeholder={loadingCourses ? "Loading..." : "Search course..."} isDisabled={!allocationData.institution} isLoading={loadingCourses} className={errors.course ? 'border border-danger rounded' : ''} isSearchable menuPortalTarget={document.body} styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} />
                                                {errors.course && <div className="text-danger small mt-1">{errors.course}</div>}
                                            </div>
                                            <div className="col-12 mt-3">
                                                <label className="text-muted small fw-bold mb-1">Year Registered <span className="text-danger">*</span></label>
                                                <input 
                                                    type="text" 
                                                    className={`form-control ${errors.yearRegistered ? 'is-invalid' : ''}`} 
                                                    placeholder="e.g. 2026" 
                                                    value={allocationData.yearRegistered} 
                                                    onChange={handleYearChange} 
                                                />
                                                {errors.yearRegistered && <div className="invalid-feedback">{errors.yearRegistered}</div>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <MDBIcon fas icon="clipboard-check" size="3x" className="text-success mb-3" />
                                            <h6 className="fw-bold mb-4">Verify Allocation Details</h6>
                                            <div className="text-start bg-white p-3 rounded border mx-auto" style={{ maxWidth: '500px' }}>
                                                <CompactListItem icon="user" label="Student" value={`${student.givenName} ${student.surName}`} />
                                                <CompactListItem icon="id-card" label="Student ID" value={allocationData.studentIdNumber} />
                                                <CompactListItem icon="university" label="Institution" value={allocationData.institution.label} />
                                                <CompactListItem icon="graduation-cap" label="Course" value={allocationData.course.label} />
                                                <CompactListItem icon="calendar" label="Year Registered" value={allocationData.yearRegistered} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-white border-top d-flex justify-content-end gap-2">
                                    {!previewMode ? (
                                        <MDBBtn color="primary" className="shadow-0 fw-bold" onClick={handlePreviewClick} style={{ backgroundColor: '#8b0000' }}>PREVIEW</MDBBtn>
                                    ) : (
                                        <>
                                            <MDBBtn color="light" className="shadow-0 border" onClick={() => setPreviewMode(false)} disabled={isSubmitting}>EDIT</MDBBtn>
                                            <MDBBtn color="success" className="shadow-0 fw-bold" onClick={submitAllocation} disabled={isSubmitting}>
                                                {isSubmitting ? 'SAVING...' : 'CONFIRM & SAVE'}
                                            </MDBBtn>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Top Toolbar: Back Button & Global Allocate Button */}
            <div className="mb-3 d-flex justify-content-between align-items-center">
                <MDBBtn color="light" className="shadow-0 border fw-bold text-dark px-3 py-2" onClick={() => navigate('/students')} style={{ fontSize: '0.8rem' }}>
                    <MDBIcon fas icon="arrow-left" className="me-2" /> BACK TO DIRECTORY
                </MDBBtn>
                
                {/* Global Allocate Button */}
                <MDBBtn 
                    color="success" 
                    className="shadow-0 fw-bold px-4 py-2" 
                    style={{ backgroundColor: '#28a745', fontSize: '0.85rem' }} 
                    onClick={openAllocateModal}
                >
                    <MDBIcon fas icon="plus-circle" className="me-2" /> ALLOCATE COURSE & INSTITUTION
                </MDBBtn>
            </div>

            <div className="row g-4">
                {/* LEFT COLUMN: Profile & Contact */}
                <div className="col-xl-4 col-lg-5">
                    {/* Profile Card */}
                    <div className="card shadow-sm border-0 mb-4 rounded-4 overflow-hidden">
                        <div className="text-center p-4" style={{ backgroundColor: '#8b0000' }}>
                            {student.personimage ? (
                                <img src={`/storage/student_images/${student.personimage}`} alt="Profile" className="rounded-circle border border-3 border-white shadow-sm mb-3" style={{ width: '120px', height: '120px', objectFit: 'cover' }} />
                            ) : (
                                <div className="rounded-circle border border-3 border-white shadow-sm mb-3 d-flex align-items-center justify-content-center mx-auto bg-white" style={{ width: '120px', height: '120px', color: '#8b0000' }}>
                                    <MDBIcon fas icon="user" size="3x" />
                                </div>
                            )}
                            <h5 className="fw-bold text-white mb-1">{student.givenName} {student.surName}</h5>
                            <div className="text-white-50 small mb-2">System ID: #{student.personIdPk}</div>
                            {student.studentnumber ? (
                                student.studentIsActive ? (
                                    <span className="badge bg-success rounded-pill px-3 py-2"><MDBIcon fas icon="check-circle" className="me-1"/> Allocated & Active</span>
                                ) : (
                                    <span className="badge bg-warning text-dark rounded-pill px-3 py-2"><MDBIcon fas icon="pause-circle" className="me-1"/> Allocated (Disabled)</span>
                                )
                            ) : (
                                <span className="badge bg-secondary text-white rounded-pill px-3 py-2"><MDBIcon fas icon="exclamation-circle" className="me-1"/> Pending Allocation</span>
                            )}
                        </div>
                        
                        <div className="card-body p-0">
                            <div className="p-3">
                                <h6 className="fw-bold text-uppercase text-muted mb-2" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Personal Data</h6>
                                <CompactListItem icon="venus-mars" label="Gender" value={student.gender} />
                                <CompactListItem icon="calendar-alt" label="Date of Birth" value={formatDate(student.dob)} />
                                <CompactListItem icon="ring" label="Marital Status" value={student.maritalStatus || 'Single'} />
                            </div>
                            <div className="p-3 border-top bg-light">
                                <h6 className="fw-bold text-uppercase text-muted mb-2" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Contact & Location</h6>
                                <CompactListItem icon="phone" label="Primary Phone" value={student.phone1 || 'N/A'} />
                                <CompactListItem icon="envelope" label="Email" value={student.email || 'N/A'} />
                                <CompactListItem icon="map-marker-alt" label="Province" value={student.provinceName || 'Middle Ramu (DDA)'} />
                                <CompactListItem icon="home" label="Residency" value={student.secondaryresidentaladdressintown || student.postalAddress || 'N/A'} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Academic & Guardian */}
                <div className="col-xl-8 col-lg-7">
                    
                    {/* Active Academic Allocation Card */}
                    <div className="card shadow-sm border-0 mb-4 rounded-4 overflow-hidden">
                        <div className="p-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: bannerColor, color: 'white', transition: '0.3s ease' }}>
                            <h6 className="mb-0 fw-bold"><MDBIcon fas icon="user-graduate" className="me-2"/> Academic Allocation</h6>
                        </div>

                        {student.studentnumber ? (
                            <div className="card-body p-4 bg-white">
                                <div className="row g-4">
                                    <div className="col-md-6 border-end-md">
                                        <h6 className="text-muted text-uppercase fw-bold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Course Info</h6>
                                        <GridItem icon="id-badge" label="Student ID Number" value={student.studentnumber} />
                                        <GridItem icon="book-open" label="Course Program" value={student.coursename} />
                                        <GridItem icon="clock" label="Study Duration" value={student.studyduration} />
                                        <GridItem icon="calendar-check" label="Year Registered" value={student.year_register} />
                                    </div>
                                    <div className="col-md-6">
                                        <h6 className="text-muted text-uppercase fw-bold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Institution Info</h6>
                                        <GridItem icon="university" label="Institution Name" value={student.organizationName} />
                                        <GridItem icon="map-pin" label="Campus Location" value={student.organizationLocation} />
                                        <GridItem icon="envelope" label="Institution Email" value={student.organizationEmail} />
                                    </div>
                                </div>
                                
                                <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                                    {/* Enable / Disable Toggle */}
                                    <div className="d-flex align-items-center border rounded px-3 py-2 bg-light shadow-sm">
                                        <div className="form-check form-switch m-0 p-0 d-flex align-items-center">
                                            <input 
                                                className="form-check-input ms-0 me-2" 
                                                type="checkbox" 
                                                role="switch" 
                                                id="activeSwitch" 
                                                checked={student.studentIsActive === 1} 
                                                onChange={handleToggleStatus} 
                                                disabled={isSubmitting}
                                                style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                            />
                                            <label className="form-check-label fw-bold text-dark mb-0" htmlFor="activeSwitch" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                                                {student.studentIsActive === 1 ? 'Enabled' : 'Disabled'}
                                            </label>
                                        </div>
                                    </div>

                                    {/* Edit / Remove Buttons */}
                                    <div className="d-flex gap-2">
                                        <MDBBtn color="light" className="shadow-0 border fw-bold px-3 py-2" style={{ color: '#8b0000' }} onClick={openEditModal}>
                                            <MDBIcon fas icon="edit" className="me-2"/> EDIT
                                        </MDBBtn>
                                        <MDBBtn color="danger" className="shadow-0 fw-bold px-3 py-2" style={{ backgroundColor: '#d9534f' }} onClick={() => setShowDeleteModal(true)}>
                                            <MDBIcon fas icon="trash" className="me-2"/> REMOVE
                                        </MDBBtn>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="card-body p-5 text-center bg-light">
                                <div className="rounded-circle bg-white shadow-sm d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '70px', height: '70px', color: '#ccc' }}>
                                    <MDBIcon fas icon="folder-open" size="2x" />
                                </div>
                                <h6 className="fw-bold text-dark">No Academic Record Found</h6>
                                <p className="text-muted small mb-0">Use the button above to allocate a course and institution to this student.</p>
                            </div>
                        )}
                    </div>

                    {/* Academic History Table */}
                    <div className="card shadow-sm border-0 mb-4 rounded-4 overflow-hidden">
                        <div className="card-header bg-white border-bottom p-3">
                            <h6 className="mb-0 fw-bold" style={{ color: '#8b0000' }}><MDBIcon fas icon="history" className="me-2"/> Academic History</h6>
                        </div>
                        <div className="card-body p-0">
                            {student.history && student.history.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                        <thead className="bg-light text-muted">
                                            <tr>
                                                <th className="fw-bold px-4">Year</th>
                                                <th className="fw-bold">Student ID</th>
                                                <th className="fw-bold">Course</th>
                                                <th className="fw-bold">Institution</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {student.history.map((hist, index) => (
                                                <tr key={index}>
                                                    <td className="fw-bold text-dark px-4">{hist.year_register}</td>
                                                    <td>{hist.studentnumber}</td>
                                                    <td>{hist.coursename} <span className="text-muted small">({hist.studyduration})</span></td>
                                                    <td>{hist.organizationName}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-4 text-center text-muted small">
                                    No previous academic history found.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Education History & Guardian Card */}
                    <div className="card shadow-sm border-0 mb-4 rounded-4 overflow-hidden">
                        <div className="card-header bg-white border-bottom p-3">
                            <h6 className="mb-0 fw-bold" style={{ color: '#8b0000' }}><MDBIcon fas icon="user-shield" className="me-2"/> Background & Guardian Info</h6>
                        </div>
                        <div className="card-body p-4 bg-light">
                            <div className="row g-4">
                                <div className="col-md-6 border-end-md">
                                    <h6 className="text-muted text-uppercase fw-bold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Previous Education</h6>
                                    <GridItem icon="school" label="Last School Attended" value={student.lastschoolattended} />
                                </div>
                                <div className="col-md-6">
                                    <h6 className="text-muted text-uppercase fw-bold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Guardian / Sponsor</h6>
                                    <GridItem icon="user" label="Full Name" value={`${student.givenName_dependent || ''} ${student.surName_dependent || ''}`.trim() || null} />
                                    <GridItem icon="link" label="Relationship" value={student.addrelationshiptostudent} />
                                    <GridItem icon="phone-alt" label="Contact Phone" value={student.phone1_dependent} />
                                </div>
                            </div>
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
                .border-end-md {
                    border-right: 1px solid #e0e0e0;
                }
                @media (max-width: 767.98px) {
                    .border-end-md { border-right: none; border-bottom: 1px solid #e0e0e0; padding-bottom: 1rem; }
                }
                /* Switch coloring */
                .form-check-input:checked {
                    background-color: #28a745;
                    border-color: #28a745;
                }
                `}
            </style>
        </DashboardLayout>
    );
}