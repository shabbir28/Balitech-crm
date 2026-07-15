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
import Filters from './pages/Filters';
import DeadNumbersUpload from './pages/DeadNumbersUpload';
import AllDeadNumbers from './pages/AllDeadNumbers';

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
import DncUploadedFiles from './pages/DncUploadedFiles';
import SingleLookups from './pages/SingleLookups';
import DncCampaigns from './pages/DncCampaigns';
import DncDownloadData from './pages/DncDownloadData';

import PremiumVendors from './pages/PremiumVendors';
import PremiumUploadLeads from './pages/PremiumUploadLeads';
import PremiumSessionsList from './pages/PremiumSessionsList';
import PremiumSessionDetails from './pages/PremiumSessionDetails';
import PremiumLeadsTable from './pages/PremiumLeadsTable';
import PremiumDownloadLeads from './pages/PremiumDownloadLeads';
import PremiumAlreadyDownloaded from './pages/PremiumAlreadyDownloaded';
import PremiumCampaigns from './pages/PremiumCampaigns';
import PremiumAddCampaign from './pages/PremiumAddCampaign';
import PremiumAddJob from './pages/PremiumAddJob';

// Van Desk Module
import VanVendors from './pages/VanVendors';
import VanCampaigns from './pages/VanCampaigns';
import VanAddCampaign from './pages/VanAddCampaign';
import VanUploadLeads from './pages/VanUploadLeads';
import VanSessionsList from './pages/VanSessionsList';
import VanSessionDetails from './pages/VanSessionDetails';
import VanAddJob from './pages/VanAddJob';
import VanLeadsTable from './pages/VanLeadsTable';
import VanDownloadLeads from './pages/VanDownloadLeads';
import VanAlreadyDownloaded from './pages/VanAlreadyDownloaded';


