import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getAreaCodeState } from '../utils/areaCodes';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Database, ListFilter } from 'lucide-react';

const SafeQuoteRefineLeadsTable = () => {
    const [leads, setLeads] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDisposition, setFilterDisposition] = useState('');
    const [filterQuality, setFilterQuality] = useState('');
    const [jumpPage, setJumpPage] = useState('');
    const limit = 20;

    const fetchLeads = async (pageToFetch, customOptions = {}) => {
        setLoading(true);
        try {
            const disp = customOptions.disposition !== undefined ? customOptions.disposition : filterDisposition;
            const qual = customOptions.quality !== undefined ? customOptions.quality : filterQuality;
            const res = await api.get(`/safe-quote-refine-data?page=${pageToFetch}&limit=${limit}&search=${encodeURIComponent(search)}&disposition=${encodeURIComponent(disp)}&quality=${encodeURIComponent(qual)}`);
            setLeads(res.data.data);
            setTotal(res.data.total);
            setPage(res.data.page);
        } catch (err) {
            console.error('Failed to fetch leads', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            fetchLeads(1);
        }
    };

    useEffect(() => {
        if (search === '') fetchLeads(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleJumpPage = (e) => {
        e.preventDefault();
        const p = parseInt(jumpPage);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
            fetchLeads(p);
            setJumpPage('');
        }
    };

    const totalPages = Math.ceil(total / limit);

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name[0].toUpperCase();
    };

    return (
        <div className="w-full min-w-0 space-y-4 font-sans pb-8">
            <div className="min-w-0 border-b border-white/5 pb-4">
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Database className="w-5 h-5 text-brand-400 shrink-0" /> All Safe Quote Refine Data
                </h1>
                <p className="text-slate-500 text-xs mt-1">
                    Safe Quote Refine records
                    <span className="text-white font-mono bg-white/5 px-1.5 py-0.5 rounded ml-1.5 border border-white/10">{total.toLocaleString()} total</span>
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 min-w-0">
                <div className="flex items-center bg-[#0a0a0f] border border-white/10 hover:border-brand-500/50 rounded-lg px-3 py-2 min-w-0 flex-1 basis-[220px] max-w-md focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500">
                    <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search state, name, or phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={handleSearch}
                        className="bg-transparent border-none text-white text-xs outline-none w-full min-w-0 ml-2 placeholder:text-slate-600"
                    />
                </div>
                <div className="relative">
                    <ListFilter className="w-3.5 h-3.5 text-brand-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                        value={filterDisposition}
                        onChange={e => {
                            setFilterDisposition(e.target.value);
                            fetchLeads(1, { disposition: e.target.value });
                        }}
                        className="bg-[#0a0a0f] border border-white/10 rounded-lg py-2 pl-8 pr-7 outline-none cursor-pointer appearance-none text-xs w-[148px] text-slate-300"
                    >
                        <option value="">All Dispositions</option>
                        {['PDROP', 'AB', 'ADC', 'A', 'AA', 'RAXFER', 'NP', 'DC', 'DNQ', 'N', 'BN', 'LRERR', 'NI', 'NA', 'LH', 'R1', 'BDNC', 'CALLBK'].map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
                <select
                    value={filterQuality}
                    onChange={e => {
                        setFilterQuality(e.target.value);
                        fetchLeads(1, { quality: e.target.value });
                    }}
                    className="bg-[#0a0a0f] border border-white/10 rounded-lg py-2 px-3 outline-none cursor-pointer text-xs w-[112px] text-slate-300"
                >
                    <option value="">All Quality</option>
                    <option value="Good">Good</option>
                    <option value="Bad">Bad</option>
                </select>
                <button
                    onClick={() => fetchLeads(1)}
                    className="bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-2 rounded-lg font-semibold text-xs whitespace-nowrap"
                >
                    Search
                </button>
            </div>

            {/* Table Container */}
            <div className="w-full min-w-0 bg-[#1e1e2d] rounded-2xl border border-white/5 overflow-x-auto shadow-2xl relative">
                <div className="min-w-[1080px] relative z-10">
                    <div className="grid grid-cols-[minmax(140px,1.3fr)_108px_minmax(120px,1fr)_48px_52px_52px_84px_68px_52px_84px_60px_72px_100px_84px] px-3 py-2.5 border-b border-white/10 bg-[#0a0a0f]/80">
                        {['Name', 'Phone', 'Email', 'Age', 'Area', 'State', 'Disposition', 'Quality', 'Calls', 'Call Date', 'Time', 'Length', 'Campaign', 'Status'].map(h => (
                            <span key={h} className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide pl-1">
                                {h}
                            </span>
                        ))}
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-white/5">
                        {loading ? (
                            <div className="p-16 text-center text-brand-400 animate-pulse font-medium tracking-widest uppercase text-sm">Loading records...</div>
                        ) : leads.length === 0 ? (
                            <div className="p-16 text-center text-slate-500">
                                <Database className="w-12 h-12 mb-4 opacity-20 mx-auto" strokeWidth={1.5} />
                                <p className="font-medium text-[15px] mb-2 text-slate-400">No Safe Quote Refine records yet</p>
                                <p className="text-xs">This list only shows files uploaded from Safe Quote Refine Upload.</p>
                            </div>
                        ) : (
                            leads.map((lead) => (
                                <div key={lead.id} className="grid grid-cols-[minmax(140px,1.3fr)_108px_minmax(120px,1fr)_48px_52px_52px_84px_68px_52px_84px_60px_72px_100px_84px] px-3 py-2 items-center hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-2 pr-2 pl-1 min-w-0">
                                        <div className="w-6 h-6 rounded-full shrink-0 bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-[10px]">
                                            {getInitials(lead.name)}
                                        </div>
                                        <p className={`font-medium text-xs truncate ${lead.name ? 'text-white' : 'text-slate-500'}`}>
                                            {lead.name || '—'}
                                        </p>
                                    </div>
                                    <div className="text-slate-300 text-[11px] font-mono">{lead.phone}</div>
                                    <div className="text-slate-500 text-[11px] pr-2 truncate">{lead.email || '—'}</div>
                                    <div className="text-white text-[11px]">{lead.age !== null && lead.age !== undefined ? lead.age : '—'}</div>

                                    {/* Area Code */}
                                    <div>
                                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0a0a0f] text-slate-400 border border-white/10 font-mono">
                                            {(() => {
                                                if (lead.area_code && lead.area_code !== 'Unknown') return lead.area_code;
                                                const clean = lead.phone.replace(/\D/g, '');
                                                if (clean.length === 11 && clean.startsWith('1')) return clean.substring(1, 4);
                                                if (clean.length === 10) return clean.substring(0, 3);
                                                return lead.area_code || '—';
                                            })()}
                                        </span>
                                    </div>

                                    {/* State */}
                                    <div>
                                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                            {(() => {
                                                let code = lead.area_code;
                                                if (!code || code === 'Unknown') {
                                                    const clean = lead.phone.replace(/\D/g, '');
                                                    if (clean.length === 11 && clean.startsWith('1')) code = clean.substring(1, 4);
                                                    else if (clean.length === 10) code = clean.substring(0, 3);
                                                }
                                                if (lead.state) return lead.state;
                                                return getAreaCodeState(code);
                                            })()}
                                        </span>
                                    </div>

                                    {/* Disposition */}
                                    <div>
                                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase text-slate-300">
                                            {lead.disposition || '—'}
                                        </span>
                                    </div>

                                    {/* Quality */}
                                    <div>
                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${lead.quality === 'Bad' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                            {lead.quality || 'Good'}
                                        </span>
                                    </div>

                                    {/* Calls */}
                                    <div>
                                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0a0a0f] text-brand-400 border border-brand-500/20">
                                            {lead.call_count || 1}
                                        </span>
                                    </div>

                                    {/* Call Date */}
                                    <div className="text-slate-300 text-[11px]">
                                        {lead.call_date ? new Date(lead.call_date).toLocaleDateString() : '—'}
                                    </div>

                                    {/* Time */}
                                    <div className="text-slate-400 text-[11px]">
                                        {lead.call_date ? new Date(lead.call_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </div>

                                    {/* Length in Sec */}
                                    <div className="text-slate-300 text-[11px] font-mono">
                                        {lead.duration !== null && lead.duration !== undefined ? lead.duration : '—'}
                                    </div>

                                    {/* Campaigns */}
                                    <div className="flex flex-wrap gap-1 pr-2">
                                        {lead.campaign_type ? lead.campaign_type.split(',').map((camp, idx) => (
                                            <span key={idx} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                                                {camp.trim()}
                                            </span>
                                        )) : <span className="text-slate-500 text-[11px]">—</span>}
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                                            lead.status === 'available' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                : 'bg-[#0a0a0f] text-slate-500 border-white/5'
                                        }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${lead.status === 'available' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-500'}`}></div>
                                            {lead.status === 'available' ? 'Available' : 'Used'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="p-4 sm:p-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0a0a0f]/50 backdrop-blur-md rounded-b-[2rem]">
                        <span className="text-slate-500 text-[12px] font-medium tracking-wide uppercase ml-2">
                            Showing <span className="text-white font-mono mx-1">{total === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, total)}</span> of <span className="text-white font-mono ml-1">{total}</span>
                        </span>
                        
                        <div className="flex items-center gap-2 mr-2">
                            <button 
                                onClick={() => fetchLeads(1)} 
                                disabled={page === 1}
                                title="First Page"
                                className="bg-[#1e1e2d] border border-white/10 hover:border-white/20 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-2.5 transition-colors active:scale-95 shadow-sm"
                            >
                                <ChevronsLeft className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => fetchLeads(Math.max(1, page - 1))} 
                                disabled={page === 1}
                                title="Previous Page"
                                className="bg-[#1e1e2d] border border-white/10 hover:border-white/20 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-2.5 transition-colors active:scale-95 shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            <div className="flex gap-1.5">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let start = Math.max(1, page - 2);
                                    let end = Math.min(totalPages, start + 4);
                                    if (end - start < 4) start = Math.max(1, end - 4);
                                    const p = start + i;
                                    if (p > totalPages) return null;
                                    
                                    const isActive = page === p;
                                    return (
                                        <button 
                                            key={p} 
                                            onClick={() => fetchLeads(p)}
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold transition-all ${
                                                isActive 
                                                    ? 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-brand-400/50' 
                                                    : 'bg-[#1e1e2d] border border-white/5 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>

                            <button 
                                onClick={() => fetchLeads(Math.min(totalPages, page + 1))} 
                                disabled={page === totalPages || totalPages === 0}
                                title="Next Page"
                                className="bg-[#1e1e2d] border border-white/10 hover:border-white/20 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-2.5 transition-colors active:scale-95 shadow-sm"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => fetchLeads(totalPages)} 
                                disabled={page === totalPages || totalPages === 0}
                                title="Last Page"
                                className="bg-[#1e1e2d] border border-white/10 hover:border-white/20 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-2.5 transition-colors active:scale-95 shadow-sm"
                            >
                                <ChevronsRight className="w-4 h-4" />
                            </button>

                            <form onSubmit={handleJumpPage} className="flex items-center ml-2 border-l border-white/10 pl-4">
                                <input 
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    value={jumpPage}
                                    onChange={(e) => setJumpPage(e.target.value)}
                                    placeholder="Page..."
                                    className="bg-[#0a0a0f] border border-white/10 text-white text-xs rounded-lg px-2 py-2 w-16 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all font-mono"
                                />
                                <button type="submit" className="ml-2 bg-[#1e1e2d] hover:bg-white/5 text-slate-300 text-xs px-3 py-2 rounded-lg font-bold border border-white/10 transition-colors">
                                    Go
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SafeQuoteRefineLeadsTable;
