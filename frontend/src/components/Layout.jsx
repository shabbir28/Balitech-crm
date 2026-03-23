import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
    LayoutDashboard, Users, UploadCloud, Download, List, LogOut,
    Database, ScrollText, UserCog, Store, Megaphone, 
    Database as DatabaseIcon, PhoneOff, Search, ChevronRight, Menu, X
} from 'lucide-react';

const Layout = ({ children }) => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu on route change
    useEffect(() => {
        const timer = setTimeout(() => setIsMobileMenuOpen(false), 0);
        return () => clearTimeout(timer);
    }, [location.pathname]);

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
        `group relative flex items-center px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-300 gap-3 mb-1 ${
            isActive
                ? 'bg-gradient-to-r from-brand-500/10 to-transparent text-white border border-brand-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
        }`;

    const displayName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username || 'User';
    const profilePic = user?.profile_picture ? `http://localhost:5000${user.profile_picture}` : null;

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const currentPageName = pathSegments.length > 0 
        ? pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1) 
        : 'Overview';

    return (
        <div className="min-h-screen flex bg-[#030303] text-white selection:bg-brand-500/30 selection:text-white font-sans antialiased">
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Premium Sidebar */}
            <aside className={`fixed top-0 bottom-0 left-0 w-[260px] bg-[#0a0a0a]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col z-50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                {/* Logo Bar */}
                <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-brand-400/50">
                            <Database className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold text-sm tracking-tight text-white flex items-center">
                            Balitech<span className="text-brand-400">CRM</span>
                        </span>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6">
                    <div className="space-y-6">
                        {isFullAccess && (
                            <>
                                <div>
                                    <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Platform</p>
                                    <NavLink to="/" className={getClassName} end>
                                        <LayoutDashboard className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                        <span>Dashboard</span>
                                    </NavLink>
                                    <NavLink to="/vendors" className={getClassName}>
                                        <Store className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                        <span>Vendors</span>
                                    </NavLink>
                                    <NavLink to="/campaigns" className={getClassName}>
                                        <Megaphone className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                        <span>Campaigns</span>
                                    </NavLink>
                                    <NavLink to="/upload" className={getClassName}>
                                        <UploadCloud className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                        <span>Upload Data</span>
                                    </NavLink>
                                    <NavLink to="/compare" className={getClassName}>
                                        <Search className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                        <span>Compare</span>
                                    </NavLink>
                                    <NavLink to="/sessions" className={getClassName}>
                                        <DatabaseIcon className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                        <span>Sessions</span>
                                    </NavLink>
                                </div>
                                
                                <div>
                                    <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Operations</p>
                                    <NavLink to="/leads" className={getClassName}>
                                        <List className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                        <span>All Data</span>
                                    </NavLink>
                                    <NavLink to="/dnc" className={getClassName}>
                                        <PhoneOff className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                        <span>DNC</span>
                                    </NavLink>
                                    <NavLink to="/download" className={getClassName}>
                                        <Download className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                        <span>Download Data</span>
                                    </NavLink>
                                    <NavLink to="/logs" className={getClassName}>
                                        <ScrollText className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                        <span>Logs</span>
                                    </NavLink>
                                </div>
                                
                                {isSuperAdmin && (
                                    <div>
                                        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">System</p>
                                        <NavLink to="/users" className={getClassName}>
                                            <UserCog className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                            <span>Users</span>
                                        </NavLink>
                                    </div>
                                )}
                            </>
                        )}

                        {isDataEntry && (
                            <div>
                                <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Tasks</p>
                                <NavLink to="/vendors" className={getClassName}>
                                    <Store className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                    <span>Vendors</span>
                                </NavLink>
                                <NavLink to="/upload" className={getClassName}>
                                    <UploadCloud className="h-[16px] w-[16px] group-hover:scale-110 transition-transform duration-300" /> 
                                    <span>Upload Data</span>
                                </NavLink>
                            </div>
                        )}
                    </div>
                </nav>

                {/* Bottom User Area */}
                <div className="p-4 border-t border-white/5 bg-[#050505]">
                    <div className="flex items-center gap-3 bg-white/[0.02] p-2 rounded-xl border border-white/5 hover:bg-white/[0.04] transition-colors">
                        <div className="h-9 w-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {profilePic ? (
                                <img src={profilePic} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <Users className="h-4 w-4 text-slate-400" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold text-white truncate">{displayName}</p>
                            <p className="text-[11px] font-medium text-brand-400 truncate">{user?.email || role.replace('_', ' ')}</p>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="h-[16px] w-[16px]" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Canvas Area */}
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 md:ml-[260px]`}>
                {/* Premium Header */}
                <header className="h-16 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-2xl flex items-center px-4 md:px-8 justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button 
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 md:hidden transition-colors"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        
                        <div className="hidden sm:flex items-center gap-2 text-[13px] font-medium text-slate-400">
                            <span className="hover:text-white cursor-pointer transition-colors">BalitechCRM</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                            <span className="text-white">{currentPageName}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                        {/* Fake Command Search for aesthetics */}
                        <div className="hidden md:flex relative group cursor-text">
                            <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-white/10 bg-[#000] group-hover:border-white/20 transition-all w-48 lg:w-64 min-w-0 shadow-inner">
                                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="text-[13px] text-slate-500 truncate">Search system...</span>
                                <div className="ml-auto flex items-center gap-1 shrink-0">
                                    <kbd className="font-mono text-[10px] text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
                                </div>
                            </div>
                        </div>

                        {/* Status Dot */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] font-bold text-emerald-400 tracking-wide uppercase hidden sm:block">Operational</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 bg-[#030303] relative">
                    <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />
                    <div className="max-w-[1600px] mx-auto relative z-10 space-y-8">
                        {children}
                    </div>
                </main>
            </div>
            
            <style jsx="true">{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.2); }
            `}</style>
        </div>
    );
};

export default Layout;