const ProtectedRoute = ({ children, roles, module }) => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    
    const userRole = user.role?.toLowerCase();
    const normalizedRoles = roles?.map(r => r.toLowerCase());
    
    const isSuperAdmin = userRole === 'super_admin';
    let hasModuleAccess = true;

    if (module && !isSuperAdmin) {
        let modules = user.accessible_modules;
        if (typeof modules === 'string') {
            try { modules = JSON.parse(modules); } catch { modules = []; }
        }
        hasModuleAccess = Array.isArray(modules) && modules.includes(module);
    }

    if ((roles && !normalizedRoles.includes(userRole)) || !hasModuleAccess) {
        let fallbackPath = '/login';
        if (userRole === 'super_admin' || userRole === 'admin') {
            fallbackPath = '/';
        } else if (userRole === 'data_entry') {
            let modules = user.accessible_modules;
            if (typeof modules === 'string') {
                try { modules = JSON.parse(modules); } catch { modules = []; }
            }
            if (!Array.isArray(modules)) modules = [];
            
            if (modules.includes('core') || modules.length === 0) {
                fallbackPath = '/vendors'; // default if they have core or no modules defined
            } else if (modules.includes('refine')) {
                fallbackPath = '/refine-vendors';
            } else if (modules.includes('premium')) {
                fallbackPath = '/premium-vendors';
            } else if (modules.includes('van_desk')) {
                fallbackPath = '/van-vendors';
            }
        }

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
            <Route path="/leads" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><LeadsTable /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><Logs /></ProtectedRoute>} />
            <Route path="/filters" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><Filters /></ProtectedRoute>} />
            <Route path="/sessions" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><SessionsList /></ProtectedRoute>} />
            <Route path="/sessions/:id" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="core"><SessionDetails /></ProtectedRoute>} />
            <Route path="/sessions/:id/add-job" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="core"><AddJob /></ProtectedRoute>} />
            <Route path="/dnc" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><Dnc /></ProtectedRoute>} />
            <Route path="/dead-numbers/upload" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><DeadNumbersUpload /></ProtectedRoute>} />
            <Route path="/dead-numbers/all" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><AllDeadNumbers /></ProtectedRoute>} />

            {/* Vendors - super_admin, admin, data_entry */}
            <Route path="/vendors" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="core"><Vendors /></ProtectedRoute>} />

            {/* Upload - super_admin, admin, data_entry */}
            <Route path="/upload" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="core"><UploadLeads /></ProtectedRoute>} />

            {/* Compare (DB compare flow) — UploadLeads detects /compare path and sets isCompareMode=true */}
            <Route path="/compare" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="core"><UploadLeads /></ProtectedRoute>} />

            {/* Compare File (new module) - super_admin, admin */}
            <Route path="/compare-file" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><CompareFiles /></ProtectedRoute>} />

            {/* Download - super_admin, admin */}
            <Route path="/download" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><DownloadLeads /></ProtectedRoute>} />
            <Route path="/already-downloaded" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><AlreadyDownloaded /></ProtectedRoute>} />

            {/* Users management - super_admin only */}
            <Route path="/users" element={<ProtectedRoute roles={['super_admin']}><Users /></ProtectedRoute>} />
            <Route path="/users/add" element={<ProtectedRoute roles={['super_admin']}><AddUser /></ProtectedRoute>} />
            <Route path="/users/edit/:id" element={<ProtectedRoute roles={['super_admin']}><AddUser editMode /></ProtectedRoute>} />

            {/* Download Requests (approval panel) - super_admin only */}
            <Route path="/download-requests" element={<ProtectedRoute roles={['super_admin']}><DownloadRequests /></ProtectedRoute>} />

            {/* Security settings - super_admin only */}
            <Route path="/security" element={<ProtectedRoute roles={['super_admin']}><SecuritySettings /></ProtectedRoute>} />

            {/* Campaigns - super_admin, admin */}
            <Route path="/campaigns" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><Campaigns /></ProtectedRoute>} />
            <Route path="/campaigns/add" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><AddCampaign /></ProtectedRoute>} />
            <Route path="/campaigns/edit/:id" element={<ProtectedRoute roles={['super_admin', 'admin']} module="core"><AddCampaign editMode /></ProtectedRoute>} />

            
            {/* REFINE DATA MODULE */}
            <Route path="/refine-vendors" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="refine"><RefineVendors /></ProtectedRoute>} />
            <Route path="/refine-upload" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="refine"><RefineUploadLeads /></ProtectedRoute>} />
            <Route path="/refine-sessions" element={<ProtectedRoute roles={['super_admin', 'admin']} module="refine"><RefineSessionsList /></ProtectedRoute>} />
            <Route path="/refine-sessions/:id" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="refine"><RefineSessionDetails /></ProtectedRoute>} />
            <Route path="/refine-sessions/:id/add-job" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="refine"><RefineAddJob /></ProtectedRoute>} />
            <Route path="/refine-data" element={<ProtectedRoute roles={['super_admin', 'admin']} module="refine"><RefineLeadsTable /></ProtectedRoute>} />
            <Route path="/refine-download" element={<ProtectedRoute roles={['super_admin', 'admin']} module="refine"><RefineDownloadLeads /></ProtectedRoute>} />
            <Route path="/refine-already-downloaded" element={<ProtectedRoute roles={['super_admin', 'admin']} module="refine"><RefineAlreadyDownloaded /></ProtectedRoute>} />
            <Route path="/refine-dnc" element={<ProtectedRoute roles={['super_admin', 'admin']} module="refine"><RefineDnc /></ProtectedRoute>} />
            <Route path="/refine-campaigns" element={<ProtectedRoute roles={['super_admin', 'admin']} module="refine"><RefineCampaigns /></ProtectedRoute>} />
            <Route path="/refine-campaigns/add" element={<ProtectedRoute roles={['super_admin', 'admin']} module="refine"><RefineAddCampaign /></ProtectedRoute>} />
            <Route path="/refine-campaigns/edit/:id" element={<ProtectedRoute roles={['super_admin', 'admin']} module="refine"><RefineAddCampaign editMode /></ProtectedRoute>} />

            {/* DNC CHECKER RESULTS MODULE */}
            <Route path="/dnc-checker/single-lookups" element={<ProtectedRoute roles={['super_admin', 'admin']} module="dnc_checker"><SingleLookups /></ProtectedRoute>} />
            <Route path="/dnc-checker/download" element={<ProtectedRoute roles={['super_admin', 'admin']} module="dnc_checker"><DncDownloadData /></ProtectedRoute>} />

            {/* PREMIUM DATA MODULE */}
            <Route path="/premium-vendors" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="premium"><PremiumVendors /></ProtectedRoute>} />
            <Route path="/premium-upload" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="premium"><PremiumUploadLeads /></ProtectedRoute>} />
            <Route path="/premium-sessions" element={<ProtectedRoute roles={['super_admin', 'admin']} module="premium"><PremiumSessionsList /></ProtectedRoute>} />
            <Route path="/premium-sessions/:id" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="premium"><PremiumSessionDetails /></ProtectedRoute>} />
            <Route path="/premium-sessions/:id/add-job" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="premium"><PremiumAddJob /></ProtectedRoute>} />
            <Route path="/premium-data" element={<ProtectedRoute roles={['super_admin', 'admin']} module="premium"><PremiumLeadsTable /></ProtectedRoute>} />
            <Route path="/premium-download" element={<ProtectedRoute roles={['super_admin', 'admin']} module="premium"><PremiumDownloadLeads /></ProtectedRoute>} />
            <Route path="/premium-already-downloaded" element={<ProtectedRoute roles={['super_admin', 'admin']} module="premium"><PremiumAlreadyDownloaded /></ProtectedRoute>} />
            <Route path="/premium-campaigns" element={<ProtectedRoute roles={['super_admin', 'admin']} module="premium"><PremiumCampaigns /></ProtectedRoute>} />
            <Route path="/premium-campaigns/add" element={<ProtectedRoute roles={['super_admin', 'admin']} module="premium"><PremiumAddCampaign /></ProtectedRoute>} />
            <Route path="/premium-campaigns/edit/:id" element={<ProtectedRoute roles={['super_admin', 'admin']} module="premium"><PremiumAddCampaign editMode /></ProtectedRoute>} />

            {/* VAN DESK MODULE */}
            <Route path="/van-vendors" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="van_desk"><VanVendors /></ProtectedRoute>} />
            <Route path="/van-campaigns" element={<ProtectedRoute roles={['super_admin', 'admin']} module="van_desk"><VanCampaigns /></ProtectedRoute>} />
            <Route path="/van-campaigns/add" element={<ProtectedRoute roles={['super_admin', 'admin']} module="van_desk"><VanAddCampaign /></ProtectedRoute>} />
            <Route path="/van-campaigns/edit/:id" element={<ProtectedRoute roles={['super_admin', 'admin']} module="van_desk"><VanAddCampaign editMode /></ProtectedRoute>} />
            <Route path="/van-upload" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="van_desk"><VanUploadLeads /></ProtectedRoute>} />
            <Route path="/van-sessions" element={<ProtectedRoute roles={['super_admin', 'admin']} module="van_desk"><VanSessionsList /></ProtectedRoute>} />
            <Route path="/van-sessions/:id" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="van_desk"><VanSessionDetails /></ProtectedRoute>} />
            <Route path="/van-sessions/:id/add-job" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']} module="van_desk"><VanAddJob /></ProtectedRoute>} />
            <Route path="/van-data" element={<ProtectedRoute roles={['super_admin', 'admin']} module="van_desk"><VanLeadsTable /></ProtectedRoute>} />
            <Route path="/van-download" element={<ProtectedRoute roles={['super_admin', 'admin']} module="van_desk"><VanDownloadLeads /></ProtectedRoute>} />
            <Route path="/van-already-downloaded" element={<ProtectedRoute roles={['super_admin', 'admin']} module="van_desk"><VanAlreadyDownloaded /></ProtectedRoute>} />

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
