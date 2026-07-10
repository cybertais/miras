import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MDBIcon, MDBBtn } from 'mdb-react-ui-kit';
import axios from 'axios';

export default function RolesUsersTab() {
    const [activeSubTab, setActiveSubTab] = useState('users');
    const [loading, setLoading] = useState(true);
    
    // RBAC Data States
    const [persons, setPersons] = useState([]);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [rolePermissions, setRolePermissions] = useState([]);

    // Modal & Form States
    const [showUserModal, setShowUserModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    
    const [formData, setFormData] = useState({
        userId: null, 
        isNewPerson: false,
        personId: '',
        givenName: '',
        surName: '',
        username: '',
        password: '',
        roleId: '',
        status: 'Active',
        photoFile: null,
        photoPreview: null,
        removePhoto: false // <-- NEW: Flag to tell backend to delete the image
    });

    const authHeaders = { headers: { Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}` } };

    useEffect(() => {
        fetchRbacData();
    }, []);

    const fetchRbacData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/system-settings/rbac', authHeaders);
            if (res.data.success) {
                setPersons(res.data.persons || []);
                setUsers(res.data.users || []);
                setRoles(res.data.roles || []);
                setPermissions(res.data.permissions || []);
                setRolePermissions(res.data.rolePermissions || []);
            }
        } catch (error) {
            console.error("Error fetching RBAC data", error);
        }
        setLoading(false);
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Render new preview, store file for upload, and unflag removal
                setFormData(prev => ({ ...prev, photoPreview: reader.result, photoFile: file, removePhoto: false }));
            };
            reader.readAsDataURL(file);
        }
    };

    const openUserModal = () => {
        setErrors({});
        setFormData({ userId: null, isNewPerson: false, personId: '', givenName: '', surName: '', username: '', password: '', roleId: '', status: 'Active', photoFile: null, photoPreview: null, removePhoto: false });
        setShowUserModal(true);
    };

    const handleEditUser = (user) => {
        setErrors({});
        const roleObj = roles.find(r => r.roleName === user.roleName);
        const nameParts = user.personName ? user.personName.split(' ') : ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        setFormData({
            userId: user.id, // Set the ID so we know we are editing
            isNewPerson: true, // We treat edits as "New Person" form to edit the name
            personId: user.personIdPk || '', // Store original person ID for backend linking
            givenName: firstName,
            surName: lastName,
            username: user.username,
            password: '', // Leave blank unless they want to change it
            roleId: roleObj ? roleObj.id : '',
            status: user.accountStatus,
            photoFile: null,
            photoPreview: null // Could load existing image here if returned by API
        });
        setShowUserModal(true);
    };

    const handleCreateUser = async () => {
        setErrors({});
        setIsSubmitting(true);
        try {
            const payload = new FormData();
            payload.append('isNewPerson', formData.isNewPerson ? 1 : 0);
            
            if (formData.userId) {
                payload.append('userId', formData.userId);
                payload.append('personId', formData.personId); 
            } else if (!formData.isNewPerson) {
                payload.append('personId', formData.personId);
            } 
            
            if (formData.isNewPerson || formData.userId) {
                payload.append('givenName', formData.givenName);
                payload.append('surName', formData.surName);
                if (formData.photoFile) payload.append('photo', formData.photoFile);
                if (formData.removePhoto) payload.append('removePhoto', '1'); // Tell backend to wipe image
            }
            
            payload.append('username', formData.username);
            if (!formData.userId || formData.password) {
                 payload.append('password', formData.password);
            }
           
            payload.append('roleId', formData.roleId);
            payload.append('status', formData.status);

            if (formData.userId) {
                payload.append('_method', 'PUT'); 
                await axios.post(`/api/system-settings/rbac/user/${formData.userId}`, payload, {
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                await axios.post('/api/system-settings/rbac/user', payload, {
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            }
            
            setShowUserModal(false);
            fetchRbacData(); 
        } catch (err) {
            if (err.response && err.response.status === 422) {
                setErrors(err.response.data.errors);
            } else {
                alert("An error occurred while saving the user.");
            }
        }
        setIsSubmitting(false);
    };

    const handleStatusChange = async (userId, newStatus) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, accountStatus: newStatus } : u));
        try {
            await axios.post('/api/system-settings/rbac/user/status', { userId, status: newStatus }, authHeaders);
        } catch (error) {
            alert("Failed to update user status.");
            fetchRbacData(); 
        }
    };

    const checkPermission = (roleId, permissionId) => {
        return rolePermissions.some(rp => rp.roleIdFk === roleId && rp.permissionIdFk === permissionId);
    };

    const handleTogglePermission = async (roleId, permissionId, hasPermission) => {
        const action = hasPermission ? 'revoke' : 'grant';
        let updatedPermissions = [...rolePermissions];
        if (action === 'grant') {
            updatedPermissions.push({ roleIdFk: roleId, permissionIdFk: permissionId });
        } else {
            updatedPermissions = updatedPermissions.filter(rp => !(rp.roleIdFk === roleId && rp.permissionIdFk === permissionId));
        }
        setRolePermissions(updatedPermissions);

        try {
            await axios.post('/api/system-settings/rbac/permission', { roleId, permissionId, action }, authHeaders);
        } catch (error) {
            alert("Failed to update permission.");
            fetchRbacData();
        }
    };

    const formatPermissionName = (name) => {
        if (!name) return '';
        return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="card shadow-sm border-0 rounded-3 animate-fade-in">
            
            {showUserModal && createPortal(
                <>
                    <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1040 }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                                <div className="p-3 d-flex justify-content-between align-items-center bg-white border-bottom">
                                    <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.1rem' }}>
                                        <MDBIcon fas icon={formData.userId ? "user-edit" : "user-plus"} className="text-primary me-2" style={{ color: '#8b0000' }} />
                                        {formData.userId ? 'Edit User Profile' : 'Provision New User'}
                                    </h5>
                                    <MDBIcon fas icon="times" style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowUserModal(false)} />
                                </div>
                                
                                <div className="modal-body p-4 bg-light">
                                    <div className="row g-4">
                                        
                                        {!formData.userId && (
                                            <div className="col-12 mb-2">
                                                <div className="btn-group w-100 shadow-sm border bg-white rounded-3 overflow-hidden">
                                                    <MDBBtn 
                                                        color={!formData.isNewPerson ? 'primary' : 'light'} 
                                                        className="w-50 shadow-0 fw-bold" 
                                                        onClick={() => setFormData({...formData, isNewPerson: false, givenName: '', surName: '', photoFile: null, photoPreview: null})}
                                                    >
                                                        <MDBIcon fas icon="link" className="me-2"/> LINK EXISTING
                                                    </MDBBtn>
                                                    <MDBBtn 
                                                        color={formData.isNewPerson ? 'primary' : 'light'} 
                                                        className="w-50 shadow-0 fw-bold" 
                                                        onClick={() => setFormData({...formData, isNewPerson: true, personId: ''})}
                                                    >
                                                        <MDBIcon fas icon="user-plus" className="me-2"/> NEW STAFF
                                                    </MDBBtn>
                                                </div>
                                            </div>
                                        )}

                                        {!formData.isNewPerson && !formData.userId ? (
                                            <div className="col-md-12 fade-in">
                                                <label className="fw-bold small text-muted mb-1">Select Unassigned Person Profile <span className="text-danger">*</span></label>
                                                <select name="personId" className={`form-select form-select-md bg-white ${errors.personId ? 'is-invalid' : ''}`} value={formData.personId} onChange={handleInputChange}>
                                                    <option value="">Select a person...</option>
                                                    {persons.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                                {errors.personId && <div className="invalid-feedback">{errors.personId[0]}</div>}
                                            </div>
                                        ) : (
                                            <div className="col-md-12 fade-in">
                                                <div className="row g-3">
                                                    <div className="col-md-8">
                                                        <div className="row g-3">
                                                            <div className="col-md-12">
                                                                <label className="fw-bold small text-muted mb-1">First Name <span className="text-danger">*</span></label>
                                                                <input type="text" name="givenName" className={`form-control form-control-md bg-white ${errors.givenName ? 'is-invalid' : ''}`} placeholder="e.g. John" value={formData.givenName} onChange={handleInputChange} />
                                                                {errors.givenName && <div className="invalid-feedback">{errors.givenName[0]}</div>}
                                                            </div>
                                                            <div className="col-md-12">
                                                                <label className="fw-bold small text-muted mb-1">Last Name <span className="text-danger">*</span></label>
                                                                <input type="text" name="surName" className={`form-control form-control-md bg-white ${errors.surName ? 'is-invalid' : ''}`} placeholder="e.g. Doe" value={formData.surName} onChange={handleInputChange} />
                                                                {errors.surName && <div className="invalid-feedback">{errors.surName[0]}</div>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="col-md-4 d-flex flex-column align-items-center justify-content-center">
                                                        <label className="fw-bold small text-muted mb-2">Face Photo</label>
                                                        <div className="position-relative">
                                                            <div 
                                                                className="border bg-white shadow-sm d-flex align-items-center justify-content-center mb-2 overflow-hidden" 
                                                                style={{ width: '120px', height: '120px', borderRadius: '12px', cursor: 'pointer' }}
                                                                onClick={() => document.getElementById('staffPhotoInput').click()}
                                                            >
                                                                {formData.photoPreview ? (
                                                                    <img src={formData.photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <MDBIcon fas icon="camera" size="2x" className="text-muted" />
                                                                )}
                                                            </div>

                                                            {formData.photoPreview && (
                                                                <MDBBtn 
                                                                    color="danger" 
                                                                    size="sm" 
                                                                    floating 
                                                                    className="position-absolute shadow-sm" 
                                                                    style={{ top: '-10px', right: '-10px', zIndex: 10 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setFormData(prev => ({ ...prev, photoPreview: null, photoFile: null, removePhoto: true }));
                                                                    }}
                                                                >
                                                                    <MDBIcon fas icon="trash" />
                                                                </MDBBtn>
                                                            )}
                                                        </div>
                                                        <input id="staffPhotoInput" type="file" accept="image/*" className="d-none" onChange={handlePhotoChange} />
                                                        <small className="text-muted" style={{ fontSize: '0.65rem' }}>Click to upload (Square)</small>
                                                        {errors.photo && <small className="text-danger text-center mt-1">{errors.photo[0]}</small>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="col-md-6">
                                            <label className="fw-bold small text-muted mb-1">Username / Email <span className="text-danger">*</span></label>
                                            <input type="email" name="username" className={`form-control form-control-md bg-white ${errors.username ? 'is-invalid' : ''}`} placeholder="e.g. admin@miras.com" value={formData.username} onChange={handleInputChange} />
                                            {errors.username && <div className="invalid-feedback">{errors.username[0]}</div>}
                                        </div>

                                        <div className="col-md-6">
                                            <label className="fw-bold small text-muted mb-1">
                                                {formData.userId ? 'New Password (Optional)' : 'Password'} {formData.userId ? '' : <span className="text-danger">*</span>}
                                            </label>
                                            <input type="password" name="password" className={`form-control form-control-md bg-white ${errors.password ? 'is-invalid' : ''}`} placeholder={formData.userId ? "Leave blank to keep current" : "Minimum 6 characters"} value={formData.password} onChange={handleInputChange} />
                                            {errors.password && <div className="invalid-feedback">{errors.password[0]}</div>}
                                        </div>

                                        <div className="col-md-6">
                                            <label className="fw-bold small text-muted mb-1">Assign Role <span className="text-danger">*</span></label>
                                            <select name="roleId" className={`form-select form-select-md bg-white ${errors.roleId ? 'is-invalid' : ''}`} value={formData.roleId} onChange={handleInputChange}>
                                                <option value="">Select role...</option>
                                                {roles.map(r => (
                                                    <option key={r.id} value={r.id}>{r.roleName}</option>
                                                ))}
                                            </select>
                                            {errors.roleId && <div className="invalid-feedback">{errors.roleId[0]}</div>}
                                        </div>

                                        <div className="col-md-6">
                                            <label className="fw-bold small text-muted mb-1">Account Status</label>
                                            <select name="status" className="form-select form-select-md bg-white" value={formData.status} onChange={handleInputChange}>
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                                <option value="Suspended">Suspended</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-white border-top d-flex justify-content-end gap-2">
                                    <MDBBtn color='light' className="shadow-0 fw-bold border px-4" onClick={() => setShowUserModal(false)}>CANCEL</MDBBtn>
                                    <MDBBtn color='success' className="shadow-sm fw-bold px-4" style={{ backgroundColor: '#28a745' }} onClick={handleCreateUser} disabled={isSubmitting}>
                                        {isSubmitting ? <><MDBIcon fas icon="spinner" spin className="me-2" /> {formData.userId ? 'UPDATING...' : 'PROVISIONING...'}</> : <><MDBIcon fas icon={formData.userId ? "save" : "user-check"} className="me-2"/> {formData.userId ? 'UPDATE USER' : 'PROVISION USER'}</>}
                                    </MDBBtn>
                                </div>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

            <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                    <div className="d-flex align-items-center">
                        <div className="icon-box bg-primary text-white me-2 shadow-sm">
                            <MDBIcon fas icon="users-cog" />
                        </div>
                        <div>
                            <h6 className="fw-bold mb-0 text-dark">Roles & User Management</h6>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>Provision users and RBAC matrix</small>
                        </div>
                    </div>
                    {activeSubTab === 'users' && (
                        <MDBBtn color="success" size="sm" className="hover-lift px-3 py-1" style={{ fontSize: '0.7rem' }} onClick={openUserModal}>
                            <MDBIcon fas icon="plus" className="me-1" /> Add User
                        </MDBBtn>
                    )}
                </div>

                <div className="row g-3">
                    <div className="col-12 col-md-3">
                        <div className="d-flex flex-row flex-md-column gap-1 border-end-md pe-2">
                            <button onClick={() => setActiveSubTab('users')} className={`btn shadow-0 text-start px-3 py-2 fw-bold rounded ${activeSubTab === 'users' ? 'bg-light text-primary border-start border-3 border-primary shadow-sm' : 'text-muted bg-transparent'}`} style={{ fontSize: '0.8rem' }}>
                                <MDBIcon fas icon="users" className="me-2" /> System Users
                            </button>
                            <button onClick={() => setActiveSubTab('matrix')} className={`btn shadow-0 text-start px-3 py-2 fw-bold rounded ${activeSubTab === 'matrix' ? 'bg-light text-primary border-start border-3 border-primary shadow-sm' : 'text-muted bg-transparent'}`} style={{ fontSize: '0.8rem' }}>
                                <MDBIcon fas icon="shield-alt" className="me-2" /> Permission Matrix
                            </button>
                        </div>
                    </div>

                    <div className="col-12 col-md-9">
                        {loading ? (
                            <div className="text-center py-5"><MDBIcon fas icon="spinner" spin size="2x" className="text-primary"/></div>
                        ) : activeSubTab === 'users' ? (
                            <div className="border rounded-3 p-2 bg-white animate-fade-in shadow-sm">
                                <div className="table-responsive">
                                    <table className="table table-sm table-hover align-middle mb-0">
                                        <thead className="bg-light">
                                            <tr style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                <th className="border-0 text-primary fw-bold">Fullname</th>
                                                <th className="border-0 text-primary fw-bold">Username</th>
                                                <th className="border-0 text-primary fw-bold">Role</th>
                                                <th className="border-0 text-center text-primary fw-bold">Status</th>
                                                <th className="border-0 text-end text-primary fw-bold">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ fontSize: '0.85rem' }}>
                                            {users.length > 0 ? users.map((user) => (
                                                <tr key={user.id}>
                                                    <td className="fw-bold text-dark">{user.personName}</td>
                                                    <td className="text-muted">{user.username}</td>
                                                    <td>
                                                        <span className="badge bg-light text-dark border border-secondary">
                                                            {user.roleName || 'Unassigned'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="d-flex justify-content-center">
                                                            <select 
                                                                className={`form-select form-select-sm fw-bold border-0 shadow-sm text-center rounded-pill ${
                                                                    user.accountStatus === 'Active' ? 'bg-success text-white' : 
                                                                    user.accountStatus === 'Suspended' ? 'bg-warning text-dark' : 'bg-danger text-white'
                                                                }`}
                                                                style={{ width: '110px', cursor: 'pointer', outline: 'none' }}
                                                                value={user.accountStatus}
                                                                onChange={(e) => handleStatusChange(user.id, e.target.value)}
                                                            >
                                                                <option value="Active" className="bg-white text-success">Active</option>
                                                                <option value="Inactive" className="bg-white text-danger">Inactive</option>
                                                                <option value="Suspended" className="bg-white text-warning">Suspended</option>
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td className="text-end">
                                                        <MDBBtn size="sm" color="light" className="shadow-sm border text-primary me-2 hover-lift px-2 py-1" onClick={() => handleEditUser(user)}>
                                                            <MDBIcon fas icon="edit" />
                                                        </MDBBtn>
                                                        <MDBIcon fas icon="trash" className="text-danger hover-lift ms-2" style={{ cursor: 'pointer' }} />
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="5" className="text-center py-4 text-muted">No users provisioned yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="border rounded-3 p-0 bg-white animate-fade-in shadow-sm overflow-hidden">
                                <div className="p-3 bg-light border-bottom d-flex align-items-center">
                                    <MDBIcon fas icon="lock" size="lg" className="text-primary me-3" />
                                    <div>
                                        <h6 className="fw-bold mb-0 text-dark">Access Control Matrix</h6>
                                        <p className="small text-muted mb-0">Toggle switches to grant or revoke specific permissions to roles.</p>
                                    </div>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-bordered table-hover align-middle mb-0 text-center">
                                        <thead className="bg-light">
                                            <tr style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                                <th className="fw-bold text-start text-dark bg-white" style={{ minWidth: '200px' }}>System Permissions</th>
                                                {roles.map(role => (
                                                    <th key={role.id} className="fw-bold text-primary">{role.roleName}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody style={{ fontSize: '0.85rem' }}>
                                            {permissions.map((perm) => (
                                                <tr key={perm.id}>
                                                    <td className="fw-bold text-dark text-start bg-light">{perm.description || formatPermissionName(perm.name)}</td>
                                                    {roles.map(role => {
                                                        const isSuperAdmin = role.roleName === 'Super Admin';
                                                        const hasPerm = checkPermission(role.id, perm.id);
                                                        
                                                        return (
                                                            <td key={`${role.id}-${perm.id}`}>
                                                                <div className="form-check form-switch d-flex justify-content-center m-0 p-0">
                                                                    <input 
                                                                        className="form-check-input ms-0" 
                                                                        type="checkbox" 
                                                                        role="switch"
                                                                        checked={isSuperAdmin || hasPerm}
                                                                        disabled={isSuperAdmin}
                                                                        onChange={() => handleTogglePermission(role.id, perm.id, hasPerm)}
                                                                        style={{ cursor: isSuperAdmin ? 'not-allowed' : 'pointer' }}
                                                                    />
                                                                </div>
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <style>
                {`
                .border-end-md { border-right: 1px solid #e0e0e0; }
                @media (max-width: 767.98px) {
                    .border-end-md { border-right: none; border-bottom: 1px solid #e0e0e0; padding-bottom: 1rem; }
                }
                .form-check-input:checked {
                    background-color: #28a745;
                    border-color: #28a745;
                }
                `}
            </style>
        </div>
    );
}