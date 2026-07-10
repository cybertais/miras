import React from 'react';
import { MDBBtn, MDBIcon } from 'mdb-react-ui-kit';

export default function ConfirmModal({ isOpen, title = "Confirm Deletion", itemName, onConfirm, onClose }) {
    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}></div>
            <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                        <div style={{ backgroundColor: '#dc4c64', height: '6px' }}></div>
                        <div className="modal-body p-4 text-center">
                            <MDBIcon far icon="trash-alt" className="text-danger mb-3" style={{ fontSize: '3rem' }} />
                            <h5 className="fw-bold text-dark mb-2">{title}</h5>
                            <p className="text-muted small mb-4 px-3">
                                Are you sure you want to delete <strong>{itemName}</strong>? <br/>This action cannot be undone.
                            </p>
                            <div className="d-flex justify-content-center gap-3">
                                <MDBBtn color="light" className="shadow-0 fw-bold border px-4" onClick={onClose}>CANCEL</MDBBtn>
                                <MDBBtn color="danger" className="shadow-0 fw-bold px-4" onClick={onConfirm}>YES, DELETE</MDBBtn>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}