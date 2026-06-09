import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { History, RefreshCw, FileDown, AlertCircle, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const downloadBlob = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const fmtDate = (d) =>
    d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const ScrubBadge = ({ status }) => {
    if (status === 'pending') return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-bold">
            <Clock className="h-3 w-3" /> Pending
        </span>
    );
    if (status === 'failed') return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-300 text-[11px] font-bold">
            <XCircle className="h-3 w-3" /> Failed
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[11px] font-bold">
            <CheckCircle2 className="h-3 w-3" /> Scrubbed
        </span>
    );
};

// Inline download panel — shows after fetching payload for a row
const DownloadPanel = ({ rowId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [payload, setPayload] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/refine-download/logs/${rowId}/file`)
            .then(res => setPayload(res.data))
            .catch(err => setError(err.response?.data?.message || 'Failed to load file data'))
            .finally(() => setLoading(false));
    }, [rowId]);

    const downloadGood = () => {
        if (!payload?.goodCsv) return;
        const name = payload.summary?.fileName || `download_${rowId}.csv`;
        downloadBlob(payload.goodCsv, name);
    };

    const downloadBad = () => {
        if (!payload?.badCsv || !String(payload.badCsv).trim()) return;
        const base = payload.summary?.fileName || `download_${rowId}.csv`;
        downloadBlob(payload.badCsv, base.replace(/\.csv$/i, '_bad_dnc.csv'));
    };

    const downloadAll = () => {
        const base = payload?.summary?.fileName || `download_${rowId}.csv`;
        const allName = base.replace(/\.csv$/i, '_all.csv');
        let merged = '';
        if (payload?.goodCsv && payload?.badCsv && String(payload.badCsv).trim()) {
            const goodLines = String(payload.goodCsv).trim().split('\n');
            const badLines = String(payload.badCsv).trim().split('\n').slice(1);
            merged = [...goodLines, ...badLines].join('\n');
        } else {
            merged = payload?.goodCsv || payload?.badCsv || '';
        }
        downloadBlob(merged, allName);
    };

    if (loading) return (
        <div className="flex items-center gap-2 py-3 px-4 text-xs text-brand-400 animate-pulse">
            <div className="h-3.5 w-3.5 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin" />
            Loading file data...
        </div>
    );
    if (error) return (
        <div className="py-2 px-4 text-xs text-red-400 flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white text-[10px] underline">Close</button>
        </div>
    );

    const goodCount = payload?.summary?.good;
    const badTotal = (payload?.summary?.blacklist || 0) + (payload?.summary?.stateDnc || 0) +
        (payload?.summary?.federalDnc || 0) + (payload?.summary?.badPhone || 0);
    const totalCount = payload?.summary?.total;
    const hasBad = badTotal > 0 && payload?.badCsv && String(payload.badCsv).trim();

    return (
        <div className="bg-[#0a0c14]/80 border border-white/5 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Choose Download</span>
                <button onClick={onClose} className="text-slate-600 hover:text-white text-[10px] underline">Close</button>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
                {payload?.goodCsv && (
                    <button onClick={downloadGood}
                        className="flex items-center justify-between gap-2 px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold text-xs transition-all">
                        <span className="flex items-center gap-2"><FileDown className="h-3.5 w-3.5" /> Good Leads Only</span>
                        <span className="bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono">{goodCount?.toLocaleString() ?? '—'}</span>
                    </button>
                )}
                {hasBad && (
                    <button onClick={downloadBad}
                        className="flex items-center justify-between gap-2 px-3 py-2.5 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 rounded-xl text-red-400 font-bold text-xs transition-all">
                        <span className="flex items-center gap-2"><FileDown className="h-3.5 w-3.5" /> Bad / DNC Leads Only</span>
                        <span className="bg-red-500/20 px-2 py-0.5 rounded-full font-mono">{badTotal.toLocaleString()}</span>
                    </button>
                )}
                <button onClick={downloadAll}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 bg-brand-500/10 hover:bg-brand-500/15 border border-brand-500/20 rounded-xl text-brand-400 font-bold text-xs transition-all">
                    <span className="flex items-center gap-2"><FileDown className="h-3.5 w-3.5" /> Full File (Good + Bad)</span>
                    <span className="bg-brand-500/20 px-2 py-0.5 rounded-full font-mono">{totalCount?.toLocaleString() ?? '—'}</span>
                </button>
            </div>
        </div>
    );
};

const RefineAlreadyDownloaded = () => {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Fixed URL: was /refine-already-downloaded, correct is /already-downloaded
            const res = await api.get('/refine-download/already-downloaded/list?limit=500');
            setRows(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load download history');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchList(); }, [fetchList]);

    const toggleExpand = (rowId) => {
        setExpandedId(prev => prev === rowId ? null : rowId);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#120a2e] via-[#0d0a1c] to-[#0a0714] border border-white/5 p-7 shadow-2xl">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-500/10 rounded-full blur-[80px] pointer-events-none opacity-40 translate-x-1/3 -translate-y-1/3" />
                <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-400/20 to-violet-600/20 border border-white/10 flex items-center justify-center shadow-xl">
                            <History className="h-7 w-7 text-brand-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Already Downloaded</h1>
                            <p className="text-slate-400 text-sm mt-0.5">Re-download any previous export as Good only, Bad/DNC only, or the full file.</p>
                        </div>
                    </div>
                    <button type="button" onClick={fetchList}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl text-slate-300 hover:text-white text-sm font-bold transition-all">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                </div>
            )}

            <div className="bg-[#13151e] rounded-2xl border border-white/[0.06] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[1000px]">
                        <thead className="bg-[#0a0a0f]/90 text-slate-400 text-[11px] font-bold uppercase tracking-widest border-b border-white/[0.06]">
                            <tr>
                                <th className="p-4 w-12">#</th>
                                <th className="p-4">Downloaded By</th>
                                <th className="p-4">Vendor</th>
                                <th className="p-4">File Name</th>
                                <th className="p-4 text-center">Scrub</th>
                                <th className="p-4 text-center">Good</th>
                                <th className="p-4 text-center">DNC Removed</th>
                                <th className="p-4">States</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 text-center">Download</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04] text-slate-200">
                            {loading ? (
                                <tr><td colSpan={10} className="p-12 text-center text-brand-400 animate-pulse">Loading...</td></tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center">
                                                <History className="h-6 w-6 text-slate-600" />
                                            </div>
                                            <p className="text-slate-500 font-semibold">No download history yet</p>
                                            <p className="text-slate-600 text-xs">Export leads from the Download page to see them here.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : rows.map((row, index) => (
                                <React.Fragment key={row.id}>
                                    <tr className={`hover:bg-white/[0.02] transition-colors ${expandedId === row.id ? 'bg-brand-500/5 border-l-2 border-brand-500/40' : ''}`}>
                                        <td className="p-4 font-mono text-slate-500 font-bold text-xs">{index + 1}</td>
                                        <td className="p-4 font-semibold text-white">{row.downloaded_by}</td>
                                        <td className="p-4 text-white font-medium">{row.vendor_name}</td>
                                        <td className="p-4 max-w-[180px]">
                                            <div className="font-mono text-xs text-brand-300 truncate" title={row.file_name}>
                                                {row.file_name}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <ScrubBadge status={row.scrub_status} />
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-emerald-400 font-bold font-mono">{row.clean_count?.toLocaleString()}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`font-bold font-mono ${row.dnc_removed > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                                                {row.dnc_removed?.toLocaleString() || 0}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-slate-400">{row.states_label}</td>
                                        <td className="p-4 text-xs text-slate-400 whitespace-nowrap">{fmtDate(row.download_date)}</td>
                                        <td className="p-4 text-center">
                                            {row.can_redownload ? (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpand(row.id)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                                        expandedId === row.id
                                                            ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                                                            : 'bg-brand-500/10 hover:bg-brand-500/20 border-brand-500/20 text-brand-400'
                                                    }`}
                                                >
                                                    <FileDown className="h-3.5 w-3.5" />
                                                    Download
                                                    {expandedId === row.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                </button>
                                            ) : (
                                                <span className="text-slate-600 text-xs italic">Not available</span>
                                            )}
                                        </td>
                                    </tr>
                                    {/* Expanded download panel */}
                                    {expandedId === row.id && (
                                        <tr className="bg-brand-500/5">
                                            <td colSpan={10} className="px-6 pb-4 pt-2">
                                                <DownloadPanel
                                                    rowId={row.id}
                                                    onClose={() => setExpandedId(null)}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!loading && rows.length > 0 && (
                    <div className="px-5 py-3 border-t border-white/[0.05] text-xs text-slate-500">
                        Showing <span className="text-white font-semibold">{rows.length}</span> of <span className="text-white font-semibold">{total}</span> downloads
                    </div>
                )}
            </div>
        </div>
    );
};

export default RefineAlreadyDownloaded;
