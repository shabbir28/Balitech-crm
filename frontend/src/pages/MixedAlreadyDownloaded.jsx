import React, { useState, useEffect } from 'react';
import { Download, Calendar, Search, RefreshCw, FileDown, ShieldBan, MapPin, Hash, Building2, User, FileText, ChevronLeft, ChevronRight, Layers, Percent } from 'lucide-react';
import api from '../services/api';

const downloadBlob = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const MixedAlreadyDownloaded = () => {
    const [downloads, setDownloads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [limit, setLimit] = useState(25);

    const fetchDownloads = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/mixed-download/already-downloaded?page=${page}&limit=${limit}`);
            setDownloads(res.data.data || []);
            setTotalRecords(res.data.total || 0);
        } catch (err) {
            console.error('Failed to fetch downloads:', err);
            setError('Failed to load download history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDownloads();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit]);

    const handleReDownload = async (log) => {
        setDownloadingId(log.id);
        setError('');
        try {
            const res = await api.get(`/mixed-download/logs/${log.id}/file`);
            const data = res.data;
            const csvContent = data.csv || data.goodCsv;
            if (data && csvContent) {
                downloadBlob(csvContent, data.summary?.fileName || data.fileName || log.file_name || `mixed_leads_${log.id}.csv`);
            } else {
                setError('File data not found or expired.');
            }
        } catch (err) {
            console.error('Redownload error:', err);
            setError(err.response?.data?.message || 'Failed to download file.');
        } finally {
            setDownloadingId(null);
        }
    };

    const filtered = downloads.filter(d => {
        const term = searchTerm.toLowerCase();
        return (d.downloaded_by?.toLowerCase().includes(term) ||
                d.file_name?.toLowerCase().includes(term));
    });

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return (
        <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#120a2e] via-[#0d0a1c] to-[#0a0714] border border-white/5 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-500/10 rounded-full blur-[80px] pointer-events-none -translate-x-1/2 translate-y-1/2" />
                
                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-violet-500/20 rounded-2xl blur-xl group-hover:bg-violet-500/30 transition-all duration-500" />
                            <div className="relative h-16 w-16 bg-[#0a0c14] border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-all duration-300">
                                <HistoryIcon className="h-7 w-7 text-violet-400" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60 tracking-tight">
                                Mixed Already Downloaded
                            </h1>
                            <p className="text-sm text-slate-400 mt-2 font-medium max-w-xl leading-relaxed">
                                View and re-download previously exported mixed data files.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
                    <ShieldBan className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-red-300">Error</h4>
                        <p className="text-xs text-red-200/80 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#13151f] p-4 rounded-2xl border border-white/[0.05]">
                <div className="relative w-full sm:w-80 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by user or file..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all text-sm shadow-inner placeholder:text-slate-600"
                    />
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Show</span>
                        <select 
                            value={limit} 
                            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                            className="bg-transparent text-white focus:outline-none cursor-pointer font-medium"
                        >
                            <option value={25} className="bg-[#13151f]">25</option>
                            <option value={50} className="bg-[#13151f]">50</option>
                            <option value={100} className="bg-[#13151f]">100</option>
                            <option value={200} className="bg-[#13151f]">200</option>
                        </select>
                    </div>
                    
                    <button 
                        onClick={() => fetchDownloads()} 
                        disabled={loading}
                        className="p-2.5 bg-black/20 hover:bg-black/40 border border-white/10 hover:border-violet-500/30 rounded-xl text-slate-400 hover:text-violet-400 transition-all disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-[#13151f] border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-black/20 border-b border-white/10">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Mix Split (%)</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Quantity</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">States</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading && downloads.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCw className="h-8 w-8 text-violet-500/50 animate-spin" />
                                            <p className="text-sm font-medium text-slate-400">Loading history...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <FileText className="h-10 w-10 text-slate-700" />
                                            <p className="text-sm font-medium text-slate-500">No download history found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/[0.015] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-lg bg-black/20 border border-white/5 flex items-center justify-center shrink-0">
                                                    <Calendar className="h-4 w-4 text-slate-400 group-hover:text-violet-400 transition-colors" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">
                                                        {new Date(log.download_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-medium">
                                                        {new Date(log.download_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-slate-500" />
                                                <span className="text-sm text-slate-300 font-medium">{log.downloaded_by}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-12 text-slate-500">Van:</span>
                                                    <span className="font-mono text-violet-300 font-bold">{log.van_percentage}%</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-12 text-slate-500">Refine:</span>
                                                    <span className="font-mono text-teal-300 font-bold">{log.refine_percentage}%</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-12 text-slate-500">Premium:</span>
                                                    <span className="font-mono text-amber-300 font-bold">{log.premium_percentage}%</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2 py-1 w-max mx-auto">
                                                <Hash className="h-3 w-3 text-slate-400" />
                                                <span className="text-sm font-mono font-bold text-slate-200">
                                                    {log.quantity?.toLocaleString() || 0}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                                {!log.states || log.states.length === 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-400 text-[10px] font-bold border border-slate-500/20">
                                                        ALL STATES
                                                    </span>
                                                ) : (
                                                    log.states.slice(0, 3).map(st => (
                                                        <span key={st} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 text-[10px] font-bold border border-violet-500/20">
                                                            {st}
                                                        </span>
                                                    ))
                                                )}
                                                {log.states && log.states.length > 3 && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-slate-400 text-[10px] font-bold border border-white/10">
                                                        +{log.states.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {log.can_redownload ? (
                                                <button
                                                    onClick={() => handleReDownload(log)}
                                                    disabled={downloadingId === log.id}
                                                    className="inline-flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                                >
                                                    {downloadingId === log.id ? (
                                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <FileDown className="h-3.5 w-3.5" />
                                                    )}
                                                    CSV
                                                </button>
                                            ) : (
                                                <span className="text-[10px] font-medium text-slate-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                                    Expired
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalRecords > 0 && (
                    <div className="border-t border-white/5 bg-[#161824] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-slate-500 font-medium">
                            Showing <span className="text-white">{(page - 1) * limit + 1}</span> to <span className="text-white">{Math.min(page * limit, totalRecords)}</span> of <span className="text-white">{totalRecords}</span> entries
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg border border-white/10 bg-black/20 text-slate-400 hover:text-white hover:border-violet-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white min-w-[1.5rem] text-center">{page}</span>
                                <span className="text-xs text-slate-500">/</span>
                                <span className="text-xs font-bold text-slate-500 min-w-[1.5rem] text-center">{totalPages}</span>
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg border border-white/10 bg-black/20 text-slate-400 hover:text-white hover:border-violet-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Quick missing icon polyfill
const HistoryIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M12 7v5l4 2"/>
    </svg>
);

export default MixedAlreadyDownloaded;
