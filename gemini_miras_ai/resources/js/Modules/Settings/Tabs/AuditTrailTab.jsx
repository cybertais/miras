import React, { useState, useEffect } from 'react';
import { MDBIcon } from 'mdb-react-ui-kit';
import axios from 'axios';

export default function AuditTrailTab() {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchToken] = useState('');

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    const fetchAuditLogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/system-settings/audit-logs');
            setAuditLogs(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching audit logs", error);
        }
        setLoading(false);
    };

    // Quick frontend filter
    const filteredLogs = auditLogs.filter(log => 
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.operationType && log.operationType.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.tableName && log.tableName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.username && log.username.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Color code operations for a modern look
    const getOperationBadge = (op) => {
        switch (op?.toUpperCase()) {
            case 'INSERT': return 'bg-success';
            case 'UPDATE': return 'bg-primary';
            case 'DELETE': return 'bg-danger';
            case 'LOGIN': return 'bg-info';
            case 'LOGOUT': return 'bg-secondary';
            default: return 'bg-dark';
        }
    };

    return (
        <div className="card shadow-sm border-0 rounded-3 animate-fade-in">
            <div className="card-body p-3">
                {/* Sleek Header */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center border-bottom pb-2 mb-3 gap-3">
                    <div className="d-flex align-items-center">
                        <div className="icon-box bg-info text-white me-2 shadow-sm">
                            <MDBIcon fas icon="history" />
                        </div>
                        <div>
                            <h6 className="fw-bold mb-0 text-dark">System Audit Trail</h6>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>Monitor system activities and data modifications (View Only).</small>
                        </div>
                    </div>
                    
                    {/* Compact Search Bar */}
                    <div className="input-group input-group-sm w-auto shadow-sm hover-lift">
                        <span className="input-group-text bg-light border-0"><MDBIcon fas icon="search" className="text-muted" /></span>
                        <input 
                            type="text" 
                            className="form-control border-0 bg-light" 
                            placeholder="Search logs..." 
                            value={searchTerm}
                            onChange={(e) => setSearchToken(e.target.value)}
                            style={{ fontSize: '0.8rem', minWidth: '200px' }}
                        />
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-3 shadow-sm border p-2">
                    <div className="table-responsive custom-scrollbar" style={{ maxHeight: '60vh' }}>
                        <table className="table table-micro table-hover align-middle mb-0">
                            <thead className="bg-light position-sticky top-0" style={{ zIndex: 1 }}>
                                <tr>
                                    <th className="fw-bold border-0 text-primary py-2">TIMESTAMP</th>
                                    <th className="fw-bold border-0 text-primary py-2">USER</th>
                                    <th className="fw-bold border-0 text-primary py-2 text-center">OPERATION</th>
                                    <th className="fw-bold border-0 text-primary py-2 text-center">TABLE / MODULE</th>
                                    <th className="fw-bold border-0 text-primary py-2">DETAILS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-5"><MDBIcon fas icon="spinner" spin size="2x" className="text-info"/></td></tr>
                                ) : filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                    <tr key={log.auditLogIdPk} className="border-bottom hover-lift">
                                        <td className="text-muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                            <MDBIcon far icon="clock" className="me-1"/> 
                                            {new Date(log.changeTimestamp).toLocaleString()}
                                        </td>
                                        <td className="fw-bold text-dark">
                                            <MDBIcon fas icon="user" className="me-1 text-muted" style={{ fontSize: '0.7rem' }}/> 
                                            {log.username || 'System'}
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge rounded-pill ${getOperationBadge(log.operationType)}`} style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                                                {log.operationType}
                                            </span>
                                        </td>
                                        <td className="text-center text-muted fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                                            {log.tableName || '-'}
                                        </td>
                                        <td className="text-dark" style={{ fontSize: '0.8rem' }}>
                                            {log.details}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" className="text-center py-4 text-muted" style={{ fontSize: '0.8rem' }}>No audit logs found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}