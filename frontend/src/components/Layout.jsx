import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import {
    LogOut, Search, ChevronRight, Menu, X,
    LayoutTemplate, Building2, Target, FolderUp, Scale, Layers,
    FileStack, ShieldBan, FolderDown, TerminalSquare, UserCheck,
    GitCompareArrows, ClipboardList, Bell, CheckCheck,
    Download, CheckCircle2, XCircle, Users
} from 'lucide-react';

// ─── Notification Bell Component ─────────────────────────────
const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    const [open, setOpen]                   = useState(false);
    const [loading, setLoading]             = useState(false);
    const ref = useRef(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.is_read).length);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        const doFetch = async () => {
            await fetchNotifications();
        };
        doFetch();
        const interval = setInterval(fetchNotifications, 20000); // poll every 20s
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close on outside click
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const markAllRead = async () => {
        setLoading(true);
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch { /* silent */ }
        setLoading(false);
    };

    const markOneRead = async (n) => {
        if (n.is_read) return;
        try {
            await api.patch(`/notifications/${n.id}/read`);
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
            setUnreadCount(c => Math.max(0, c - 1));
        } catch { /* silent */ }
    };

    const typeConfig = {
        download_request_new: {
            icon: <Download className="h-4 w-4" />,
            color: 'text-blue-400',
            bg: 'bg-blue-500/15 border-blue-500/20',
        },
        download_request_accepted: {
            icon: <CheckCircle2 className="h-4 w-4" />,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/15 border-emerald-500/20',
        },
        download_request_rejected: {
            icon: <XCircle className="h-4 w-4" />,
            color: 'text-red-400',
            bg: 'bg-red-500/15 border-red-500/20',
        },
    };

    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(timer);
    }, []);

    const fmtTime = (d) => {
        const diff = (now - new Date(d).getTime()) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="relative" ref={ref}>
            {/* Bell Button */}
            <button
                onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
                className="relative p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/10 transition-all duration-200"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-br from-orange-400 to-pink-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-lg animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div className="absolute right-0 top-full mt-3 w-[380px] bg-[#1a1d2e] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden z-[100]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-white/[0.02]">
                        <div className="flex items-center gap-2.5">
                            <Bell className="h-4 w-4 text-orange-400" />
                            <span className="font-bold text-white text-sm">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                disabled={loading}
                                className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition-colors font-medium"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[420px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <Bell className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm font-medium">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => {
                                const cfg = typeConfig[n.type] || typeConfig.download_request_new;
                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => markOneRead(n)}
                                        className={`flex gap-3 px-5 py-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/[0.03] ${!n.is_read ? 'bg-white/[0.015]' : ''}`}
                                    >
                                        {/* Icon */}
                                        <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.color}`}>
                                            {cfg.icon}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-bold leading-tight ${n.is_read ? 'text-slate-400' : 'text-white'}`}>
                                                    {n.title}
                                                </p>
                                                {!n.is_read && (
                                                    <span className="h-2 w-2 bg-orange-400 rounded-full shrink-0 mt-1" />
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                                            <p className="text-[10px] text-slate-600 mt-1.5 font-medium">{fmtTime(n.created_at)}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-5 py-3 border-t border-white/8 bg-white/[0.01]">
                            <p className="text-[11px] text-slate-600 text-center">Showing last {notifications.length} notifications</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// MAIN LAYOUT
// ─────────────────────────────────────────────────────────────
const Layout = ({ children }) => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsMobileMenuOpen(false), 0);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    const handleLogout = () => { logout(); navigate('/login'); };

    const role = user?.role;
    const isSuperAdmin = role === 'super_admin';
    const isAdmin      = role === 'admin';
    const isDataEntry  = role === 'data_entry';
    const isFullAccess = isSuperAdmin || isAdmin;

    // Pending download requests count (superadmin sidebar badge)
    const [pendingCount, setPendingCount] = useState(0);
    useEffect(() => {
        if (!isSuperAdmin) return;
        const fetchPendingCount = async () => {
            try {
                const res = await api.get('/download/requests');
                setPendingCount(res.data.filter(r => r.status === 'pending').length);
            } catch { /* silent */ }
        };
        fetchPendingCount();
        const interval = setInterval(fetchPendingCount, 30000);
        return () => clearInterval(interval);
    }, [isSuperAdmin]);

    const getClassName = ({ isActive }) =>
        `group relative flex items-center px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 gap-3 mb-0.5 ${
            isActive
                ? 'bg-gradient-to-r from-brand-500/15 to-transparent text-white border border-brand-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
        }`;

    const displayName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username || 'User';
    const profilePic  = user?.profile_picture ? `http://localhost:5000${user.profile_picture}` : null;
    const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const pathSegments  = location.pathname.split('/').filter(Boolean);
    const currentPageName = pathSegments.length > 0
        ? pathSegments[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Overview';

    return (
        <div className="min-h-screen flex bg-[#0f1117] text-white selection:bg-brand-500/30 selection:text-white font-sans antialiased">

            {/* Mobile overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* ══════ SIDEBAR ════════════════════════════════════ */}
            <aside className={`fixed top-0 bottom-0 left-0 w-[260px] bg-[#13151f] border-r border-white/[0.06] flex flex-col z-50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

                {/* Logo */}
                <div className="h-[70px] flex items-center justify-center px-4 border-b border-white/[0.06] shrink-0 relative">
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
                    <img src="/assets/logo.png" alt="BaliTech" className="h-12 w-auto max-w-[85%] object-contain select-none" />
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ffffff10 transparent' }}>

                    {isFullAccess && (
                        <>
                            <div>
                                <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-2">Platform</p>
                                <NavLink to="/" className={getClassName} end>
                                    <LayoutTemplate className="h-[15px] w-[15px] shrink-0" /><span>Dashboard</span>
                                </NavLink>
                                <NavLink to="/vendors" className={getClassName}>
                                    <Building2 className="h-[15px] w-[15px] shrink-0" /><span>Vendors</span>
                                </NavLink>
                                <NavLink to="/campaigns" className={getClassName}>
                                    <Target className="h-[15px] w-[15px] shrink-0" /><span>Campaigns</span>
                                </NavLink>
                                <NavLink to="/upload" className={getClassName}>
                                    <FolderUp className="h-[15px] w-[15px] shrink-0" /><span>Upload Data</span>
                                </NavLink>
                                <NavLink to="/compare" className={getClassName}>
                                    <Scale className="h-[15px] w-[15px] shrink-0" /><span>Compare</span>
                                </NavLink>
                                <NavLink to="/compare-file" className={getClassName}>
                                    <GitCompareArrows className="h-[15px] w-[15px] shrink-0" /><span>Compare File</span>
                                </NavLink>
                                <NavLink to="/sessions" className={getClassName}>
                                    <Layers className="h-[15px] w-[15px] shrink-0" /><span>Sessions</span>
                                </NavLink>
                            </div>

                            <div>
                                <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-2">Operations</p>
                                <NavLink to="/leads" className={getClassName}>
                                    <FileStack className="h-[15px] w-[15px] shrink-0" /><span>All Data</span>
                                </NavLink>
                                <NavLink to="/dnc" className={getClassName}>
                                    <ShieldBan className="h-[15px] w-[15px] shrink-0" /><span>DNC</span>
                                </NavLink>
                                <NavLink to="/download" className={getClassName}>
                                    <FolderDown className="h-[15px] w-[15px] shrink-0" /><span>Download Data</span>
                                </NavLink>
                                <NavLink to="/logs" className={getClassName}>
                                    <TerminalSquare className="h-[15px] w-[15px] shrink-0" /><span>Logs</span>
                                </NavLink>
                            </div>

                            {isSuperAdmin && (
                                <div>
                                    <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-2">System</p>
                                    <NavLink to="/users" className={getClassName}>
                                        <UserCheck className="h-[15px] w-[15px] shrink-0" /><span>Users</span>
                                    </NavLink>
                                    <NavLink to="/download-requests" className={getClassName}>
                                        <ClipboardList className="h-[15px] w-[15px] shrink-0" />
                                        <span>Download Requests</span>
                                        {pendingCount > 0 && (
                                            <span className="ml-auto bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                                {pendingCount}
                                            </span>
                                        )}
                                    </NavLink>
                                    <NavLink to="/security" className={getClassName}>
                                        <ShieldBan className="h-[15px] w-[15px] shrink-0" /><span>Security</span>
                                    </NavLink>
                                </div>
                            )}
                        </>
                    )}

                    {isDataEntry && (
                        <div>
                            <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-2">Tasks</p>
                            <NavLink to="/vendors" className={getClassName}>
                                <Building2 className="h-[15px] w-[15px] shrink-0" /><span>Vendors</span>
                            </NavLink>
                            <NavLink to="/upload" className={getClassName}>
                                <FolderUp className="h-[15px] w-[15px] shrink-0" /><span>Upload Data</span>
                            </NavLink>
                        </div>
                    )}
                </nav>

                {/* Bottom user card */}
                <div className="p-3 border-t border-white/[0.06] bg-[#0f1117]/60">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500/50 to-purple-500/50 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 text-xs font-bold text-white">
                            {profilePic ? <img src={profilePic} alt="User" className="w-full h-full object-cover" /> : initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-white truncate leading-tight">{displayName}</p>
                            <p className="text-[10px] font-semibold text-brand-400/80 truncate capitalize">{role?.replace('_', ' ')}</p>
                        </div>
                        <button onClick={handleLogout} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Sign out">
                            <LogOut className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Powered by GO Connectivo */}
                    <div className="mt-3 pt-3 border-t border-white/[0.05]">
                        <div className="flex flex-col items-center gap-1.5">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-slate-700 font-semibold">Powered by</p>
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-default select-none transition-all duration-300 hover:scale-[1.02]"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(139,92,246,0.07) 0%, rgba(217,70,239,0.05) 50%, rgba(236,72,153,0.04) 100%)',
                                    border: '1px solid rgba(139,92,246,0.16)',
                                    boxShadow: '0 0 14px rgba(139,92,246,0.07), inset 0 1px 0 rgba(255,255,255,0.04)'
                                }}
                            >
                                <img
                                    src="/assets/Go Connectivo 1.png"
                                    alt="GO Connectivo"
                                    className="h-7 w-28 object-fill select-none"
                                    style={{ filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.35))' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </aside>

            {/* ══════ MAIN AREA ══════════════════════════════════ */}
            <div className="flex-1 flex flex-col min-h-screen md:ml-[260px]">

                {/* ── Top Header ─────────────────────────────── */}
                <header className="h-[60px] border-b border-white/[0.06] bg-[#13151f]/95 backdrop-blur-xl flex items-center px-4 md:px-6 justify-between sticky top-0 z-30">
                    {/* Left */}
                    <div className="flex items-center gap-3">
                        <button
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 md:hidden transition-colors"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <div className="hidden sm:flex items-center gap-2 text-[13px] font-medium text-slate-500">
                            <span className="hover:text-slate-300 cursor-default transition-colors">BaliTech CRM</span>
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-white font-semibold">{currentPageName}</span>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2">
                        {/* Search bar */}
                        <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-xl border border-white/8 bg-white/[0.03] hover:border-white/15 transition-all w-44 lg:w-56 cursor-text">
                            <Search className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                            <span className="text-[12px] text-slate-600 truncate flex-1">Search...</span>
                            <kbd className="font-mono text-[9px] text-slate-600 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded">⌘K</kbd>
                        </div>

                        {/* Notification Bell */}
                        <NotificationBell />

                        {/* Status */}
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
                        </div>
                    </div>
                </header>

                {/* ── Page Content ───────────────────────────── */}
                <main className="flex-1 p-4 md:p-8 bg-[#0f1117] relative">
                    <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-brand-500/[0.04] to-transparent pointer-events-none" />
                    <div className="max-w-[1600px] mx-auto relative z-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
