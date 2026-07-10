import React, { useState } from 'react';
import { MDBBtn, MDBIcon } from 'mdb-react-ui-kit';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function ResetPasswordModule() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // Extract token and email from the URL
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [passwords, setPasswords] = useState({ password: '', password_confirmation: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Security Check: If the URL is missing the token or email, block the form
    if (!token || !email) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
                <div className="card shadow-lg border-0 rounded-4 p-5 text-center" style={{ maxWidth: '450px' }}>
                    <MDBIcon fas icon="unlink" size="3x" className="text-danger mb-3" />
                    <h4 className="text-danger fw-bold mb-2">Invalid or Broken Link</h4>
                    <p className="text-muted small">Your email provider may have broken the link, or data is missing. Please go back and request a fresh reset link.</p>
                    <MDBBtn color="primary" className="mt-3 shadow-0" onClick={() => navigate('/forgot-password')}>
                        REQUEST NEW LINK
                    </MDBBtn>
                </div>
            </div>
        );
    }

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await axios.post('/api/reset-password', {
                token: token,
                email: email,
                password: passwords.password,
                password_confirmation: passwords.password_confirmation
            });
            
            setMessage(res.data.message || 'Password successfully reset.');
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
            
        } catch (err) {
            // FIX: Prioritize exact validation errors over the generic Laravel message
            const exactError = err.response?.data?.errors?.password?.[0] 
                            || err.response?.data?.errors?.email?.[0]
                            || err.response?.data?.message 
                            || 'Failed to reset password.';
            setError(exactError);
        }
        setLoading(false);
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
            <div className="card shadow-lg border-0 rounded-4" style={{ width: '400px' }}>
                <div className="card-body p-5">
                    <div className="text-center mb-4">
                        <MDBIcon fas icon="unlock-alt" size="3x" className="mb-3" style={{ color: '#8b0000' }} />
                        <h5 className="fw-bold text-dark mb-1">Set New Password</h5>
                        <p className="text-muted small">Enter your new secure password below.</p>
                    </div>

                    {message && <div className="alert alert-success small fw-bold py-2">{message}</div>}
                    {error && <div className="alert alert-danger small fw-bold py-2">{error}</div>}

                    <form onSubmit={handlePasswordReset}>
                        <div className="mb-3">
                            <label className="fw-bold small text-muted mb-1">Account Email</label>
                            <input 
                                type="email" 
                                className="form-control bg-light text-muted" 
                                value={email} 
                                disabled 
                                readOnly 
                            />
                        </div>

                        <div className="mb-3">
                            <label className="fw-bold small text-muted mb-1">New Password</label>
                            <input 
                                type="password" 
                                name="password"
                                className="form-control form-control-lg bg-white" 
                                placeholder="Minimum 8 characters"
                                value={passwords.password} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                        
                        <div className="mb-4">
                            <label className="fw-bold small text-muted mb-1">Confirm Password</label>
                            <input 
                                type="password" 
                                name="password_confirmation"
                                className="form-control form-control-lg bg-white" 
                                placeholder="Retype password"
                                value={passwords.password_confirmation} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>

                        <MDBBtn block size="lg" className="shadow-sm fw-bold mt-2" style={{ backgroundColor: '#28a745' }} disabled={loading}>
                            {loading ? <MDBIcon fas icon="spinner" spin /> : 'SAVE NEW PASSWORD'}
                        </MDBBtn>
                    </form>
                </div>
            </div>
        </div>
    );
}