import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FileCheck2, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
    Download, Eye, AlertCircle, InboxIcon, FileText, Shield,
    CheckCircle2, XCircle, Clock, TrendingUp, Users, BarChart3,
    X, ExternalLink, DownloadCloud
} from 'lucide-react';
import { fetchSingleLookups } from '../services/dncChecker.service';

// ── helpers ────────────────────────────────────────────────────────────────
const CAMPAIGNS = ['Medicare', 'ACA', 'FE', 'Home Improvement', 'Solar', 'Hospital Indemnity'];
const STATUSES  = ['completed', 'pending', 'failed', 'processing'];

const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};
const fmtNum = (n) => (n ?? 0).toLocaleString();

const StatusBadge = ({ status }) => {
    const cfg = {
        completed:  { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Completed' },
        pending:    { cls: 'bg-amber-500/15   text-amber-400   border-amber-500/30',   icon: <Clock        className="h-3 w-3" />, label: 'Pending'   },
        processing: { cls: 'bg-blue-500/15    text-blue-400    border-blue-500/30',    icon: <RefreshCw    className="h-3 w-3" />, label: 'Processing'},
        failed:     { cls: 'bg-red-500/15     text-red-400     border-red-500/30',     icon: <XCircle      className="h-3 w-3" />, label: 'Failed'    },
    };
    const s = cfg[status] || { cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: <Clock className="h-3 w-3" />, label: status };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${s.cls}`}>
            {s.icon}{s.label}
        </span>
    );
};

const triggerDownload = (url, onError) => {
    if (!url) {
        if (onError) onError();
        return;
    }
    try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    } catch (error) {
        console.error("Download failed:", error);
        if (onError) onError();
    }
};

// ── Detail Modal ───────────────────────────────────────────────────────────
const DetailModal = ({ job, onClose, onError }) => {
    if (!job) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#1a1d2e] border border-white/10 rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.6)] w-full max-w-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/20 flex items-center justify-center">
                            <FileCheck2 className="h-4 w-4 text-brand-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-[14px]">Job Details</h2>
                            <p className="text-slate-500 text-[11px] truncate max-w-[280px]">{job.original_file_name || job.file_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/8 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { label: 'Total Rows',  value: fmtNum(job.total_rows),  cls: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
                            { label: 'Matched DNC', value: fmtNum(job.matched),     cls: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20'   },
                            { label: 'Clean',       value: fmtNum(job.clean),       cls: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                            { label: 'Invalid',     value: fmtNum(job.invalid),     cls: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
                            { label: 'Duplicates',  value: fmtNum(job.duplicates),  cls: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20' },
                        ].map(c => (
                            <div key={c.label} className={`rounded-xl border p-3.5 ${c.bg}`}>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{c.label}</p>
                                <p className={`text-xl font-bold ${c.cls}`}>{c.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Info rows */}
                    <div className="bg-white/[0.02] rounded-xl border border-white/8 divide-y divide-white/5">
                        {[
                            { label: 'Original File Name', value: job.original_file_name || job.file_name },
                            { label: 'Campaign',           value: job.campaign },
                            { label: 'Source',             value: job.source },
                            { label: 'Status',             value: <StatusBadge status={job.status} /> },
                            { label: 'Checked At',         value: fmtDate(job.checked_at) },
                            { label: 'Created At',         value: fmtDate(job.created_at) },
                        ].map(row => (
                            <div key={row.label} className="flex items-center justify-between px-4 py-3 gap-4">
                                <span className="text-[12px] text-slate-500 shrink-0">{row.label}</span>
                                <span className="text-[13px] text-white font-medium text-right">{row.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Download buttons */}
                    <div className="space-y-2">
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Downloads</p>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => triggerDownload(job.clean_file_url, onError)}
                                disabled={!job.clean_file_url}
                                title={!job.clean_file_url ? "File is not available for this record" : "Download Clean Results"}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[12px] font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <Download className="h-3.5 w-3.5" />Clean Results
                            </button>
                            <button 
                                onClick={() => triggerDownload(job.matched_file_url, onError)}
                                disabled={!job.matched_file_url}
                                title={!job.matched_file_url ? "File is not available for this record" : "Download DNC Matched Results"}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[12px] font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <Download className="h-3.5 w-3.5" />DNC Matched Results
                            </button>
                            <button 
                                onClick={() => triggerDownload(job.report_file_url, onError)}
                                disabled={!job.report_file_url}
                                title={!job.report_file_url ? "File is not available for this record" : "Download Full Report"}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[12px] font-semibold hover:bg-blue-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <ExternalLink className="h-3.5 w-3.5" />Full Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Main Page ──────────────────────────────────────────────────────────────
const SingleLookups = () => {
    useNavigate();
    const [searchParams] = useSearchParams();

    const [data,       setData]       = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [detailJob,  setDetailJob]  = useState(null);
    const [toast,      setToast]      = useState(null);

    // Filters
    const [search,    setSearch]    = useState(searchParams.get('search')   || '');
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [startDate, setStartDate] = useState('');
    const [endDate,   setEndDate]   = useState('');
    const [page,      setPage]      = useState(1);

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(handler);
    }, [search]);

    // Summary totals derived from all data (lazy: we show page-level totals as overview)
    const [summary, setSummary] = useState({ files: 0, rows: 0, matched: 0, clean: 0 });

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchSingleLookups({ page, limit: 20, search: debouncedSearch, startDate, endDate });
            const { data: rows, pagination: pag } = res.data;
            setData(rows);
            setPagination(pag);

            // Derive summary from current page
            const totFiles   = pag.total;
            setSummary({ files: totFiles, rows: 0, matched: 0, clean: 0 });
        } catch (e) {
            setError(e?.response?.data?.message || 'Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);


    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleDownloadError = () => {
        showToast('Unable to download the requested file.', 'error');
    };

    const downloadSingleResult = (row) => {
        const header = "Phone Number,DNC Status,Line Type,Source,Checked At\n";
        const content = `${row.phone_number},${row.dnc_status},${row.line_type || ''},${row.source},${new Date(row.checked_at).toISOString()}\n`;
        const blob = new Blob([header + content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', `dnc_result_${row.phone_number}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const summaryCards = [
        { label: 'Total Lookups', value: fmtNum(summary.files), icon: Search, cls: 'text-blue-400', bg: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/20' },
        { label: 'Already Present', value: fmtNum(pagination.alreadyPresent || 0), icon: InboxIcon, cls: 'text-amber-400', bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20' },
        { label: 'Fresh Lookups', value: fmtNum(pagination.fresh || 0), icon: Search, cls: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20' },
    ];

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/20 flex items-center justify-center shadow-lg">
                        <FileCheck2 className="h-5 w-5 text-brand-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">DNC Single Lookups</h1>
                        <p className="text-slate-500 text-[13px] mt-0.5">All single DNC lookups from checkdncnumber.com</p>
                    </div>
                </div>
                <button onClick={fetchData} disabled={loading}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/8 text-slate-400 hover:text-white hover:border-white/15 transition-all text-[12px] font-medium disabled:opacity-50">
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                {summaryCards.map(c => {
                    const Icon = c.icon;
                    return (
                        <div key={c.label} className={`rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} p-4 flex items-center gap-3`}>
                            <div className={`h-9 w-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0 ${c.cls}`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{c.label}</p>
                                <p className={`text-lg font-bold ${c.cls}`}>{c.value}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="bg-[#13151f] border border-white/[0.06] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filters</span>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by phone number..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.02] border border-white/10 rounded-xl text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-brand-500/50 transition-colors" />
                    </div>

                </div>
                {/* Date range */}
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">From</span>
                        <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
                            className="px-3 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg text-[12px] text-white outline-none focus:border-brand-500/50 transition-colors cursor-text" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">To</span>
                        <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
                            className="px-3 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg text-[12px] text-white outline-none focus:border-brand-500/50 transition-colors cursor-text" />
                    </div>
                </div>
            </div>

            {/* Table / States */}
            <div className="bg-[#13151f] border border-white/[0.06] rounded-2xl overflow-hidden">
                {/* Table header */}
                <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                    <p className="text-[12px] text-slate-500 font-medium">
                        {loading ? 'Loading…' : `${fmtNum(pagination.total)} total records`}
                    </p>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="h-10 w-10 rounded-full border-2 border-brand-500/30 border-t-brand-400 animate-spin" />
                        <p className="text-slate-500 text-sm font-medium">Loading files…</p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <AlertCircle className="h-10 w-10 text-red-400" />
                        <p className="text-red-400 font-semibold text-sm">{error}</p>
                        <button onClick={fetchData} className="text-[12px] text-brand-400 hover:underline">Retry</button>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && data.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <InboxIcon className="h-10 w-10 text-slate-700" />
                        <p className="text-slate-500 font-semibold text-sm">No records found</p>
                        <p className="text-slate-600 text-xs">Try adjusting your filters</p>
                    </div>
                )}

                {/* Table */}
                {!loading && !error && data.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="border-b border-white/[0.05]">
                                    {['Phone Number', 'DNC Status', 'Line Type', 'Source', 'IP Address', 'Checked At'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {data.map(row => (
                                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3 max-w-[180px]">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] text-white font-medium">{row.phone_number}</p>
                                                <button onClick={() => downloadSingleResult(row)} className="text-slate-400 hover:text-brand-400 transition-colors" title="Download Result">
                                                    <Download className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`text-[12px] font-semibold ${row.dnc_status === 'Clean' ? 'text-emerald-400' : 'text-red-400'}`}>{row.dnc_status}</span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-[12px] text-slate-300 font-medium">{row.line_type || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[13px] text-slate-300 font-medium">
                                            {row.source}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[12px] text-slate-400 font-mono">
                                            {row.ip_address || '—'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[12px] text-slate-400">{fmtDate(row.checked_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && !error && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.06]">
                        <p className="text-[12px] text-slate-500">
                            Page {pagination.page} of {pagination.totalPages} — {fmtNum(pagination.total)} total
                        </p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-2 rounded-lg bg-white/[0.04] border border-white/8 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-[12px] text-white font-medium px-2">{page}</span>
                            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
                                className="p-2 rounded-lg bg-white/[0.04] border border-white/8 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {detailJob && <DetailModal job={detailJob} onClose={() => setDetailJob(null)} onError={handleDownloadError} />}
            
            {/* Minimalist Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[200] animate-in fade-in slide-in-from-bottom-5">
                    <div className="bg-[#1a1d2e] border border-white/10 rounded-xl shadow-2xl p-4 pr-12 min-w-[300px] flex items-start gap-3 relative">
                        {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                        <div className="mt-0.5">
                            <p className="text-sm font-medium text-white">{toast.msg}</p>
                        </div>
                        <button onClick={() => setToast(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SingleLookups;
