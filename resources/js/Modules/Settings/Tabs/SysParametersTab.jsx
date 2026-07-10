import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    MDBBtn, MDBIcon, MDBTable, MDBTableHead, MDBTableBody, 
    MDBModal, MDBModalDialog, MDBModalContent, MDBModalHeader, MDBModalTitle, MDBModalBody, MDBModalFooter, MDBInput, MDBBadge
} from 'mdb-react-ui-kit';

export default function SysParametersTab() {
    // State Management
    const [udcTypes, setUdcTypes] = useState([]);
    const [selectedType, setSelectedType] = useState(null);
    const [udcValues, setUdcValues] = useState([]);
    
    // Modal States
    const [typeModal, setTypeModal] = useState(false);
    const [valueModal, setValueModal] = useState(false);
    
    // Form & Error States
    const [typeForm, setTypeForm] = useState({ system_code: '', udc_type: '', type_description: '' });
    const [valueForm, setValueForm] = useState({ id: null, udc_code: '', description_1: '', special_handling_code: '', sort_order: 0, is_active: 1 });
    const [errors, setErrors] = useState({}); // <--- NEW: Error state

    const authHeaders = { headers: { Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}` } };

    // Fetch Data
    const fetchTypes = async () => {
        try {
            const res = await axios.get('/api/system-settings/udc/types', authHeaders);
            setUdcTypes(res.data);
        } catch (err) { console.error("Error fetching UDC types", err); }
    };

    const fetchValues = async (system_code, udc_type) => {
        try {
            const res = await axios.get(`/api/system-settings/udc/values?system_code=${system_code}&udc_type=${udc_type}`, authHeaders);
            setUdcValues(res.data);
        } catch (err) { console.error("Error fetching UDC values", err); }
    };

    useEffect(() => { fetchTypes(); }, []);

    // Handlers
    const handleSelectType = (type) => {
        setSelectedType(type);
        fetchValues(type.system_code, type.udc_type);
    };

    const handleSaveType = async () => {
        setErrors({}); // Clear old errors
        try {
            await axios.post('/api/system-settings/udc/type', typeForm, authHeaders);
            setTypeModal(false);
            fetchTypes();
            setTypeForm({ system_code: '', udc_type: '', type_description: '' });
        } catch (err) { 
            if (err.response && err.response.status === 422) {
                setErrors(err.response.data.errors); // <--- Capture Validation Errors
            } else {
                console.error(err); 
            }
        }
    };

    const handleSaveValue = async () => {
        setErrors({}); // Clear old errors
        try {
            const payload = { ...valueForm, system_code: selectedType.system_code, udc_type: selectedType.udc_type };
            await axios.post('/api/system-settings/udc/value', payload, authHeaders);
            setValueModal(false);
            fetchValues(selectedType.system_code, selectedType.udc_type);
            setValueForm({ id: null, udc_code: '', description_1: '', special_handling_code: '', sort_order: 0, is_active: 1 });
        } catch (err) { 
            if (err.response && err.response.status === 422) {
                setErrors(err.response.data.errors); // <--- Capture Validation Errors
            } else {
                console.error(err); 
            }
        }
    };

    const handleDeleteValue = async (id) => {
        if(!window.confirm("Delete this parameter?")) return;
        try {
            await axios.delete(`/api/system-settings/udc/value/${id}`, authHeaders);
            fetchValues(selectedType.system_code, selectedType.udc_type);
        } catch (err) { console.error(err); }
    };

    // Helper to close modals and clear errors
    const closeTypeModal = () => { setTypeModal(false); setErrors({}); };
    const closeValueModal = () => { 
        setValueModal(false); 
        setErrors({});
        setValueForm({id: null, udc_code: '', description_1: '', special_handling_code: '', sort_order: 0, is_active: 1});
    };

    return (
        <div className="container-fluid py-2">
            <div className="row g-4">
                {/* LEFT PANE: UDC TYPES (Categories) */}
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 rounded-4">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 border-bottom">
                            <h6 className="mb-0 fw-bold text-primary"><MDBIcon fas icon="layer-group" className="me-2"/>System Parameters</h6>
                            <MDBBtn size="sm" color="primary" floating onClick={() => setTypeModal(true)}>
                                <MDBIcon fas icon="plus" />
                            </MDBBtn>
                        </div>
                        <div className="card-body p-0" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            <div className="list-group list-group-flush list-group-light">
                                {udcTypes.map((type, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => handleSelectType(type)}
                                        className={`list-group-item list-group-item-action px-4 py-3 border-0 transition-all duration-300 ${selectedType?.udc_type === type.udc_type ? 'bg-primary text-white shadow-sm' : 'hover:bg-light'}`}
                                    >
                                        <div className="d-flex w-100 justify-content-between">
                                            <h6 className="mb-1 fw-bold">{type.type_description}</h6>
                                        </div>
                                        <small className={selectedType?.udc_type === type.udc_type ? 'text-white-50' : 'text-muted'}>
                                            SYS: <strong className="me-2">{type.system_code}</strong> 
                                            CODE: <strong>{type.udc_type}</strong>
                                        </small>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANE: UDC VALUES */}
                <div className="col-md-8">
                    <div className="card shadow-sm border-0 rounded-4 h-100">
                        {selectedType ? (
                            <>
                                <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 border-bottom">
                                    <h6 className="mb-0 fw-bold text-dark">
                                        Values for: <span className="text-primary">{selectedType.type_description}</span>
                                    </h6>
                                    <MDBBtn size="sm" color="success" className="rounded-pill px-3 shadow-sm" onClick={() => setValueModal(true)}>
                                        <MDBIcon fas icon="plus" className="me-2"/> Add Value
                                    </MDBBtn>
                                </div>
                                <div className="card-body p-0">
                                    <MDBTable align="middle" hover responsive className="mb-0 text-sm">
                                        <MDBTableHead className="bg-light text-muted">
                                            <tr>
                                                <th scope="col" className="fw-bold px-4">Code</th>
                                                <th scope="col" className="fw-bold">Description</th>
                                                <th scope="col" className="fw-bold">Special Handling</th>
                                                <th scope="col" className="fw-bold">Order</th>
                                                <th scope="col" className="fw-bold text-end px-4">Action</th>
                                            </tr>
                                        </MDBTableHead>
                                        <MDBTableBody>
                                            {udcValues.length === 0 && <tr><td colSpan="5" className="text-center py-4 text-muted">No values found.</td></tr>}
                                            {udcValues.map(val => (
                                                <tr key={val.id} className="transition-all hover:bg-gray-50">
                                                    <td className="px-4">
                                                        <MDBBadge color="primary" pill className="px-3 py-2">{val.udc_code}</MDBBadge>
                                                    </td>
                                                    <td className="fw-medium text-dark">{val.description_1}</td>
                                                    <td className="text-muted"><small>{val.special_handling_code || '---'}</small></td>
                                                    <td>{val.sort_order}</td>
                                                    <td className="text-end px-4">
                                                        <MDBBtn color="link" size="sm" className="p-2 text-primary" onClick={() => { setValueForm(val); setValueModal(true); }}>
                                                            <MDBIcon fas icon="edit" />
                                                        </MDBBtn>
                                                        {!val.is_hardcoded && (
                                                            <MDBBtn color="link" size="sm" className="p-2 text-danger" onClick={() => handleDeleteValue(val.id)}>
                                                                <MDBIcon fas icon="trash-alt" />
                                                            </MDBBtn>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </MDBTableBody>
                                    </MDBTable>
                                </div>
                            </>
                        ) : (
                            <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted p-5">
                                <MDBIcon fas icon="mouse-pointer" size="3x" className="mb-3 text-gray-300"/>
                                <h5>Select a Parameter Category</h5>
                                <p>Click on a category from the left panel to manage its values.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL: ADD/EDIT UDC TYPE */}
            <MDBModal open={typeModal} onClose={closeTypeModal} tabIndex="-1">
                <MDBModalDialog centered>
                    <MDBModalContent className="rounded-4 shadow-lg border-0">
                        <MDBModalHeader className="border-bottom-0 pb-0">
                            <MDBModalTitle className="fw-bold">System Category</MDBModalTitle>
                            <MDBBtn className='btn-close' color='none' onClick={closeTypeModal}></MDBBtn>
                        </MDBModalHeader>
                        <MDBModalBody className="pt-4">
                            <div className="d-flex gap-3 mb-4">
                                <div className="flex-grow-1">
                                    <MDBInput label='System Code (e.g. SYS)' value={typeForm.system_code} onChange={(e) => setTypeForm({...typeForm, system_code: e.target.value.toUpperCase()})} />
                                    {errors.system_code && <small className="text-danger">{errors.system_code[0]}</small>}
                                </div>
                                <div className="flex-grow-1">
                                    <MDBInput label='Type Code (e.g. DUR)' value={typeForm.udc_type} onChange={(e) => setTypeForm({...typeForm, udc_type: e.target.value.toUpperCase()})} />
                                    {errors.udc_type && <small className="text-danger">{errors.udc_type[0]}</small>}
                                </div>
                            </div>
                            <MDBInput label='Description (e.g. Course Duration)' value={typeForm.type_description} onChange={(e) => setTypeForm({...typeForm, type_description: e.target.value})} />
                            {errors.type_description && <small className="text-danger">{errors.type_description[0]}</small>}
                        </MDBModalBody>
                        <MDBModalFooter className="border-top-0 pt-0">
                            <MDBBtn color='light' className="rounded-pill" onClick={closeTypeModal}>Cancel</MDBBtn>
                            <MDBBtn color='primary' className="rounded-pill px-4" onClick={handleSaveType}>Save Category</MDBBtn>
                        </MDBModalFooter>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>

            {/* MODAL: ADD/EDIT UDC VALUE */}
            <MDBModal open={valueModal} onClose={closeValueModal} tabIndex="-1">
                <MDBModalDialog centered>
                    <MDBModalContent className="rounded-4 shadow-lg border-0">
                        <MDBModalHeader className="border-bottom-0 pb-0">
                            <MDBModalTitle className="fw-bold">{valueForm.id ? 'Edit' : 'Add'} Value for {selectedType?.type_description}</MDBModalTitle>
                            <MDBBtn className='btn-close' color='none' onClick={closeValueModal}></MDBBtn>
                        </MDBModalHeader>
                        <MDBModalBody className="pt-4">
                            <MDBInput className="mb-2" label='Value Code (e.g. 1Y6M)' value={valueForm.udc_code} onChange={(e) => setValueForm({...valueForm, udc_code: e.target.value.toUpperCase()})} disabled={!!valueForm.id} />
                            {errors.udc_code && <small className="text-danger d-block mb-3">{errors.udc_code[0]}</small>}

                            <MDBInput className="mb-2 mt-3" label='Display Name (e.g. 1 Year 6 Months)' value={valueForm.description_1} onChange={(e) => setValueForm({...valueForm, description_1: e.target.value})} />
                            {errors.description_1 && <small className="text-danger d-block mb-3">{errors.description_1[0]}</small>}

                            <MDBInput className="mb-4 mt-3" label='Special Handling Code (e.g. 18)' value={valueForm.special_handling_code || ''} onChange={(e) => setValueForm({...valueForm, special_handling_code: e.target.value})} />
                            
                            <MDBInput type="number" label='Sort Order' value={valueForm.sort_order} onChange={(e) => setValueForm({...valueForm, sort_order: e.target.value})} />
                        </MDBModalBody>
                        <MDBModalFooter className="border-top-0 pt-0 mt-3">
                            <MDBBtn color='light' className="rounded-pill" onClick={closeValueModal}>Cancel</MDBBtn>
                            <MDBBtn color='success' className="rounded-pill px-4" onClick={handleSaveValue}>Save Value</MDBBtn>
                        </MDBModalFooter>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>
        </div>
    );
}