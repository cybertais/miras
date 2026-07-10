import React, { useState, useEffect } from 'react';
import { MDBBtn, MDBIcon, MDBCheckbox } from 'mdb-react-ui-kit';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../Layouts/DashboardLayout.jsx';
import ValidationErrors from '../../Components/ValidationErrors.jsx';

export default function EditStudentModule() {
    const navigate = useNavigate();
    const { id } = useParams(); // Get the ID from the URL

    const [activeTab, setActiveTab] = useState('personal');
    const [previewMode, setPreviewMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [provincesList, setProvincesList] = useState([]);
    const [llgsList, setLlgsList] = useState([]);
    const [wardsList, setWardsList] = useState([]);

    const [formData, setFormData] = useState({
        givenName: '', middleName: '', surname: '', gender: '', dob: '', phone1: '', phone2: '', email: '', lastSchool: '',
        isOtherProvince: false, llg: '', ward: '', province: '', postalAddress: '', secondaryAddress: '',
        depGivenName: '', depSurname: '', depGender: '', depRelation: '', depEmail: '', depPhone1: '', depPhone2: '', depAddress: '',
        photoPreview: null, photoFile: null
    });

    // 1. Fetch dropdown lists and the existing student's data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [provRes, llgRes, studentRes] = await Promise.all([
                    axios.get('/api/provinces'),
                    axios.get('/api/llgs'),
                    axios.get(`/api/students/${id}`)
                ]);
                
                setProvincesList(provRes.data);
                setLlgsList(llgRes.data);
                
                const data = studentRes.data;
                const isOther = !!data.provinceidfk;

                setFormData({
                    givenName: data.givenName || '',
                    middleName: data.middleName || '',
                    surname: data.surName || '',
                    gender: data.gender || '',
                    dob: data.dob || '',
                    phone1: data.phone1 || '',
                    phone2: data.phone2 || '',
                    email: data.email || '',
                    lastSchool: data.lastschoolattended || '',
                    isOtherProvince: isOther,
                    province: data.provinceidfk || '',
                    ward: data.wardidfk || '',
                    llg: '', // Will be derived if ward exists
                    postalAddress: data.postalAddress || '',
                    secondaryAddress: data.secondaryresidentaladdressintown || '',
                    depGivenName: data.givenName_dependent || '',
                    depSurname: data.surName_dependent || '',
                    depGender: data.gender_dependent || '',
                    depRelation: data.addrelationshiptostudent || '',
                    depEmail: data.email_dependent || '',
                    depPhone1: data.phone1_dependent || '',
                    depPhone2: data.phone2_dependent || '',
                    depAddress: data.guardianresidentaladdress || '',
                    photoPreview: data.personimage ? `/storage/student_images/${data.personimage}` : null,
                    photoFile: null
                });

                // If they have a ward, we need to fetch the wards for their LLG. 
                // Note: In a real app, you might join the LLG ID in the backend show() method to make this easier.
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchInitialData();
    }, [id]);

    useEffect(() => {
        if (formData.llg) {
            axios.get(`/api/wards/${formData.llg}`).then(res => setWardsList(res.data)).catch(err => console.error(err));
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
                setFormData(prev => ({ ...prev, photoPreview: reader.result, photoFile: file }));
            };
            reader.readAsDataURL(file);
        }
    };

    const submitUpdate = async () => {
        setIsSubmitting(true);
        setErrors({}); 
        
        const payload = new FormData();
        Object.keys(formData).forEach(key => {
            if (key !== 'photoPreview' && key !== 'photoFile') {
                payload.append(key, formData[key] === null ? '' : formData[key]);
            }
        });
        if (formData.photoFile) payload.append('photo', formData.photoFile);

        try {
            const response = await axios.post(`/api/students/update/${id}`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                alert(response.data.message);
                navigate('/students'); 
            }
        } catch (error) {
            if (error.response && error.response.status === 422) {
                setErrors(error.response.data.errors);
                setPreviewMode(false); 
                window.scrollTo({ top: 0, behavior: 'smooth' }); 
            } else {
                console.error("Error updating applicant", error);
                alert("A server error occurred during update.");
            }
        }
        setIsSubmitting(false);
    };

    const getProvinceName = (id) => provincesList.find(p => p.provinceId == id)?.pro_name || '-';
    const getLlgName = (id) => llgsList.find(l => l.llgIdPk == id)?.llgName || '-';
    const getWardName = (id) => wardsList.find(w => w.wardIdPk == id)?.wardName || '-';

    const TabLink = ({ tabId, label }) => {
        const isActive = activeTab === tabId;
        return (
            <div 
                className={`py-2 px-3 text-center ${isActive ? 'fw-bold' : 'text-muted'}`}
                style={{ cursor: 'pointer', borderBottom: isActive ? '3px solid #800000' : '3px solid transparent', transition: '0.3s', fontSize: '0.85rem' }}
                onClick={() => !previewMode && setActiveTab(tabId)}
            >
                {label}
            </div>
        );
    };

    if (isLoadingData) {
        return <DashboardLayout pageTitle="Loading..."><div className="text-center mt-5">Loading applicant data...</div></DashboardLayout>;
    }

    return (
        <DashboardLayout 
            pageTitle="MIRAS Edit Applicant" 
            breadcrumbs={[{ label: "Home", url: "/" }, { label: "Students Management", url: "/students" }, "Edit"]}
        >
            <div className="mb-2">
                <MDBBtn color="link" className="text-primary px-0 shadow-0" onClick={() => navigate('/students')} style={{ textTransform: 'none', fontSize: '0.9rem' }}>
                    <MDBIcon fas icon="arrow-circle-left" className="me-2 fs-5" /> Back
                </MDBBtn>
            </div>

            <div className="card shadow-sm border-0 mb-4" style={{ backgroundColor: '#fff' }}>
                <div className="card-header bg-white py-3 border-bottom">
                    <h6 className="mb-0 fw-bold text-dark">Edit Applicant Details</h6>
                </div>
                
                <div className="card-body p-4" style={{ backgroundColor: '#faf9f7' }}>
                    
                    <ValidationErrors errors={errors} />

                    {!previewMode && (
                        <div className="d-flex flex-wrap justify-content-between justify-content-md-start mb-4 bg-white rounded shadow-sm px-2 pt-2">
                            <TabLink tabId="personal" label="PERSONAL INFORMATION" />
                            <TabLink tabId="location" label="LOCATION & ADDRESS DETAILS" />
                            <TabLink tabId="guardian" label="GUARDIAN / DEPENDENT INFORMATION" />
                            <TabLink tabId="photo" label="UPLOAD FACE PHOTO" />
                        </div>
                    )}

                    {previewMode && (
                        <div className="alert alert-warning fw-bold text-center border-warning shadow-sm">
                            <MDBIcon fas icon="exclamation-triangle" className="me-2"/>
                            PREVIEW MODE: Please review your information before saving changes.
                        </div>
                    )}

                    <div className="bg-white p-4 rounded shadow-sm border">
                        
                        {previewMode ? (
                            <div className="row" style={{ fontSize: '0.9rem' }}>
                                <div className="col-md-9">
                                    {/* Same Preview markup as Register Student */}
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
                                {/* Same Form markup as Register Student */}
                                {activeTab === 'personal' && (
                                    <div className="row g-3">
                                        <div className="col-md-4"><input type="text" className="form-control" name="givenName" value={formData.givenName} onChange={handleChange} placeholder="Enter Given Name" /></div>
                                        <div className="col-md-4"><input type="text" className="form-control" name="middleName" value={formData.middleName} onChange={handleChange} placeholder="Enter Middle Name" /></div>
                                        <div className="col-md-4"><input type="text" className="form-control" name="surname" value={formData.surname} onChange={handleChange} placeholder="Enter Surname" /></div>
                                        <div className="col-md-4">
                                            <select className="form-select text-muted" name="gender" value={formData.gender} onChange={handleChange}>
                                                <option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option>
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
                                        <div className="col-md-4 d-flex align-items-center"><MDBCheckbox name="isOtherProvince" id="otherProvince" label="Other Province" checked={formData.isOtherProvince} onChange={handleChange} /></div>
                                        {!formData.isOtherProvince ? (
                                            <><div className="col-md-4"><select className="form-select text-muted" name="llg" value={formData.llg} onChange={handleChange}><option value="">Select LLG</option>{llgsList.map(item => (<option key={item.llgIdPk} value={item.llgIdPk}>{item.llgName}</option>))}</select></div><div className="col-md-4"><select className="form-select text-muted" name="ward" value={formData.ward} onChange={handleChange} disabled={!formData.llg}><option value="">Select Ward</option>{wardsList.map(item => (<option key={item.wardIdPk} value={item.wardIdPk}>{item.wardName}</option>))}</select></div></>
                                        ) : (
                                            <div className="col-md-8"><select className="form-select text-muted" name="province" value={formData.province} onChange={handleChange}><option value="">Select Province</option>{provincesList.map(item => (<option key={item.provinceId} value={item.provinceId}>{item.pro_name}</option>))}</select></div>
                                        )}
                                        <div className="col-md-6"><input type="text" className="form-control" name="postalAddress" value={formData.postalAddress} onChange={handleChange} placeholder="Enter Postal Address" /></div>
                                        <div className="col-md-6"><input type="text" className="form-control" name="secondaryAddress" value={formData.secondaryAddress} onChange={handleChange} placeholder="Enter Secondary Residential Address in town" /></div>
                                    </div>
                                )}

                                {activeTab === 'guardian' && (
                                    <div className="row g-3">
                                        <div className="col-md-4"><input type="text" className="form-control" name="depGivenName" value={formData.depGivenName} onChange={handleChange} placeholder="Enter Dependent's Name" /></div>
                                        <div className="col-md-4"><input type="text" className="form-control" name="depSurname" value={formData.depSurname} onChange={handleChange} placeholder="Enter Dependent's Surname" /></div>
                                        <div className="col-md-4"><select className="form-select text-muted" name="depGender" value={formData.depGender} onChange={handleChange}><option value="">Choose a Dependent Gender</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                                        <div className="col-md-4"><input type="text" className="form-control" name="depRelation" value={formData.depRelation} onChange={handleChange} placeholder="Enter Relationship to Student" /></div>
                                        <div className="col-md-4"><input type="email" className="form-control" name="depEmail" value={formData.depEmail} onChange={handleChange} placeholder="Enter Dependent Email" /></div>
                                        <div className="col-md-4"><input type="text" className="form-control" name="depPhone1" value={formData.depPhone1} onChange={handleChange} placeholder="Enter Dependent (Primary)" /></div>
                                        <div className="col-md-4"><input type="text" className="form-control" name="depPhone2" value={formData.depPhone2} onChange={handleChange} placeholder="Enter Dependent (Alternate Contact)" /></div>
                                        <div className="col-md-8"><input type="text" className="form-control" name="depAddress" value={formData.depAddress} onChange={handleChange} placeholder="Enter Guardian Residential Address" /></div>
                                    </div>
                                )}

                                {activeTab === 'photo' && (
                                    <div className="p-3 border rounded bg-light">
                                        <h6 className="fw-bold mb-3">Update Photo</h6>
                                        <div className="mb-3"><input type="file" className="form-control" accept="image/*" onChange={handlePhotoChange} /></div>
                                        <h6 className="fw-bold mb-2">Image Preview</h6>
                                        <div className="border bg-white rounded d-flex align-items-center justify-content-center" style={{ minHeight: '150px', width: '150px' }}>
                                            {formData.photoPreview ? <img src={formData.photoPreview} alt="Preview" className="img-fluid rounded" /> : <span className="text-muted small">No Image</span>}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="d-flex justify-content-end mt-4">
                        {!previewMode ? (
                            <MDBBtn color="success" className="shadow-0 fw-bold" onClick={() => setPreviewMode(true)}>
                                <MDBIcon fas icon="search" className="me-2" /> PREVIEW BEFORE SAVING
                            </MDBBtn>
                        ) : (
                            <>
                                <MDBBtn color="light" className="shadow-0 fw-bold border me-3" onClick={() => setPreviewMode(false)} disabled={isSubmitting}>
                                    <MDBIcon fas icon="edit" className="me-2" /> EDIT INFORMATION
                                </MDBBtn>
                                <MDBBtn color="warning" className="shadow-0 fw-bold" onClick={submitUpdate} disabled={isSubmitting}>
                                    {isSubmitting ? <span><MDBIcon fas icon="spinner" spin className="me-2"/> SAVING...</span> : <span><MDBIcon fas icon="save" className="me-2" /> UPDATE APPLICANT</span>}
                                </MDBBtn>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}