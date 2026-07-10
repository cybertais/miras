import React from 'react';
import { MDBBtn, MDBIcon } from 'mdb-react-ui-kit';

export default function WarningModal({ isOpen, title = "Cannot Delete Record", message, onClose }) {
    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}></div>
            <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                        <div style={{ backgroundColor: '#ffc107', height: '6px' }}></div>
                        <div className="modal-body p-4 text-center">
                            <MDBIcon fas icon="exclamation-triangle" className="text-warning mb-3" style={{ fontSize: '3rem' }} />
                            <h5 className="fw-bold text-dark mb-2">{title}</h5>
                            <p className="text-muted small mb-4 px-3">
                                {message} <br/><br/>
                                Please reassign or delete the child records before attempting to remove this item to maintain system data integrity.
                            </p>
                            <div className="d-flex justify-content-center">
                                <MDBBtn color="light" className="shadow-0 fw-bold border px-4" onClick={onClose}>UNDERSTOOD</MDBBtn>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}