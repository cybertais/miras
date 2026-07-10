import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../../../assests/madang.png';

export default function LoginModule({ status }) {
    const navigate = useNavigate();
    const [data, setData] = useState({
        email: '',
        password: '',
        remember: false,
    });
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        document.title = "Log in - MRDDA System";
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const submit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        try {
            const response = await axios.post('/api/login', data);
            
            if (response.data && response.data.token) {
                localStorage.setItem('miras_auth_token', response.data.token);
                if (response.data.user) {
                    localStorage.setItem('miras_user', JSON.stringify(response.data.user));
                }
            }
            navigate('/');
        } catch (error) {
            if (error.response && error.response.status === 422) {
                setErrors(error.response.data.errors || {});
            } else {
                setErrors({ email: 'Invalid credentials or server error.' });
            }
            setData(prev => ({ ...prev, password: '' }));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <>
            {/* Custom Styles for Animations & Gradient */}
            <style>
                {`
                    .login-gradient-bg {
                        background: linear-gradient(135deg, #1e3a8a 0%, #5a0a18 100%);
                        background-size: 200% 200%;
                        animation: gradientBG 12s ease infinite;
                    }
                    @keyframes gradientBG {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                    .glass-card {
                        background: rgba(255, 255, 255, 0.08);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        border-radius: 1rem;
                        transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
                    }
                    .glass-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 15px 30px rgba(0,0,0,0.3);
                        background: rgba(255, 255, 255, 0.12);
                    }
                    .icon-box {
                        width: 45px;
                        height: 45px;
                        min-width: 45px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 12px;
                        background: rgba(255,255,255,0.15);
                        font-size: 1.2rem;
                        color: #fff;
                    }
                    .fade-in-up {
                        animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    .delay-1 { animation-delay: 0.1s; }
                    .delay-2 { animation-delay: 0.3s; }
                    .delay-3 { animation-delay: 0.5s; }
                    
                    @keyframes fadeInUp {
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .btn-login {
                        background: #1e3a8a;
                        transition: all 0.3s ease;
                    }
                    .btn-login:hover {
                        background: #5a0a18;
                        transform: scale(1.02);
                        box-shadow: 0 8px 20px rgba(90, 10, 24, 0.4);
                    }
                `}
            </style>

            <div className="container-fluid p-0 min-vh-100 d-flex bg-light overflow-hidden">
                <div className="row g-0 w-100">
                    
                    {/* Left Side: Infographic & Branding */}
                    <div className="col-lg-7 d-none d-lg-flex flex-column justify-content-center align-items-center text-white login-gradient-bg position-relative p-5">
                        
                        <div className="w-100" style={{ maxWidth: '650px', zIndex: 1 }}>
                            {/* Header Section */}
                            <div className="text-center mb-5 fade-in-up">
                                <img 
                                    src={logo} 
                                    alt="Madang Province Logo" 
                                    className="mb-4 img-fluid"
                                    style={{ width: '130px', filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.3))' }}
                                />
                                <h4 className="text-info text-uppercase fw-bold mb-2" style={{ letterSpacing: '2px' }}>
                                    Middle Ramu (MRDDA)
                                </h4>
                                <h1 className="display-6 fw-bolder text-white">
                                    DDA School Fee Subsidiary<br/>Management System
                                </h1>
                            </div>

                            <div className="row g-4">
                                {/* MRDDA Info Card */}
                                <div className="col-md-6 fade-in-up delay-1">
                                    <div className="glass-card p-4 h-100">
                                        <h5 className="border-bottom border-secondary pb-2 mb-4 text-white fw-bold">
                                            <i className="fas fa-building me-2"></i> MRDDA Office
                                        </h5>
                                        <div className="d-flex align-items-center mb-3">
                                            <div className="icon-box me-3"><i className="fas fa-map-marker-alt"></i></div>
                                            <div>
                                                <small className="text-info text-uppercase fw-bold d-block" style={{fontSize: '0.7rem'}}>Physical Address</small>
                                                <span className="text-light">Madang</span>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center mb-3">
                                            <div className="icon-box me-3"><i className="fas fa-envelope-open-text"></i></div>
                                            <div>
                                                <small className="text-info text-uppercase fw-bold d-block" style={{fontSize: '0.7rem'}}>Postal Address</small>
                                                <span className="text-light">PO Box 555, Madang</span>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <div className="icon-box me-3"><i className="fas fa-phone-alt"></i></div>
                                            <div>
                                                <small className="text-info text-uppercase fw-bold d-block" style={{fontSize: '0.7rem'}}>Landline</small>
                                                <span className="text-light">+675 6343232</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Developer & Software Info Card */}
                                <div className="col-md-6 fade-in-up delay-2">
                                    <div className="glass-card p-4 h-100">
                                        <h5 className="border-bottom border-secondary pb-2 mb-4 text-white fw-bold">
                                            <i className="fas fa-code me-2"></i> System Info
                                        </h5>
                                        
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <span className="badge bg-info text-dark px-3 py-2 rounded-pill fw-bold">v 1.0.1</span>
                                            <small className="text-light"><i className="far fa-calendar-alt me-1"></i> Released: 6 Jun 2026</small>
                                        </div>

                                        <p className="text-light mb-4 small">
                                            Developed & maintained by<br/>
                                            <strong className="text-white fs-6">Cybertais IT Consultant</strong>
                                        </p>

                                        <div className="d-flex align-items-center mb-2">
                                            <a href="mailto:admin@cybertais.com" className="text-decoration-none text-light d-flex align-items-center w-100 icon-link-hover">
                                                <div className="icon-box me-3" style={{width: '35px', height: '35px', fontSize: '1rem', background: '#ea4335'}}><i className="fas fa-envelope"></i></div>
                                                <span style={{wordBreak: 'break-all'}}>admin@cybertais.com</span>
                                            </a>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <a href="https://wa.me/67572880784" target="_blank" rel="noreferrer" className="text-decoration-none text-light d-flex align-items-center w-100">
                                                <div className="icon-box me-3" style={{width: '35px', height: '35px', fontSize: '1.2rem', background: '#25D366'}}><i className="fab fa-whatsapp"></i></div>
                                                <span>+675 72880784</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Login Form */}
                    <div className="col-12 col-lg-5 d-flex align-items-center justify-content-center bg-white position-relative">
                        
                        <div className="w-100 px-4 px-md-5 fade-in-up delay-3" style={{ maxWidth: '480px' }}>
                            
                            {/* Mobile Branding (Only visible on small screens) */}
                            <div className="d-lg-none text-center mb-4 mt-4">
                                <img src={logo} alt="MRDDA Logo" className="mb-3" style={{ width: '80px' }} />
                                <h3 className="fw-bold text-dark" style={{ color: '#1e3a8a' }}>MRDDA Portal</h3>
                                <p className="text-muted small">School Fee Subsidiary Management v1.0.1</p>
                            </div>

                            <div className="mb-5 text-center text-lg-start">
                                <div className="d-inline-block p-3 rounded-circle mb-3 d-none d-lg-inline-block" style={{ background: '#f0f4ff', color: '#1e3a8a' }}>
                                    <i className="fas fa-user-lock fa-2x"></i>
                                </div>
                                <h2 className="fw-bold text-dark mb-2">Secure Login</h2>
                                <p className="text-muted">Enter your credentials to access the portal.</p>
                            </div>

                            {status && <div className="alert alert-success border-0 shadow-sm rounded-3"><i className="fas fa-check-circle me-2"></i>{status}</div>}
                            {errors.email && <div className="alert alert-danger border-0 shadow-sm rounded-3"><i className="fas fa-exclamation-triangle me-2"></i>{errors.email}</div>}

                            <form onSubmit={submit}>
                                {/* Email Input */}
                                <div className="form-floating mb-4">
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                        onChange={handleChange}
                                        placeholder="name@example.com"
                                        required
                                        style={{ borderRadius: '0.75rem' }}
                                    />
                                    <label htmlFor="email"><i className="fas fa-envelope text-muted me-2"></i>Email Address</label>
                                </div>

                                {/* Password Input */}
                                <div className="form-floating mb-4">
                                    <input
                                        id="password"
                                        type="password"
                                        name="password"
                                        value={data.password}
                                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                        onChange={handleChange}
                                        placeholder="Password"
                                        required
                                        style={{ borderRadius: '0.75rem' }}
                                    />
                                    <label htmlFor="password"><i className="fas fa-lock text-muted me-2"></i>Password</label>
                                </div>

                                {/* Remember Me & Forgot Password */}
                                <div className="d-flex justify-content-between align-items-center mb-5 px-1">
                                    <div className="form-check">
                                        <input
                                            id="remember_me"
                                            type="checkbox"
                                            name="remember"
                                            checked={data.remember}
                                            onChange={handleChange}
                                            className="form-check-input shadow-sm"
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <label htmlFor="remember_me" className="form-check-label text-muted user-select-none" style={{ cursor: 'pointer' }}>
                                            Remember me
                                        </label>
                                    </div>
                                    <Link to="/forgot-password" className="text-decoration-none fw-semibold" style={{ color: '#5a0a18' }}>
                                        Forgot password?
                                    </Link>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="btn btn-login text-white btn-lg w-100 fw-bold border-0 rounded-pill d-flex justify-content-center align-items-center"
                                    style={{ padding: '14px' }}
                                >
                                    {processing ? (
                                        <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Authenticating...</>
                                    ) : (
                                        <>Sign In <i className="fas fa-arrow-right ms-2"></i></>
                                    )}
                                </button>
                                
                                {/* Mobile Footer Info */}
                                <div className="d-lg-none mt-5 text-center text-muted small">
                                    <p className="mb-1">&copy; 2026 Cybertais IT Consultant</p>
                                    <a href="https://wa.me/67572880784" className="text-success text-decoration-none"><i className="fab fa-whatsapp me-1"></i> Support</a>
                                </div>
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}