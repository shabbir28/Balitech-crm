import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getAreaCodeState } from '../utils/areaCodes';
import { ChevronLeft, ChevronRight, Search, Database, ListFilter } from 'lucide-react';

const LeadsTable = () => {
    const [leads, setLeads] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDisposition, setFilterDisposition] = useState('');
    const limit = 20;

    const fetchLeads = async (pageToFetch, customOptions = {}) => {
        setLoading(true);
        try {
            const disp = customOptions.disposition !== undefined ? customOptions.disposition : filterDisposition;
            const res = await api.get(`/leads?page=${pageToFetch}&limit=${limit}&search=${encodeURIComponent(search)}&disposition=${encodeURIComponent(disp)}`);
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
        <div className="max-w-[1400px] mx-auto space-y-6 font-sans pb-12">
            {/* Header */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 flex-wrap gap-6 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Database className="w-8 h-8 text-brand-400" /> All Data
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 font-medium">
                        Browse and filter through all uploaded data records <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded-md ml-1 border border-white/10">{total.toLocaleString()} total</span>
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
                    {/* Search Field */}
                    <div className="flex items-center bg-[#0a0a0f] border border-white/10 hover:border-brand-500/50 rounded-xl px-4 py-2.5 w-full sm:w-80 transition-all focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 group shadow-inner">
                        <Search className="w-4 h-4 text-slate-500 group-focus-within:text-brand-400 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search state, name, or phone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={handleSearch}
                            className="bg-transparent border-none text-white text-[13px] outline-none w-full ml-3 placeholder:text-slate-600 font-medium"
                        />
                    </div>
                    
                    {/* Filters Wrapper */}
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative group flex-1 sm:flex-none">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-brand-400">
                                <ListFilter className="w-4 h-4" />
                            </div>
                            <select
                                value={filterDisposition}
                                onChange={e => {
                                    setFilterDisposition(e.target.value);
                                    fetchLeads(1, { disposition: e.target.value });
                                }}
                                className={`bg-[#0a0a0f] border border-white/10 hover:border-brand-500/50 rounded-xl py-2.5 pl-10 pr-10 outline-none cursor-pointer transition-all appearance-none text-[13px] font-medium w-full shadow-inner focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 ${filterDisposition ? 'text-brand-400 border-brand-500/30' : 'text-slate-400'}`}
                            >
                                <option value="">All Dispositions</option>
                                {['PDROP', 'AB', 'ADC', 'A', 'AA', 'RAXFER', 'NP', 'DC', 'DNQ', 'N', 'BN', 'LRERR', 'NI', 'NA', 'LH', 'R1', 'BDNC', 'CALLBK'].map(d => (
                                    <option key={d} value={d} className="bg-[#1e1e2d] text-white py-2">{d}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 group-hover:text-brand-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        <button 
                            onClick={() => fetchLeads(1)}
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

                <div className="min-w-[1000px] relative z-10">
                    {/* Table Header */}
                    <div className="grid grid-cols-[minmax(200px,1.5fr)_140px_minmax(200px,1.5fr)_100px_100px_140px_120px] p-5 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0">
                        {['Name', 'Phone', 'Email', 'Area Code', 'State', 'Disposition', 'Status'].map(h => (
                            <span key={h} className="text-slate-400 text-[11px] font-bold uppercase tracking-widest pl-2">
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
                                <p className="font-medium text-[15px] mb-2 text-slate-400">No records found matching your criteria</p>
                                <p className="text-xs">Try adjusting your search terms or disposition filter.</p>
                            </div>
                        ) : (
                            leads.map((lead) => (
                                <div key={lead.id} className="grid grid-cols-[minmax(200px,1.5fr)_140px_minmax(200px,1.5fr)_100px_100px_140px_120px] p-4 items-center hover:bg-white/5 transition-colors group cursor-default">
                                    {/* Name */}
                                    <div className="flex items-center gap-3 pr-4 pl-2">
                                        <div className="w-9 h-9 rounded-full shrink-0 bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs shadow-inner group-hover:scale-110 transition-transform">
                                            {getInitials(lead.name)}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className={`font-bold text-[14px] truncate mb-0.5 transition-colors ${lead.name ? 'text-white group-hover:text-brand-300' : 'text-slate-500 font-medium'}`}>
                                                {lead.name || '—'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Phone */}
                                    <div className="text-slate-300 text-[13px] font-mono tracking-wide">
                                        {lead.phone}
                                    </div>
                                    
                                    {/* Email */}
                                    <div className="text-slate-500 text-[13px] pr-4 truncate font-medium">
                                        {lead.email || '—'}
                                    </div>

                                    {/* Area Code */}
                                    <div>
                                        <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#0a0a0f] text-slate-400 border border-white/10 font-mono shadow-sm">
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
                                        <span className="inline-flex px-3 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm">
                                            {(() => {
                                                let code = lead.area_code;
                                                if (!code || code === 'Unknown') {
                                                    const clean = lead.phone.replace(/\D/g, '');
                                                    if (clean.length === 11 && clean.startsWith('1')) code = clean.substring(1, 4);
                                                    else if (clean.length === 10) code = clean.substring(0, 3);
                                                }
                                                return getAreaCodeState(code);
                                            })()}
                                        </span>
                                    </div>

                                    {/* Disposition */}
                                    <div>
                                        <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider text-slate-300">
                                            {lead.disposition || '—'}
                                        </span>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border shadow-sm ${
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
                                onClick={() => fetchLeads(Math.max(1, page - 1))} 
                                disabled={page === 1}
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

export default LeadsTable;
