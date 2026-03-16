import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';

import Vendors from './pages/Vendors';
import UploadLeads from './pages/UploadLeads';
import SessionDetails from './pages/SessionDetails';
import AddJob from './pages/AddJob';
import LeadsTable from './pages/LeadsTable';
import DownloadLeads from './pages/DownloadLeads';
import Logs from './pages/Logs';
import Dashboard from './pages/Dashboard';

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    
    // Perform case-insensitive check and prevent infinite loops
    const userRole = user.role?.toLowerCase();
    const normalizedRoles = roles?.map(r => r.toLowerCase());

    if (roles && !normalizedRoles.includes(userRole)) {
        const fallbackPath = userRole === 'admin' ? '/' : '/download';
        if (location.pathname === fallbackPath) {
            // Already at fallback but still unauthorized (e.g., unknown role)
            return <Navigate to="/login" replace />;
        }
        return <Navigate to={fallbackPath} replace />;
    }

    return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Admin only routes */}
            <Route path="/" element={<ProtectedRoute roles={['admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute roles={['admin']}><Vendors /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute roles={['admin']}><UploadLeads /></ProtectedRoute>} />
            <Route path="/sessions/:id" element={<ProtectedRoute roles={['admin']}><SessionDetails /></ProtectedRoute>} />
            <Route path="/sessions/:id/add-job" element={<ProtectedRoute roles={['admin']}><AddJob /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute roles={['admin']}><LeadsTable /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute roles={['admin']}><Logs /></ProtectedRoute>} />
            
            {/* Download leads available to Agent and Admin */}
            <Route path="/download" element={<ProtectedRoute roles={['admin', 'agent']}><DownloadLeads /></ProtectedRoute>} />
            
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
