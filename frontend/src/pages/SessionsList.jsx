import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Database, Search, Calendar, ChevronLeft, ChevronRight, ListFilter, AlertTriangle, Trash2, X, Activity, FileText, Files } from 'lucide-react';

const SessionsList = () => {
    const [sessions, setSessions] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Custom Delete Modal State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, isDeleting: false });

    // Files Viewer Modal State
    const [filesModal, setFilesModal] = useState({ isOpen: false, files: [], sessionId: null });
    
    const limit = 20;

    const fetchSessions = async (pageToFetch = 1) => {
        setLoading(true);
        try {
            const from = fromDate ? new Date(fromDate).toISOString() : '';
            const to = toDate ? new Date(`${toDate}T23:59:59`).toISOString() : '';
            const res = await api.get(
                `/sessions?page=${pageToFetch}&limit=${limit}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
            );
            setSessions(res.data.data);
            setTotal(res.data.total);
            setPage(res.data.page);
        } catch (err) {
            console.error('Failed to fetch sessions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const totalPages = Math.ceil(total / limit) || 1;

    const formatDateTime = (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatShortId = (id) => {
        if (!id) return '';
        return String(id).slice(0, 8);
    };

    const confirmDelete = (id) => {
        setDeleteModal({ isOpen: true, id, isDeleting: false });
    };

    const cancelDelete = () => {
        setDeleteModal({ isOpen: false, id: null, isDeleting: false });
    };

    const executeDelete = async () => {
        if (!deleteModal.id) return;
        setDeleteModal(prev => ({ ...prev, isDeleting: true }));
        try {
            await api.delete(`/sessions/${deleteModal.id}`);
            fetchSessions(page);
            setDeleteModal({ isOpen: false, id: null, isDeleting: false });
        } catch (err) {
            console.error('Failed to delete session', err);
            setDeleteModal(prev => ({ ...prev, isDeleting: false }));
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 font-sans pb-12 relative">
            
            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelDelete}></div>
                    <div className="bg-[#1e1e2d] border border-white/10 rounded-2xl w-full max-w-md relative z-10 overflow-hidden shadow-2xl animate-fade-in scale-in">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Delete Session?</h3>
                            <p className="text-slate-400 text-[14px] leading-relaxed">
                                Are you sure you want to delete session <span className="font-mono text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">{formatShortId(deleteModal.id)}</span>? 
                                <br/><span className="text-red-400 font-medium">This action will also permanently delete all its associated jobs.</span>
                            </p>
                        </div>
                        <div className="bg-black/20 p-4 border-t border-white/5 flex items-center justify-end gap-3">
                            <button
                                disabled={deleteModal.isDeleting}
                                onClick={cancelDelete}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={deleteModal.isDeleting}
                                onClick={executeDelete}
                                className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all flex items-center gap-2 group disabled:opacity-50"
                            >
                                {deleteModal.isDeleting ? (
                                    <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                )}
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Files Viewer Modal */}
            {filesModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setFilesModal({ isOpen: false, files: [], sessionId: null })}></div>
                    <div className="bg-[#1e1e2d] border border-white/10 rounded-2xl w-full max-w-lg relative z-10 overflow-hidden shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/8">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center">
                                    <Files className="w-4 h-4 text-brand-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-[15px] tracking-tight">Uploaded Files</h3>
                                    <p className="text-slate-500 text-[11px] font-mono mt-0.5">Session: {formatShortId(filesModal.sessionId)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="bg-brand-500/15 border border-brand-500/25 text-brand-300 text-[11px] font-bold px-2.5 py-1 rounded-lg font-mono">
                                    {filesModal.files.length} {filesModal.files.length === 1 ? 'file' : 'files'}
                                </span>
                                <button
                                    onClick={() => setFilesModal({ isOpen: false, files: [], sessionId: null })}
                                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Files List */}
                        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
                            {filesModal.files.map((fileName, idx) => {
                                const ext = fileName.split('.').pop().toUpperCase();
                                const isExcel = ['XLS', 'XLSX'].includes(ext);
                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 bg-[#0a0a0f] border border-white/5 rounded-xl px-4 py-3 hover:border-brand-500/30 hover:bg-brand-500/5 transition-all group"
                                    >
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] border ${
                                            isExcel
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                                        }`}>
                                            {ext}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-[13px] font-medium truncate group-hover:text-brand-300 transition-colors" title={fileName}>
                                                {fileName}
                                            </p>
                                            <p className="text-slate-600 text-[11px] mt-0.5 font-mono">File #{idx + 1}</p>
                                        </div>
                                        <FileText className="w-4 h-4 text-slate-600 group-hover:text-brand-400 transition-colors shrink-0" />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-4 py-3 border-t border-white/5 bg-black/20 flex justify-end">
                            <button
                                onClick={() => setFilesModal({ isOpen: false, files: [], sessionId: null })}
                                className="px-5 py-2 rounded-xl text-[13px] font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 gap-6 border-b border-white/5 pb-6">
                <div className="shrink-0">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <div className="p-2.5 bg-brand-500/10 rounded-xl border border-brand-500/20">
                            <Activity className="w-7 h-7 text-brand-400" />
                        </div>
                        Session Monitoring
                    </h1>
                    <p className="text-slate-400 text-sm mt-3 font-medium flex items-center gap-2">
                        Track all data upload processing sessions. 
                        <span className="inline-flex items-center justify-center bg-brand-500/10 text-brand-300 border border-brand-500/20 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono">
                            {total.toLocaleString()} total
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end">
                    
                    {/* Date Range Filters */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-[#13151f] border border-white/10 rounded-xl px-4 py-1.5 w-full sm:w-auto shadow-inner hover:border-white/20 transition-colors">
                        <Calendar className="w-4 h-4 text-slate-500 hidden sm:block shrink-0" />
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="bg-transparent border-none text-slate-300 text-[12px] outline-none font-medium custom-date-input w-full sm:w-auto flex-1 py-1"
                        />
                        <span className="text-slate-500 text-[10px] font-black uppercase shrink-0 px-1">TO</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="bg-transparent border-none text-slate-300 text-[12px] outline-none font-medium custom-date-input w-full sm:w-auto flex-1 py-1"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative group w-full sm:w-auto flex-1 sm:flex-none min-w-[140px] max-w-full sm:max-w-[200px]">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-brand-400">
                            <ListFilter className="w-4 h-4" />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={`bg-[#13151f] border hover:border-brand-500/50 rounded-xl py-2 pl-10 pr-10 outline-none cursor-pointer transition-all w-full text-[13px] font-medium appearance-none shadow-inner focus:ring-2 focus:ring-brand-500/30 ${statusFilter !== 'All' ? 'text-brand-400 border-brand-500/40 bg-brand-500/5' : 'text-slate-300 border-white/10'}`}
                        >
                            {['All', 'Pending', 'Processing', 'Completed', 'Failed'].map((s) => (
                                <option key={s} value={s} className="bg-[#1e1e2d] text-white">{s}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 group-hover:text-brand-400">
                            <ChevronDownIcon className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Search Field & Button */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto flex-1">
                        <div className="flex items-center bg-[#13151f] border border-white/10 hover:border-brand-500/50 rounded-xl px-4 py-2 w-full lg:w-64 transition-all focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500 group shadow-inner">
                            <Search className="w-4 h-4 text-slate-500 group-focus-within:text-brand-400 transition-colors shrink-0" />
                            <input
                                type="text"
                                placeholder="Search by vendor, ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') fetchSessions(1);
                                }}
                                className="bg-transparent border-none text-white text-[13px] outline-none w-full ml-2 placeholder:text-slate-500 font-medium"
                            />
                            {search && (
                                <button onClick={() => {setSearch(''); fetchSessions(1);}} className="text-slate-500 hover:text-white transition-colors shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => fetchSessions(1)}
                            className="bg-brand-500 hover:bg-brand-400 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-95 text-[13px] w-full sm:w-auto shrink-0"
                        >
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-[#13151f] rounded-3xl border border-white/5 shadow-2xl relative">
                
                <div className="w-full overflow-x-auto custom-scrollbar rounded-3xl">
                    <div className="min-w-[1500px]">
                        {/* Table Header */}
                        <div className="grid grid-cols-[160px_100px_160px_160px_200px_140px_150px_150px_130px_180px_170px] p-4 items-center border-b border-white/10 bg-black/20 text-[11px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 backdrop-blur-xl z-20">
                            <div className="pl-4">Session ID</div>
                            <div>Jobs</div>
                            <div>Vendor</div>
                            <div>Campaign</div>
                            <div>Uploaded File</div>
                            <div>Created By</div>
                            <div>Start Time</div>
                            <div>End Time</div>
                            <div>Status</div>
                            <div>Progress Overview</div>
                            <div className="text-right pr-4">Actions</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-white/5">
                            {loading ? (
                                <div className="p-20 text-center flex flex-col items-center justify-center gap-4 text-brand-400">
                                    <span className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></span>
                                    <span className="font-medium text-sm tracking-widest uppercase animate-pulse">Loading Sessions...</span>
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="p-24 text-center text-slate-500 flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                        <Database className="w-8 h-8 opacity-40 text-slate-400" />
                                    </div>
                                    <p className="font-medium text-lg text-slate-300 mb-1 tracking-tight">No sessions found</p>
                                    <p className="text-sm">We couldn't find anything matching your filters.</p>
                                </div>
                            ) : (
                                sessions.map((s) => {
                                    const processed = parseInt(s.processed_rows || 0, 10);
                                    const totalRows = parseInt(s.total_rows || 0, 10);
                                    const progress = totalRows > 0 ? Math.round((processed / totalRows) * 100) : 0;
                                    const status = s.status || 'Pending';
                                    const totalJobs = parseInt(s.total_jobs || 0, 10);

                                    return (
                                        <div key={s.id} className="grid grid-cols-[160px_100px_160px_160px_200px_140px_150px_150px_130px_180px_170px] p-3 items-center hover:bg-white/[0.02] transition-colors group">
                                            
                                            {/* Session ID */}
                                            <div className="pl-4">
                                                <span className="text-slate-400 font-mono text-[12px] bg-black/30 border border-white/5 px-2.5 py-1 rounded shadow-sm group-hover:text-brand-300 transition-colors" title={s.id}>
                                                    {formatShortId(s.id)}
                                                </span>
                                            </div>
                                            
                                            {/* Jobs */}
                                            <div className="text-slate-300 font-mono text-[13px] font-bold">
                                                <span className="bg-white/5 px-2.5 py-1 rounded-md text-slate-300 font-medium text-xs border border-white/5">{totalJobs}</span>
                                            </div>
                                            
                                            {/* Vendor */}
                                            <div className="text-white font-semibold text-[13px] pr-2 group-hover:text-brand-300 transition-colors line-clamp-1">
                                                {s.vendor_name || '—'}
                                            </div>
                                            
                                            {/* Campaign */}
                                            <div className="text-slate-300 text-[13px] pr-2 font-medium line-clamp-1">
                                                {s.campaign_type || '—'}
                                            </div>
                                            
                                            {/* Uploaded File */}
                                            <div className="text-slate-300 text-[13px] pr-2 font-medium">
                                                {s.uploaded_files && s.uploaded_files.length > 0 
                                                    ? (
                                                        <button
                                                            onClick={() => setFilesModal({ isOpen: true, files: s.uploaded_files, sessionId: s.id })}
                                                            className="flex items-center gap-1.5 group cursor-pointer hover:text-brand-300 transition-colors text-left"
                                                            title={`Click to view all ${s.uploaded_files.length} file(s)`}
                                                        >
                                                            <FileText className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400 shrink-0 transition-colors" />
                                                            <span className="truncate max-w-[120px]">{s.uploaded_files[0]}</span>
                                                            {s.uploaded_files.length > 1 && (
                                                                <span className="text-[10px] bg-brand-500/15 border border-brand-500/25 px-1.5 py-0.5 rounded text-brand-400 font-bold shrink-0">
                                                                    +{s.uploaded_files.length - 1}
                                                                </span>
                                                            )}
                                                        </button>
                                                    ) 
                                                    : <span className="text-slate-600">—</span>}
                                            </div>
                                            
                                            {/* Created By */}
                                            <div className="flex items-center gap-2 text-slate-400 text-[13px]">
                                                <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-[10px] uppercase">
                                                    {(s.created_by_username?.[0] || 'U')}
                                                </div>
                                                <span className="truncate max-w-[90px]">{s.created_by_username || '—'}</span>
                                            </div>
                                            
                                            {/* Start Time */}
                                            <div className="text-slate-400 text-[12px] font-medium leading-tight">
                                                {formatDateTime(s.created_at)}
                                            </div>
                                            
                                            {/* End Time */}
                                            <div className="text-slate-500 text-[12px] font-medium leading-tight italic">
                                                {formatDateTime(s.end_time)}
                                            </div>
                                            
                                            {/* Status */}
                                            <div>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                                                    status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    status === 'Processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.15)] animate-pulse' :
                                                    status === 'Failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    'bg-white/5 text-slate-400 border-white/10'
                                                }`}>
                                                    {status === 'Processing' ? (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                    ) : status === 'Completed' ? (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                    ) : status === 'Failed' ? (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                    ) : (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                    )}
                                                    {status}
                                                </span>
                                            </div>
                                            
                                            {/* Progress */}
                                            <div className="pr-6 w-[160px]">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className="text-[10px] text-slate-400 font-mono font-medium">{processed.toLocaleString()} / <span className="text-slate-300">{totalRows.toLocaleString()}</span></span>
                                                    <span className={`text-[10px] font-bold font-mono ${status === 'Completed' ? 'text-emerald-400' : 'text-brand-400'}`}>{progress}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-700 ease-in-out ${
                                                            status === 'Completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                            status === 'Failed' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                                            'bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                                                        }`}
                                                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="flex items-center justify-end gap-2 pr-4">
                                                <Link
                                                    to={`/sessions/${s.id}`}
                                                    className="bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all flex items-center gap-1.5 active:scale-95"
                                                >
                                                    View
                                                </Link>
                                                <button
                                                    onClick={() => confirmDelete(s.id)}
                                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 flex items-center justify-center p-2"
                                                    title="Delete Session"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-white/5 flex items-center justify-between bg-black/20 rounded-b-3xl">
                    <span className="text-slate-500 text-[12px] font-medium tracking-wide">
                        Showing <span className="text-white font-mono">{total === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, total)}</span> of <span className="text-white font-mono">{total}</span>
                    </span>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchSessions(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-2 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        <span className="text-slate-400 text-[12px] font-medium px-2">
                            Page <span className="text-white font-bold">{page}</span> of {totalPages}
                        </span>

                        <button
                            onClick={() => fetchSessions(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages || totalPages === 0}
                            className="bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-2 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Extracted small icon since Lucide lacks an exact ChevronDown we want to drop in directly
const ChevronDownIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
);

export default SessionsList;
