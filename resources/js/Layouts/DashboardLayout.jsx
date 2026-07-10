import React, { useState, useEffect } from 'react';

// Using './' to import files located in the exact same folder
import Sidebar from './Sidebar'; 
import Topbar from './Topbar';   

export default function DashboardLayout({ children, pageTitle, breadcrumbs }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Handle window resize for responsiveness
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setIsSidebarOpen(false);
            else setIsSidebarOpen(true);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = (e) => {
        // Stop the click event from bubbling up to the background 
        // so opening the menu doesn't instantly close it!
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        // Removed the "isMobile" check. Now, if the sidebar is expanded (200px), 
        // clicking anywhere will force it to collapse back down (55px).
        if (isSidebarOpen) {
            setIsSidebarOpen(false);
        }
    };

    // Calculate the exact width the sidebar is taking up based on its current state
    const sidebarWidth = isMobile ? '0px' : (isSidebarOpen ? '200px' : '55px');

    return (
        <div className="d-flex bg-light" style={{ minHeight: '100vh', overflowX: 'hidden', width: '100vw' }}>
            
            {/* Sidebar Component */}
            <Sidebar isOpen={isSidebarOpen} isMobile={isMobile} />

            {/* Main Content Wrapper 
                Added onClick={closeSidebar} here so clicking Topbar, Main, or Footer 
                will instantly collapse the menu.
            */}
            <div 
                className="d-flex flex-column"
                onClick={closeSidebar}
                style={{ 
                    marginLeft: sidebarWidth,
                    width: `calc(100vw - ${sidebarWidth})`, 
                    transition: 'margin-left 0.25s ease-in-out, width 0.25s ease-in-out',
                    minHeight: '100vh'
                }}
            >
                {/* Topbar Component */}
                <Topbar 
                    toggleSidebar={toggleSidebar} 
                    title={pageTitle} 
                    breadcrumbs={breadcrumbs} 
                />

                {/* Page Content */}
                <main className="p-1 pt-md-2 pb-md-5 p-md-5 flex-grow-1 overflow-auto position-relative">
                    {/* Dark overlay for mobile screens when the sidebar is open */}
                    {isMobile && isSidebarOpen && (
                        <div 
                            className="position-absolute top-0 start-0 w-100 h-100 rounded" 
                            style={{ backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 999, pointerEvents: 'none' }}
                        ></div>
                    )}
                    
                    {children}
                </main>

                {/* Footer */}
                <footer className="text-center py-2 bg-dark text-light mt-auto border-top border-warning border-2">
                    <small className="fw-normal" style={{ fontSize: '0.7rem' }}>
                        &copy; 2026 <span style={{ color: '#ffc107' }}>DDA School Fee Subsidiary Management System</span> | Version: 1.0.1
                    </small>
                </footer>
            </div>
        </div>
    );
}