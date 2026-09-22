import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FileCheck2, Search, RefreshCw, ChevronLeft, ChevronRight,
    Download, AlertCircle, InboxIcon, CheckCircle2,
    X, DownloadCloud, Sparkles, Check, Copy, Calendar
} from 'lucide-react';
import {
    fetchSingleLookups,
    downloadSingleLookups,
    markSingleLookupDownloaded,
} from '../services/dncChecker.service';

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtNum = (n) => (n ?? 0).toLocaleString();

// ── Main Page ──────────────────────────────────────────────────────────────
const SingleLookups = () => {
    useNavigate();
    const [searchParams] = useSearchParams();

    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        allTotal: 0,
        totalPages: 0,
        alreadyPresent: 0,
        fresh: 0,
        alreadyDownloaded: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [copiedPhone, setCopiedPhone] = useState(null);

    // Filters
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const [presenceFilter, setPresenceFilter] = useState('');

    // Download controls
    const [downloadQuantity, setDownloadQuantity] = useState('');
    const [includeDownloaded, setIncludeDownloaded] = useState(false);
    const [downloadingType, setDownloadingType] = useState(null);

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 350);
        return () => clearTimeout(handler);
    }, [search]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchSingleLookups({
                page,
                limit: 20,
                search: debouncedSearch,
                startDate,
                endDate,
                presenceFilter,
            });
            const { data: rows, pagination: pag } = res.data;
            setData(rows || []);
            setPagination(pag || {});
        } catch (e) {
            setError(e?.response?.data?.message || 'Failed to load records. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, startDate, endDate, presenceFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleCopy = (phone) => {
        if (!phone) return;
        navigator.clipboard.writeText(phone);
        setCopiedPhone(phone);
        setTimeout(() => setCopiedPhone(null), 2000);
    };

    // Bulk download handler
    const handleBulkDownload = async (category) => {
        const type = category || presenceFilter || 'all';
        setDownloadingType(type);
        try {
            const payload = {
                type,
                quantity: downloadQuantity ? parseInt(downloadQuantity, 10) : undefined,
                include_downloaded: includeDownloaded,
                search: debouncedSearch,
                startDate,
                endDate,
            };

            const res = await downloadSingleLookups(payload);
            const { csv, fileName, count } = res.data;

            if (!csv) {
                showToast('No records returned for download.', 'error');
                return;
            }

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.setAttribute('download', fileName || `dnc_${type}_lookups_${Date.now()}.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`Downloaded ${count.toLocaleString()} record(s) successfully!`, 'success');
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.message || 'Download failed. Please try again.';
            showToast(msg, 'error');
        } finally {
            setDownloadingType(null);
        }
    };

    // Single record download
    const downloadSingleResult = async (row) => {
        try {
            const header = "Phone Number,DNC Status,Line Type,Source,IP Address,CRM Status,Checked At,Downloaded At\n";
            const content = `"${row.phone_number}","${row.dnc_status}","${row.line_type || ''}","${row.source || ''}","${row.ip_address || ''}","${row.is_already_present ? 'Already Present' : 'Fresh'}","${row.checked_at ? new Date(row.checked_at).toISOString() : ''}","${new Date().toISOString()}"\n`;
            const blob = new Blob([header + content], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.setAttribute('download', `dnc_result_${row.phone_number}.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            await markSingleLookupDownloaded(row.id);
            showToast(`Downloaded ${row.phone_number}`, 'success');
            fetchData();
        } catch (err) {
            console.error('Failed to download single result:', err);
            showToast('Failed to download record.', 'error');
        }
    };

    const hasActiveFilters = Boolean(startDate || endDate || search || presenceFilter);

    // KPI Cards Configuration
    const summaryCards = [
        {
            id: '',
            label: 'Total Lookups',
            shortLabel: 'All',
            subtext: 'All Checked Leads',
            value: fmtNum(pagination.allTotal ?? pagination.total),
            icon: Search,
            downloadType: 'all',
            color: 'blue',
            iconBox: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            bg: 'bg-gradient-to-b from-[#131b30] to-[#0c1222] border-blue-500/25',
            activeRing: 'ring-2 ring-blue-500 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.25)]',
            tabActive: 'bg-blue-600 text-white shadow-blue-500/30 border-blue-500',
            btnStyle: 'bg-blue-500/10 hover:bg-blue-500/25 text-blue-300 border-blue-500/30 hover:border-blue-400/50',
            badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        },
        {
            id: 'already_present',
            label: 'Already Present',
            shortLabel: 'Already Present',
            subtext: 'Existing CRM Leads',
            value: fmtNum(pagination.alreadyPresent || 0),
            icon: InboxIcon,
            downloadType: 'already_present',
            color: 'amber',
            iconBox: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            bg: 'bg-gradient-to-b from-[#241a12] to-[#140e08] border-amber-500/25',
            activeRing: 'ring-2 ring-amber-500 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
            tabActive: 'bg-amber-600 text-white shadow-amber-500/30 border-amber-500',
            btnStyle: 'bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border-amber-500/30 hover:border-amber-400/50',
            badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        },
        {
            id: 'fresh',
            label: 'Fresh Lookups',
            shortLabel: 'Fresh Leads',
            subtext: 'Unique New Leads',
            value: fmtNum(pagination.fresh || 0),
            icon: Sparkles,
            downloadType: 'fresh',
            color: 'emerald',
            iconBox: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            bg: 'bg-gradient-to-b from-[#0f241a] to-[#081710] border-emerald-500/25',
            activeRing: 'ring-2 ring-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
            tabActive: 'bg-emerald-600 text-white shadow-emerald-500/30 border-emerald-500',
            btnStyle: 'bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30 hover:border-emerald-400/50',
            badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        },
        {
            id: 'already_downloaded',
            label: 'Already Downloaded',
            shortLabel: 'Downloaded',
            subtext: 'Exported Leads',
            value: fmtNum(pagination.alreadyDownloaded || 0),
            icon: DownloadCloud,
            downloadType: 'already_downloaded',
            color: 'purple',
            iconBox: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            bg: 'bg-gradient-to-b from-[#1f142e] to-[#120a1c] border-purple-500/25',
            activeRing: 'ring-2 ring-purple-500 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.25)]',
            tabActive: 'bg-purple-600 text-white shadow-purple-500/30 border-purple-500',
            btnStyle: 'bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 border-purple-500/30 hover:border-purple-400/50',
            badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        },
    ];

    const activeCard = summaryCards.find(c => c.id === presenceFilter);

    return (
        <div className="space-y-4 w-full pb-10">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500/20 via-purple-500/15 to-blue-500/20 border border-brand-500/30 flex items-center justify-center shadow-md backdrop-blur-md shrink-0">
                        <FileCheck2 className="h-5 w-5 text-brand-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-white tracking-tight">DNC Single Lookups</h1>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Live
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">
                            Real-time lookups from checkdncnumber.com with selective duplicate-free download
                        </p>
                    </div>
                </div>

                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-semibold backdrop-blur-md shadow-sm active:scale-95 disabled:opacity-50 w-fit shrink-0 cursor-pointer"
                >
                    <RefreshCw className={`h-3.5 w-3.5 text-brand-400 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* ── 4 KPI Summary Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {summaryCards.map(c => {
                    const Icon = c.icon;
                    const isActive = (presenceFilter === c.id);
                    const isDownloadingThis = (downloadingType === c.downloadType);

                    return (
                        <div
                            key={c.label}
                            onClick={() => {
                                setPresenceFilter(c.id);
                                setPage(1);
                            }}
                            className={`relative group overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer p-4 backdrop-blur-xl flex flex-col justify-between ${
                                isActive
                                    ? `${c.activeRing} ${c.bg}`
                                    : `${c.bg} hover:border-white/20 hover:scale-[1.01]`
                            }`}
                        >
                            {/* Card Top: Icon & Direct Download Button */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center border shadow-inner ${c.iconBox}`}>
                                    <Icon className="h-4 w-4" />
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleBulkDownload(c.downloadType);
                                    }}
                                    disabled={downloadingType !== null}
                                    title={`Download ${c.label}`}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all duration-150 shadow-sm backdrop-blur-md active:scale-95 disabled:opacity-40 cursor-pointer ${c.btnStyle}`}
                                >
                                    {isDownloadingThis ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Download className="h-3 w-3" />
                                    )}
                                    <span>Download</span>
                                </button>
                            </div>

                            {/* Metric Value */}
                            <div>
                                <span className="text-2xl font-extrabold text-white tracking-tight">
                                    {c.value}
                                </span>
                                <div className="flex items-center justify-between pt-1">
                                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{c.label}</p>
                                    {isActive ? (
                                        <span className="text-[10px] font-bold text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">{c.subtext}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Perfectly Aligned Search & Export Control Center ── */}
            <div className="bg-[#11131e]/90 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-xl p-3.5 space-y-3">
                {/* Row 1: Search + Date Range + Reset */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
                    {/* Search Field */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by phone number..."
                            className="w-full pl-9 pr-8 py-1.5 bg-[#0a0c14] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20 transition-all shadow-inner"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {/* Date Pickers */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 bg-[#0a0c14] border border-white/10 rounded-xl px-2.5 py-1 shadow-inner">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">From:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => { setStartDate(e.target.value); setPage(1); }}
                                className="bg-transparent text-xs text-white outline-none cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#0a0c14] border border-white/10 rounded-xl px-2.5 py-1 shadow-inner">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">To:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => { setEndDate(e.target.value); setPage(1); }}
                                className="bg-transparent text-xs text-white outline-none cursor-pointer"
                            />
                        </div>

                        {hasActiveFilters && (
                            <button
                                onClick={() => {
                                    setStartDate('');
                                    setEndDate('');
                                    setSearch('');
                                    setPresenceFilter('');
                                    setPage(1);
                                }}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all whitespace-nowrap cursor-pointer"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Row 2: Category Selector (Left) + Export Controls (Right) */}
                <div className="pt-2.5 border-t border-white/[0.06] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    {/* Category Switcher Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Category:</span>
                        {summaryCards.map(c => {
                            const isTarget = (presenceFilter === c.id);
                            return (
                                <button
                                    key={c.label}
                                    type="button"
                                    onClick={() => {
                                        setPresenceFilter(c.id);
                                        setPage(1);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                                        isTarget
                                            ? `${c.tabActive} shadow-md`
                                            : 'bg-[#0a0c14] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                                    }`}
                                >
                                    <span>{c.shortLabel}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                        isTarget ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                                    }`}>
                                        {c.value}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Side: Quantity Input + Re-Download Checkbox + Download Button */}
                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        {/* Quantity Input */}
                        <div className="flex items-center gap-1.5 bg-[#0a0c14] border border-white/10 rounded-xl px-2.5 py-1 shadow-inner focus-within:border-brand-500/50">
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Qty:</span>
                            <input
                                type="number"
                                min="1"
                                placeholder="All"
                                value={downloadQuantity}
                                onChange={e => setDownloadQuantity(e.target.value)}
                                className="w-16 bg-transparent text-xs font-mono text-white placeholder:text-slate-500 outline-none"
                            />
                        </div>

                        {/* Re-Download Checkbox */}
                        <label
                            className={`flex items-center gap-2 px-3 py-1 rounded-xl border transition-all cursor-pointer select-none text-xs ${
                                includeDownloaded
                                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                                    : 'bg-[#0a0c14] border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                            }`}
                            title="When enabled, previously exported leads will be re-downloaded. When disabled, already downloaded leads are automatically excluded."
                        >
                            <input
                                type="checkbox"
                                checked={includeDownloaded}
                                onChange={e => setIncludeDownloaded(e.target.checked)}
                                className="rounded bg-black/40 border-white/20 text-purple-500 focus:ring-purple-500/30 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className="font-medium whitespace-nowrap">Include already downloaded</span>
                        </label>

                        {/* Primary Action Button — Strictly Named "Download" */}
                        <button
                            type="button"
                            onClick={() => handleBulkDownload(presenceFilter || 'all')}
                            disabled={downloadingType !== null}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 active:scale-95 cursor-pointer whitespace-nowrap"
                        >
                            {downloadingType === (presenceFilter || 'all') ? (
                                <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    <span>Downloading...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="h-3.5 w-3.5" />
                                    <span>Download</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Records Table ── */}
            <div className="bg-[#11131e]/90 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-xl overflow-hidden">
                {/* Table Header Bar */}
                <div className="px-4 py-3 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <p className="text-xs font-bold text-white uppercase tracking-wider">
                            Single Lookup Records
                        </p>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-slate-400">
                            {loading ? 'Loading…' : `${fmtNum(pagination.total)} records`}
                        </span>
                        {presenceFilter && activeCard && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${activeCard.badgeBg}`}>
                                <span>Filter: {activeCard.label}</span>
                                <button onClick={() => { setPresenceFilter(''); setPage(1); }} className="hover:text-white cursor-pointer">
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                    </div>

                    <div className="text-[11px] text-slate-500 hidden sm:block font-medium">
                        Page {pagination.page} of {Math.max(1, pagination.totalPages)}
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="h-9 w-9 rounded-full border-2 border-brand-500/30 border-t-brand-400 animate-spin" />
                        <p className="text-slate-400 text-xs font-medium tracking-wide">Loading lookup records…</p>
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <AlertCircle className="h-9 w-9 text-red-400" />
                        <p className="text-red-400 font-semibold text-xs">{error}</p>
                        <button onClick={fetchData} className="text-xs text-brand-400 hover:underline cursor-pointer">Retry</button>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && data.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-2.5">
                        <InboxIcon className="h-9 w-9 text-slate-700" />
                        <p className="text-slate-400 font-semibold text-sm">No lookup records found</p>
                        <p className="text-slate-600 text-xs">Try clearing search or date filters</p>
                    </div>
                )}

                {/* Data Table — Responsive without forced horizontal overflow */}
                {!loading && !error && data.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                                    <th className="px-3.5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Phone Number
                                    </th>
                                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        DNC Status
                                    </th>
                                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Line Type
                                    </th>
                                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        CRM Status
                                    </th>
                                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Download Status
                                    </th>
                                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Source / IP
                                    </th>
                                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        Checked At
                                    </th>
                                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">
                                        Export
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {data.map(row => {
                                    const isClean = row.dnc_status === 'Clean';
                                    const isCopied = copiedPhone === row.phone_number;

                                    return (
                                        <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                                            {/* Phone Number */}
                                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-white font-mono font-semibold tracking-wide">
                                                        {row.phone_number}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopy(row.phone_number)}
                                                        className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded hover:bg-white/5 cursor-pointer"
                                                        title="Copy phone number"
                                                    >
                                                        {isCopied ? (
                                                            <Check className="h-3 w-3 text-emerald-400" />
                                                        ) : (
                                                            <Copy className="h-3 w-3" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* DNC Status */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                                    isClean
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isClean ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                                    {row.dnc_status}
                                                </span>
                                            </td>

                                            {/* Line Type */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <span className="text-[11px] text-slate-300 font-medium px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5">
                                                    {row.line_type || '—'}
                                                </span>
                                            </td>

                                            {/* CRM Status */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                {row.is_already_present ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-semibold border border-amber-500/20">
                                                        <InboxIcon className="h-3 w-3" />
                                                        Already Present
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                                                        <Sparkles className="h-3 w-3" />
                                                        Fresh
                                                    </span>
                                                )}
                                            </td>

                                            {/* Download Status */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                {row.is_downloaded ? (
                                                    <span
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-[11px] font-semibold border border-purple-500/30 shadow-sm"
                                                        title={row.downloaded_at ? `Downloaded: ${new Date(row.downloaded_at).toLocaleString()}` : 'Downloaded'}
                                                    >
                                                        <CheckCircle2 className="h-3 w-3 text-purple-400" />
                                                        Downloaded
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.03] text-slate-400 text-[11px] font-medium border border-white/10">
                                                        Not Downloaded
                                                    </span>
                                                )}
                                            </td>

                                            {/* Source / IP */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-300 font-medium truncate max-w-[150px]" title={row.source}>
                                                        {row.source || '—'}
                                                    </span>
                                                    {row.ip_address && (
                                                        <span className="text-[10px] text-slate-500 font-mono tracking-tight" title={`IP: ${row.ip_address}`}>
                                                            {row.ip_address}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Checked At */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-300 font-medium">
                                                        {row.checked_at ? new Date(row.checked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                    </span>
                                                    {row.checked_at && (
                                                        <span className="text-[10px] text-slate-500 font-mono">
                                                            {new Date(row.checked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Export Action */}
                                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                <button
                                                    onClick={() => downloadSingleResult(row)}
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-brand-500/20 border border-transparent hover:border-brand-500/30 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
                                                    title="Download record as CSV"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && !error && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
                        <p className="text-xs text-slate-400">
                            Page <span className="font-semibold text-white">{pagination.page}</span> of <span className="font-semibold text-white">{pagination.totalPages}</span> — <span className="font-semibold text-white">{fmtNum(pagination.total)}</span> total records
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-xs text-white font-mono font-bold px-2">{page}</span>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page >= pagination.totalPages}
                                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Toast Notification ── */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[200] animate-in fade-in slide-in-from-bottom-5">
                    <div className="bg-[#1a1d2e] border border-white/15 rounded-2xl shadow-2xl p-3.5 pr-10 min-w-[280px] flex items-start gap-2.5 relative backdrop-blur-xl">
                        {toast.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                            <p className="text-xs font-semibold text-white">{toast.msg}</p>
                        </div>
                        <button
                            onClick={() => setToast(null)}
                            className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SingleLookups;
