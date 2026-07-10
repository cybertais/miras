import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MDBBtn, MDBIcon } from 'mdb-react-ui-kit';
import axios from 'axios';
import WarningModal from '../../../Components/Modals/WarningModal.jsx';
import ConfirmModal from '../../../Components/Modals/ConfirmModal.jsx';

export default function AcademicsTab() {
    const academicLevels = ['Institutions', 'Courses'];
    const [activeLevel, setActiveLevel] = useState(academicLevels[0]); 
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filter State for Courses
    const [filterInstitution, setFilterInstitution] = useState('');
    const [institutionList, setInstitutionList] = useState([]);

    // Modal States
    const [showDependencyWarning, setShowDependencyWarning] = useState(false);
    const [dependencyMessage, setDependencyMessage] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ id: '', name: '', code: '', location: '', email: '', duration: '', parentId: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- State for Study Duration Options ---
    const [studyDurations, setStudyDurations] = useState([]);
    const authHeaders = { headers: { Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}` } };

    // 1. Fetch Institutions & UDCs globally on mount for dropdowns
    useEffect(() => {
        fetchInstitutionList();
        fetchStudyDurations(); // Fetch the durations when the component mounts
    }, []);

    const fetchInstitutionList = () => {
        axios.get('/api/system-settings/academics/Institutions', authHeaders).then(res => {
            setInstitutionList(Array.isArray(res.data) ? res.data : []);
        }).catch(err => console.error("Error fetching institutions:", err));
    };

    // Fetch UDC Values for Study Duration
    const fetchStudyDurations = async () => {
        try {
            const res = await axios.get('/api/system-settings/udc/values?system_code=SYS&udc_type=STD_PERIOD', authHeaders);
            setStudyDurations(res.data);
        } catch (err) {
            console.error("Failed to fetch study durations", err);
        }
    };

    // 2. Fetch Data based on active level & filter
    useEffect(() => {
        fetchData();
        if (activeLevel === 'Institutions') {
            setFilterInstitution(''); // Reset filter when switching back
        }
    }, [activeLevel, filterInstitution]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = `/api/system-settings/academics/${activeLevel}`;
            if (activeLevel === 'Courses' && filterInstitution) {
                url += `?institutionId=${filterInstitution}`;
            }
            const res = await axios.get(url, authHeaders);
            setData(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching academic data", error);
            setData([]);
        }
        setLoading(false);
    };

    const handleNew = () => {
        setFormData({ id: '', name: '', code: '', location: '', email: '', duration: '', parentId: '' });
        setShowModal(true);
    };

    const handleEdit = (item) => {
        if (!item) return;
        setFormData({ 
            id: item.id || '', 
            name: item.name || '', 
            code: item.code || '', 
            location: item.location || '',
            email: item.email || '',
            duration: item.duration || '',
            parentId: item.parentId || '' 
        });
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const confirmDelete = (item) => {
        if (activeLevel === 'Institutions' && item.linkedRecords > 0) {
            setDependencyMessage(`This institution cannot be deleted because it has ${item.linkedRecords} course(s) registered under it.`);
            setShowDependencyWarning(true);
            return;
        }
        setItemToDelete(item);
        setShowDeleteConfirm(true);
    };

    const executeDelete = async () => {
        if (!itemToDelete) return;
        try {
            await axios.delete(`/api/system-settings/academics/${activeLevel}/${itemToDelete.id}`, authHeaders);
            setShowDeleteConfirm(false);
            setItemToDelete(null);
            fetchData();
            if (activeLevel === 'Institutions') fetchInstitutionList(); // Refresh global list
        } catch (error) {
            alert("Failed to delete record.");
        }
    };

    const saveData = async () => {
        if (!formData.name.trim()) return alert("Name is required.");
        if (activeLevel === 'Courses' && !formData.parentId) return alert("Please select an Institution for this course.");

        setIsSubmitting(true);
        try {
            await axios.post(`/api/system-settings/academics/${activeLevel}`, formData, authHeaders);
            setShowModal(false);
            fetchData();
            if (activeLevel === 'Institutions') fetchInstitutionList(); // Refresh global list
        } catch (error) {
            alert("Failed to save record.");
        }
        setIsSubmitting(false);
    };

    // --- NEW: Helper to format Duration string as "Description (Code)" ---
    const getDurationDisplay = (code) => {
        if (!code) return '-';
        const udc = studyDurations.find(d => d.udc_code === code);
        return udc ? `${udc.description_1} (${udc.udc_code})` : code;
    };

    return (
        <div className="tab-pane-content fade-in">
            {/* ESCAPE DOM HIERARCHY USING REACT PORTALS */}
            {createPortal(
                <>
                    <WarningModal isOpen={showDependencyWarning} message={dependencyMessage} onClose={() => setShowDependencyWarning(false)} />
                    <ConfirmModal isOpen={showDeleteConfirm} itemName={itemToDelete?.name} onConfirm={executeDelete} onClose={() => setShowDeleteConfirm(false)} />
                </>,
                document.body
            )}

            {/* CREATE/EDIT MODAL */}
            {showModal && createPortal(
                <>
                    <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1040 }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                                <div className="p-3 d-flex justify-content-between align-items-center bg-white border-bottom">
                                    <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '1rem' }}>
                                        <MDBIcon fas icon={activeLevel === 'Institutions' ? 'school' : 'book'} className="me-2" style={{ color: '#8b0000' }}/>
                                        {formData.id ? `Edit ${activeLevel.slice(0, -1)}` : `New ${activeLevel.slice(0, -1)}`}
                                    </h5>
                                    <MDBIcon fas icon="times" style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowModal(false)} />
                                </div>
                                <div className="modal-body p-4 bg-light">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="fw-bold small text-muted mb-1">{activeLevel.slice(0, -1)} Name <span className="text-danger">*</span></label>
                                            <input type="text" name="name" className="form-control form-control-sm" value={formData.name} onChange={handleInputChange} />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="fw-bold small text-muted mb-1">Code</label>
                                            <input type="text" name="code" className="form-control form-control-sm" placeholder="e.g. UOT" value={formData.code} onChange={handleInputChange} />
                                        </div>
                                        
                                        {activeLevel === 'Institutions' && (
                                            <>
                                                <div className="col-12 col-md-6">
                                                    <label className="fw-bold small text-muted mb-1">Email</label>
                                                    <input type="email" name="email" className="form-control form-control-sm" value={formData.email} onChange={handleInputChange} />
                                                </div>
                                                <div className="col-12">
                                                    <label className="fw-bold small text-muted mb-1">Location / Address</label>
                                                    <input type="text" name="location" className="form-control form-control-sm" value={formData.location} onChange={handleInputChange} />
                                                </div>
                                            </>
                                        )}

                                        {activeLevel === 'Courses' && (
                                            <>
                                                <div className="col-12 col-md-6">
                                                    <label className="fw-bold small text-muted mb-1">Duration</label>
                                                    <select 
                                                        name="duration"
                                                        className="form-select form-select-sm" 
                                                        value={formData.duration || ''} 
                                                        onChange={handleInputChange}
                                                    >
                                                        <option value="" disabled>Select Study Duration...</option>
                                                        {studyDurations.map((duration) => (
                                                            <option key={duration.id} value={duration.udc_code}>
                                                                {duration.description_1}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-12">
                                                    <label className="fw-bold small text-muted mb-1">Belongs To Institution <span className="text-danger">*</span></label>
                                                    <select name="parentId" className="form-select form-select-sm" value={formData.parentId} onChange={handleInputChange}>
                                                        <option value="">Select Institution...</option>
                                                        {institutionList.map(inst => (
                                                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 bg-white border-top d-flex justify-content-end gap-2">
                                    <MDBBtn color="light" size="sm" className="shadow-0 fw-bold border hover-lift" onClick={() => setShowModal(false)}>CANCEL</MDBBtn>
                                    <MDBBtn color="success" size="sm" className="shadow-sm fw-bold hover-lift" style={{ backgroundColor: '#8b0000' }} onClick={saveData} disabled={isSubmitting}>
                                        {isSubmitting ? <><MDBIcon fas icon="spinner" spin className="me-2"/> SAVING...</> : <><MDBIcon fas icon="save" className="me-2"/> SAVE</>}
                                    </MDBBtn>
                                </div>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* --- INJECTED SLEEK HEADER COMPONENT --- */}
            <div className="card shadow-sm border-0 rounded-3 animate-fade-in mb-4">
                <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                        <div className="d-flex align-items-center">
                            <div className="icon-box bg-dark text-white me-2 shadow-sm">
                                <MDBIcon fas icon="university" />
                            </div>
                            <div>
                                <h6 className="fw-bold mb-0 text-dark">Institutions & Courses</h6>
                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>Manage academic configurations.</small>
                            </div>
                        </div>
                    </div>

                    <div className="row g-3">
                        {/* Institutions Column */}
                        <div className="col-12 col-md-6">
                            <div className="border rounded-3 p-3 bg-white hover-lift h-100">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span className="fw-bold text-primary" style={{ fontSize: '0.85rem' }}>Registered Institutions</span>
                                    <MDBBtn size="sm" color="light" className="shadow-sm px-2 py-1 text-primary border" 
                                            onClick={() => { setActiveLevel('Institutions'); handleNew(); }}>
                                        <MDBIcon fas icon="plus" className="me-1"/> ADD
                                    </MDBBtn>
                                </div>
                                <table className="table table-micro table-borderless mb-0 table-striped">
                                    <tbody>
                                        {institutionList.slice(0, 3).map(inst => (
                                            <tr key={inst.id}>
                                                <td className="fw-medium text-dark"><MDBIcon fas icon="school" className="text-muted me-2"/>{inst.name}</td>
                                                <td className="text-end"><MDBIcon fas icon="edit" className="text-info cursor-pointer hover-lift" onClick={() => { setActiveLevel('Institutions'); handleEdit(inst); }}/></td>
                                            </tr>
                                        ))}
                                        {institutionList.length === 0 && (
                                            <tr><td className="text-muted small">No institutions configured yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Courses Column */}
                        <div className="col-12 col-md-6">
                            <div className="border rounded-3 p-3 bg-white hover-lift h-100">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span className="fw-bold text-primary" style={{ fontSize: '0.85rem' }}>Registered Courses</span>
                                    <MDBBtn size="sm" color="light" className="shadow-sm px-2 py-1 text-primary border" 
                                            onClick={() => { setActiveLevel('Courses'); handleNew(); }}>
                                        <MDBIcon fas icon="plus" className="me-1"/> ADD
                                    </MDBBtn>
                                </div>
                                <table className="table table-micro table-borderless mb-0 table-striped">
                                    <tbody>
                                        <tr>
                                            <td className="fw-medium text-dark"><MDBIcon fas icon="book" className="text-muted me-2"/>Applied Physics</td>
                                            <td className="text-end"><span className="badge bg-light text-dark me-2 border">4 Yrs</span></td>
                                        </tr>
                                        <tr>
                                            <td className="fw-medium text-dark"><MDBIcon fas icon="book" className="text-muted me-2"/>Work Safety</td>
                                            <td className="text-end"><span className="badge bg-light text-dark me-2 border">6 Mos</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MAIN DYNAMIC DATA SECTION --- */}
            <div className="bg-white rounded-3 shadow-sm border p-3 animate-fade-in">
                
                {/* Header & Filters */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 border-bottom pb-2 gap-3">
                    <div className="btn-group shadow-0">
                        {academicLevels.map(level => (
                            <MDBBtn 
                                key={level} 
                                color={activeLevel === level ? 'primary' : 'light'} 
                                className={`shadow-0 fw-bold px-4 py-2 ${activeLevel !== level ? 'text-muted border' : ''}`}
                                style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}
                                onClick={() => setActiveLevel(level)}
                            >
                                {level}
                            </MDBBtn>
                        ))}
                    </div>

                    {activeLevel === 'Courses' && (
                        <div className="d-flex align-items-center">
                            <MDBIcon fas icon="filter" className="text-muted me-2" />
                            <select 
                                className="form-select form-select-sm border-secondary shadow-none" 
                                style={{ width: '200px' }}
                                value={filterInstitution} 
                                onChange={(e) => setFilterInstitution(e.target.value)}
                            >
                                <option value="">All Institutions</option>
                                {institutionList.map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.code ? `${inst.code} - ` : ''}{inst.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Data Table */}
                <div className="table-responsive">
                    <table className="table table-micro table-hover align-middle mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="fw-bold border-0 text-primary">NAME</th>
                                <th className="fw-bold border-0 text-primary text-center">CODE</th>
                                
                                {activeLevel === 'Institutions' && (
                                    <th className="fw-bold border-0 text-primary">LOCATION / CONTACT</th>
                                )}
                                {activeLevel === 'Courses' && (
                                    <>
                                        <th className="fw-bold border-0 text-primary text-center">DURATION</th>
                                        <th className="fw-bold border-0 text-primary">INSTITUTION</th>
                                    </>
                                )}

                                <th className="fw-bold border-0 text-primary text-center">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-5"><MDBIcon fas icon="spinner" spin size="2x" className="text-primary"/></td></tr>
                            ) : data.length > 0 ? data.map((item) => (
                                <tr key={item.id} className="border-bottom hover-lift">
                                    <td className="fw-bold text-dark">{item.name}</td>
                                    <td className="text-center text-muted">{item.code || '-'}</td>
                                    
                                    {activeLevel === 'Institutions' && (
                                        <td className="text-muted">
                                            <div style={{ fontSize: '0.75rem' }}>
                                                {item.location && <div><MDBIcon fas icon="map-marker-alt" className="me-2"/>{item.location}</div>}
                                                {item.email && <div><MDBIcon fas icon="envelope" className="me-2"/>{item.email}</div>}
                                            </div>
                                        </td>
                                    )}
                                    {activeLevel === 'Courses' && (
                                        <>
                                            {/* --- UPDATED: Render Duration as Description (Code) wrapped in Badge --- */}
                                            <td className="text-center">
                                                <span className="badge bg-light text-secondary border px-2 py-1">
                                                    {getDurationDisplay(item.duration)}
                                                </span>
                                            </td>
                                            <td className="text-muted fw-bold">{item.parentName || <span className="badge bg-danger rounded-pill shadow-0" style={{fontSize: '0.65rem'}}>Orphaned</span>}</td>
                                        </>
                                    )}

                                    <td className="text-center">
                                        <div className="d-flex justify-content-center align-items-center">
                                            <MDBBtn size="sm" color="light" className="shadow-sm border text-primary me-2 hover-lift px-2 py-1" onClick={() => handleEdit(item)}>
                                                <MDBIcon fas icon="edit" />
                                            </MDBBtn>
                                            <MDBBtn size="sm" color="light" className="shadow-sm border text-danger hover-lift px-2 py-1" onClick={() => confirmDelete(item)}>
                                                <MDBIcon fas icon="trash" />
                                            </MDBBtn>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="text-center py-4 text-muted" style={{ fontSize: '0.8rem' }}>No records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}