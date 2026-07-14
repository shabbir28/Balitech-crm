import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { History, ChevronLeft, ChevronRight, Download, Truck } from 'lucide-react';

const VanAlreadyDownloaded = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const LIMIT = 50;

    const fetchData = useCallback(async (pg = 1) => {
        setLoading(true);
        try {
            const res = await api.get(`/van-download/already-downloaded?page=${pg}&limit=${LIMIT}`);
            setData(res.data.data || []);
            setTotal(res.data.total || 0);
            setPage(pg);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(1); }, [fetchData]);

    const handleRedownload = async (item) => {
        try {
            const res = await api.get(`/van-download/logs/${item.id}/file`);
            if (!res.data?.csv) { alert('No stored file for this download.'); return; }
            const blob = new Blob([res.data.csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = res.data.fileName || `van_redownload_${item.id}.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch { alert('Failed to re-download.'); }
    };

    const totalPages = Math.ceil(total / LIMIT) || 1;
    const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—';

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"><History className="h-5 w-5 text-violet-400" /></div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Already Downloaded — Van</h1>
                    <p className="text-xs text-slate-500">{total.toLocaleString()} total downloads</p>
                </div>
            </div>

            <div className="overflow-x-auto bg-[#1a1d2e] border border-white/[0.05] rounded-2xl shadow-2xl">
                <table className="min-w-full divide-y divide-white/[0.05] text-sm">
                    <thead className="bg-[#13151e]">
                        <tr>
                            {['#', 'Downloaded By', 'Vendor', 'States', 'Quantity', 'Age Range', 'Date', 'Re-download'].map(h => (
                                <th key={h} className={`px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h === 'Re-download' ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                        {loading && <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>}
                        {!loading && data.map(item => (
                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-5 py-3 text-violet-400 font-medium">#{item.id}</td>
                                <td className="px-5 py-3 text-white whitespace-nowrap">{item.downloaded_by || '—'}</td>
                                <td className="px-5 py-3 whitespace-nowrap">
                                    {item.vendor_name ? <div className="flex items-center gap-1.5"><Truck className="h-3 w-3 text-violet-400 shrink-0" /><span className="text-gray-300 text-xs">{item.vendor_name}</span></div> : <span className="text-gray-500">All</span>}
                                </td>
                                <td className="px-5 py-3">
                                    {item.states?.length > 0
                                        ? <div className="flex flex-wrap gap-1 max-w-[180px]">{item.states.slice(0, 6).map(s => <span key={s} className="px-1.5 py-0.5 text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded">{s}</span>)}{item.states.length > 6 && <span className="text-xs text-slate-500">+{item.states.length - 6}</span>}</div>
                                        : <span className="text-gray-500 text-xs">All States</span>}
                                </td>
                                <td className="px-5 py-3 text-emerald-400 font-medium">{(item.quantity || 0).toLocaleString()}</td>
                                <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                                    {item.min_age || item.max_age ? `${item.min_age || '—'} – ${item.max_age || '—'}` : 'Any'}
                                </td>
                                <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(item.download_date)}</td>
                                <td className="px-5 py-3 text-right">
                                    {item.can_redownload && (
                                        <button onClick={() => handleRedownload(item)} title="Re-download"
                                            className="p-1.5 rounded-lg text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all">
                                            <Download className="h-4 w-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!loading && data.length === 0 && <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No downloads yet.</td></tr>}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => fetchData(page - 1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"><ChevronLeft className="h-4 w-4" /></button>
                        <button disabled={page >= totalPages} onClick={() => fetchData(page + 1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VanAlreadyDownloaded;
