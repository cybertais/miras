import React, { useState } from 'react';
import { MDBBtn, MDBIcon } from 'mdb-react-ui-kit';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ForgotPasswordModule() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleResetRequest = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await axios.post('/api/forgot-password', { email });
            setMessage(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to process request.');
        }
        setLoading(false);
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
            <div className="card shadow-lg border-0 rounded-4" style={{ width: '400px' }}>
                <div className="card-body p-5">
                    <div className="text-center mb-4">
                        <MDBIcon fas icon="key" size="3x" className="mb-3 text-secondary" />
                        <h5 className="fw-bold text-dark mb-1">Recover Password</h5>
                        <p className="text-muted small">Enter your email to receive a reset link.</p>
                    </div>

                    {message && <div className="alert alert-success small fw-bold py-2">{message}</div>}
                    {error && <div className="alert alert-danger small fw-bold py-2">{error}</div>}

                    <form onSubmit={handleResetRequest}>
                        <div className="mb-4 mt-2">
                            <input 
                                type="email" 
                                className="form-control form-control-lg bg-light" 
                                placeholder="Enter your registered email"
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                            />
                        </div>

                        <MDBBtn 
                            block 
                            size="lg" 
                            className="shadow-sm fw-bold mt-2" 
                            style={{ backgroundColor: '#3b71ca' }} 
                            disabled={loading}
                        >
                            {loading ? <MDBIcon fas icon="spinner" spin /> : 'SEND RESET LINK'}
                        </MDBBtn>

                        <div className="text-center mt-4">
                            <a href="/login" className="text-muted small fw-bold" style={{ textDecoration: 'none' }}>
                                <MDBIcon fas icon="arrow-left" className="me-2" /> Back to Login
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}