import React, { useState, useEffect } from 'react';
import { MDBBtn, MDBIcon } from 'mdb-react-ui-kit';
import axios from 'axios';

export default function DdaProfileTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const [formData, setFormData] = useState({
        longname: '', shortname: '', initial: '', slogan: '',
        postaladdress: '', office_location: '', email: '',
        phone1: '', phone2: '', landline1: '', landline2: '', whatsappnumber: '',
        fblink: '', linkedin: '', tiktoklink: '',
        bank_name: '', bank_branch_code: '', bank_account_name: '', bank_account_number: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/system-settings/dda-profile');
            if (res.data) {
                // Merge fetched data to avoid null values breaking controlled inputs
                setFormData(prev => ({
                    ...prev,
                    ...Object.fromEntries(Object.entries(res.data).map(([k, v]) => [k, v === null ? '' : v]))
                }));
            }
        } catch (error) {
            console.error("Error fetching DDA Profile", error);
            showAlert('danger', 'Failed to load profile data.');
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await axios.post('/api/system-settings/dda-profile', formData);
            if (res.data.success) {
                showAlert('success', 'DDA Profile updated successfully!');
            }
        } catch (error) {
            console.error("Error saving DDA Profile", error);
            // Catch the exact server error and display it on the UI
            const errorMsg = error.response?.data?.message || 'Failed to save profile data.';
            showAlert('danger', errorMsg);
        }
        setSaving(false);
    };

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
        setTimeout(() => setAlert({ show: false, type: '', message: '' }), 4000);
    };

    if (loading) {
        return <div className="text-center py-5"><MDBIcon fas icon="spinner" spin size="2x" className="text-primary"/></div>;
    }

    return (
        <form onSubmit={handleSubmit} className="fade-in">
            {/* Action Bar */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded-4 shadow-sm border">
                <div>
                    <h6 className="mb-0 fw-bold text-dark"><MDBIcon fas icon="building" className="me-2 text-primary"/> DDA Profile Settings</h6>
                    <small className="text-muted">Manage global organization variables and contact info.</small>
                </div>
                <div className="d-flex align-items-center">
                    {alert.show && <span className={`text-${alert.type} fw-bold me-3 small`}><MDBIcon fas icon={alert.type === 'success' ? 'check-circle' : 'exclamation-circle'} className="me-1"/>{alert.message}</span>}
                    <MDBBtn type="submit" color="success" className="shadow-sm fw-bold" disabled={saving}>
                        {saving ? <MDBIcon fas icon="spinner" spin className="me-2" /> : <MDBIcon fas icon="save" className="me-2" />} SAVE PROFILE
                    </MDBBtn>
                </div>
            </div>

            <div className="row g-3">
                {/* 1. Identity Information */}
                <div className="col-12 col-xl-6">
                    <div className="card shadow-sm border-0 rounded-4 h-100">
                        <div className="card-header bg-white p-3 border-bottom"><h6 className="mb-0 fw-bold text-dark">Identity & Branding</h6></div>
                        <div className="card-body p-4 row g-3">
                            <div className="col-12">
                                <label className="form-label small fw-bold text-muted mb-1">Organization Long Name</label>
                                <input type="text" name="longname" className="form-control bg-light" value={formData.longname} onChange={handleChange} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold text-muted mb-1">Short Name</label>
                                <input type="text" name="shortname" className="form-control bg-light" value={formData.shortname} onChange={handleChange} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold text-muted mb-1">Initials / Acronym</label>
                                <input type="text" name="initial" className="form-control bg-light" value={formData.initial} onChange={handleChange} />
                            </div>
                            <div className="col-12">
                                <label className="form-label small fw-bold text-muted mb-1">Organization Slogan</label>
                                <input type="text" name="slogan" className="form-control bg-light" value={formData.slogan} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Contact Information */}
                <div className="col-12 col-xl-6">
                    <div className="card shadow-sm border-0 rounded-4 h-100">
                        <div className="card-header bg-white p-3 border-bottom"><h6 className="mb-0 fw-bold text-dark">Contact Telecommunications</h6></div>
                        <div className="card-body p-4 row g-3">
                            <div className="col-md-6">
                                <label className="form-label small fw-bold text-muted mb-1">Phone 1</label>
                                <input type="text" name="phone1" className="form-control bg-light" value={formData.phone1} onChange={handleChange} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold text-muted mb-1">Phone 2</label>
                                <input type="text" name="phone2" className="form-control bg-light" value={formData.phone2} onChange={handleChange} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold text-muted mb-1">Landline 1</label>
                                <input type="text" name="landline1" className="form-control bg-light" value={formData.landline1} onChange={handleChange} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold text-muted mb-1">Landline 2</label>
                                <input type="text" name="landline2" className="form-control bg-light" value={formData.landline2} onChange={handleChange} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold text-muted mb-1">WhatsApp Number</label>
                                <input type="text" name="whatsappnumber" className="form-control bg-light" value={formData.whatsappnumber} onChange={handleChange} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold text-muted mb-1">Official Email</label>
                                <input type="email" name="email" className="form-control bg-light" value={formData.email} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Bank & Financial Information */}
                <div className="col-12 col-xl-6">
                    <div className="card shadow-sm border-0 rounded-4 h-100">
                        <div className="card-header bg-white p-3 border-bottom"><h6 className="mb-0 fw-bold text-dark">Default Banking Information</h6></div>
                        <div className="card-body p-4 row g-3">
                            <div className="col-md-6">
                                <label className="form-label small fw-bold text-muted mb-1">Bank Name</label>
                                <input type="text" name="bank_name" className="form-control bg-light" value={formData.bank_name} onChange={handleChange} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold text-muted mb-1">Branch Code / BSB</label>
                                <input type="text" name="bank_branch_code" className="form-control bg-light" value={formData.bank_branch_code} onChange={handleChange} />
                            </div>
                            <div className="col-12">
                                <label className="form-label small fw-bold text-muted mb-1">Account Name</label>
                                <input type="text" name="bank_account_name" className="form-control bg-light" value={formData.bank_account_name} onChange={handleChange} />
                            </div>
                            <div className="col-12">
                                <label className="form-label small fw-bold text-muted mb-1">Account Number</label>
                                <input type="text" name="bank_account_number" className="form-control bg-light" value={formData.bank_account_number} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Location & Social Links */}
                <div className="col-12 col-xl-6 d-flex flex-column gap-3">
                    <div className="card shadow-sm border-0 rounded-4 flex-grow-1">
                        <div className="card-header bg-white p-3 border-bottom"><h6 className="mb-0 fw-bold text-dark">Addresses & Location</h6></div>
                        <div className="card-body p-4 row g-3">
                            <div className="col-12">
                                <label className="form-label small fw-bold text-muted mb-1">Office Location (Physical)</label>
                                <textarea name="office_location" className="form-control bg-light" rows="2" value={formData.office_location} onChange={handleChange}></textarea>
                            </div>
                            <div className="col-12">
                                <label className="form-label small fw-bold text-muted mb-1">Postal Address</label>
                                <textarea name="postaladdress" className="form-control bg-light" rows="2" value={formData.postaladdress} onChange={handleChange}></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm border-0 rounded-4 flex-grow-1">
                        <div className="card-header bg-white p-3 border-bottom"><h6 className="mb-0 fw-bold text-dark">Social Media Links</h6></div>
                        <div className="card-body p-4 row g-3">
                            <div className="col-md-4">
                                <label className="form-label small fw-bold text-muted mb-1"><MDBIcon fab icon="facebook" className="text-primary me-1"/> Facebook</label>
                                <input type="text" name="fblink" className="form-control bg-light" value={formData.fblink} onChange={handleChange} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold text-muted mb-1"><MDBIcon fab icon="linkedin" className="text-info me-1"/> LinkedIn</label>
                                <input type="text" name="linkedin" className="form-control bg-light" value={formData.linkedin} onChange={handleChange} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold text-muted mb-1"><MDBIcon fab icon="tiktok" className="text-dark me-1"/> TikTok</label>
                                <input type="text" name="tiktoklink" className="form-control bg-light" value={formData.tiktoklink} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}