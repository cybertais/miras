import React, { useState, useEffect } from 'react';
import { MDBIcon } from 'mdb-react-ui-kit';

export default function ValidationErrors({ errors }) {
    const [visible, setVisible] = useState(false);

    // Auto-dismiss logic
    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            setVisible(true);
            
            // Set a timer to close the alert after 20 seconds
            const timer = setTimeout(() => {
                setVisible(false);
            }, 20000); 
            
            // Cleanup the timer if the component unmounts or errors change
            return () => clearTimeout(timer);
        }
    }, [errors]);

    // Do not render if not visible or no errors exist
    if (!visible || !errors || Object.keys(errors).length === 0) {
        return null;
    }

    const errorList = Object.values(errors).flat();
    
    // Sleek Infographic Touch: Split into 2 columns if there are many errors
    const columns = errorList.length > 5 ? 2 : 1;

    return (
        <div 
            className="mb-4 position-relative shadow-sm rounded-4 overflow-hidden" 
            style={{ 
                backgroundColor: '#fff5f5', // Soft, modern red tint
                border: '1px solid #ffcaca',
                animation: 'fadeIn 0.4s ease-out'
            }}
        >
            {/* Bold Left Accent Bar */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', backgroundColor: '#dc3545' }}></div>
            
            {/* Header Row */}
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{ borderColor: '#ffcaca', backgroundColor: '#ffeaea' }}>
                <div className="fw-bold text-danger d-flex align-items-center" style={{ fontSize: '1rem' }}>
                    <MDBIcon fas icon="exclamation-circle" className="me-2 fs-5" />
                    Registration Incomplete: Please provide the missing information
                </div>
                
                {/* Manual Close Button */}
                <MDBIcon 
                    fas 
                    icon="times" 
                    className="text-danger" 
                    style={{ cursor: 'pointer', fontSize: '1.2rem', opacity: 0.7 }} 
                    onClick={() => setVisible(false)} 
                    onMouseEnter={(e) => e.target.style.opacity = 1}
                    onMouseLeave={(e) => e.target.style.opacity = 0.7}
                    title="Dismiss"
                />
            </div>

            {/* Errors List (Multi-Column) */}
            <div className="p-3">
                <ul className="mb-0" style={{ 
                    listStyleType: 'none', 
                    paddingLeft: '10px', 
                    columnCount: columns, 
                    columnGap: '40px',
                    color: '#5a1a1a',
                    fontSize: '0.85rem'
                }}>
                    {errorList.map((error, index) => (
                        <li key={index} className="mb-2 d-flex align-items-start">
                            <MDBIcon fas icon="angle-right" className="me-2 text-danger mt-1" />
                            {error}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Auto-close Progress Bar Animation */}
            <div 
                style={{ 
                    height: '4px', 
                    backgroundColor: '#dc3545', 
                    animation: 'shrink 20s linear forwards' // 20 seconds shrinking bar
                }}
            ></div>

            {/* Inline CSS for the animations */}
            <style>
                {`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                `}
            </style>
        </div>
    );
}