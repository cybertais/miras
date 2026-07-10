import React from 'react';
import { MDBIcon } from 'mdb-react-ui-kit';
import { Link, useLocation } from 'react-router-dom';
import useAbility from '../Hooks/useAbility'; // <-- Import the hook

// Note: Ensure this path correctly resolves to your logo image
import madangLogo from '../../assests/madang.png'; 

export default function Sidebar({ isOpen, isMobile }) {
    const location = useLocation();
    const { hasRole, hasPermission } = useAbility(); // <-- Initialize the hook

    // Define menu items and attach their required access level
    const allMenuItems = [
        { name: 'Dashboard', icon: 'tachometer-alt', path: '/', isVisible: true }, // Everyone can see the dashboard
        { name: 'Student Management', icon: 'user-graduate', path: '/students', isVisible: hasPermission('manage_students') },
        { name: 'Subsidy Management', icon: 'hand-holding-usd', path: '/subsidies', isVisible: hasPermission('manage_subsidies') },
        { name: 'Subsidy Authorization', icon: 'file-signature', path: '/authorizations', isVisible: hasPermission('approve_subsidies') },
        { name: 'Reports', icon: 'chart-bar', path: '/reports', isVisible: hasPermission('view_reports') },
        { name: 'System Settings', icon: 'cogs', path: '/settings', isVisible: hasRole('Super Admin') },
    ];

    // Filter the menu items to only include the ones the user is allowed to see
    const visibleMenuItems = allMenuItems.filter(item => item.isVisible);

    return (
        <div 
            className="d-flex flex-column pb-3 position-fixed shadow-sm"
            style={{ 
                width: isOpen ? '220px' : (isMobile ? '0px' : '60px'),
                minHeight: '100vh', 
                borderRight: (isOpen || !isMobile) ? '1px solid #ddd' : 'none',
                backgroundColor: '#ffffff',
                transition: 'width 0.3s ease-in-out',
                overflow: 'hidden',
                zIndex: 1050
            }}
        >
            <div className="text-center py-3">
                {isOpen ? (
                    <img src={madangLogo} alt="Logo" style={{ height: '70px', objectFit: 'contain' }} />
                ) : (
                    <img src={madangLogo} alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
                )}
            </div>

            <div className="flex-grow-1 px-2">
                {/* Loop through the FILTERED array instead of the raw array */}
                {visibleMenuItems.map((item, index) => {
                    const isActive = location.pathname === item.path;

                    return (
                        <Link 
                            to={item.path}
                            key={index} 
                            className={`d-flex align-items-center px-2 py-1 mb-1 rounded text-decoration-none ${isActive ? 'bg-deepbrown text-white' : 'text-dark'}`}
                            style={{ 
                                transition: '0.2s',
                                justifyContent: isOpen ? 'flex-start' : 'center',
                                minHeight: '32px'
                            }}
                            title={!isOpen ? item.name : ''}
                        >
                            <MDBIcon 
                                fas 
                                icon={item.icon} 
                                className={`${isActive ? 'text-warning' : 'text-dark'} ${isOpen ? 'me-2' : ''}`} 
                                style={{ width: '20px', textAlign: 'center', fontSize: '0.9rem' }} 
                            />
                            {isOpen && <span className="fw-normal text-nowrap" style={{ fontSize: '0.85rem' }}>{item.name}</span>}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}