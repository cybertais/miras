import React from 'react';

export default function Footer() {
    return (
        <footer className="text-center text-white mt-auto w-100" style={{ backgroundColor: '#000', fontSize: '0.75rem' }}>
            <div className="py-1 px-2" style={{ borderTop: '2px solid #dc3545' }}>
                © 2026 Copyright: <span className="text-warning fw-bold">DDA School Fee Subsidiary Management System</span>
            </div>
            <div className="py-1 px-2" style={{ backgroundColor: '#111' }}>
                <span className="text-muted" style={{ fontSize: '0.7rem' }}>Version: 1.0.1 | Stage Version: 3.1.12 | Stage Update Date 25 March 2026</span>
            </div>
            <div className="py-1 px-2" style={{ backgroundColor: '#1a1a1a' }}>
                <span className="text-muted" style={{ fontSize: '0.7rem' }}>Cybertais IT Consultant</span>
            </div>
        </footer>
    );
}