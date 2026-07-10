import React, { useState, useRef } from 'react';
import { MDBIcon, MDBBtn } from 'mdb-react-ui-kit';
import DashboardLayout from '../../Layouts/DashboardLayout';

// Import your dedicated tab components
import RolesUsersTab from './Tabs/RolesUsersTab';
import GeopoliticalTab from './Tabs/GeopoliticalTab';
import AcademicsTab from './Tabs/AcademicsTab';
import SubsidyTab from './Tabs/SubsidyTab';
import AuditTrailTab from './Tabs/AuditTrailTab';
import DdaProfileTab from './Tabs/DdaProfileTab';
import BackupRestoreTab from './Tabs/BackupRestoreTab';
// Import the new Sys Parameters Tab
import SysParametersTab from './Tabs/SysParametersTab';

export default function SystemSettingsModule() {
    const [activeTab, setActiveTab] = useState('roles');
    
    // Create a reference to the scrollable container
    const scrollContainerRef = useRef(null);

    const settingsTabs = [
        { id: 'roles', label: 'ROLES & USER MGT', icon: 'users-cog' },
        { id: 'geo', label: 'GEOPOLITICAL AREA', icon: 'globe' },
        { id: 'courses', label: 'INST. & COURSES', icon: 'university' },
        { id: 'subsidy', label: 'SUBSIDY CONFIG', icon: 'hand-holding-usd' },
        { id: 'audit', label: 'AUDIT TRAIL', icon: 'history' },
        { id: 'profile', label: 'DDA PROFILE', icon: 'building' },
        { id: 'backup', label: 'BACKUP & RESTORE', icon: 'database' },
        // Added the new System Parameters tab
        { id: 'sysparams', label: 'SYS PARAMETERS', icon: 'sliders-h' }
    ];

    // Function to handle the scrolling
    const scroll = (scrollOffset) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: scrollOffset, behavior: 'smooth' });
        }
    };

    return (
        <DashboardLayout 
            pageTitle="System Settings" 
            breadcrumbs={[{ label: 'Home', url: '/' }, 'System Settings']}
        >
            {/* Sleek, Scrollable Pill Navigation with Buttons */}
            <div className="d-flex align-items-center mb-3">
                {/* Scroll Left Button */}
                <MDBBtn 
                    color="light" 
                    className="shadow-sm px-3 py-2 me-2 border" 
                    onClick={() => scroll(-250)}
                    style={{ borderRadius: '50px' }}
                >
                    <MDBIcon fas icon="chevron-left" />
                </MDBBtn>

                <div className="bg-transparent overflow-hidden flex-grow-1">
                    <div 
                        className="d-flex scroll-hide-x pt-1 pb-1" 
                        ref={scrollContainerRef}
                        style={{ whiteSpace: 'nowrap', gap: '10px', overflowX: 'auto', scrollBehavior: 'smooth' }}
                    >
                        {settingsTabs.map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`btn shadow-0 px-4 py-2 text-capitalize fw-bold d-flex align-items-center settings-tab ${
                                        isActive ? 'active' : 'text-muted bg-white border shadow-sm'
                                    }`}
                                    style={{
                                        fontSize: '0.75rem',
                                        letterSpacing: '0.5px',
                                        transition: 'background-color 0.3s ease',
                                        flexShrink: 0 // Crucial: Prevents the tabs from squishing!
                                    }}
                                >
                                    <MDBIcon fas icon={tab.icon} className={`me-2 fs-6 ${isActive ? 'text-white' : 'text-secondary'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Scroll Right Button */}
                <MDBBtn 
                    color="light" 
                    className="shadow-sm px-3 py-2 ms-2 border" 
                    onClick={() => scroll(250)}
                    style={{ borderRadius: '50px' }}
                >
                    <MDBIcon fas icon="chevron-right" />
                </MDBBtn>
            </div>

            {/* Main Content Area */}
            <div className="fade-in mt-2">
                {activeTab === 'roles' && <RolesUsersTab />}
                {activeTab === 'geo' && <GeopoliticalTab />}
                {activeTab === 'courses' && <AcademicsTab />}
                {activeTab === 'subsidy' && <SubsidyTab />}
                {activeTab === 'audit' && <AuditTrailTab />} 
                {activeTab === 'profile' && <DdaProfileTab />}
                {activeTab === 'backup' && <BackupRestoreTab />}
                {/* Added Conditional Render for the new tab */}
                {activeTab === 'sysparams' && <SysParametersTab />}
            </div>
        </DashboardLayout>
    );
}