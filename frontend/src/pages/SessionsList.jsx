import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Database, Search, Calendar, UserCircle, ChevronLeft, ChevronRight, ListFilter, PlayCircle } from 'lucide-react';

const SessionsList = () => {
    const [sessions, setSessions] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [loading, setLoading] = useState(true);
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
        return new Date(value).toLocaleString();
    };

    const formatShortId = (id) => {
        if (!id) return '';
        return String(id).slice(0, 8);
    };

    const handleDelete = async (id) => {
        const ok = window.confirm('Delete this session? This will also delete its jobs.');
        if (!ok) return;
        try {
            await api.delete(`/sessions/${id}`);
            fetchSessions(1);
        } catch (err) {
            console.error('Failed to delete session', err);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 font-sans pb-12">
            
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 flex-wrap gap-6 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Database className="w-8 h-8 text-brand-400" /> Session List
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 font-medium">
                        Monitor all upload sessions and their processing status. <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded-md ml-1 border border-white/10">{total.toLocaleString()} total</span>
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full xl:w-auto">
                    
                    {/* Date Range Filters */}
                    <div className="flex items-center gap-3 bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2 w-full lg:w-auto shadow-inner">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="bg-transparent border-none text-slate-300 text-[12px] outline-none font-medium custom-date-input"
                        />
                        <span className="text-slate-600 text-xs font-bold uppercase">to</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="bg-transparent border-none text-slate-300 text-[12px] outline-none font-medium custom-date-input"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative group w-full lg:w-auto">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-brand-400">
                            <ListFilter className="w-4 h-4" />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={`bg-[#0a0a0f] border border-white/10 hover:border-brand-500/50 rounded-xl py-2.5 pl-10 pr-10 outline-none cursor-pointer transition-all appearance-none text-[13px] font-medium w-full shadow-inner focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 ${statusFilter !== 'All' ? 'text-brand-400 border-brand-500/30' : 'text-slate-400'}`}
                        >
                            {['All', 'Pending', 'Processing', 'Completed', 'Failed'].map((s) => (
                                <option key={s} value={s} className="bg-[#1e1e2d] text-white py-2">{s}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 group-hover:text-brand-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                    {/* Search Field & Button */}
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center bg-[#0a0a0f] border border-white/10 hover:border-brand-500/50 rounded-xl px-4 py-2.5 w-full sm:w-64 transition-all focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 group shadow-inner">
                            <Search className="w-4 h-4 text-slate-500 group-focus-within:text-brand-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by vendor, ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') fetchSessions(1);
                                }}
                                className="bg-transparent border-none text-white text-[13px] outline-none w-full ml-3 placeholder:text-slate-600 font-medium"
                            />
                        </div>
                        <button
                            onClick={() => fetchSessions(1)}
                            className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_4px_14px_rgba(59,130,246,0.3)] active:scale-[0.98] text-[13px] whitespace-nowrap"
                        >
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-[#1e1e2d] rounded-[2rem] border border-white/5 overflow-x-auto shadow-2xl relative">
                {/* Decorative glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

                <div className="min-w-[1250px] relative z-10">
                    {/* Table Header */}
                    <div className="grid grid-cols-[200px_130px_160px_160px_140px_140px_140px_130px_160px_160px] p-5 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0">
                        {['Session ID', 'Total Jobs', 'Vendor Name', 'Campaign', 'Created By', 'Start Time', 'End Time', 'Status', 'Processed / Total', 'Action'].map((h) => (
                            <span key={h} className="text-slate-400 text-[11px] font-bold uppercase tracking-widest pl-2">
                                {h}
                            </span>
                        ))}
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-white/5">
                        {loading ? (
                            <div className="p-16 text-center text-brand-400 animate-pulse font-medium tracking-widest uppercase text-sm">Loading sessions...</div>
                        ) : sessions.length === 0 ? (
                            <div className="p-16 text-center text-slate-500">
                                <Database className="w-12 h-12 mb-4 opacity-20 mx-auto" strokeWidth={1.5} />
                                <p className="font-medium text-[15px] mb-2 text-slate-400">No sessions found</p>
                                <p className="text-xs">Try adjusting your filters or create a new session.</p>
                            </div>
                        ) : (
                            sessions.map((s) => {
                                const processed = parseInt(s.processed_rows || 0, 10);
                                const totalRows = parseInt(s.total_rows || 0, 10);
                                const progress = totalRows > 0 ? Math.round((processed / totalRows) * 100) : 0;
                                const status = s.status || 'Pending';
                                const totalJobs = parseInt(s.total_jobs || 0, 10);

                                return (
                                    <div key={s.id} className="grid grid-cols-[200px_130px_160px_160px_140px_140px_140px_130px_160px_160px] p-4 items-center hover:bg-white/5 transition-colors group">
                                        
                                        {/* Session ID */}
                                        <div className="pl-2">
                                            <span className="text-slate-400 font-mono text-[13px] bg-[#0a0a0f] border border-white/5 px-2.5 py-1 rounded-md shadow-sm group-hover:text-brand-300 transition-colors" title={s.id}>
                                                {formatShortId(s.id)}
                                            </span>
                                        </div>
                                        
                                        {/* Total Jobs */}
                                        <div className="text-slate-300 font-mono text-[13px] font-bold pl-2">
                                            {totalJobs}
                                        </div>
                                        
                                        {/* Vendor */}
                                        <div className="text-white font-bold text-[13px] truncate pr-4 group-hover:text-brand-300 transition-colors pl-2">
                                            {s.vendor_name || '—'}
                                        </div>
                                        
                                        {/* Campaign */}
                                        <div className="text-slate-300 text-[13px] truncate pr-4 pl-2 font-medium">
                                            {s.campaign_type || '—'}
                                        </div>
                                        
                                        {/* Created By */}
                                        <div className="flex items-center gap-2 text-slate-400 text-[13px] pl-2">
                                            <UserCircle className="w-4 h-4 text-brand-400 opacity-70" />
                                            <span className="truncate">{s.created_by_username || '—'}</span>
                                        </div>
                                        
                                        {/* Start Time */}
                                        <div className="text-slate-400 text-[12px] font-medium pl-2">
                                            {formatDateTime(s.created_at)}
                                        </div>
                                        
                                        {/* End Time */}
                                        <div className="text-slate-500 text-[12px] font-medium pl-2 italic">
                                            {formatDateTime(s.end_time)}
                                        </div>
                                        
                                        {/* Status */}
                                        <div className="pl-2">
                                            <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm max-w-fit ${
                                                status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                status === 'Processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                                                status === 'Failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                'bg-[#0a0a0f] text-slate-400 border-white/5'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    status === 'Completed' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' :
                                                    status === 'Processing' ? 'bg-amber-400' :
                                                    status === 'Failed' ? 'bg-red-400' : 'bg-slate-400'
                                                }`}></span>
                                                {status}
                                            </span>
                                        </div>
                                        
                                        {/* Progress */}
                                        <div className="pr-8 pl-2 w-[140px]">
                                            <div className="flex justify-between items-center mb-1.5 text-[11px] font-mono">
                                                <span className="text-slate-300">{processed.toLocaleString()} / {totalRows.toLocaleString()}</span>
                                                <span className="text-brand-400 font-bold">{progress}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-[#0a0a0f] rounded-full overflow-hidden border border-white/5">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        status === 'Completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' :
                                                        status === 'Failed' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' :
                                                        'bg-brand-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]'
                                                    }`}
                                                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="flex items-center gap-2 pl-2">
                                            <Link
                                                to={`/sessions/${s.id}`}
                                                className="bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                                            >
                                                Details <ChevronRight className="w-3.5 h-3.5" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95"
                                            >
                                                Del
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="p-4 sm:p-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0a0a0f]/50 backdrop-blur-md rounded-b-[2rem]">
                        <span className="text-slate-500 text-[12px] font-medium tracking-wide uppercase ml-2">
                            Showing <span className="text-white font-mono mx-1">{total === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, total)}</span> of <span className="text-white font-mono ml-1">{total}</span>
                        </span>
                        
                        <div className="flex items-center gap-2 mr-2">
                            <button
                                onClick={() => fetchSessions(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="bg-[#1e1e2d] border border-white/10 hover:border-white/20 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-2.5 transition-colors active:scale-95 shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            <span className="text-slate-400 text-[13px] font-medium px-2">
                                Page <span className="text-white font-bold">{page}</span> of {totalPages}
                            </span>

                            <button
                                onClick={() => fetchSessions(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages || totalPages === 0}
                                className="bg-[#1e1e2d] border border-white/10 hover:border-white/20 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-2.5 transition-colors active:scale-95 shadow-sm"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionsList;
