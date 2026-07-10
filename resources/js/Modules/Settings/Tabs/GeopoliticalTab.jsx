import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MDBBtn, MDBIcon, MDBTable, MDBTableHead, MDBTableBody } from 'mdb-react-ui-kit';
import axios from 'axios';
import WarningModal from '../../../Components/Modals/WarningModal.jsx';
import ConfirmModal from '../../../Components/Modals/ConfirmModal.jsx';

export default function GeopoliticalTab() {
    const geoLevels = ['Provinces', 'Districts', 'LLGs', 'Wards'];
    const [activeGeoLevel, setActiveGeoLevel] = useState(geoLevels[3]); // Wards Tab Default
    const [geoData, setGeoData] = useState([]);
    const [loadingGeo, setLoadingGeo] = useState(false);
    
    // Cascading Filter States
    const [filterProvince, setFilterProvince] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('');
    const [filterLLG, setFilterLLG] = useState('');
    
    // Lists for Dropdowns
    const [provinceList, setProvinceList] = useState([]);
    const [districtList, setDistrictList] = useState([]);
    const [llgList, setLlgList] = useState([]);

    // Modal States
    const [showDependencyWarning, setShowDependencyWarning] = useState(false);
    const [dependencyMessage, setDependencyMessage] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const [showGeoModal, setShowGeoModal] = useState(false);
    const [geoFormData, setGeoFormData] = useState({ id: '', name: '', code: '', parentId: '' });
    const [parentOptions, setParentOptions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- PAGINATION STATES ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Sleek UI Geo Area Stats
    const geoAreas = [
        { title: 'Provinces', count: 22, icon: 'map', color: 'primary' },
        { title: 'Districts', count: 91, icon: 'map-marked-alt', color: 'success' },
        { title: 'LLGs', count: 4, icon: 'layer-group', color: 'warning' },
        { title: 'Wards', count: 69, icon: 'home', color: 'info' }
    ];

    // --- CASCADING FILTER FETCH LOGIC ---
    useEffect(() => {
        axios.get('/api/system-settings/geo/Provinces').then(res => {
            const fetchedData = res.data?.data || res.data;
            setProvinceList(Array.isArray(fetchedData) ? fetchedData : []);
        }).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (filterProvince) {
            axios.get(`/api/system-settings/geo/Districts?provinceId=${filterProvince}`).then(res => {
                const fetchedData = res.data?.data || res.data;
                setDistrictList(Array.isArray(fetchedData) ? fetchedData : []);
            }).catch(err => console.error(err));
        } else {
            setDistrictList([]);
            setFilterDistrict(''); 
        }
    }, [filterProvince]);

    useEffect(() => {
        if (filterDistrict) {
            axios.get(`/api/system-settings/geo/LLGs?districtId=${filterDistrict}`).then(res => {
                const fetchedData = res.data?.data || res.data;
                setLlgList(Array.isArray(fetchedData) ? fetchedData : []);
            }).catch(err => console.error(err));
        } else {
            setLlgList([]);
            setFilterLLG(''); 
        }
    }, [filterDistrict]);

    // Reset filters and page when switching main tabs
    useEffect(() => {
        setFilterProvince('');
        setFilterDistrict('');
        setFilterLLG('');
        setCurrentPage(1);
    }, [activeGeoLevel]);

    // --- MAIN TABLE DATA FETCH ---
    useEffect(() => {
        fetchGeoData();
    }, [activeGeoLevel, filterProvince, filterDistrict, filterLLG]);

    const fetchGeoData = async () => {
        setLoadingGeo(true);
        try {
            let url = `/api/system-settings/geo/${activeGeoLevel}`;
            
            const params = new URLSearchParams();
            if (filterProvince) params.append('provinceId', filterProvince);
            if (filterDistrict) params.append('districtId', filterDistrict);
            if (filterLLG) params.append('llgId', filterLLG);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const res = await axios.get(url);
            const fetchedData = res.data?.data || res.data;
            setGeoData(Array.isArray(fetchedData) ? fetchedData : []);
            setCurrentPage(1); // Reset to page 1 on new data fetch
        } catch (error) {
            console.error("Error fetching geopolitical data", error);
            setGeoData([]);
        }
        setLoadingGeo(false);
    };

    // --- FORM PARENT OPTIONS LOGIC ---
    const fetchParentOptions = async () => {
        let parentLevel = '';
        if (activeGeoLevel === 'Districts') parentLevel = 'Provinces';
        else if (activeGeoLevel === 'LLGs') parentLevel = 'Districts';
        else if (activeGeoLevel === 'Wards') parentLevel = 'LLGs';

        if (parentLevel) {
            try {
                const res = await axios.get(`/api/system-settings/geo/${parentLevel}`);
                const fetchedData = res.data?.data || res.data;
                setParentOptions(Array.isArray(fetchedData) ? fetchedData : []);
            } catch (error) {
                console.error("Error fetching parent options", error);
                setParentOptions([]);
            }
        } else {
            setParentOptions([]);
        }
    };

    const getParentLabel = () => {
        if (activeGeoLevel === 'Districts') return 'Province';
        if (activeGeoLevel === 'LLGs') return 'District';
        if (activeGeoLevel === 'Wards') return 'LLG';
        return 'Parent';
    };

    const handleNewGeo = () => {
        setGeoFormData({ id: '', name: '', code: '', parentId: '' });
        setParentOptions([]); 
        fetchParentOptions(); 
        setShowGeoModal(true);
    };

    const handleEditGeo = (item) => {
        if (!item) return;
        setGeoFormData({ 
            id: item.id || '', 
            name: item.name || '', 
            code: item.code || '', 
            parentId: item.parentId || '' 
        });
        setParentOptions([]); 
        fetchParentOptions(); 
        setShowGeoModal(true);
    };

    const handleGeoInputChange = (e) => {
        const { name, value } = e.target;
        setGeoFormData(prev => ({ ...prev, [name]: value }));
    };

    const confirmDeleteGeo = (item) => {
        if (item.linkedRecords > 0) {
            setDependencyMessage(`This record cannot be deleted because it is actively linked to ${item.linkedRecords} dependent child item(s).`);
            setShowDependencyWarning(true);
            return;
        }
        setItemToDelete(item);
        setShowDeleteConfirm(true);
    };

    const executeDeleteGeo = async () => {
        if (!itemToDelete) return;
        const type = activeGeoLevel.slice(0, -1).toLowerCase(); 
        try {
            await axios.delete(`/api/system-settings/geo/${type}/${itemToDelete.id}`);
            setShowDeleteConfirm(false);
            setItemToDelete(null);
            fetchGeoData(); 
        } catch (error) {
            if (error.response?.status === 409 && error.response.data.has_children) {
                setShowDeleteConfirm(false);
                setDependencyMessage(error.response.data.message);
                setShowDependencyWarning(true);
            } else {
                alert("Failed to delete record.");
            }
        }
    };

    const saveGeoData = async () => {
        if (!geoFormData.name.trim()) return alert("Name is required.");
        
        if (activeGeoLevel !== 'Provinces' && !geoFormData.parentId) {
            return alert(`Please select a ${getParentLabel()} to establish the link for this ${activeGeoLevel.slice(0, -1)}.`);
        }

        setIsSubmitting(true);
        const type = activeGeoLevel.slice(0, -1).toLowerCase(); 
        try {
            await axios.post(`/api/system-settings/geo/${type}`, geoFormData);
            setShowGeoModal(false);
            fetchGeoData(); 
        } catch (error) {
            alert("Failed to save record.");
        }
        setIsSubmitting(false);
    };

    const buildExportUrl = (format) => {
        // FIX: Route updated to match api.php (/api/system-settings/geo/export/{level})
        let url = `/api/system-settings/geo/export/${activeGeoLevel}`;
        const params = new URLSearchParams();
        if (filterProvince) params.append('provinceId', filterProvince);
        if (filterDistrict) params.append('districtId', filterDistrict);
        if (filterLLG) params.append('llgId', filterLLG);
        params.append('format', format);
        return `${url}?${params.toString()}`;
    };

    const handleExportExcel = () => window.location.href = buildExportUrl('csv');
    const handleExportPDF = () => window.location.href = buildExportUrl('pdf');

    // --- PAGINATION LOGIC ---
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = geoData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(geoData.length / itemsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div className="tab-pane-content fade-in">
            
            {createPortal(
                <>
                    <WarningModal isOpen={showDependencyWarning} message={dependencyMessage} onClose={() => setShowDependencyWarning(false)} />
                    <ConfirmModal isOpen={showDeleteConfirm} itemName={itemToDelete?.name} onConfirm={executeDeleteGeo} onClose={() => setShowDeleteConfirm(false)} />
                </>,
                document.body
            )}

            {showGeoModal && createPortal(
                <>
                    <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1040 }}></div>
                    <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                                <div className="p-3 d-flex justify-content-between align-items-center bg-white border-bottom">
                                    <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '1rem' }}>
                                        <MDBIcon fas icon="map-marked-alt" className="me-2" style={{ color: '#8b0000' }}/>
                                        {geoFormData.id ? `Edit ${activeGeoLevel.slice(0, -1)}` : `New ${activeGeoLevel.slice(0, -1)}`}
                                    </h5>
                                    <MDBIcon fas icon="times" style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowGeoModal(false)} />
                                </div>
                                <div className="modal-body p-4 bg-light">
                                    <div className="row g-4">
                                        <div className="col-12">
                                            <label className="fw-bold small text-muted mb-1">{activeGeoLevel.slice(0, -1)} Name <span className="text-danger">*</span></label>
                                            <input type="text" name="name" className="form-control form-control-sm" placeholder={`Enter ${activeGeoLevel.slice(0, -1)} Name`} value={geoFormData.name} onChange={handleGeoInputChange} />
                                        </div>
                                        <div className="col-12">
                                            <label className="fw-bold small text-muted mb-1">{activeGeoLevel.slice(0, -1)} Code</label>
                                            <input type="text" name="code" className="form-control form-control-sm" placeholder="Optional short code" value={geoFormData.code} onChange={handleGeoInputChange} />
                                        </div>
                                        
                                        {activeGeoLevel !== 'Provinces' && (
                                            <div className="col-12">
                                                <label className="fw-bold small text-muted mb-1">Link to {getParentLabel()} <span className="text-danger">*</span></label>
                                                <select name="parentId" className="form-select form-select-sm" value={geoFormData.parentId} onChange={handleGeoInputChange}>
                                                    <option value="">Select {getParentLabel()}...</option>
                                                    {Array.isArray(parentOptions) && parentOptions.map(parent => (
                                                        <option key={parent.id} value={parent.id}>{parent.name} {parent.code ? `(${parent.code})` : ''}</option>
                                                    ))}
                                                </select>
                                                <div className="text-muted small mt-1" style={{ fontSize: '0.7rem' }}><MDBIcon fas icon="link" className="me-1"/> Establishing 1-to-Many hierarchy.</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 bg-white border-top d-flex justify-content-end gap-2">
                                    <MDBBtn color="light" size="sm" className="shadow-0 fw-bold border hover-lift" onClick={() => setShowGeoModal(false)}>CANCEL</MDBBtn>
                                    <MDBBtn color="success" size="sm" className="shadow-sm fw-bold hover-lift" style={{ backgroundColor: '#8b0000' }} onClick={saveGeoData} disabled={isSubmitting}>
                                        {isSubmitting ? <><MDBIcon fas icon="spinner" spin className="me-2"/> SAVING...</> : <><MDBIcon fas icon="save" className="me-2"/> SAVE RECORD</>}
                                    </MDBBtn>
                                </div>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

            <div className="card shadow-sm border-0 rounded-3 animate-fade-in mb-4">
                <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                        <div className="d-flex align-items-center">
                            <div className="icon-box bg-secondary text-dark me-2 shadow-sm">
                                <MDBIcon fas icon="globe" />
                            </div>
                            <div>
                                <h6 className="fw-bold mb-0 text-dark">Geopolitical Area Setup</h6>
                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>Manage regions, districts, and wards.</small>
                            </div>
                        </div>
                        <MDBBtn color="success" size="sm" className="shadow-sm fw-bold px-3 py-1 hover-lift" style={{ backgroundColor: '#28a745', fontSize: '0.7rem' }} onClick={handleNewGeo}>
                            <MDBIcon fas icon="plus" className="me-2"/> ADD {activeGeoLevel.slice(0, -1).toUpperCase()}
                        </MDBBtn>
                    </div>

                    <div className="row g-3">
                        {geoAreas.map((area, index) => (
                            <div className="col-6 col-md-3" key={index}>
                                <div className="card border rounded-3 hover-lift bg-light h-100" style={{ cursor: 'pointer' }}>
                                    <div className="card-body p-3 text-center">
                                        <MDBIcon fas icon={area.icon} size="2x" className={`text-${area.color} mb-2`} />
                                        <h3 className="fw-bold text-dark mb-0">{area.count}</h3>
                                        <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>{area.title}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="row g-4 animate-fade-in">
                <div className="col-md-3">
                    <div className="list-group rounded-3 shadow-sm border-0">
                        {geoLevels.map(level => (
                            <button key={level} className={`list-group-item list-group-item-action fw-bold border-0 py-2 ${activeGeoLevel === level ? 'active shadow-sm' : ''}`}
                                style={{ backgroundColor: activeGeoLevel === level ? '#3b71ca' : '#ffffff', fontSize: '0.85rem' }} onClick={() => setActiveGeoLevel(level)}>
                                <MDBIcon fas icon={level === 'Provinces' ? 'map' : (level === 'Districts' ? 'map-pin' : (level === 'LLGs' ? 'route' : 'home'))} className="me-3 opacity-75"/>
                                {level}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="col-md-9">
                    
                    {activeGeoLevel === 'Wards' && (
                        <div className="d-flex flex-wrap align-items-end justify-content-between bg-white p-3 rounded-3 shadow-sm border mb-3 gap-3">
                            <div className="d-flex flex-wrap gap-3 flex-grow-1">
                                <div style={{ flex: '1 1 150px' }}>
                                    <label className="text-muted mb-1" style={{ fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase' }}>Filter Province</label>
                                    <select className="form-select form-select-sm border-secondary shadow-none" value={filterProvince} onChange={(e) => setFilterProvince(e.target.value)}>
                                        <option value="">All Provinces</option>
                                        {provinceList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: '1 1 150px' }}>
                                    <label className="text-muted mb-1" style={{ fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase' }}>Filter District</label>
                                    <select className="form-select form-select-sm border-secondary shadow-none" value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)} disabled={!filterProvince}>
                                        <option value="">All Districts</option>
                                        {districtList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: '1 1 150px' }}>
                                    <label className="text-muted mb-1" style={{ fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase' }}>Filter LLG</label>
                                    <select className="form-select form-select-sm border-secondary shadow-none" value={filterLLG} onChange={(e) => setFilterLLG(e.target.value)} disabled={!filterDistrict}>
                                        <option value="">All LLGs</option>
                                        {llgList.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="d-flex gap-2 mt-2 mt-md-0">
                                <MDBBtn size="sm" color="light" className="fw-bold border border-secondary text-dark shadow-0 hover-lift px-3" onClick={handleExportExcel} style={{ fontSize: '0.7rem' }}>
                                    <MDBIcon fas icon="file-excel" className="me-2 text-success"/> Export Excel
                                </MDBBtn>
                                <MDBBtn size="sm" color="light" className="fw-bold border border-secondary text-dark shadow-0 hover-lift px-3" onClick={handleExportPDF} style={{ fontSize: '0.7rem' }}>
                                    <MDBIcon fas icon="file-pdf" className="me-2 text-danger"/> Export PDF
                                </MDBBtn>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-3 shadow-sm border p-3">
                        <h6 className="fw-bold text-dark mb-3 border-bottom pb-2" style={{ fontSize: '0.85rem' }}>Currently Managing: <span className="text-primary">{activeGeoLevel}</span></h6>
                        
                        <MDBTable responsive hover align="middle" small className="mb-0 border-top text-nowrap">
                            <MDBTableHead className="bg-light" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                                <tr>
                                    <th className="fw-bold py-2 border-0 text-primary">NAME</th>
                                    <th className="fw-bold py-2 border-0 text-center text-primary">CODE</th>
                                    
                                    {activeGeoLevel !== 'Provinces' && (
                                        <th className="fw-bold py-2 border-0 text-center text-primary">
                                            BELONGS TO ({getParentLabel()})
                                        </th>
                                    )}

                                    <th className="fw-bold py-2 border-0 text-center text-primary">ACTIONS</th>
                                </tr>
                            </MDBTableHead>
                            <MDBTableBody style={{ fontSize: '0.75rem' }}>
                                {loadingGeo ? (
                                    <tr><td colSpan="4" className="text-center py-4"><MDBIcon fas icon="spinner" spin size="2x" className="text-primary"/></td></tr>
                                ) : currentItems.length > 0 ? currentItems.map((item) => (
                                    <tr key={item.id} className="border-bottom hover-lift">
                                        <td className="fw-bold text-dark py-1">{item.name}</td>
                                        <td className="text-center text-muted py-1">{item.code || '-'}</td>
                                        
                                        {activeGeoLevel !== 'Provinces' && (
                                            <td className="text-center text-muted fw-bold py-1">
                                                {item.parentName || <span className="badge bg-danger rounded-pill shadow-0" style={{ fontSize: '0.65rem' }}>Orphaned Record</span>}
                                            </td>
                                        )}

                                        <td className="text-center py-1">
                                            <MDBIcon fas icon="edit" className="text-primary me-3 hover-lift" style={{ cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => handleEditGeo(item)} />
                                            <MDBIcon fas icon="trash" className="text-danger hover-lift" style={{ cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => confirmDeleteGeo(item)} />
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" className="text-center py-4 text-muted" style={{ fontSize: '0.8rem' }}>No records found.</td></tr>
                                )}
                            </MDBTableBody>
                        </MDBTable>

                        {/* PAGINATION CONTROLS */}
                        {geoData.length > itemsPerPage && (
                            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                                <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                    Showing <span className="fw-bold text-dark">{indexOfFirstItem + 1}</span> to <span className="fw-bold text-dark">{Math.min(indexOfLastItem, geoData.length)}</span> of <span className="fw-bold text-dark">{geoData.length}</span> entries
                                </span>
                                <nav>
                                    <ul className="pagination pagination-sm mb-0">
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Previous</button>
                                        </li>
                                        {/* Simple page numbers mapping */}
                                        {[...Array(totalPages)].map((_, i) => (
                                            <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                                                <button className="page-link" onClick={() => handlePageChange(i + 1)}>
                                                    {i + 1}
                                                </button>
                                            </li>
                                        ))}
                                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                            <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Next</button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}