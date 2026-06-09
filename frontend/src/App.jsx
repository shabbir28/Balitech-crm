import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import IpGuard from './components/IpGuard';

import Vendors from './pages/Vendors';
import UploadLeads from './pages/UploadLeads';
import SessionsList from './pages/SessionsList';
import SessionDetails from './pages/SessionDetails';
import AddJob from './pages/AddJob';
import LeadsTable from './pages/LeadsTable';
import DownloadLeads from './pages/DownloadLeads';
import DownloadRequests from './pages/DownloadRequests';
import Logs from './pages/Logs';
import Dashboard from './pages/Dashboard';
import Dnc from './pages/Dnc';
import Users from './pages/Users';
import AddUser from './pages/AddUser';
import Campaigns from './pages/Campaigns';
import AddCampaign from './pages/AddCampaign';
import SecuritySettings from './pages/SecuritySettings';
import CompareFiles from './pages/CompareFiles';
import AlreadyDownloaded from './pages/AlreadyDownloaded';

import RefineVendors from './pages/RefineVendors';
import RefineUploadLeads from './pages/RefineUploadLeads';
import RefineSessionsList from './pages/RefineSessionsList';
import RefineSessionDetails from './pages/RefineSessionDetails';
import RefineLeadsTable from './pages/RefineLeadsTable';
import RefineDownloadLeads from './pages/RefineDownloadLeads';
import RefineAlreadyDownloaded from './pages/RefineAlreadyDownloaded';
import RefineDnc from './pages/RefineDnc';
import RefineCampaigns from './pages/RefineCampaigns';
import RefineAddCampaign from './pages/RefineAddCampaign';
import RefineAddJob from './pages/RefineAddJob';


const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    
    const userRole = user.role?.toLowerCase();
    const normalizedRoles = roles?.map(r => r.toLowerCase());

    if (roles && !normalizedRoles.includes(userRole)) {
        // Role-specific fallback to prevent infinite loops
        const fallbacks = {
            super_admin: '/',
            admin: '/',
            data_entry: '/vendors',
        };
        const fallbackPath = fallbacks[userRole] || '/login';
        if (location.pathname === fallbackPath) {
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
            
            {/* Super Admin + Admin routes */}
            <Route path="/" element={<ProtectedRoute roles={['super_admin', 'admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute roles={['super_admin', 'admin']}><LeadsTable /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute roles={['super_admin', 'admin']}><Logs /></ProtectedRoute>} />
            <Route path="/sessions" element={<ProtectedRoute roles={['super_admin', 'admin']}><SessionsList /></ProtectedRoute>} />
            <Route path="/sessions/:id" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']}><SessionDetails /></ProtectedRoute>} />
            <Route path="/sessions/:id/add-job" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']}><AddJob /></ProtectedRoute>} />
            <Route path="/dnc" element={<ProtectedRoute roles={['super_admin', 'admin']}><Dnc /></ProtectedRoute>} />

            {/* Vendors - super_admin, admin, data_entry */}
            <Route path="/vendors" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']}><Vendors /></ProtectedRoute>} />

            {/* Upload - super_admin, admin, data_entry */}
            <Route path="/upload" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']}><UploadLeads /></ProtectedRoute>} />

            {/* Compare (DB compare flow) — UploadLeads detects /compare path and sets isCompareMode=true */}
            <Route path="/compare" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']}><UploadLeads /></ProtectedRoute>} />

            {/* Compare File (new module) - super_admin, admin */}
            <Route path="/compare-file" element={<ProtectedRoute roles={['super_admin', 'admin']}><CompareFiles /></ProtectedRoute>} />

            {/* Download - super_admin, admin */}
            <Route path="/download" element={<ProtectedRoute roles={['super_admin', 'admin']}><DownloadLeads /></ProtectedRoute>} />
            <Route path="/already-downloaded" element={<ProtectedRoute roles={['super_admin', 'admin']}><AlreadyDownloaded /></ProtectedRoute>} />

            {/* Users management - super_admin only */}
            <Route path="/users" element={<ProtectedRoute roles={['super_admin']}><Users /></ProtectedRoute>} />
            <Route path="/users/add" element={<ProtectedRoute roles={['super_admin']}><AddUser /></ProtectedRoute>} />
            <Route path="/users/edit/:id" element={<ProtectedRoute roles={['super_admin']}><AddUser editMode /></ProtectedRoute>} />

            {/* Download Requests (approval panel) - super_admin only */}
            <Route path="/download-requests" element={<ProtectedRoute roles={['super_admin']}><DownloadRequests /></ProtectedRoute>} />

            {/* Security settings - super_admin only */}
            <Route path="/security" element={<ProtectedRoute roles={['super_admin']}><SecuritySettings /></ProtectedRoute>} />

            {/* Campaigns - super_admin, admin */}
            <Route path="/campaigns" element={<ProtectedRoute roles={['super_admin', 'admin']}><Campaigns /></ProtectedRoute>} />
            <Route path="/campaigns/add" element={<ProtectedRoute roles={['super_admin', 'admin']}><AddCampaign /></ProtectedRoute>} />
            <Route path="/campaigns/edit/:id" element={<ProtectedRoute roles={['super_admin', 'admin']}><AddCampaign editMode /></ProtectedRoute>} />

            
            {/* REFINE DATA MODULE */}
            <Route path="/refine-vendors" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']}><RefineVendors /></ProtectedRoute>} />
            <Route path="/refine-upload" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']}><RefineUploadLeads /></ProtectedRoute>} />
            <Route path="/refine-sessions" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineSessionsList /></ProtectedRoute>} />
            <Route path="/refine-sessions/:id" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']}><RefineSessionDetails /></ProtectedRoute>} />
            <Route path="/refine-sessions/:id/add-job" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']}><RefineAddJob /></ProtectedRoute>} />
            <Route path="/refine-data" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineLeadsTable /></ProtectedRoute>} />
            <Route path="/refine-download" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineDownloadLeads /></ProtectedRoute>} />
            <Route path="/refine-already-downloaded" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineAlreadyDownloaded /></ProtectedRoute>} />
            <Route path="/refine-dnc" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineDnc /></ProtectedRoute>} />
            <Route path="/refine-campaigns" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineCampaigns /></ProtectedRoute>} />
            <Route path="/refine-campaigns/add" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineAddCampaign /></ProtectedRoute>} />
            <Route path="/refine-campaigns/edit/:id" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineAddCampaign editMode /></ProtectedRoute>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

import ErrorBoundary from './components/ErrorBoundary';

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ErrorBoundary>
                    <IpGuard>
                        <AppRoutes />
                    </IpGuard>
                </ErrorBoundary>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
