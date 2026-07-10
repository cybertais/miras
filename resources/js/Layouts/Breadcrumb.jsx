import React from 'react';

export default function Breadcrumb({ paths = [] }) {
    return (
        <div className="text-muted d-flex align-items-center" style={{ fontSize: '0.75rem' }}>
            {paths.map((path, index) => {
                // Support both strings and objects (e.g., { label: 'Home', url: '/#' })
                const label = typeof path === 'string' ? path : path.label;
                const url = typeof path === 'string' ? null : path.url;
                const isLast = index === paths.length - 1;

                return (
                    <span key={index} className="d-flex align-items-center">
                        {url ? (
                            <a href={url} className="text-primary text-decoration-none" style={{ cursor: 'pointer' }}>
                                <strong>{label}</strong>
                            </a>
                        ) : (
                            <span className={isLast ? 'fw-bold text-dark' : ''}>
                                {label}
                            </span>
                        )}
                        
                        {/* Separator */}
                        {!isLast && <span className="mx-1">&raquo;</span>}
                    </span>
                );
            })}
        </div>
    );
}