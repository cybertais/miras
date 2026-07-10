import React, { useState, useEffect } from 'react';
import { MDBBtn, MDBIcon } from 'mdb-react-ui-kit';
import axios from 'axios';

export default function SubsidyTab() {
    const [subsidyTypes, setSubsidyTypes] = useState([]);
    const [loadingSubsidies, setLoadingSubsidies] = useState(false);
    const [showSubModal, setShowSubModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subErrors, setSubErrors] = useState({});
    const [subData, setSubData] = useState({
        subsidy_idPk: '', subsidy_name: '', description: '', calculation_type: 'PERCENTAGE', global_percent_fixed_value: '', subsidytype_isActive: false
    });

    useEffect(() => {
        fetchSubsidyTypes();
    }, []);

    const fetchSubsidyTypes = async () => {
        setLoadingSubsidies(true);
        try {
            const res = await axios.get('/api/system-settings/subsidy-types');
            
            // BULLETPROOF STATE MANAGEMENT: Check both direct values and standard pagination arrays
            const fetchedData = res.data?.data || res.data;
            setSetSubsidySafe(fetchedData);
            
        } catch (error) {
            console.error("Error fetching subsidy types", error);
            setSubsidyTypes([]); 
        } finally {
            setLoadingSubsidies(false);
        }
    };

    const setSetSubsidySafe = (data) => {
        if (Array.isArray(data)) {
            setSubsidyTypes(data);
        } else if (data && typeof data === 'object') {
            // Fallback: If it returns an object containing an array property
            const values = Object.values(data);
            const foundArray = values.find(val => Array.isArray(val));
            setSubsidyTypes(foundArray || []);
        } else {
            setSubsidyTypes([]);
        }
    };

    const openSubModal = (item = null) => {
        if (item) {
            setSubData({
                subsidy_idPk: item.subsidy_idPk, subsidy_name: item.subsidy_name, description: item.description,
                calculation_type: item.calculation_type, global_percent_fixed_value: item.global_percent_fixed_value,
                subsidytype_isActive: item.subsidytype_isActive === 1
            });
        } else {
            setSubData({
                subsidy_idPk: '', subsidy_name: '', description: '', calculation_type: 'PERCENTAGE', global_percent_fixed_value: '', subsidytype_isActive: false
            });
        }
        setSubErrors({});
        setShowSubModal(true);
    };

    const handleSubInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSubData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const saveSubsidyConfig = async () => {
        const errors = {};
        if (!subData.subsidy_name.trim()) errors.subsidy_name = "Name is required.";
        if (!subData.description.trim()) errors.description = "Description is required.";
        if (!subData.global_percent_fixed_value) errors.global_percent_fixed_value = "Value is required.";
        
        if (Object.keys(errors).length > 0) return setSubErrors(errors);

        setIsSubmitting(true);
        try {
            await axios.post('/api/system-settings/subsidy-types', subData);
            setShowSubModal(false);
            fetchSubsidyTypes();
        } catch (error) {
            console.error(error);
            alert("Error saving configuration.");
        }
        setIsSubmitting(false);
    };

    return (
        <div className="tab-pane-content fade-in">
            {/* SUBSIDY CONFIGURATION MODAL */}
            {showSubModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                                <div className="p-3 d-flex justify-content-between align-items-center bg-white border-bottom">
                                    <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '1rem' }}>
                                        <MDBIcon fas icon="cogs" className="me-2" style={{ color: '#8b0000' }}/>
                                        {subData.subsidy_idPk ? 'Edit Subsidy Config' : 'New Subsidy Config'}
                                    </h5>
                                    <MDBIcon fas icon="times" style={{ cursor: 'pointer' }} onClick={() => setShowSubModal(false)} />
                                </div>
                                <div className="modal-body p-4 bg-light">
                                    <div className="row g-4">
                                        <div className="col-12">
                                            <label className="fw-bold small text-muted mb-1">Subsidy Name</label>
                                            <input type="text" name="subsidy_name" className={`form-control form-control-sm ${subErrors.subsidy_name ? 'is-invalid' : ''}`} value={subData.subsidy_name} onChange={handleSubInputChange} />
                                            {subErrors.subsidy_name && <div className="invalid-feedback">{subErrors.subsidy_name}</div>}
                                        </div>
                                        <div className="col-12">
                                            <label className="fw-bold small text-muted mb-1">Description</label>
                                            <input type="text" name="description" className={`form-control form-control-sm ${subErrors.description ? 'is-invalid' : ''}`} value={subData.description} onChange={handleSubInputChange} />
                                            {subErrors.description && <div className="invalid-feedback">{subErrors.description}</div>}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="fw-bold small text-muted mb-1">Calculation Type</label>
                                            <select name="calculation_type" className="form-select form-select-sm" value={subData.calculation_type} onChange={handleSubInputChange}>
                                                <option value="PERCENTAGE">PERCENTAGE (%)</option>
                                                <option value="FIXED">FIXED AMOUNT (K)</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="fw-bold small text-muted mb-1">Assigned Value</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                name="global_percent_fixed_value" 
                                                className={`form-control form-control-sm ${subErrors.global_percent_fixed_value ? 'is-invalid' : ''}`} 
                                                value={subData.global_percent_fixed_value} 
                                                onChange={handleSubInputChange} 
                                                placeholder={subData.calculation_type === 'PERCENTAGE' ? "e.g., 33.33" : "e.g., 2500.50"} 
                                            />
                                            {subErrors.global_percent_fixed_value && <div className="invalid-feedback">{subErrors.global_percent_fixed_value}</div>}
                                        </div>
                                        <div className="col-12 mt-4">
                                            <div className="form-check bg-white p-3 rounded border shadow-sm d-flex align-items-center">
                                                <input className="form-check-input ms-1 me-3" type="checkbox" name="subsidytype_isActive" id="activeCheck" checked={subData.subsidytype_isActive} onChange={handleSubInputChange} style={{ transform: 'scale(1.3)' }} />
                                                <label className="form-check-label fw-bold text-dark m-0" htmlFor="activeCheck">Set as Active Configuration <br /><span className="text-muted small fw-normal">Activating this will automatically disable all other configurations.</span></label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 bg-white border-top d-flex justify-content-end gap-2">
                                    <MDBBtn color="light" size="sm" className="shadow-0 fw-bold border hover-lift" onClick={() => setShowSubModal(false)}>CANCEL</MDBBtn>
                                    <MDBBtn color="success" size="sm" className="shadow-sm fw-bold hover-lift" style={{ backgroundColor: '#8b0000' }} onClick={saveSubsidyConfig} disabled={isSubmitting}>
                                        {isSubmitting ? <><MDBIcon fas icon="spinner" spin className="me-2"/> SAVING...</> : <><MDBIcon fas icon="save" className="me-2"/> SAVE CONFIG</>}
                                    </MDBBtn>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* HEADER AREA */}
            <div className="card shadow-sm border-0 rounded-3 animate-fade-in mb-4">
                <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                            <div className="icon-box bg-success text-white me-2 shadow-sm">
                                <MDBIcon fas icon="hand-holding-usd" />
                            </div>
                            <div>
                                <h6 className="fw-bold mb-0 text-dark">Subsidy Configuration</h6>
                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>Set global percentage and fixed values.</small>
                            </div>
                        </div>
                        <MDBBtn color="success" size="sm" className="shadow-sm fw-bold px-3 py-1 hover-lift" style={{ backgroundColor: '#28a745', fontSize: '0.7rem' }} onClick={() => openSubModal()}>
                            <MDBIcon fas icon="plus" className="me-2"/> NEW CONFIG
                        </MDBBtn>
                    </div>
                </div>
            </div>
            
            {/* COMPACT MOBILE-FIRST LEDGER */}
            <div className="bg-white rounded-3 shadow-sm border p-3 animate-fade-in">
                <h6 className="fw-bold text-dark mb-3" style={{ fontSize: '0.85rem' }}>All Configurations Overview</h6>
                
                <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0 border-top text-nowrap">
                        <thead className="bg-light" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                            <tr>
                                <th className="fw-bold py-2 border-0 text-primary">NAME</th>
                                <th className="fw-bold py-2 border-0 text-primary">DESCRIPTION</th>
                                <th className="fw-bold py-2 border-0 text-primary text-center">TYPE</th>
                                <th className="fw-bold py-2 border-0 text-primary text-center">VALUE</th>
                                <th className="fw-bold py-2 border-0 text-primary text-center">STATUS</th>
                                <th className="fw-bold py-2 border-0 text-primary text-end">ACTION</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '0.75rem' }}>
                            {loadingSubsidies ? (
                                <tr><td colSpan="6" className="text-center py-5"><MDBIcon fas icon="spinner" spin size="2x" className="text-primary"/></td></tr>
                            ) : Array.isArray(subsidyTypes) && subsidyTypes.length > 0 ? (
                                subsidyTypes.map((item) => (
                                    <tr key={item.subsidy_idPk || Math.random()} className="border-bottom hover-lift">
                                        <td className="fw-bold text-dark py-1">{item.subsidy_name}</td>
                                        <td className="text-muted py-1">{item.description}</td>
                                        <td className="text-center py-1">
                                            <span className="badge bg-light text-secondary border px-2 py-1" style={{fontSize: '0.65rem'}}>{item.calculation_type}</span>
                                        </td>
                                        <td className="text-center fw-bold text-dark py-1">
                                            {item.calculation_type === 'PERCENTAGE' ? `${item.global_percent_fixed_value}%` : `K ${item.global_percent_fixed_value}`}
                                        </td>
                                        <td className="text-center py-1">
                                            {item.subsidytype_isActive === 1 
                                                ? <span className="badge bg-success rounded-pill px-2 py-1" style={{ fontSize: '0.6...rem' }}>ACTIVE</span> 
                                                : <span className="badge bg-secondary text-dark rounded-pill px-2 py-1" style={{ fontSize: '0.6...rem' }}>INACTIVE</span>}
                                        </td>
                                        <td className="text-end py-1">
                                            <MDBBtn size="sm" color="light" className="shadow-sm border text-primary hover-lift px-2 py-1" style={{fontSize: '0.65rem'}} onClick={() => openSubModal(item)}>
                                                <MDBIcon fas icon="edit" /> Edit
                                            </MDBBtn>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="text-center py-4 text-muted" style={{ fontSize: '0.8rem' }}>No configurations found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}