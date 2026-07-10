import React, { useState, useEffect } from 'react';
import { 
    MDBIcon, MDBDropdown, MDBDropdownToggle, MDBDropdownMenu, MDBDropdownItem,
    MDBModal, MDBModalDialog, MDBModalContent, MDBModalHeader, MDBModalTitle, MDBModalBody, MDBModalFooter, MDBBtn
} from 'mdb-react-ui-kit';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from './Breadcrumb.jsx'; 

export default function Topbar({ toggleSidebar, title, breadcrumbs }) {
    const navigate = useNavigate();
    
    // 1. Expanded State to hold all profile fields
    const [profileData, setProfileData] = useState({ 
        fullName: 'Loading...', 
        photo: null,
        email: '',
        phone: '',
        gender: '',
        dob: '',
        address: ''
    });

    // 2. State to control the Profile Modal
    const [profileModal, setProfileModal] = useState(false);
    const toggleProfileModal = () => setProfileModal(!profileModal);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axios.get('/api/user', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}` }
                });
                
                const data = response.data;
                const userObj = data?.user || data || {};
                const profileObj = data?.profile || null;

                setProfileData({ 
                    fullName: profileObj?.fullName || userObj?.name || 'Administrator', 
                    photo: profileObj?.photo || null,
                    email: profileObj?.email || userObj?.email || '',
                    phone: profileObj?.phone || '',
                    gender: profileObj?.gender || '',
                    dob: profileObj?.dob || '',
                    address: profileObj?.address || ''
                });

            } catch (error) {
                console.error("Failed to fetch user profile", error);
                setProfileData(prev => ({ ...prev, fullName: 'Administrator' }));
            }
        };

        fetchProfile();
    }, []);

    const handleLogout = async (e) => {
        if (e) e.preventDefault(); 
        try {
            await axios.post('/api/logout', {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}` }
            });
        } finally {
            localStorage.removeItem('miras_auth_token');
            localStorage.removeItem('miras_user');
            window.location.href = '/login'; 
        }
    };

    const getProfileImage = (photo) => {
        if (!photo) return 'https://mdbcdn.b-cdn.net/img/new/avatars/2.jpg'; // Fallback
        if (photo.startsWith('data:image') || photo.startsWith('http')) return photo;
        
        // Point to the correct folder where Laravel stores the images
        return `/storage/student_images/${photo}`; 
    };

    return (
        <div className="w-100 position-sticky top-0" style={{ zIndex: 1000 }}>
            {/* Top Navigation Row */}
            <div className="d-flex justify-content-between align-items-center px-3 py-1 border-bottom shadow-sm bg-white">
                
                {/* Hamburger Menu */}
                <MDBIcon 
                    fas 
                    icon="bars" 
                    className="text-secondary fs-5 hover-primary mx-3 p-2" 
                    style={{ cursor: 'pointer' }} 
                    onClick={toggleSidebar} 
                />
                
                <MDBDropdown>
                    <MDBDropdownToggle tag="a" className="nav-link d-flex align-items-center hidden-arrow" style={{ cursor: 'pointer' }}>
                        <span className="me-2 text-dark fw-bold text-uppercase" style={{ fontSize: '0.75rem'}}>
                            {profileData.fullName}
                        </span>
                        <img 
                            src={getProfileImage(profileData.photo)} 
                            className="rounded-circle border border-warning" 
                            style={{ width: '32px', height: '32px', objectFit: 'cover' }} 
                            alt="Avatar" 
                        />
                    </MDBDropdownToggle>
                    <MDBDropdownMenu style={{ margin: 0 }}>
                        <MDBDropdownItem 
                            link href="#" 
                            style={{ fontSize: '0.8rem' }} 
                            onClick={(e) => { e.preventDefault(); toggleProfileModal(); }}
                        >
                            My Profile
                        </MDBDropdownItem>
                        <MDBDropdownItem link href="#" style={{ fontSize: '0.8rem' }} onClick={handleLogout}>
                            Logout
                        </MDBDropdownItem>
                    </MDBDropdownMenu>
                </MDBDropdown>
            </div>

            {/* Title Banner */}
            <div className="text-white w-100">
                <div className="bg-white mx-auto shadow-sm px-3 py-1 rounded d-flex flex-column flex-sm-row align-items-sm-center justify-content-between" style={{ width: '98%' }}>
                    <div className="fw-bold mb-1 mb-sm-0 text-primary" style={{ fontSize: '0.9rem' }}>
                        {title}
                    </div>
                    {breadcrumbs && <div style={{ fontSize: '0.75rem' }}><Breadcrumb paths={breadcrumbs} /></div>}
                </div>
            </div>

            {/* Profile Pop-Up Modal */}
            <MDBModal open={profileModal} onClose={() => setProfileModal(false)} tabIndex="-1">
                <MDBModalDialog centered>
                    <MDBModalContent className="border-0 shadow-lg rounded-4 overflow-hidden">
                        {/* --- A: Deep Maroon Header --- */}
                        <MDBModalHeader className="text-white" style={{ backgroundColor: '#8b0000' }}>
                            <MDBModalTitle className="fw-bold" style={{ fontSize: '1.1rem' }}>My Profile</MDBModalTitle>
                            <MDBBtn className='btn-close btn-close-white' color='none' onClick={toggleProfileModal}></MDBBtn>
                        </MDBModalHeader>
                        
                        <MDBModalBody className="text-center p-5">
                            {/* --- B: Deep Maroon Image Border --- */}
                            <img 
                                src={getProfileImage(profileData.photo)} 
                                alt="Profile" 
                                className="rounded-circle mb-3 shadow-3" 
                                style={{ width: '120px', height: '120px', objectFit: 'cover', border: '3px solid #8b0000' }} 
                            />
                            
                            <h4 className="mb-1 text-dark fw-bold">{profileData.fullName}</h4>
                            <p className="text-muted mb-0">{profileData.email}</p>
                            
                            {/* --- C: Removed extra profile details block --- */}

                        </MDBModalBody>
                        <MDBModalFooter className="bg-light p-3 border-top justify-content-center">
                            <MDBBtn color='light' className="shadow-0 border fw-bold px-4 hover-lift" onClick={toggleProfileModal}>
                                CLOSE
                            </MDBBtn>
                        </MDBModalFooter>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>

        </div>
    );
}