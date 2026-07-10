import React, { useState, useEffect } from 'react';
import { MDBBtn, MDBIcon, MDBTable, MDBTableHead, MDBTableBody, MDBSpinner } from 'mdb-react-ui-kit';
import axios from 'axios';

export default function BackupRestoreTab() {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', filename: '' });

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/system-settings/backups');
            if (response.data.success) {
                setBackups(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching backups:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const handleCreateBackup = async () => {
        setProcessing(true);
        try {
            const response = await axios.post('/api/system-settings/backups/create');
            if (response.data.success) {
                alert('Backup generated successfully: ' + response.data.filename);
                fetchBackups(); // Refresh the table
            }
        } catch (error) {
            alert('Failed to create backup: ' + (error.response?.data?.message || error.message));
        } finally {
            setProcessing(false);
        }
    };

    const confirmAction = (type, filename) => {
        setConfirmModal({ isOpen: true, type, filename });
    };

    const handleAction = async () => {
        const { type, filename } = confirmModal;
        setConfirmModal({ isOpen: false, type: '', filename: '' });
        setProcessing(true);

        try {
            if (type === 'restore') {
                const response = await axios.post(`/api/system-settings/backups/restore/${filename}`);
                if (response.data.success) alert('System successfully restored!');
            } else if (type === 'delete') {
                const response = await axios.delete(`/api/system-settings/backups/${filename}`);
                if (response.data.success) fetchBackups(); // Refresh the table
            }
        } catch (error) {
            alert(`Failed to ${type} backup: ` + (error.response?.data?.message || error.message));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="card shadow-sm border-0 rounded-3 fade-in">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold text-dark">
                    <MDBIcon fas icon="database" className="me-2 text-primary" />
                    Database Backup & Recovery
                </h6>
                <MDBBtn color="primary" size="sm" onClick={handleCreateBackup} disabled={processing}>
                    {processing ? <MDBSpinner size="sm" /> : <><MDBIcon fas icon="plus" className="me-2" /> CREATE BACKUP</>}
                </MDBBtn>
            </div>
            
            <div className="card-body p-0">
                {loading ? (
                    <div className="text-center py-5"><MDBSpinner color="primary" /></div>
                ) : backups.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                        <MDBIcon fas icon="folder-open" size="3x" className="mb-3" /><br />
                        No backups found.
                    </div>
                ) : (
                    <div className="table-responsive">
                        <MDBTable align="middle" hover className="mb-0 text-nowrap">
                            <MDBTableHead light>
                                <tr>
                                    <th className="fw-bold">No</th>
                                    <th className="fw-bold">Backup Filename</th>
                                    <th className="fw-bold">Date & Time Created</th>
                                    <th className="fw-bold">File Size</th>
                                    <th className="text-end fw-bold">Actions</th>
                                </tr>
                            </MDBTableHead>
                            <MDBTableBody>
                                {backups.map((backup, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td className="fw-bold font-monospace text-primary" style={{ fontSize: '0.85rem' }}>
                                            {backup.filename}
                                        </td>
                                        <td>{backup.last_modified}</td>
                                        <td>{backup.size}</td>
                                        <td className="text-end">
                                            {/* Restore Button */}
                                            <MDBBtn color="warning" size="sm" className="me-2" onClick={() => confirmAction('restore', backup.filename)} disabled={processing}>
                                                <MDBIcon fas icon="undo" className="me-1" /> Restore
                                            </MDBBtn>
                                            {/* Delete Button */}
                                            <MDBBtn color="danger" size="sm" onClick={() => confirmAction('delete', backup.filename)} disabled={processing}>
                                                <MDBIcon fas icon="trash" />
                                            </MDBBtn>
                                        </td>
                                    </tr>
                                ))}
                            </MDBTableBody>
                        </MDBTable>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className={`modal-header text-white ${confirmModal.type === 'restore' ? 'bg-warning' : 'bg-danger'}`}>
                                <h6 className="modal-title mb-0">
                                    <MDBIcon fas icon="exclamation-triangle" className="me-2" />
                                    Confirm {confirmModal.type === 'restore' ? 'System Recovery' : 'Deletion'}
                                </h6>
                            </div>
                            <div className="modal-body py-4">
                                {confirmModal.type === 'restore' ? (
                                    <p className="mb-0 text-dark">
                                        <strong>WARNING:</strong> Restoring this backup will overwrite the current database data. Are you sure you want to proceed with <code className="text-primary">{confirmModal.filename}</code>?
                                    </p>
                                ) : (
                                    <p className="mb-0 text-dark">
                                        Are you sure you want to delete <code className="text-danger">{confirmModal.filename}</code>? This action cannot be undone.
                                    </p>
                                )}
                            </div>
                            <div className="modal-footer bg-light">
                                <MDBBtn color="light" onClick={() => setConfirmModal({ isOpen: false, type: '', filename: '' })}>Cancel</MDBBtn>
                                <MDBBtn color={confirmModal.type === 'restore' ? 'warning' : 'danger'} onClick={handleAction}>
                                    Confirm {confirmModal.type === 'restore' ? 'Restore' : 'Delete'}
                                </MDBBtn>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}