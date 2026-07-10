import React, { useState, useEffect } from 'react';
import { MDBBtn, MDBIcon, MDBCheckbox } from 'mdb-react-ui-kit';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../Layouts/DashboardLayout.jsx';
import ValidationErrors from '../../Components/ValidationErrors.jsx';

export default function RegisterStudentModule() {
    const navigate = useNavigate();

    // UI States
    const [activeTab, setActiveTab] = useState('personal');
    const [previewMode, setPreviewMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dynamic Dropdown States
    const [provincesList, setProvincesList] = useState([]);
    const [llgsList, setLlgsList] = useState([]);
    const [wardsList, setWardsList] = useState([]);

    const [errors, setErrors] = useState({}); // <-- Add this state

    // Form Data State
    const [formData, setFormData] = useState({
        // Personal
        givenName: '', middleName: '', surname: '', gender: '', dob: '', phone1: '', phone2: '', email: '', lastSchool: '',
        // Location
        isOtherProvince: false, llg: '', ward: '', province: '', postalAddress: '', secondaryAddress: '',
        // Guardian
        depGivenName: '', depSurname: '', depGender: '', depRelation: '', depEmail: '', depPhone1: '', depPhone2: '', depAddress: '',
        // Photo
        photoPreview: null,
        photoFile: null // Track the actual File object for backend upload
    });

    useEffect(() => {
        axios.get('/api/provinces').then(res => setProvincesList(res.data)).catch(err => console.error(err));
        axios.get('/api/llgs').then(res => setLlgsList(res.data)).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (formData.llg) {
            axios.get(`/api/wards/${formData.llg}`)
                .then(res => setWardsList(res.data))
                .catch(err => console.error(err));
        } else {
            setWardsList([]); 
        }
    }, [formData.llg]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: type === 'checkbox' ? checked : value };
            if (name === 'llg') newData.ward = '';
            if (name === 'isOtherProvince') {
                newData.llg = ''; newData.ward = ''; newData.province = '';
            }
            return newData;
        });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ 
                    ...prev, 
                    photoPreview: reader.result,
                    photoFile: file // Save the file for API upload
                }));
            };
            reader.readAsDataURL(file);
        }
    };

   // --- SUBMIT REGISTRATION LOGIC ---
    const submitRegistration = async () => {
        setIsSubmitting(true);
        setErrors({}); // Clear old errors
        
        const payload = new FormData();
        Object.keys(formData).forEach(key => {
            if (key !== 'photoPreview' && key !== 'photoFile') {
                payload.append(key, formData[key] === null ? '' : formData[key]);
            }
        });
        if (formData.photoFile) payload.append('photo', formData.photoFile);

        try {
            const response = await axios.post('/api/students/register', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                alert(response.data.message);
                navigate('/students');
            }
        } catch (error) {
            // Check if Laravel returned a 422 Validation Error
            if (error.response && error.response.status === 422) {
                setErrors(error.response.data.errors);
                setPreviewMode(false); // Kick them back to edit mode to see the errors
                // Optional: Scroll to the top of the page so they see the error box
                window.scrollTo({ top: 0, behavior: 'smooth' }); 
            } else {
                console.error("Error registering applicant", error);
                alert("A server error occurred during registration.");
            }
        }
        setIsSubmitting(false);
    };

    // Helper functions for Preview Screen
    const getProvinceName = (id) => provincesList.find(p => p.provinceId == id)?.pro_name || '-';
    const getLlgName = (id) => llgsList.find(l => l.llgIdPk == id)?.llgName || '-';
    const getWardName = (id) => wardsList.find(w => w.wardIdPk == id)?.wardName || '-';

    const TabLink = ({ id, label }) => {
        const isActive = activeTab === id;
        return (
            <div 
                className={`py-2 px-3 text-center ${isActive ? 'fw-bold' : 'text-muted'}`}
                style={{ 
                    cursor: 'pointer', borderBottom: isActive ? '3px solid #800000' : '3px solid transparent',
                    transition: '0.3s', fontSize: '0.85rem'
                }}
                onClick={() => !previewMode && setActiveTab(id)}
            >
                {label}
            </div>
        );
    };

    return (
        <DashboardLayout 
            pageTitle="MIRAS Register" 
            breadcrumbs={[{ label: "Home", url: "/" }, { label: "Students Management", url: "/students" }, "Register"]}
        >
            <div className="mb-2">
                <MDBBtn color="link" className="text-primary px-0 shadow-0" onClick={() => navigate('/students')} style={{ textTransform: 'none', fontSize: '0.9rem' }}>
                    <MDBIcon fas icon="arrow-circle-left" className="me-2 fs-5" /> Back
                </MDBBtn>
            </div>

            <div className="card shadow-sm border-0 mb-4" style={{ backgroundColor: '#fff' }}>
                <div className="card-header bg-white py-3 border-bottom">
                    <h6 className="mb-0 fw-bold text-dark">Register New Person</h6>
                </div>
                
                <div className="card-body p-4" style={{ backgroundColor: '#faf9f7' }}>

                    {/* Render Global Validation Errors Component */}
                    <ValidationErrors errors={errors} />
                    
                    {!previewMode && (
                        <div className="d-flex flex-wrap justify-content-between justify-content-md-start mb-4 bg-white rounded shadow-sm px-2 pt-2">
                            <TabLink id="personal" label="PERSONAL INFORMATION" />
                            <TabLink id="location" label="LOCATION & ADDRESS DETAILS" />
                            <TabLink id="guardian" label="GUARDIAN / DEPENDENT INFORMATION" />
                            <TabLink id="photo" label="UPLOAD FACE PHOTO" />
                        </div>
                    )}

                    {previewMode && (
                        <div className="alert alert-warning fw-bold text-center border-warning shadow-sm">
                            <MDBIcon fas icon="exclamation-triangle" className="me-2"/>
                            PREVIEW MODE: Please review your information before final registration.
                        </div>
                    )}

                    <div className="bg-white p-4 rounded shadow-sm border">
                        
                        {previewMode ? (
                            <div className="row" style={{ fontSize: '0.9rem' }}>
                                <div className="col-md-9">
                                    <h6 className="fw-bold text-primary border-bottom pb-2">Personal Information</h6>
                                    <div className="row mb-3">
                                        <div className="col-4"><span className="text-muted">Full Name:</span><br/>{formData.givenName} {formData.middleName} {formData.surname}</div>
                                        <div className="col-4"><span className="text-muted">Gender:</span><br/>{formData.gender || '-'}</div>
                                        <div className="col-4"><span className="text-muted">DOB:</span><br/>{formData.dob || '-'}</div>
                                    </div>
                                    <div className="row mb-4">
                                        <div className="col-4"><span className="text-muted">Phone:</span><br/>{formData.phone1} / {formData.phone2}</div>
                                        <div className="col-4"><span className="text-muted">Email:</span><br/>{formData.email || '-'}</div>
                                        <div className="col-4"><span className="text-muted">Last School:</span><br/>{formData.lastSchool || '-'}</div>
                                    </div>

                                    <h6 className="fw-bold text-primary border-bottom pb-2">Location & Address</h6>
                                    <div className="row mb-4">
                                        <div className="col-4"><span className="text-muted">Province origin:</span><br/>{formData.isOtherProvince ? getProvinceName(formData.province) : 'Middle Ramu (Default)'}</div>
                                        <div className="col-4"><span className="text-muted">LLG / Ward:</span><br/>{formData.isOtherProvince ? 'N/A' : `${getLlgName(formData.llg)} / ${getWardName(formData.ward)}`}</div>
                                        <div className="col-4"><span className="text-muted">Addresses:</span><br/>{formData.postalAddress}<br/>{formData.secondaryAddress}</div>
                                    </div>

                                    <h6 className="fw-bold text-primary border-bottom pb-2">Guardian / Dependent</h6>
                                    <div className="row mb-2">
                                        <div className="col-4"><span className="text-muted">Name:</span><br/>{formData.depGivenName} {formData.depSurname}</div>
                                        <div className="col-4"><span className="text-muted">Relation:</span><br/>{formData.depRelation || '-'}</div>
                                        <div className="col-4"><span className="text-muted">Contact:</span><br/>{formData.depPhone1} / {formData.depEmail}</div>
                                    </div>
                                </div>
                                <div className="col-md-3 text-center border-start">
                                    <h6 className="fw-bold text-primary border-bottom pb-2">Applicant Photo</h6>
                                    {formData.photoPreview ? (
                                        <img src={formData.photoPreview} alt="Applicant" className="img-thumbnail mt-2" style={{ maxHeight: '200px' }} />
                                    ) : (
                                        <div className="text-muted mt-5"><MDBIcon fas icon="user-circle" className="fs-1 mb-2"/><br/>No Photo Uploaded</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'personal' && (
                                    <div className="row g-3">
                                        <div className="col-md-4"><input type="text" className="form-control" name="givenName" value={formData.givenName} onChange={handleChange} placeholder="Enter Given Name" /></div>
                                        <div className="col-md-4"><input type="text" className="form-control" name="middleName" value={formData.middleName} onChange={handleChange} placeholder="Enter Middle Name" /></div>
                                        <div className="col-md-4"><input type="text" className="form-control" name="surname" value={formData.surname} onChange={handleChange} placeholder="Enter Surname" /></div>
                                        
                                        <div className="col-md-4">
                                            <select className="form-select text-muted" name="gender" value={formData.gender} onChange={handleChange}>
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                        <div className="col-md-4"><input type="date" className="form-control text-muted" name="dob" value={formData.dob} onChange={handleChange} /></div>
                                        <div className="col-md-4"><input type="text" className="form-control" name="phone1" value={formData.phone1} onChange={handleChange} placeholder="Enter Phone (Primary)" /></div>
                                        
                                        <div className="col-md-4"><input type="text" className="form-control" name="phone2" value={formData.phone2} onChange={handleChange} placeholder="Enter Phone (Alternate)" /></div>
                                        <div className="col-md-4"><input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} placeholder="Enter Email" /></div>
                                        <div className="col-md-4"><input type="text" className="form-control" name="lastSchool" value={formData.lastSchool} onChange={handleChange} placeholder="Enter Last School Attended" /></div>
                                    </div>
                                )}

                                {activeTab === 'location' && (
                                    <div className="row g-3">
                                        <div className="col-md-4 d-flex align-items-center">
                                            <MDBCheckbox name="isOtherProvince" id="otherProvince" label="Other Province" checked={formData.isOtherProvince} onChange={handleChange} />
                                        </div>
                                        
                                        {!formData.isOtherProvince ? (
                                            <>
                                                <div className="col-md-4">
                                                    <select className="form-select text-muted" name="llg" value={formData.llg} onChange={handleChange}>
                                                        <option value="">Select LLG</option>
                                                        {llgsList.map(item => (
                                                            <option key={item.llgIdPk} value={item.llgIdPk}>{item.llgName}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-md-4">
                                                    <select className="form-select text-muted" name="ward" value={formData.ward} onChange={handleChange} disabled={!formData.llg}>
                                                        <option value="">Select Ward (Choose LLG First)</option>
                                                        {wardsList.map(item => (
                                                            <option key={item.wardIdPk} value={item.wardIdPk}>{item.wardName}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="col-md-8">
                                                <select className="form-select text-muted" name="province" value={formData.province} onChange={handleChange}>
                                                    <option value="">Select Province</option>
                                                    {provincesList.map(item => (
                                                        <option key={item.provinceId} value={item.provinceId}>{item.pro_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="col-md-6"><input type="text" className="form-control" name="postalAddress" value={formData.postalAddress} onChange={handleChange} placeholder="Enter Postal Address" /></div>
                                        <div className="col-md-6"><input type="text" className="form-control" name="secondaryAddress" value={formData.secondaryAddress} onChange={handleChange} placeholder="Enter Secondary Residential Address in town" /></div>
                                    </div>
                                )}

                                {activeTab === 'guardian' && (
                                    <div className="row g-3">
                                        <div className="col-md-4"><input type="text" className="form-control" name="depGivenName" value={formData.depGivenName} onChange={handleChange} placeholder="Enter Dependent's Name" /></div>
                                        <div className="col-md-4"><input type="text" className="form-control" name="depSurname" value={formData.depSurname} onChange={handleChange} placeholder="Enter Dependent's Surname" /></div>
                                        <div className="col-md-4">
                                            <select className="form-select text-muted" name="depGender" value={formData.depGender} onChange={handleChange}>
                                                <option value="">Choose a Dependent Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                        
                                        <div className="col-md-4"><input type="text" className="form-control" name="depRelation" value={formData.depRelation} onChange={handleChange} placeholder="Enter Relationship to Student" /></div>
                                        <div className="col-md-4"><input type="email" className="form-control" name="depEmail" value={formData.depEmail} onChange={handleChange} placeholder="Enter Dependent Email" /></div>
                                        <div className="col-md-4"><input type="text" className="form-control" name="depPhone1" value={formData.depPhone1} onChange={handleChange} placeholder="Enter Dependent (Primary)" /></div>
                                        
                                        <div className="col-md-4"><input type="text" className="form-control" name="depPhone2" value={formData.depPhone2} onChange={handleChange} placeholder="Enter Dependent (Alternate Contact)" /></div>
                                        <div className="col-md-8"><input type="text" className="form-control" name="depAddress" value={formData.depAddress} onChange={handleChange} placeholder="Enter Guardian Residential Address" /></div>
                                    </div>
                                )}

                                {activeTab === 'photo' && (
                                    <div className="p-3 border rounded bg-light">
                                        <h6 className="fw-bold mb-3">Upload Photo</h6>
                                        <div className="mb-3">
                                            <input type="file" className="form-control" accept="image/*" onChange={handlePhotoChange} />
                                        </div>
                                        <h6 className="fw-bold mb-2">Image Preview</h6>
                                        <div className="border bg-white rounded d-flex align-items-center justify-content-center" style={{ minHeight: '150px', width: '150px' }}>
                                            {formData.photoPreview ? (
                                                <img src={formData.photoPreview} alt="Preview" className="img-fluid rounded" />
                                            ) : (
                                                <span className="text-muted small">No Image</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="d-flex justify-content-end mt-4">
                        {!previewMode ? (
                            <MDBBtn color="success" className="shadow-0 fw-bold" onClick={() => setPreviewMode(true)}>
                                <MDBIcon fas icon="search" className="me-2" /> PREVIEW BEFORE REGISTERING
                            </MDBBtn>
                        ) : (
                            <>
                                <MDBBtn color="light" className="shadow-0 fw-bold border me-3" onClick={() => setPreviewMode(false)} disabled={isSubmitting}>
                                    <MDBIcon fas icon="edit" className="me-2" /> EDIT INFORMATION
                                </MDBBtn>
                                <MDBBtn color="success" className="shadow-0 fw-bold" onClick={submitRegistration} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <span><MDBIcon fas icon="spinner" spin className="me-2"/> SAVING...</span>
                                    ) : (
                                        <span><MDBIcon fas icon="paper-plane" className="me-2" /> REGISTER APPLICANT</span>
                                    )}
                                </MDBBtn>
                            </>
                        )}
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}