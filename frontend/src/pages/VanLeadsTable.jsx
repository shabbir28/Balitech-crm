import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { FileStack, Search, ChevronLeft, ChevronRight, Truck } from 'lucide-react';

const VanLeadsTable = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [vendors, setVendors] = useState([]);
    const [vendorFilter, setVendorFilter] = useState('all');
    const LIMIT = 100;

    useEffect(() => {
        api.get('/van-vendors?counts=false').then(res => setVendors(res.data)).catch(console.error);
    }, []);

    const fetchData = useCallback(async (pg = 1, srch = search, vendor = vendorFilter) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: pg, limit: LIMIT, search: srch });
            if (vendor !== 'all') params.append('vendor_id', vendor);
            const res = await api.get(`/van-data?${params}`);
            setData(res.data.data || []);
            setTotal(res.data.total || 0);
            setPage(pg);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [search, vendorFilter]);

    useEffect(() => { fetchData(1); }, [vendorFilter]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
        fetchData(1, searchInput, vendorFilter);
    };

    const totalPages = Math.ceil(total / LIMIT) || 1;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"><FileStack className="h-5 w-5 text-violet-400" /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">All Van Data</h1>
                        <p className="text-xs text-slate-500">{total.toLocaleString()} records total</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search name, phone, email..."
                            className="w-full pl-10 py-2.5 bg-[#13151e] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-violet-500/50 placeholder:text-slate-600" />
                    </div>
                    <button type="submit" className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors">Search</button>
                </form>
                <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}
                    className="px-4 py-2.5 bg-[#13151e] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-violet-500/50">
                    <option value="all">All Vendors</option>
                    {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-[#1a1d2e] border border-white/[0.05] rounded-2xl shadow-2xl">
                <table className="min-w-full divide-y divide-white/[0.05] text-sm">
                    <thead className="bg-[#13151e]">
                        <tr>
                            {['First Name', 'Last Name', 'Phone No', 'Area Code', 'State', 'Age', 'Vendor', 'Status', 'Uploaded'].map(h => (
                                <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                        {loading && <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-500">Loading van data...</td></tr>}
                        {!loading && data.map(r => (
                            <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-5 py-3 whitespace-nowrap text-white font-medium">{r.first_name || '—'}</td>
                                <td className="px-5 py-3 whitespace-nowrap text-gray-300">{r.last_name || '—'}</td>
                                <td className="px-5 py-3 whitespace-nowrap font-mono text-slate-300 text-xs">{r.phone}</td>
                                <td className="px-5 py-3 whitespace-nowrap text-gray-400">{r.area_code || '—'}</td>
                                <td className="px-5 py-3 whitespace-nowrap text-gray-400">{r.state || '—'}</td>
                                <td className="px-5 py-3 whitespace-nowrap text-gray-300">{r.age != null ? r.age : '—'}</td>
                                <td className="px-5 py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5"><Truck className="h-3 w-3 text-violet-400 shrink-0" /><span className="text-gray-400 text-xs">{r.vendor_name || '—'}</span></div>
                                </td>
                                <td className="px-5 py-3 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 text-xs rounded-full border ${r.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{r.status}</span>
                                </td>
                                <td className="px-5 py-3 whitespace-nowrap text-gray-500 text-xs">{new Date(r.uploaded_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {!loading && data.length === 0 && <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No van data found.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}</p>
                    <div className="flex items-center gap-2">
                        <button disabled={page <= 1} onClick={() => fetchData(page - 1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"><ChevronLeft className="h-4 w-4" /></button>
                        <span className="text-sm text-slate-400 px-2">Page {page} / {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => fetchData(page + 1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VanLeadsTable;
