import React, { useState, useEffect } from 'react';
import { MDBBtn, MDBIcon, MDBTooltip } from 'mdb-react-ui-kit';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../Layouts/DashboardLayout.jsx';

export default function SubsidyAuthorizationModule() {
    const navigate = useNavigate();
    const [subsidies, setSubsidies] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Store the globally Active Subsidy Type
    const [activeSubsidy, setActiveSubsidy] = useState(null);
    const [studyingYearOptions, setStudyingYearOptions] = useState([]);

    // 3 Phases mapped to DB Status
    const phases = [
        { id: 1, label: 'PREPARE FOR REVIEW', status: 'UNDER REVIEW', icon: 'file-signature', desc: 'Initial vetting of draft allocations' },
        { id: 2, label: 'FINALIZE & APPROVAL', status: 'PENDING APPROVAL', icon: 'user-shield', desc: 'Management review and commitment' },
        { id: 3, label: 'APPROVED LIST', status: 'APPROVED', icon: 'check-double', desc: 'Successfully posted subsidies' }
    ];
    const [activeTab, setActiveTab] = useState(phases[0]);

    // Selection & Row Expansion States
    const [selectedIds, setSelectedIds] = useState([]);
    const [expandedRows, setExpandedRows] = useState([]);

    // Batch & Export States
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchPreviewMode, setBatchPreviewMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [batchErrors, setBatchErrors] = useState({});
    const [batchData, setBatchData] = useState({
        cheque: '', bankRef: '', comment: '', doc: null, certify: false
    });

    // Decline Pipeline States
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [declineLoading, setDeclineLoading] = useState(false);

    // Pagination & Sorting States
    const [pagination, setPagination] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState('student_subsidytype.modify_at_student_subsidytype');
    const [sortDirection, setSortDirection] = useState('desc');

    const authHeaders = { headers: { Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}` } };

    useEffect(() => {
        const fetchStudyPeriods = async () => {
            try {
                const res = await axios.get('/api/system-settings/udc/values?system_code=SYS&udc_type=STD_WILLDO', authHeaders);
                const options = res.data.map(period => ({
                    value: period.udc_code,
                    label: period.description_1
                }));
                setStudyingYearOptions(options);
            } catch (err) {
                console.error("Failed to fetch study periods", err);
            }
        };
        fetchStudyPeriods();
    }, []);

    useEffect(() => {
        fetchData();
        fetchActiveSubsidy();
        setSelectedIds([]); 
        setExpandedRows([]);
    }, [activeTab, currentPage, perPage, sortColumn, sortDirection]);

    const fetchActiveSubsidy = async () => {
        try {
            const res = await axios.get('/api/system-settings/subsidy-types', authHeaders);
            const fetchedData = res.data?.data || res.data;
            
            if (Array.isArray(fetchedData)) {
                const active = fetchedData.find(item => item.subsidytype_isActive === 1);
                setActiveSubsidy(active || null);
            } else {
                setActiveSubsidy(null);
            }
        } catch (error) {
            console.error("Error fetching active subsidy", error);
            setActiveSubsidy(null);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `/api/subsidy-authorizations?status=${activeTab.status}&page=${currentPage}&per_page=${perPage}&search=${searchTerm}&sort=${sortColumn}&direction=${sortDirection}`,
                authHeaders
            );
            setSubsidies(response.data.data);
            setPagination({
                current_page: response.data.current_page,
                last_page: response.data.last_page,
                total: response.data.total,
                from: response.data.from,
                to: response.data.to,
            });
        } catch (error) {
            console.error("Error fetching authorizations", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => { if (e.key === 'Enter') { setCurrentPage(1); fetchData(); } };

    const handleSort = (column) => {
        if (sortColumn === column) { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); } 
        else { setSortColumn(column); setSortDirection('asc'); }
    };

    const handleCheckAll = (e) => {
        if (e.target.checked) setSelectedIds(subsidies.map(s => s.id));
        else setSelectedIds([]);
    };

    const handleCheckSingle = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const toggleRowExpansion = (e, id) => {
        e.stopPropagation();
        setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
    };

    const openBatchModal = () => {
        setBatchData({ cheque: '', bankRef: '', comment: '', doc: null, certify: false });
        setBatchErrors({});
        setBatchPreviewMode(false);
        setShowBatchModal(true);
    };

    const closeBatchModal = () => {
        setShowBatchModal(false);
        setBatchPreviewMode(false);
        setBatchErrors({});
    };

    const handleBatchInputChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        setBatchData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'file' ? files[0] : value)
        }));
    };

    const handleRemoveFromBatch = (id) => {
        const newIds = selectedIds.filter(item => item !== id);
        setSelectedIds(newIds);
        if (newIds.length === 0) closeBatchModal();
    };

    const handleBatchPreview = () => {
        if (activeTab.id === 2) {
            const newErrors = {};
            if (!batchData.cheque.trim()) newErrors.cheque = "Cheque number is required.";
            if (!batchData.bankRef.trim()) newErrors.bankRef = "Bank deposit reference is required.";
            if (!batchData.doc) newErrors.doc = "Payment scanned document is required.";
            if (!batchData.certify) newErrors.certify = "You must certify the information.";

            if (Object.keys(newErrors).length > 0) {
                setBatchErrors(newErrors);
                return;
            }
        }
        setBatchErrors({});
        setBatchPreviewMode(true);
    };

    const submitBatch = async () => {
        setIsSubmitting(true);
        const payload = new FormData();
        payload.append('phase', activeTab.id);
        selectedIds.forEach(id => payload.append('ids[]', id));
        
        if (activeTab.id === 2) {
            payload.append('chequenumber', batchData.cheque);
            payload.append('bankdepositrefnumber', batchData.bankRef);
            payload.append('paymentscanneddoc', batchData.doc);
            payload.append('comment', batchData.comment);
        }

        try {
            await axios.post('/api/subsidy-authorizations/batch-post', payload, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}`
                }
            });
            closeBatchModal();
            setSelectedIds([]);
            fetchData();
        } catch (error) {
            if (error.response && error.response.status === 422) {
                alert("Validation error. Please check your inputs.");
            } else if (error.response && error.response.data && error.response.data.message) {
                alert(error.response.data.message);
            } else {
                alert("Error processing batch. Please try again.");
            }
            setBatchPreviewMode(false);
        }
        setIsSubmitting(false);
    };

    const handleDeclineConfirm = async () => {
        setDeclineLoading(true);
        try {
            const response = await axios.post('/api/authorizations/decline-batch', {
                subsidy_ids: selectedIds
            }, authHeaders);
            
            if (response.data.success) {
                setShowDeclineModal(false);
                setSelectedIds([]);
                fetchData();
            }
        } catch (error) {
            console.error("Error submitting decline action batch:", error);
            alert(error.response?.data?.message || "Failed to process decline batch application operations.");
        } finally {
            setDeclineLoading(false);
        }
    };

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const response = await axios.post('/api/subsidy-authorizations/export', { 
                status: activeTab.status 
            }, { 
                responseType: 'blob',
                headers: { Authorization: `Bearer ${localStorage.getItem('miras_auth_token')}` }
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Subsidy_${activeTab.label.replace(/\s+/g, '_')}_${new Date().getTime()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert("Failed to export records. Please try again.");
        }
        setIsExporting(false);
    };

    const formatCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        return `K ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getProgressWidth = () => {
        if (activeTab.id === 1) return '0%';
        if (activeTab.id === 2) return '50%';
        return '100%';
    };

    const getStatusTheme = (status) => {
        switch(status) {
            case 'UNDER REVIEW': return { bgHex: '#0d6efd', textClass: 'text-white' }; 
            case 'PENDING APPROVAL': return { bgHex: '#fd7e14', textClass: 'text-dark' }; 
            case 'APPROVED': return { bgHex: '#198754', textClass: 'text-white' }; 
            case 'DECLINE': 
            case 'DECLINED': return { bgHex: '#dc3545', textClass: 'text-white' }; 
            default: return { bgHex: '#6c757d', textClass: 'text-white' }; 
        }
    };

    // Helper to map Study Duration Code to its UDC Description
    const getDurationDescription = (code) => {
        if (!code) return 'N/A';
        const option = studyingYearOptions.find(opt => opt.value === code);
        return option ? option.label : code;
    };

    const selectedSubsidiesData = subsidies.filter(s => selectedIds.includes(s.id));
    const totalBatchCost = selectedSubsidiesData.reduce((sum, item) => sum + parseFloat(item.academicCost || 0), 0);
    
    const totalSubsidyAmount = selectedSubsidiesData.reduce((sum, item) => {
        const cost = parseFloat(item.academicCost || 0);
        if (!activeSubsidy) return sum;
        if (activeSubsidy.calculation_type === 'PERCENTAGE') {
            return sum + (cost * (parseFloat(activeSubsidy.global_percent_fixed_value) / 100));
        } else {
            const fixedVal = parseFloat(activeSubsidy.global_percent_fixed_value);
            return sum + (fixedVal > cost ? cost : fixedVal);
        }
    }, 0);

    const SortableHeader = ({ label, column, align = "left" }) => {
        const isCurrentSort = sortColumn === column;
        const icon = isCurrentSort ? (sortDirection === 'asc' ? 'sort-up' : 'sort-down') : 'sort';
        return (
            <th className={`fw-bold py-3 text-${align} header-hover`} style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.8rem', letterSpacing: '0.5px' }} onClick={() => handleSort(column)}>
                {label} <MDBIcon fas icon={icon} className={`ms-1 ${isCurrentSort ? 'text-warning' : 'opacity-50'}`} />
            </th>
        );
    };

    const renderPageNumbers = () => {
        const lastPage = pagination.last_page || 1;
        const current = currentPage;
        const range = [];
        for (let i = Math.max(1, current - 1); i <= Math.min(lastPage, current + 1); i++) range.push(i);
        return range.map((page) => (
            <MDBBtn key={page} size="sm" color={current === page ? 'primary' : 'light'} className="shadow-0 px-3 py-1 mx-1 fw-bold" style={{ backgroundColor: current === page ? '#8b0000' : '' }} onClick={() => setCurrentPage(page)}>
                {page}
            </MDBBtn>
        ));
    };

    return (
        <DashboardLayout pageTitle="MIRAS Subsidy Authorization" breadcrumbs={[{ label: "Home", url: "/" }, "Subsidy Authorization"]}>
            
            {/* BATCH POST MODAL */}
            {showBatchModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                                <div className="p-3 d-flex justify-content-between align-items-center bg-white border-bottom">
                                    <h5 className="mb-0 fw-bold text-dark"><MDBIcon fas icon="layer-group" className="me-2 text-primary" style={{ color: '#8b0000' }}/>{activeTab.id === 1 ? 'Process Batch to Level 2 (Finalize)' : 'Process Batch to Level 3 (Approve)'}</h5>
                                    <MDBIcon fas icon="times" style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={closeBatchModal} />
                                </div>
                                <div className="modal-body p-4 bg-light">
                                    <div className="mb-4">
                                        <h6 className="fw-bold text-primary mb-3" style={{ color: '#8b0000' }}>
                                            <MDBIcon fas icon="users" className="me-2"/> Selected Students ({selectedIds.length})
                                        </h6>
                                        <div className="table-responsive bg-white rounded border shadow-sm" style={{ maxHeight: '250px' }}>
                                            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                                                <thead className="bg-light text-muted" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                    <tr>
                                                        <th className="fw-bold py-2">Fullname</th>
                                                        <th className="fw-bold py-2">Belongs to</th>
                                                        <th className="fw-bold py-2 text-end">Subsidized Cost</th>
                                                        <th className="fw-bold py-2 text-end">Academic Cost</th>
                                                        <th className="fw-bold py-2 text-center">Subsidy Status</th>
                                                        <th className="fw-bold py-2 text-center">Std ID #</th>
                                                        <th className="fw-bold py-2">Course</th>
                                                        <th className="fw-bold py-2 text-center">Subsidy Year</th>
                                                        <th className="fw-bold py-2 text-center">Studying Year</th>
                                                        <th className="fw-bold py-2">Institution</th>
                                                        <th className="fw-bold py-2 text-center">Remove</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedSubsidiesData.map(item => {
                                                        const theme = getStatusTheme(item.status);
                                                        return (
                                                        <tr key={item.id}>
                                                            <td className="fw-bold">{item.fullname}</td>
                                                            <td className="text-muted">{item.belongsTo}</td>
                                                            <td className="text-end fw-bold text-success">{formatCurrency(item.totalAmount)}</td>
                                                            <td className="text-end fw-bold text-danger">{formatCurrency(item.academicCost)}</td>
                                                            <td className="text-center">
                                                                <span className={`badge rounded-pill border ${theme.textClass}`} style={{ backgroundColor: theme.bgHex }}>
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                            <td className="text-center">{item.studentId}</td>
                                                            <td>{item.courseName}</td>
                                                            <td className="text-center fw-bold">{item.subsidy_year}</td>
                                                            <td className="text-center text-muted">{getDurationDescription(item.studying_year)}</td>
                                                            <td>{item.institution}</td>
                                                            <td className="text-center">
                                                                <MDBBtn size="sm" color="danger" floating className="shadow-sm" onClick={() => handleRemoveFromBatch(item.id)}>
                                                                    <MDBIcon fas icon="trash" />
                                                                </MDBBtn>
                                                            </td>
                                                        </tr>
                                                    )})}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        {activeTab.id === 1 && !batchPreviewMode && (
                                            <div className="mt-4 p-3 rounded" style={{ border: '2px dashed #dc3545', backgroundColor: '#fffcfc' }}>
                                                <h6 className="fw-bold text-danger mb-2">
                                                    <MDBIcon fas icon="cogs" className="me-2" />
                                                    Subsidy Allocation Rule (Active Configuration)
                                                </h6>
                                                {activeSubsidy ? (
                                                    <div className="d-flex flex-wrap justify-content-between align-items-center">
                                                        <div className="mb-2 mb-md-0">
                                                            <span className="fw-bold text-dark me-2">Application Type:</span> 
                                                            <span className="badge bg-danger fs-6 py-2 px-3">{activeSubsidy.calculation_type}</span>
                                                        </div>
                                                        <div>
                                                            <span className="fw-bold text-dark me-2">Value to be Subsidized:</span> 
                                                            <span className="fw-bold text-danger fs-6">
                                                                {activeSubsidy.calculation_type === 'PERCENTAGE' 
                                                                    ? `${activeSubsidy.global_percent_fixed_value}% of Total Academic Cost` 
                                                                    : `${formatCurrency(activeSubsidy.global_percent_fixed_value)} Flat Rate`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-muted small fw-bold">
                                                        <MDBIcon fas icon="exclamation-triangle" className="me-2 text-warning"/>
                                                        No Active Subsidy Rule is configured. Please navigate to System Settings &gt; Subsidy Config to activate one.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {activeTab.id === 2 && !batchPreviewMode && (
                                        <div className="card shadow-sm border-0 rounded-4">
                                            <div className="card-header bg-white p-3 border-bottom">
                                                <h6 className="mb-0 fw-bold" style={{ color: '#3b71ca' }}>
                                                    <MDBIcon fas icon="money-check-alt" className="me-2"/> Subsidy Payment Details
                                                </h6>
                                            </div>
                                            <div className="card-body p-4">
                                                <div className="row g-4 align-items-center">
                                                    <div className="col-md-6">
                                                        <input type="text" name="cheque" className={`form-control form-control-lg bg-light ${batchErrors.cheque ? 'is-invalid' : ''}`} value={batchData.cheque} onChange={handleBatchInputChange} placeholder="Enter cheque number" />
                                                        {batchErrors.cheque && <div className="invalid-feedback">{batchErrors.cheque}</div>}
                                                    </div>
                                                    <div className="col-md-6">
                                                        <input type="text" name="bankRef" className={`form-control form-control-lg bg-light ${batchErrors.bankRef ? 'is-invalid' : ''}`} value={batchData.bankRef} onChange={handleBatchInputChange} placeholder="Enter bank deposit ref" />
                                                        {batchErrors.bankRef && <div className="invalid-feedback">{batchErrors.bankRef}</div>}
                                                    </div>
                                                    <div className="col-md-12">
                                                        <label className="fw-bold small text-muted mb-2">Payment Scanned Doc <span className="text-danger">*</span></label>
                                                        <input type="file" name="doc" className={`form-control bg-light ${batchErrors.doc ? 'is-invalid' : ''}`} onChange={handleBatchInputChange} accept=".pdf,.jpg,.png,.jpeg" />
                                                        {batchErrors.doc && <div className="invalid-feedback">{batchErrors.doc}</div>}
                                                    </div>
                                                    <div className="col-md-12">
                                                        <input type="text" name="comment" className="form-control form-control-lg bg-light" value={batchData.comment} onChange={handleBatchInputChange} placeholder="Enter Comment (Optional)" />
                                                    </div>
                                                    <div className="col-md-12 mt-4">
                                                        <div className="form-check">
                                                            <input className={`form-check-input ${batchErrors.certify ? 'is-invalid' : ''}`} type="checkbox" name="certify" id="certifyCheck" checked={batchData.certify} onChange={handleBatchInputChange} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
                                                            <label className="form-check-label ms-2 text-dark" htmlFor="certifyCheck" style={{ cursor: 'pointer' }}>
                                                                I certify that the information provided is true and accurate.
                                                            </label>
                                                            {batchErrors.certify && <div className="invalid-feedback d-block mt-1">{batchErrors.certify}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {batchPreviewMode && (
                                        <div className="text-center p-3">
                                            <MDBIcon fas icon={activeTab.id === 1 ? "clipboard-check" : "search-dollar"} size="3x" className="text-success mb-3" />
                                            <h5 className="fw-bold text-dark mb-4">Review Batch Submission (Level {activeTab.id})</h5>
                                            <div className="row text-start justify-content-center">
                                                <div className="col-md-8 bg-white p-4 rounded border shadow-sm">
                                                    <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                                                        <span className="text-muted fw-bold">Total Students in Batch:</span>
                                                        <span className="fw-bold fs-5">{selectedIds.length}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                                                        <span className="text-muted fw-bold">Total Academic Cost:</span>
                                                        <span className="fw-bold text-danger fs-5">{formatCurrency(totalBatchCost)}</span>
                                                    </div>
                                                    
                                                    {activeTab.id === 1 && activeSubsidy && (
                                                        <>
                                                            <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                                                                <span className="text-muted fw-bold">Subsidy Type:</span>
                                                                <span className="fw-bold text-danger">
                                                                    {activeSubsidy.calculation_type === 'PERCENTAGE' 
                                                                        ? `Percentage (${activeSubsidy.global_percent_fixed_value}%)` 
                                                                        : 'Fixed Amount'}
                                                                </span>
                                                            </div>
                                                            <div className="d-flex justify-content-between mb-3 pb-2 border-bottom bg-light px-2 rounded">
                                                                <span className="text-danger fw-bold fs-5 pt-1">Total Amount To Be Subsidize:</span>
                                                                <span className="fw-bold text-danger fs-4">{formatCurrency(totalSubsidyAmount)}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                    
                                                    {activeTab.id === 2 && (
                                                        <>
                                                            <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                                                                <span className="text-muted fw-bold">Cheque #:</span>
                                                                <span className="fw-bold text-dark">{batchData.cheque}</span>
                                                            </div>
                                                            <div className="d-flex justify-content-between">
                                                                <span className="text-muted fw-bold">Bank Deposit Ref:</span>
                                                                <span className="fw-bold text-dark">{batchData.bankRef}</span>
                                                            </div>
                                                        </>
                                                    )}

                                                    {activeTab.id === 1 && (
                                                        <div className="text-center mt-3 text-muted small">
                                                            <MDBIcon fas icon="info-circle" className="me-1"/> This batch will be progressed to Level 2 (Finalize & Approval).
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-white border-top d-flex justify-content-end gap-3">
                                    {!batchPreviewMode ? (
                                        <>
                                            <MDBBtn color="danger" className="shadow-0 fw-bold px-4" style={{ backgroundColor: '#dc3545', borderRadius: '5px' }} onClick={closeBatchModal}>CLOSE</MDBBtn>
                                            <MDBBtn 
                                                color="success" 
                                                className="shadow-0 fw-bold px-4" 
                                                style={{ backgroundColor: '#28a745', borderRadius: '5px' }} 
                                                onClick={handleBatchPreview}
                                                disabled={activeTab.id === 1 && !activeSubsidy}
                                            >
                                                <MDBIcon fas icon="eye" className="me-2" /> PREVIEW BATCH
                                            </MDBBtn>
                                        </>
                                    ) : (
                                        <>
                                            <MDBBtn color="warning" className="shadow-0 fw-bold px-4 text-white" style={{ backgroundColor: '#d39e00' }} onClick={() => setBatchPreviewMode(false)} disabled={isSubmitting}>
                                                {activeTab.id === 1 ? 'BACK' : 'EDIT DETAILS'}
                                            </MDBBtn>
                                            <MDBBtn color="success" className="shadow-0 fw-bold px-4" style={{ backgroundColor: '#28a745', borderRadius: '5px' }} onClick={submitBatch} disabled={isSubmitting}>
                                                {isSubmitting ? <><MDBIcon fas icon="spinner" spin className="me-2"/> PROCESSING...</> : <><MDBIcon fas icon="paper-plane" className="me-2"/> SUBMIT THIS BATCH</>}
                                            </MDBBtn>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* --- DECLINE PREVIEW MODAL --- */}
            {showDeclineModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                                <div className="p-3 d-flex justify-content-between align-items-center bg-danger text-white border-bottom">
                                    <h5 className="mb-0 fw-bold"><MDBIcon fas icon="exclamation-triangle" className="me-2"/> Preview Decline Action</h5>
                                    <MDBIcon fas icon="times" style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowDeclineModal(false)} />
                                </div>
                                <div className="modal-body p-4 bg-light">
                                    <div className="text-center mb-4">
                                        <MDBIcon fas icon="times-circle" size="3x" className="text-danger mb-2" />
                                        <h5 className="fw-bold text-dark">Are you sure you want to decline the selected records?</h5>
                                        <p className="text-muted small">
                                            You are moving <strong>{selectedIds.length}</strong> checked row(s) to the DECLINE phase. This will revoke status changes and log individual audit entries.
                                        </p>
                                    </div>
                                    <div className="bg-white rounded border p-3 shadow-sm overflow-auto" style={{ maxHeight: '180px' }}>
                                        <h6 className="fw-bold text-dark mb-2" style={{ fontSize: '0.85rem' }}>Selected Rows Overview:</h6>
                                        <ul className="list-group list-group-flush" style={{ fontSize: '0.85rem' }}>
                                            {subsidies.filter(s => selectedIds.includes(s.id)).map(item => (
                                                <li key={item.id} className="list-group-item px-1 d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <span className="fw-bold text-dark">{item.fullname}</span>
                                                        <span className="text-muted ms-2">(ID: #{item.studentId})</span>
                                                    </div>
                                                    <span className="fw-bold text-danger">{formatCurrency(item.academicCost)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="p-3 bg-white border-top d-flex justify-content-end gap-3">
                                    <MDBBtn color="light" className="shadow-0 fw-bold px-4" onClick={() => setShowDeclineModal(false)}>Cancel</MDBBtn>
                                    <MDBBtn color="danger" className="shadow-0 fw-bold px-4" style={{ backgroundColor: '#dc3545', borderRadius: '5px' }} onClick={handleDeclineConfirm} disabled={declineLoading}>
                                        {declineLoading ? <><MDBIcon fas icon="spinner" spin className="me-2"/> Processing...</> : "Approve Decline"}
                                    </MDBBtn>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Infographic Stepper Pipeline */}
            <div className="card shadow-sm border-0 mb-4 rounded-4 bg-white fade-in-up">
                <div className="card-body p-4 pt-5 pb-4">
                    <div className="position-relative d-flex justify-content-between align-items-center w-100 px-md-5">
                        <div className="position-absolute" style={{ height: '4px', backgroundColor: '#e9ecef', top: '23px', left: '10%', right: '10%', zIndex: 1, borderRadius: '2px' }}></div>
                        <div className="position-absolute" style={{ height: '4px', backgroundColor: '#8b0000', top: '23px', left: '10%', width: `calc(${getProgressWidth()} * 0.8)`, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 1, borderRadius: '2px' }}></div>

                        {phases.map((phase) => {
                            const isActive = activeTab.id === phase.id;
                            const isCompleted = phase.id < activeTab.id;
                            
                            return (
                                <div key={phase.id} className="d-flex flex-column align-items-center position-relative step-node" style={{ zIndex: 2, cursor: 'pointer', width: '33%' }} onClick={() => { setCurrentPage(1); setActiveTab(phase); }}>
                                    <div 
                                        className={`rounded-circle d-flex justify-content-center align-items-center mb-3 ${isActive ? 'active-pulse' : ''}`}
                                        style={{ width: '50px', height: '50px', backgroundColor: isActive || isCompleted ? '#8b0000' : '#ffffff', color: isActive || isCompleted ? '#ffffff' : '#adb5bd', border: isActive || isCompleted ? '3px solid #8b0000' : '3px solid #dee2e6', transition: 'all 0.3s ease' }}
                                    >
                                        <MDBIcon fas icon={isCompleted ? 'check' : phase.icon} size="lg" />
                                    </div>
                                    <h6 className={`fw-bold mb-1 text-center ${isActive ? 'text-dark' : 'text-muted'}`} style={{ fontSize: '0.85rem', letterSpacing: '0.5px', transition: 'color 0.3s ease' }}>{phase.label}</h6>
                                    <small className="text-muted text-center d-none d-md-block" style={{ fontSize: '0.7rem' }}>{phase.desc}</small>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Data Section */}
            <div className="card shadow-sm border-0 rounded-4 overflow-hidden fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="card-body p-4 bg-light">
                    
                    {/* Top Action Bar */}
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4">
                        <div className="d-flex gap-2 mb-3 mb-md-0">
                            <MDBBtn 
                                color="success" 
                                className="shadow-sm fw-bold px-3 py-2 hover-lift" 
                                style={{ backgroundColor: '#28a745', borderRadius: '8px' }} 
                                disabled={isExporting} 
                                onClick={handleExportExcel}
                            >
                                {isExporting ? <MDBIcon fas icon="spinner" spin className="me-2" /> : <MDBIcon fas icon="file-excel" className="me-2" />} EXPORT EXCEL
                            </MDBBtn>
                            
                            {(activeTab.id === 1 || activeTab.id === 2) && (
                                <MDBBtn color="primary" className="shadow-sm fw-bold px-3 py-2 hover-lift" style={{ backgroundColor: '#3b71ca', borderRadius: '8px' }} disabled={selectedIds.length === 0} onClick={openBatchModal}>
                                    <MDBIcon fas icon="layer-group" className="me-2" /> BATCH POST SUBSIDY
                                </MDBBtn>
                            )}

                            {/* DECLINE WORKFLOW BUTTON ACTION (Only available on Levels 1 & 2) */}
                            {(activeTab.id === 1 || activeTab.id === 2) && (
                                <MDBBtn 
                                    color="danger" 
                                    className="shadow-sm fw-bold px-3 py-2 ms-2 hover-lift" 
                                    style={{ borderRadius: '8px' }}
                                    disabled={selectedIds.length === 0}
                                    onClick={() => setShowDeclineModal(true)}
                                >
                                    <MDBIcon fas icon="ban" className="me-2" /> DECLINE
                                </MDBBtn>
                            )}
                        </div>
                        
                        <div className="d-flex align-items-center gap-3 bg-white p-2 rounded-4 shadow-sm border">
                            <div className="d-flex align-items-center border-end pe-3">
                                <select className="form-select form-select-sm border-0 fw-bold text-dark shadow-none" style={{ width: '65px', cursor: 'pointer', backgroundColor: 'transparent' }} value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                                    <option value="10">10</option><option value="25">25</option><option value="50">50</option>
                                </select>
                                <span className="text-muted small ms-1 text-nowrap">entries per page</span>
                            </div>
                            <div className="d-flex align-items-center ps-2 pe-1">
                                <MDBIcon fas icon="search" className="me-2 text-primary" />
                                <input type="text" className="form-control form-control-sm border-0 shadow-none" style={{ width: '180px', backgroundColor: 'transparent' }} placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleSearch} />
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="table-responsive bg-white rounded-4 shadow-sm border pb-2">
                        <table className="table table-sm table-hover align-middle mb-0 text-nowrap" style={{ borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#8b0000', color: 'white', fontSize: '0.75rem' }}>
                                <tr>
                                    {activeTab.id === 2 && <th className="border-0 text-center" style={{ width: '30px' }}></th>}
                                    
                                    {(activeTab.id === 1 || activeTab.id === 2) && (
                                        <th className="py-2 text-center border-0" style={{ width: '60px' }}>
                                            <div className="d-flex align-items-center justify-content-center m-0">
                                                <span className="me-2">Check All</span>
                                                <input className="form-check-input custom-checkbox" type="checkbox" style={{ cursor: 'pointer' }} onChange={handleCheckAll} checked={subsidies.length > 0 && selectedIds.length === subsidies.length} />
                                            </div>
                                        </th>
                                    )}
                                    <SortableHeader label="Fullname" column="fullname" />
                                    <SortableHeader label="Belongs to" column="ward.wardName" />
                                    <SortableHeader label="Subsidized Cost" column="totalAmount" align="end" />
                                    <SortableHeader label="Aca. Cost" column="academicCost" align="end" />
                                    <SortableHeader label="Status" column="status" align="center" />
                                    <SortableHeader label="ID #" column="studentId" align="center" />
                                    <SortableHeader label="Course" column="courseName" />
                                    <SortableHeader label="Sub. Year" column="subsidy_year" align="center" />
                                    <SortableHeader label="Sty. Year" column="studying_year" align="center" />
                                    <SortableHeader label="Institution" column="institution" />
                                    
                                </tr>
                            </thead>
                            <tbody style={{ fontSize: '0.8rem' }}>
                                {loading ? (
                                    <tr><td colSpan="14" className="text-center py-5"><MDBIcon fas icon="spinner" spin size="2x" className="text-primary"/></td></tr>
                                ) : subsidies.length > 0 ? subsidies.map((item) => {
                                    const theme = getStatusTheme(item.status);
                                    return (
                                    <React.Fragment key={item.id}>
                                        <tr className="data-row" onClick={() => (activeTab.id === 1 || activeTab.id === 2) && handleCheckSingle(item.id)} style={{ cursor: (activeTab.id === 1 || activeTab.id === 2) ? 'pointer' : 'default', borderBottom: expandedRows.includes(item.id) ? 'none' : '1px solid #dee2e6' }}>
                                            
                                            {activeTab.id === 2 && (
                                                <td className="text-center" onClick={(e) => toggleRowExpansion(e, item.id)}>
                                                    <MDBIcon fas icon={expandedRows.includes(item.id) ? "caret-down" : "caret-right"} style={{ cursor: 'pointer', fontSize: '1.2rem', color: '#8b0000', transition: 'transform 0.2s' }} />
                                                </td>
                                            )}

                                            {(activeTab.id === 1 || activeTab.id === 2) && (
                                                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                    <div className="form-check d-flex justify-content-center m-0">
                                                        <input className="form-check-input custom-checkbox" type="checkbox" style={{ cursor: 'pointer' }} checked={selectedIds.includes(item.id)} onChange={() => handleCheckSingle(item.id)} />
                                                    </div>
                                                </td>
                                            )}
                                            <td className="fw-bold text-dark text-nowrap">{item.fullname}</td>
                                            <td className="text-muted">{item.belongsTo}</td>
                                            
                                            <td className="text-end fw-bold text-success text-nowrap">{formatCurrency(item.totalAmount)}</td>
                                            <td className="text-end fw-bold text-nowrap" style={{ color: '#8b0000' }}>{formatCurrency(item.academicCost)}</td>
                                            <td className="text-center text-nowrap">
                                                <span 
                                                    className={`badge rounded-pill px-3 py-2 fw-bold border ${theme.textClass}`} 
                                                    style={{ backgroundColor: theme.bgHex }}
                                                >
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="text-center fw-bold text-muted">#{item.studentId}</td>
                                            <td><div className="fw-bold text-dark">{item.courseName}</div></td>
                                            <td className="text-center fw-bold">{item.subsidy_year}</td>
                                            <td className="text-center text-muted">{getDurationDescription(item.studying_year)}</td>
                                            <td>{item.institution}</td>
                                        </tr>

                                        {activeTab.id === 2 && expandedRows.includes(item.id) && (
                                            <tr className="bg-light" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                                <td colSpan="13" className="p-0 border-bottom">
                                                    <div className="p-3 mx-4 my-2 bg-white rounded shadow-sm border border-start-0 border-end-0 border-bottom-0" style={{ borderTop: '3px solid #3b71ca' }}>
                                                        <h6 className="fw-bold text-primary mb-3" style={{ fontSize: '0.8rem' }}><MDBIcon fas icon="info-circle" className="me-2"/> Payment Details (Level 1 Submission)</h6>
                                                        <div className="d-flex flex-wrap gap-4">
                                                            <div>
                                                                <span className="text-muted small fw-bold text-uppercase d-block" style={{ letterSpacing: '0.5px' }}>Cheque #</span>
                                                                <span className="text-dark fw-bold">{item.cheque || item.chequenumber || 'N/A'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted small fw-bold text-uppercase d-block" style={{ letterSpacing: '0.5px' }}>Bank Ref</span>
                                                                <span className="text-dark fw-bold">{item.bankRef || item.bankdepositrefnumber || 'N/A'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted small fw-bold text-uppercase d-block" style={{ letterSpacing: '0.5px' }}>Comments</span>
                                                                <span className="text-dark">{item.comment || 'None'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )}) : (
                                    <tr>
                                        <td colSpan="14" className="text-center py-5 text-muted">
                                            <div className="mb-3 opacity-50"><MDBIcon fas icon="box-open" size="3x" /></div>
                                            <h6 className="fw-bold">No records found for this phase.</h6>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-4">
                        <span className="text-muted fw-bold" style={{ fontSize: '0.85rem' }}>
                            Showing {pagination.from || 0} to {pagination.to || 0} of <span className="text-dark">{pagination.total || 0}</span> entries
                        </span>
                        <div className="d-flex align-items-center bg-white border rounded-pill px-2 py-1 shadow-sm">
                            <MDBBtn size="sm" color="link" className="text-dark shadow-0 px-2 py-1 me-1" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>&lsaquo; Prev</MDBBtn>
                            {renderPageNumbers()}
                            <MDBBtn size="sm" color="link" className="text-dark shadow-0 px-2 py-1 ms-1" disabled={currentPage === pagination.last_page || !pagination.last_page} onClick={() => setCurrentPage(currentPage + 1)}>Next &rsaquo;</MDBBtn>
                        </div>
                    </div>

                </div>
            </div>

            <style>
                {`
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; background-color: #f8f9fa; }
                    to { opacity: 1; background-color: #f8f9fa; }
                }
                .fade-in-up {
                    opacity: 0;
                    animation: slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes pulse-ring {
                    0% { box-shadow: 0 0 0 0 rgba(139, 0, 0, 0.5); }
                    70% { box-shadow: 0 0 0 10px rgba(139, 0, 0, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(139, 0, 0, 0); }
                }
                .active-pulse {
                    animation: pulse-ring 2s infinite;
                }
                .data-row {
                    transition: all 0.2s ease;
                }
                .data-row:hover {
                    background-color: #fdfaf4 !important;
                }
                .hover-lift {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .hover-lift:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
                }
                .header-hover:hover {
                    background-color: rgba(255,255,255,0.1);
                }
                .custom-checkbox:checked {
                    background-color: #8b0000;
                    border-color: #8b0000;
                }
                .step-node:hover h6 {
                    color: #8b0000 !important;
                }
                `}
            </style>
        </DashboardLayout>
    );
}