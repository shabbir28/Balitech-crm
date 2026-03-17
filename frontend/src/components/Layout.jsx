import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
    LayoutDashboard, 
    Users, 
    UploadCloud, 
    Download, 
    List, 
    LogOut,
    Database,
    ScrollText,
    UserCog,
    Store,
    Megaphone
} from 'lucide-react';

const Layout = ({ children }) => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const role = user?.role;
    const isSuperAdmin = role === 'super_admin';
    const isAdmin = role === 'admin';
    const isDataEntry = role === 'data_entry';
    const isFullAccess = isSuperAdmin || isAdmin;

    const getClassName = ({ isActive }) =>
        `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 mb-1 gap-3 ${
            isActive
                ? 'bg-amber-400 text-gray-900 font-bold shadow-[0_4px_14px_rgba(251,191,36,0.4)]'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`;

    const displayName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username;
    const roleLabel = isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Data Entry';

    return (
        <div className="min-h-screen flex" style={{ background: '#0f1117' }}>
            {/* Sidebar */}
            <div className="w-64 flex flex-col fixed inset-y-0 left-0 h-screen z-10 border-r border-white/5" style={{ background: '#13151e' }}>
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-amber-400 flex items-center justify-center shadow-[0_0_14px_rgba(251,191,36,0.5)]">
                            <Database className="h-4 w-4 text-gray-900" />
                        </div>
                        <span className="font-extrabold text-lg tracking-tight text-white">BALITECH<span className="text-amber-400">CRM</span></span>
                    </div>
                </div>
                
                {/* Nav */}
                <div className="flex-1 px-4 py-5 overflow-y-auto custom-scrollbar flex flex-col">
                    <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                        Main Menu
                    </p>
                    <div className="space-y-0.5">
                        {/* Full access: Dashboard, Vendors, Upload, Leads, Logs */}
                        {isFullAccess && (
                            <>
                                <NavLink to="/" className={getClassName} end>
                                    <LayoutDashboard className="h-5 w-5 flex-shrink-0" /> Dashboard
                                </NavLink>
                                <NavLink to="/vendors" className={getClassName}>
                                    <Store className="h-5 w-5 flex-shrink-0" /> Vendor Panel
                                </NavLink>
                                <NavLink to="/campaigns" className={getClassName}>
                                    <Megaphone className="h-5 w-5 flex-shrink-0" /> Campaigns
                                </NavLink>
                                <NavLink to="/upload" className={getClassName}>
                                    <UploadCloud className="h-5 w-5 flex-shrink-0" /> Upload Data
                                </NavLink>
                                <NavLink to="/leads" className={getClassName}>
                                    <List className="h-5 w-5 flex-shrink-0" /> All Data
                                </NavLink>
                                <NavLink to="/download" className={getClassName}>
                                    <Download className="h-5 w-5 flex-shrink-0" /> Download Data
                                </NavLink>
                                <NavLink to="/logs" className={getClassName}>
                                    <ScrollText className="h-5 w-5 flex-shrink-0" /> Download Logs
                                </NavLink>
                                {isSuperAdmin && (
                                    <NavLink to="/users" className={getClassName}>
                                        <UserCog className="h-5 w-5 flex-shrink-0" /> Users
                                    </NavLink>
                                )}
                            </>
                        )}

                        {/* Data Entry: only Vendor Panel + Upload Data */}
                        {isDataEntry && (
                            <>
                                <NavLink to="/vendors" className={getClassName}>
                                    <Store className="h-5 w-5 flex-shrink-0" /> Vendor Panel
                                </NavLink>
                                <NavLink to="/upload" className={getClassName}>
                                    <UploadCloud className="h-5 w-5 flex-shrink-0" /> Upload Data
                                </NavLink>
                            </>
                        )}
                    </div>
                </div>

                {/* User Footer */}
                <div className="p-4 border-t border-white/5 mt-auto">
                    <div className="flex items-center gap-3 px-2 mb-3">
                        <div className="h-9 w-9 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center font-extrabold uppercase text-sm shadow-[0_0_10px_rgba(251,191,36,0.35)]" style={{ overflow: 'hidden' }}>
                            {user?.profile_picture
                                ? <img src={`http://localhost:5000${user.profile_picture}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : (user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()
                            }
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white capitalize">{displayName}</p>
                            <p className="text-xs text-amber-400 font-medium">{roleLabel}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
                    >
                        <LogOut className="h-4 w-4" /> Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-64 flex flex-col min-h-screen" style={{ background: '#0f1117' }}>
                {/* Top Header Bar */}
                <div className="h-16 border-b border-white/5 flex items-center px-8 justify-between sticky top-0 z-10" style={{ background: '#0f1117' }}>
                    <div className="text-white/40 text-sm font-medium tracking-wide">BPO Data CRM Platform</div>
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                        <span className="text-green-400 text-xs font-semibold tracking-wide">LIVE</span>
                    </div>
                </div>
                <main className="flex-1 p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
