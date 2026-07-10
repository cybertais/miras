import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import axios from 'axios';

// MDB & FontAwesome Defaults
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'mdb-react-ui-kit/dist/css/mdb.min.css';

// Your Global Theme Overrides
import '../css/app.css';

// Import Layouts
import DashboardLayout from './Layouts/DashboardLayout.jsx';

// Import Hooks
import useAbility from './Hooks/useAbility.jsx'; // <-- IMPORTED RBAC HOOK

// Import Auth Modules
import LoginModule from './Modules/Auth/LoginModule.jsx';
import ForgotPasswordModule from './Modules/Auth/ForgotPasswordModule.jsx';
import ResetPasswordModule from './Modules/Auth/ResetPasswordModule.jsx';

// Import Modules
import StudentManagementModule from './Modules/StudentManagement/StudentManagementModule.jsx';
import RegisterStudentModule from './Modules/StudentManagement/RegisterStudentModule.jsx';
import EditStudentModule from './Modules/StudentManagement/EditStudentModule.jsx';
import ManageStudentModule from './Modules/StudentManagement/ManageStudentModule.jsx';

// Subsidy Modules
import SubsidyListModule from './Modules/SubsidyManagement/SubsidyListModule.jsx';
import ManageSubsidyModule from './Modules/SubsidyManagement/ManageSubsidyModule.jsx';
import SubsidyAuthorizationModule from './Modules/SubsidyManagement/SubsidyAuthorizationModule.jsx';

// Settings Module
import SystemSettingsModule from './Modules/Settings/SystemSettingsModule.jsx';

// Dashboard & Reports Modules
import ReportsModule from './Modules/Reports/ReportsModule.jsx';
import DashboardModule from './Modules/Dashboard/DashboardModule.jsx'; 

// --- AXIOS GLOBAL INTERCEPTORS --- //

// 1. AUTOMATICALLY ATTACH TOKEN TO EVERY REQUEST
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('miras_auth_token');
    if (token) {
        // Automatically inject the Bearer token into the headers
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// 2. CATCH 401 ERRORS AND LOGOUT
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('miras_auth_token');
            localStorage.removeItem('miras_user');
            window.location.href = '/login'; // Force redirect to login
        }
        return Promise.reject(error);
    }
);

// --- AUTHENTICATION & RBAC GUARDS --- //

/**
 * Advanced Protected Route Component
 * Validates authentication AND verifies Roles/Permissions before rendering the page.
 */
const ProtectedRoute = ({ requiredRole, requiredPermission }) => {
    const token = localStorage.getItem('miras_auth_token');
    const { hasRole, hasPermission } = useAbility();

    // 1. Not logged in? Kick to login screen.
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 2. Requires a specific role but user lacks it? Kick to dashboard.
    if (requiredRole && !hasRole(requiredRole)) {
        return <Navigate to="/" replace />; 
    }

    // 3. Requires a specific permission but user lacks it? Kick to dashboard.
    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/" replace />;
    }

    // 4. All checks passed. Render the requested component route.
    return <Outlet />;
};

// Protects auth routes: Redirects to / (dashboard) if user is already logged in
const PublicRoutes = () => {
    const token = localStorage.getItem('miras_auth_token');
    return !token ? <Outlet /> : <Navigate to="/" replace />;
};

export default function App() {
    return (
        <Router>
            <Routes>
                {/* ========================================== */}
                {/* 1. PUBLIC ROUTES (Login, Forgot Password)  */}
                {/* ========================================== */}
                <Route element={<PublicRoutes />}>
                    <Route path="/login" element={<LoginModule />} />
                    <Route path="/forgot-password" element={<ForgotPasswordModule />} />
                    <Route path="/password-reset" element={<ResetPasswordModule />} />
                </Route>

                {/* ========================================== */}
                {/* 2. PROTECTED ROUTES & RBAC GROUPS          */}
                {/* ========================================== */}
                
                {/* A. Basic Authenticated Access (All logged-in users) */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<DashboardModule />} />
                </Route>
                
                {/* B. Strict Role Requirement (Super Admins ONLY) */}
                <Route element={<ProtectedRoute requiredRole="Super Admin" />}>
                    <Route path="/settings" element={<SystemSettingsModule />} />
                </Route>
                
                {/* C. Reports Access */}
                <Route element={<ProtectedRoute requiredPermission="view_reports" />}>
                    <Route path="/reports" element={<ReportsModule />} />
                </Route>
                
                {/* D. Student Management Access */}
                <Route element={<ProtectedRoute requiredPermission="manage_students" />}>
                    <Route path="/students" element={<StudentManagementModule />} />
                    <Route path="/students/register" element={<RegisterStudentModule />} />
                    <Route path="/students/edit/:id" element={<EditStudentModule />} />
                    <Route path="/students/manage/:id" element={<ManageStudentModule />} />
                </Route>
                
                {/* E. Subsidy Management Access */}
                <Route element={<ProtectedRoute requiredPermission="manage_subsidies" />}>
                    <Route path="/subsidies" element={<SubsidyListModule />} />
                    <Route path="/subsidies/manage/:id" element={<ManageSubsidyModule />} />
                </Route>

                {/* F. Subsidy Authorization Access */}
                <Route element={<ProtectedRoute requiredPermission="approve_subsidies" />}>
                    <Route path="/authorizations" element={<SubsidyAuthorizationModule />} />
                </Route>

                {/* ========================================== */}
                {/* 3. FALLBACK 404 CATCH-ALL                  */}
                {/* ========================================== */}
                <Route path="*" element={
                    <DashboardLayout pageTitle="404 Not Found" breadcrumbs={["Home", "Error"]}>
                        <h4 className="text-center text-danger mt-5">Page not constructed yet or does not exist.</h4>
                    </DashboardLayout>
                } />
            </Routes>
        </Router>
    );
}

if (document.getElementById('root')) {
    if (!window.reactRoot) {
        window.reactRoot = createRoot(document.getElementById('root'));
    }
    window.reactRoot.render(<App />);
}