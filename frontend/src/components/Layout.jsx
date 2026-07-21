import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import {
    LogOut, Search, ChevronRight, ChevronDown, Menu, X,
    LayoutTemplate, Building2, Target, FolderUp, Scale, Layers,
    FileStack, ShieldBan, FolderDown, TerminalSquare, UserCheck,
    GitCompareArrows, ClipboardList, Bell, CheckCheck,
    Download, CheckCircle2, XCircle, Users, History, ShieldCheck, FileCheck2, Filter, Truck, Pickaxe, Users2, Database
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
    const [searchOpen,  setSearchOpen]  = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [vendorResults, setVendorResults] = useState([]);
    const [refineVendorResults, setRefineVendorResults] = useState([]);
    const [searchDataLoading, setSearchDataLoading] = useState(false);
    const searchRef  = useRef(null);
    const searchInputRef = useRef(null);

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

    const hasModule = (mod) => {
        if (isSuperAdmin) return true;
        let modules = user?.accessible_modules;
        if (!modules) return false;
        if (typeof modules === 'string') {
            try { modules = JSON.parse(modules); } catch { return false; }
        }
        return Array.isArray(modules) && modules.includes(mod);
    };

    // Pending download requests count (superadmin sidebar badge)
    const [pendingCount, setPendingCount] = useState(0);
    useEffect(() => {
        if (!isSuperAdmin) return;
        const fetchPendingCount = async () => {
            try {
                const [res1, res2, res3, res4] = await Promise.all([
                    api.get('/download/requests').catch(() => ({ data: [] })),
                    api.get('/premium-download/requests').catch(() => ({ data: [] })),
                    api.get('/refine-download/requests').catch(() => ({ data: [] })),
                    api.get('/van-download/requests').catch(() => ({ data: [] }))
                ]);
                const allReqs = [...(res1.data || []), ...(res2.data || []), ...(res3.data || []), ...(res4.data || [])];
                setPendingCount(allReqs.filter(r => r.status?.toLowerCase() === 'pending').length);
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

    const getSubClassName = ({ isActive }) =>
        `group flex items-center pl-9 pr-3 py-2 text-[12px] font-medium rounded-lg transition-all duration-200 gap-2.5 mb-0.5 ${
            isActive
                ? 'bg-brand-500/12 text-white border border-brand-500/20'
                : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
        }`;

    const REFINE_NAV_ITEMS = [
        { to: '/refine-vendors', icon: Building2, label: 'Refine Vendors' },
        { to: '/refine-campaigns', icon: Target, label: 'Refine Campaigns' },
        { to: '/refine-upload', icon: FolderUp, label: 'Upload Refine Data' },
        { to: '/refine-sessions', icon: Layers, label: 'Refine Sessions' },
        { to: '/refine-data', icon: FileStack, label: 'All Refine Data' },
        { to: '/refine-dnc', icon: ShieldBan, label: 'Refine DNC' },
        { to: '/refine-download', icon: FolderDown, label: 'Download Refined' },
        { to: '/refine-already-downloaded', icon: History, label: 'Already Downloaded' },
    ];

    const PREMIUM_NAV_ITEMS = [
        { to: '/premium-vendors', icon: Building2, label: 'Premium Vendors' },
        { to: '/premium-campaigns', icon: Target, label: 'Premium Campaigns' },
        { to: '/premium-upload', icon: FolderUp, label: 'Upload Premium Data' },
        { to: '/premium-sessions', icon: Layers, label: 'Premium Sessions' },
        { to: '/premium-data', icon: FileStack, label: 'All Premium Data' },
        { to: '/premium-download', icon: FolderDown, label: 'Download Premium Data' },
        { to: '/premium-already-downloaded', icon: History, label: 'Already Downloaded (Premium)' },
    ];

    const VAN_NAV_ITEMS = [
        { to: '/van-vendors', icon: Truck, label: 'Van Vendors' },
        { to: '/van-campaigns', icon: Target, label: 'Van Campaigns' },
        { to: '/van-upload', icon: FolderUp, label: 'Upload Van Data' },
        { to: '/van-sessions', icon: Layers, label: 'Van Sessions' },
        { to: '/van-data', icon: FileStack, label: 'All Van Data' },
        { to: '/van-download', icon: FolderDown, label: 'Download Van Data' },
        { to: '/van-already-downloaded', icon: History, label: 'Already Downloaded' },
    ];

    const MIXED_NAV_ITEMS = [
        { to: '/mixed-download', icon: FolderDown, label: 'Mixed Download' },
        { to: '/mixed-already-downloaded', icon: History, label: 'Already Downloaded' },
    ];

    const isRefinePath = location.pathname.startsWith('/refine');
    const [refineMenuOpen, setRefineMenuOpen] = useState(isRefinePath);

    useEffect(() => {
        if (location.pathname.startsWith('/refine')) {
            setRefineMenuOpen(true);
        }
    }, [location.pathname]);

    const isDeadNumbersPath = location.pathname.startsWith('/dead-numbers');
    const [deadNumbersMenuOpen, setDeadNumbersMenuOpen] = useState(isDeadNumbersPath);

    useEffect(() => {
        if (location.pathname.startsWith('/dead-numbers')) {
            setDeadNumbersMenuOpen(true);
        }
    }, [location.pathname]);

    const isPremiumPath = location.pathname.startsWith('/premium');
    const [premiumMenuOpen, setPremiumMenuOpen] = useState(isPremiumPath);

    useEffect(() => {
        if (location.pathname.startsWith('/premium')) {
            setPremiumMenuOpen(true);
        }
    }, [location.pathname]);

    const isVanPath = location.pathname.startsWith('/van');
    const [vanMenuOpen, setVanMenuOpen] = useState(isVanPath);

    useEffect(() => {
        if (location.pathname.startsWith('/van')) {
            setVanMenuOpen(true);
        }
    }, [location.pathname]);

    const isMixedPath = location.pathname.startsWith('/mixed');
    const [mixedMenuOpen, setMixedMenuOpen] = useState(isMixedPath);

    useEffect(() => {
        if (location.pathname.startsWith('/mixed')) {
            setMixedMenuOpen(true);
        }
    }, [location.pathname]);

    const isDncCheckerPath = location.pathname.startsWith('/dnc-checker');
    const [dncCheckerMenuOpen, setDncCheckerMenuOpen] = useState(isDncCheckerPath);

    useEffect(() => {
        if (location.pathname.startsWith('/dnc-checker')) {
            setDncCheckerMenuOpen(true);
        }
    }, [location.pathname]);

    const displayName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username || 'User';
    const profilePic  = user?.profile_picture ? `http://localhost:5000${user.profile_picture}` : null;
    const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const pathSegments  = location.pathname.split('/').filter(Boolean);
    const currentPageName = pathSegments.length > 0
        ? pathSegments[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Overview';

    // ── Global Search ─────────────────────────────────────────
    const ALL_PAGES = [
        { label: 'Dashboard',         path: '/',                  roles: ['super_admin','admin'],        icon: <LayoutTemplate className="h-4 w-4" /> },
        { label: 'Vendors',           path: '/vendors',           roles: ['super_admin','admin','data_entry'], icon: <Building2 className="h-4 w-4" /> },
        { label: 'Campaigns',         path: '/campaigns',         roles: ['super_admin','admin'],        icon: <Target className="h-4 w-4" /> },
        { label: 'Upload Data',       path: '/upload',            roles: ['super_admin','admin','data_entry'], icon: <FolderUp className="h-4 w-4" /> },
        { label: 'Compare',           path: '/compare',           roles: ['super_admin','admin'],        icon: <Scale className="h-4 w-4" /> },
        { label: 'Compare File',      path: '/compare-file',      roles: ['super_admin','admin'],        icon: <GitCompareArrows className="h-4 w-4" /> },
        { label: 'Sessions',          path: '/sessions',          roles: ['super_admin','admin'],        icon: <Layers className="h-4 w-4" /> },
        { label: 'Van Desk Data',     path: '/van-data',          roles: ['super_admin','admin'],        icon: <Database className="h-4 w-4" /> },
        { label: 'Van Desk Download', path: '/van-download',      roles: ['super_admin','admin'],        icon: <FolderDown className="h-4 w-4" /> },
        { label: 'Van Already Down.', path: '/van-already-downloaded', roles: ['super_admin','admin'],   icon: <History className="h-4 w-4" /> },
        { label: 'Mixed Download',    path: '/mixed-download',    roles: ['super_admin','admin'],        icon: <FolderDown className="h-4 w-4" /> },
        { label: 'Mixed Already Down.', path: '/mixed-already-downloaded', roles: ['super_admin','admin'], icon: <History className="h-4 w-4" /> },
        { label: 'All Data',          path: '/leads',             roles: ['super_admin','admin'],        icon: <FileStack className="h-4 w-4" /> },
        { label: 'DNC',               path: '/dnc',               roles: ['super_admin','admin'],        icon: <ShieldBan className="h-4 w-4" /> },
        { label: 'Download Data',     path: '/download',          roles: ['super_admin','admin'],        icon: <FolderDown className="h-4 w-4" /> },
        { label: 'Logs',              path: '/logs',              roles: ['super_admin','admin'],        icon: <TerminalSquare className="h-4 w-4" /> },
        { label: 'Users',             path: '/users',             roles: ['super_admin'],               icon: <UserCheck className="h-4 w-4" /> },
        { label: 'Download Requests', path: '/download-requests', roles: ['super_admin'],               icon: <ClipboardList className="h-4 w-4" /> },
        { label: 'Filters',           path: '/filters',           roles: ['super_admin','admin'],        icon: <Filter className="h-4 w-4" /> },
        { label: 'Clients',           path: '/clients',           roles: ['super_admin','admin'],        icon: <Users2 className="h-4 w-4" /> },
        { label: 'Separation',        path: '/separation-upload', roles: ['super_admin','admin','data_entry'], icon: <Pickaxe className="h-4 w-4" /> },
        { label: 'Refine DNC',          path: '/refine-dnc',               roles: ['super_admin','admin'],        icon: <ShieldBan className="h-4 w-4" /> },
        { label: 'Refine Vendors',      path: '/refine-vendors',           roles: ['super_admin','admin'],        icon: <Building2 className="h-4 w-4" /> },
        { label: 'Refine Campaigns',    path: '/refine-campaigns',         roles: ['super_admin','admin'],        icon: <Target className="h-4 w-4" /> },
        { label: 'Upload Refine Data',  path: '/refine-upload',            roles: ['super_admin','admin','data_entry'], icon: <FolderUp className="h-4 w-4" /> },
        { label: 'All Refine Data',     path: '/refine-data',              roles: ['super_admin','admin'],        icon: <FileStack className="h-4 w-4" /> },
        { label: 'Download Refined',    path: '/refine-download',          roles: ['super_admin','admin'],        icon: <FolderDown className="h-4 w-4" /> },
        { label: 'Already Downloaded (Refine)', path: '/refine-already-downloaded', roles: ['super_admin','admin'], icon: <History className="h-4 w-4" /> },
        { label: 'DNC Single Lookups',          path: '/dnc-checker/single-lookups', roles: ['super_admin','admin'], icon: <Search className="h-4 w-4" /> },
        { label: 'DNC Download Data',           path: '/dnc-checker/download',       roles: ['super_admin','admin'], icon: <FolderDown className="h-4 w-4" /> },
        { label: 'Van Vendors',                 path: '/van-vendors',              roles: ['super_admin','admin','data_entry'], icon: <Truck className="h-4 w-4" /> },
        { label: 'Van Campaigns',               path: '/van-campaigns',            roles: ['super_admin','admin'],        icon: <Target className="h-4 w-4" /> },
        { label: 'Upload Van Data',             path: '/van-upload',               roles: ['super_admin','admin','data_entry'], icon: <FolderUp className="h-4 w-4" /> },
        { label: 'Van Sessions',                path: '/van-sessions',             roles: ['super_admin','admin'],        icon: <Layers className="h-4 w-4" /> },
        { label: 'All Van Data',                path: '/van-data',                 roles: ['super_admin','admin'],        icon: <FileStack className="h-4 w-4" /> },
        { label: 'Download Van Data',           path: '/van-download',             roles: ['super_admin','admin'],        icon: <FolderDown className="h-4 w-4" /> },
        { label: 'Already Downloaded (Van)',    path: '/van-already-downloaded',   roles: ['super_admin','admin'], icon: <History className="h-4 w-4" /> },
    ];

    const matchesSearchText = (value, query) =>
        value && String(value).toLowerCase().includes(query);

    const entityMatchesQuery = (entity, fields, query) =>
        fields.some((field) => matchesSearchText(entity[field], query));

    const isPageAllowed = (p) => {
        if (!p.roles.includes(role)) return false;
        if (p.path.startsWith('/refine-') && !hasModule('refine')) return false;
        if (p.path.startsWith('/premium-') && !hasModule('premium')) return false;
        if (p.path.startsWith('/van-') && !hasModule('van_desk')) return false;
        if (p.path.startsWith('/dnc-checker') && !hasModule('dnc_checker')) return false;
        if (!p.path.startsWith('/refine-') && !p.path.startsWith('/premium-') && !p.path.startsWith('/van-') && !p.path.startsWith('/dnc-checker') && p.path !== '/' && p.path !== '/users' && p.path !== '/security' && p.path !== '/download-requests') {
            if (!hasModule('core')) return false;
        }
        return true;
    };

    const filteredPages = searchQuery.trim()
        ? ALL_PAGES.filter(p => isPageAllowed(p) && p.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : ALL_PAGES.filter(p => isPageAllowed(p));

    const vendorSearchQuery = searchQuery.trim().toLowerCase();
    const filteredVendors = vendorSearchQuery
        ? vendorResults.filter((v) =>
            entityMatchesQuery(v, ['name', 'email', 'phone', 'comment', 'company'], vendorSearchQuery)
        )
        : [];
    const filteredRefineVendors = vendorSearchQuery && isFullAccess
        ? refineVendorResults.filter((v) =>
            entityMatchesQuery(v, ['name', 'email', 'phone', 'company'], vendorSearchQuery)
        )
        : [];

    const hasSearchQuery = Boolean(vendorSearchQuery);
    const hasAnyResults =
        filteredPages.length > 0 ||
        filteredVendors.length > 0 ||
        filteredRefineVendors.length > 0;

    useEffect(() => {
        if (!searchOpen) return undefined;
        let cancelled = false;
        const loadSearchData = async () => {
            setSearchDataLoading(true);
            try {
                const requests = [api.get('/vendors?counts=false')];
                if (isFullAccess) {
                    requests.push(api.get('/refine-vendors?counts=false'));
                }
                const responses = await Promise.all(requests);
                if (cancelled) return;
                setVendorResults(responses[0]?.data || []);
                setRefineVendorResults(isFullAccess ? (responses[1]?.data || []) : []);
            } catch {
                if (!cancelled) {
                    setVendorResults([]);
                    setRefineVendorResults([]);
                }
            } finally {
                if (!cancelled) setSearchDataLoading(false);
            }
        };
        loadSearchData();
        return () => { cancelled = true; };
    }, [searchOpen, isFullAccess]);

    const openSearch = () => {
        setSearchOpen(true);
        setSearchQuery('');
        setTimeout(() => searchInputRef.current?.focus(), 50);
    };
    const closeSearch = () => { setSearchOpen(false); setSearchQuery(''); };

    const goToPage = (path) => { closeSearch(); navigate(path); };

    const goToVendorSearch = (vendor, refine = false) => {
        closeSearch();
        const base = refine ? '/refine-vendors' : '/vendors';
        navigate(`${base}?search=${encodeURIComponent(vendor.name || '')}`);
    };

    const handleSearchEnter = () => {
        if (filteredVendors.length > 0) {
            goToVendorSearch(filteredVendors[0], false);
            return;
        }
        if (filteredRefineVendors.length > 0) {
            goToVendorSearch(filteredRefineVendors[0], true);
            return;
        }
        if (filteredPages.length > 0) {
            goToPage(filteredPages[0].path);
        }
    };

    // Keyboard shortcut Ctrl+K / ⌘K
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchOpen ? closeSearch() : openSearch();
            }
            if (e.key === 'Escape') closeSearch();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [searchOpen]);

    // Close on outside click
    useEffect(() => {
        const h = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) closeSearch(); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

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
                                <button
                                    type="button"
                                    onClick={() => setDeadNumbersMenuOpen((open) => !open)}
                                    className={`w-full flex items-center px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 gap-3 mb-0.5 border ${
                                        isDeadNumbersPath
                                            ? 'bg-gradient-to-r from-red-500/15 to-transparent text-white border-red-500/25'
                                            : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border-transparent'
                                    }`}
                                >
                                    <ShieldBan className="h-[15px] w-[15px] shrink-0 text-red-400" />
                                    <span className="flex-1 text-left">Dead Numbers</span>
                                    <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${deadNumbersMenuOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                <div
                                    className={`overflow-hidden transition-all duration-300 ease-out ${
                                        deadNumbersMenuOpen ? 'max-h-[200px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    <NavLink to="/dead-numbers/upload" className={getSubClassName}>
                                        <FolderUp className="h-[14px] w-[14px] shrink-0" />
                                        <span>Upload Dead Numbers</span>
                                    </NavLink>
                                    <NavLink to="/dead-numbers/all" className={getSubClassName}>
                                        <FileStack className="h-[14px] w-[14px] shrink-0" />
                                        <span>All Dead Numbers</span>
                                    </NavLink>
                                </div>
                            </div>

                            {hasModule('core') && (
                                <div>
                                    <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-2">Operations</p>
                                    <NavLink to="/clients" className={getClassName}>
                                        <Users2 className="h-[15px] w-[15px] shrink-0" /><span>Clients</span>
                                    </NavLink>
                                    <NavLink to="/separation-upload" className={getClassName}>
                                        <Pickaxe className="h-[15px] w-[15px] shrink-0" /><span>Separation</span>
                                    </NavLink>
                                    <NavLink to="/leads" className={getClassName}>
                                        <FileStack className="h-[15px] w-[15px] shrink-0" /><span>All Data</span>
                                    </NavLink>
                                    <NavLink to="/dnc" className={getClassName}>
                                        <ShieldBan className="h-[15px] w-[15px] shrink-0" /><span>DNC</span>
                                    </NavLink>
                                    <NavLink to="/download" className={getClassName}>
                                        <FolderDown className="h-[15px] w-[15px] shrink-0" /><span>Download Data</span>
                                    </NavLink>
                                    <NavLink to="/already-downloaded" className={getClassName}>
                                        <History className="h-[15px] w-[15px] shrink-0" /><span>Already Downloaded</span>
                                    </NavLink>
                                    <NavLink to="/filters" className={getClassName}>
                                        <Filter className="h-[15px] w-[15px] shrink-0" /><span>Filters</span>
                                    </NavLink>
                                    <NavLink to="/logs" className={getClassName}>
                                        <TerminalSquare className="h-[15px] w-[15px] shrink-0" /><span>Logs</span>
                                    </NavLink>
                                </div>
                            )}

                            {hasModule('refine') && (
                                <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => setRefineMenuOpen((open) => !open)}
                                    className={`w-full flex items-center px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 gap-3 mb-0.5 border ${
                                        isRefinePath
                                            ? 'bg-gradient-to-r from-teal-500/15 to-transparent text-white border-teal-500/25'
                                            : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border-transparent'
                                    }`}
                                >
                                    <Layers className="h-[15px] w-[15px] shrink-0 text-teal-400" />
                                    <span className="flex-1 text-left">Refine Data</span>
                                    <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${refineMenuOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                <div
                                    className={`overflow-hidden transition-all duration-300 ease-out ${
                                        refineMenuOpen ? 'max-h-[520px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    {REFINE_NAV_ITEMS.map((item) => {
                                        const ItemIcon = item.icon;
                                        return (
                                            <NavLink key={item.to} to={item.to} className={getSubClassName}>
                                                <ItemIcon className="h-[14px] w-[14px] shrink-0" />
                                                <span>{item.label}</span>
                                            </NavLink>
                                        );
                                    })}
                                </div>
                                </div>
                            )}

                            {hasModule('premium') && (
                                <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => setPremiumMenuOpen((open) => !open)}
                                    className={`w-full flex items-center px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 gap-3 mb-0.5 border ${
                                        isPremiumPath
                                            ? 'bg-gradient-to-r from-teal-500/15 to-transparent text-white border-teal-500/25'
                                            : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border-transparent'
                                    }`}
                                >
                                    <Layers className="h-[15px] w-[15px] shrink-0 text-teal-400" />
                                    <span className="flex-1 text-left">Premium Data</span>
                                    <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${premiumMenuOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                <div
                                    className={`overflow-hidden transition-all duration-300 ease-out ${
                                        premiumMenuOpen ? 'max-h-[520px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    {PREMIUM_NAV_ITEMS.map((item) => {
                                        const ItemIcon = item.icon;
                                        return (
                                            <NavLink key={item.to} to={item.to} className={getSubClassName}>
                                                <ItemIcon className="h-[14px] w-[14px] shrink-0" />
                                                <span>{item.label}</span>
                                            </NavLink>
                                        );
                                    })}
                                </div>
                                </div>
                            )}

                            {/* VAN DESK Collapsible */}
                            {hasModule('van_desk') && (
                                <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => setVanMenuOpen((open) => !open)}
                                    className={`w-full flex items-center px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 gap-3 mb-0.5 border ${
                                        isVanPath
                                            ? 'bg-gradient-to-r from-violet-500/15 to-transparent text-white border-violet-500/25'
                                            : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border-transparent'
                                    }`}
                                >
                                    <Truck className="h-[15px] w-[15px] shrink-0 text-violet-400" />
                                    <span className="flex-1 text-left">Van Desk</span>
                                    <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${vanMenuOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                <div
                                    className={`overflow-hidden transition-all duration-300 ease-out ${
                                        vanMenuOpen ? 'max-h-[520px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    {VAN_NAV_ITEMS.map((item) => {
                                        const ItemIcon = item.icon;
                                        return (
                                            <NavLink key={item.to} to={item.to} className={getSubClassName}>
                                                <ItemIcon className="h-[14px] w-[14px] shrink-0" />
                                                <span>{item.label}</span>
                                            </NavLink>
                                        );
                                    })}
                                </div>
                                </div>
                            )}

                            {/* MIXED DOWNLOAD Collapsible (Always available to super_admin/admin, no specific module needed, or maybe tie it to van_desk/premium/refine?) */}
                            {(isSuperAdmin || isAdmin) && (
                                <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => setMixedMenuOpen((open) => !open)}
                                    className={`w-full flex items-center px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 gap-3 mb-0.5 border ${
                                        isMixedPath
                                            ? 'bg-gradient-to-r from-blue-500/15 to-transparent text-white border-blue-500/25'
                                            : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border-transparent'
                                    }`}
                                >
                                    <FolderDown className="h-[15px] w-[15px] shrink-0 text-blue-400" />
                                    <span className="flex-1 text-left">Download Data</span>
                                    <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${mixedMenuOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                <div
                                    className={`overflow-hidden transition-all duration-300 ease-out ${
                                        mixedMenuOpen ? 'max-h-[520px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    {MIXED_NAV_ITEMS.map((item) => {
                                        const ItemIcon = item.icon;
                                        return (
                                            <NavLink key={item.to} to={item.to} className={getSubClassName}>
                                                <ItemIcon className="h-[14px] w-[14px] shrink-0" />
                                                <span>{item.label}</span>
                                            </NavLink>
                                        );
                                    })}
                                </div>
                                </div>
                            )}

                            {/* DNC Checker Results Collapsible */}
                            {hasModule('dnc_checker') && (
                                <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => setDncCheckerMenuOpen((open) => !open)}
                                    className={`w-full flex items-center px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 gap-3 mb-0.5 border ${
                                        isDncCheckerPath
                                            ? 'bg-gradient-to-r from-teal-500/15 to-transparent text-white border-teal-500/25'
                                            : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border-transparent'
                                    }`}
                                >
                                    <ShieldCheck className="h-[15px] w-[15px] shrink-0 text-teal-400" />
                                    <span className="flex-1 text-left">DNC Checker Results</span>
                                    <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${dncCheckerMenuOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                <div
                                    className={`overflow-hidden transition-all duration-300 ease-out ${
                                        dncCheckerMenuOpen ? 'max-h-[200px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    <NavLink to="/dnc-checker/single-lookups" className={getSubClassName}>
                                        <Search className="h-[14px] w-[14px] shrink-0" />
                                        <span>Single Lookups</span>
                                    </NavLink>
                                    <NavLink to="/dnc-checker/download" className={getSubClassName}>
                                        <FolderDown className="h-[14px] w-[14px] shrink-0" />
                                        <span>Download Data</span>
                                    </NavLink>
                                </div>
                                </div>
                            )}

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
                            
                            {hasModule('core') && (
                                <div className="mt-2">
                                    <NavLink to="/vendors" className={getClassName}>
                                        <Building2 className="h-[15px] w-[15px] shrink-0" /><span>Vendors</span>
                                    </NavLink>
                                    <NavLink to="/upload" className={getClassName}>
                                        <FolderUp className="h-[15px] w-[15px] shrink-0" /><span>Upload Data</span>
                                    </NavLink>
                                </div>
                            )}

                            {hasModule('refine') && (
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setRefineMenuOpen((open) => !open)}
                                        className={`w-full flex items-center px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 gap-3 mb-0.5 border ${
                                            isRefinePath
                                                ? 'bg-gradient-to-r from-teal-500/15 to-transparent text-white border-teal-500/25'
                                                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border-transparent'
                                        }`}
                                    >
                                        <Layers className="h-[15px] w-[15px] shrink-0 text-teal-400" />
                                        <span className="flex-1 text-left">Refine Data</span>
                                        <ChevronDown
                                            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${refineMenuOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-300 ease-out ${refineMenuOpen ? 'max-h-[520px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                        <NavLink to="/refine-vendors" className={getSubClassName}>
                                            <Building2 className="h-[14px] w-[14px] shrink-0" /><span>Refine Vendors</span>
                                        </NavLink>
                                        <NavLink to="/refine-upload" className={getSubClassName}>
                                            <FolderUp className="h-[14px] w-[14px] shrink-0" /><span>Upload Refine Data</span>
                                        </NavLink>
                                    </div>
                                </div>
                            )}

                            {hasModule('premium') && (
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setPremiumMenuOpen((open) => !open)}
                                        className={`w-full flex items-center px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 gap-3 mb-0.5 border ${
                                            isPremiumPath
                                                ? 'bg-gradient-to-r from-teal-500/15 to-transparent text-white border-teal-500/25'
                                                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border-transparent'
                                        }`}
                                    >
                                        <Layers className="h-[15px] w-[15px] shrink-0 text-teal-400" />
                                        <span className="flex-1 text-left">Premium Data</span>
                                        <ChevronDown
                                            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${premiumMenuOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-300 ease-out ${premiumMenuOpen ? 'max-h-[520px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                        <NavLink to="/premium-vendors" className={getSubClassName}>
                                            <Building2 className="h-[14px] w-[14px] shrink-0" /><span>Premium Vendors</span>
                                        </NavLink>
                                        <NavLink to="/premium-upload" className={getSubClassName}>
                                            <FolderUp className="h-[14px] w-[14px] shrink-0" /><span>Upload Premium Data</span>
                                        </NavLink>
                                    </div>
                                </div>
                            )}

                            {hasModule('van_desk') && (
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setVanMenuOpen((open) => !open)}
                                        className={`w-full flex items-center px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 gap-3 mb-0.5 border ${
                                            isVanPath
                                                ? 'bg-gradient-to-r from-violet-500/15 to-transparent text-white border-violet-500/25'
                                                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border-transparent'
                                        }`}
                                    >
                                        <Truck className="h-[15px] w-[15px] shrink-0 text-violet-400" />
                                        <span className="flex-1 text-left">Van Desk</span>
                                        <ChevronDown
                                            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${vanMenuOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-300 ease-out ${vanMenuOpen ? 'max-h-[520px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                        <NavLink to="/van-vendors" className={getSubClassName}>
                                            <Building2 className="h-[14px] w-[14px] shrink-0" /><span>Van Vendors</span>
                                        </NavLink>
                                        <NavLink to="/van-upload" className={getSubClassName}>
                                            <FolderUp className="h-[14px] w-[14px] shrink-0" /><span>Upload Van Data</span>
                                        </NavLink>
                                    </div>
                                </div>
                            )}
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
                    <div className="mt-3 pt-3 border-t border-white/[0.05] flex justify-center">
                        <div className="flex items-center gap-4 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default shadow-sm">
                            <span className="text-[11px] tracking-[0.2em] uppercase text-slate-300 font-semibold transition-colors">Powered by</span>
                            <div className="w-px h-4 bg-white/20 transition-colors" />
                            <img
                                src="/assets/Go Connectivo 1.png"
                                alt="GO Connectivo"
                                className="h-6 w-auto object-contain opacity-100 brightness-110 drop-shadow-sm"
                            />
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

                        {/* ── Search ── */}
                        <div className="relative" ref={searchRef}>
                            {/* Desktop: inline bar */}
                            <button
                                onClick={openSearch}
                                className="hidden md:flex items-center gap-2 h-9 px-3 rounded-xl border border-white/8 bg-white/[0.03] hover:border-white/15 transition-all w-44 lg:w-56 cursor-text text-left"
                            >
                                <Search className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                                <span className="text-[12px] text-slate-600 truncate flex-1">Search...</span>
                                <kbd className="font-mono text-[9px] text-slate-600 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded">⌘K</kbd>
                            </button>

                            {/* Mobile: icon button */}
                            <button
                                onClick={openSearch}
                                className="md:hidden p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/10 transition-all duration-200"
                            >
                                <Search className="h-5 w-5" />
                            </button>

                            {/* Search dropdown/overlay */}
                            {searchOpen && (
                                <>
                                    {/* Backdrop (mobile) */}
                                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden" onClick={closeSearch} />

                                    {/* Dropdown panel */}
                                    <div className="fixed md:absolute left-1/2 md:left-auto -translate-x-1/2 md:translate-x-0 md:right-0 top-[70px] md:top-full md:mt-2 w-[92vw] md:w-[380px] bg-[#1a1d2e] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden z-[100]">
                                        {/* Input row */}
                                        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
                                            <Search className="h-4 w-4 text-slate-500 shrink-0" />
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleSearchEnter(); }}
                                                placeholder="Search pages, vendors..."
                                                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-slate-600 outline-none font-medium"
                                            />
                                            <button onClick={closeSearch} className="p-1 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-colors">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Results */}
                                        <div className="max-h-[320px] overflow-y-auto py-2">
                                            {searchDataLoading && hasSearchQuery ? (
                                                <div className="px-4 py-6 text-center text-slate-500 text-sm">Searching…</div>
                                            ) : !hasAnyResults ? (
                                                <div className="px-4 py-8 text-center">
                                                    <p className="text-slate-500 text-sm">No results for <span className="text-white font-medium">&quot;{searchQuery}&quot;</span></p>
                                                </div>
                                            ) : (
                                                <>
                                                    {filteredVendors.length > 0 && (
                                                        <div className="mb-2">
                                                            <p className="px-4 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Vendors</p>
                                                            {filteredVendors.map((vendor) => (
                                                                <button
                                                                    key={vendor.vendor_id}
                                                                    type="button"
                                                                    onClick={() => goToVendorSearch(vendor, false)}
                                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-white/[0.05] text-slate-300"
                                                                >
                                                                    <span className="shrink-0 text-slate-500">
                                                                        <Building2 className="h-4 w-4" />
                                                                    </span>
                                                                    <div className="min-w-0 flex-1">
                                                                        <span className="text-[13px] font-medium text-white block truncate">{vendor.name}</span>
                                                                        {(vendor.email || vendor.phone) && (
                                                                            <span className="text-[11px] text-slate-500 block truncate">
                                                                                {[vendor.email, vendor.phone].filter(Boolean).join(' · ')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-600 shrink-0">Vendor</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {filteredRefineVendors.length > 0 && (
                                                        <div className="mb-2">
                                                            <p className="px-4 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Refine Vendors</p>
                                                            {filteredRefineVendors.map((vendor) => (
                                                                <button
                                                                    key={vendor.vendor_id}
                                                                    type="button"
                                                                    onClick={() => goToVendorSearch(vendor, true)}
                                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-white/[0.05] text-slate-300"
                                                                >
                                                                    <span className="shrink-0 text-brand-400">
                                                                        <Building2 className="h-4 w-4" />
                                                                    </span>
                                                                    <div className="min-w-0 flex-1">
                                                                        <span className="text-[13px] font-medium text-white block truncate">{vendor.name}</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-brand-400/80 shrink-0">Refine</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {filteredPages.length > 0 && (
                                                        <div>
                                                            {hasSearchQuery && (
                                                                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Pages</p>
                                                            )}
                                                            {filteredPages.map((page) => (
                                                                <button
                                                                    key={page.path}
                                                                    type="button"
                                                                    onClick={() => goToPage(page.path)}
                                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-white/[0.05] ${
                                                                        location.pathname === page.path ? 'bg-brand-500/10 text-brand-300' : 'text-slate-300'
                                                                    }`}
                                                                >
                                                                    <span className={`shrink-0 ${ location.pathname === page.path ? 'text-brand-400' : 'text-slate-500' }`}>
                                                                        {page.icon}
                                                                    </span>
                                                                    <span className="text-[13px] font-medium">{page.label}</span>
                                                                    {location.pathname === page.path && (
                                                                        <span className="ml-auto text-[10px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-full">Current</span>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Footer hint */}
                                        <div className="px-4 py-2.5 border-t border-white/8 bg-white/[0.01] flex items-center gap-3">
                                            <span className="text-[10px] text-slate-600"><kbd className="bg-white/8 border border-white/10 px-1.5 py-0.5 rounded text-[9px]">↵</kbd> to navigate</span>
                                            <span className="text-[10px] text-slate-600"><kbd className="bg-white/8 border border-white/10 px-1.5 py-0.5 rounded text-[9px]">Esc</kbd> to close</span>
                                        </div>
                                    </div>
                                </>
                            )}
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
