import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { History, RefreshCw, FileDown, AlertCircle } from 'lucide-react';

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

const AlreadyDownloaded = () => {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [downloadingDncId, setDownloadingDncId] = useState(null);
    const [error, setError] = useState('');

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/download/already-downloaded/list?limit=500');
            setRows(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load download history');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const fetchPayload = async (logId) => {
        const res = await api.get(`/download/logs/${logId}/file`);
        return res.data;
    };

    const handleDownloadClean = async (row) => {
        setDownloadingId(row.id);
        try {
            const payload = await fetchPayload(row.id);
            if (payload.goodCsv) {
                const name = payload.summary?.fileName || row.file_name;
                downloadBlob(payload.goodCsv, name);
            } else {
                alert('Clean file not available for this record.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Download failed');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDownloadDnc = async (row) => {
        if (!row.can_download_dnc || row.dnc_removed <= 0) return;
        setDownloadingDncId(row.id);
        try {
            const payload = await fetchPayload(row.id);
            if (payload.badCsv && String(payload.badCsv).trim()) {
                const base = payload.summary?.fileName || row.file_name || `download_${row.id}.csv`;
                const dncName = base.replace(/\.csv$/i, '_dnc_removed.csv');
                downloadBlob(payload.badCsv, dncName);
            } else {
                alert('DNC numbers file not available for this record.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'DNC download failed');
        } finally {
            setDownloadingDncId(null);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 font-sans pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <History className="w-8 h-8 text-brand-400" />
                        Already Downloaded
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 font-medium">
                        Har download ki detail — vendor, file, states, DNC vs clean numbers.
                    </p>
                </div>
                <button type="button" onClick={fetchList} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-sm font-bold">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}
            <div className="bg-[#13151e] rounded-2xl border border-white/6 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[1100px]">
                        <thead className="bg-[#0a0a0f]/90 text-slate-400 text-[11px] font-bold uppercase tracking-widest border-b border-white/10">
                            <tr>
                                <th className="p-4 w-16">Sr No</th>
                                <th className="p-4">Download By</th>
                                <th className="p-4">Vendor</th>
                                <th className="p-4">File Name</th>
                                <th className="p-4">States</th>
                                <th className="p-4 text-center" title="Click count to download DNC file">DNC Removed ↓</th>
                                <th className="p-4 text-center">Clean Numbers</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 text-center">Download Again</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-200">
                            {loading ? (
                                <tr><td colSpan={9} className="p-12 text-center text-brand-400 animate-pulse">Loading...</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={9} className="p-12 text-center text-slate-500">Koi download history nahi mili.</td></tr>
                            ) : rows.map((row, index) => (
                                <tr key={row.id} className="hover:bg-white/[0.02]">
                                    <td className="p-4 font-mono text-slate-400 font-bold">{index + 1}</td>
                                    <td className="p-4 font-medium text-white">{row.downloaded_by}</td>
                                    <td className="p-4 text-white font-semibold">{row.vendor_name}</td>
                                    <td className="p-4"><span className="font-mono text-xs text-brand-300 break-all">{row.file_name}</span></td>
                                    <td className="p-4 text-xs text-slate-300">{row.states_label}</td>
                                    <td className="p-4 text-center">
                                        {row.can_download_dnc && row.dnc_removed > 0 ? (
                                            <button
                                                type="button"
                                                title="Click to download DNC removed numbers"
                                                disabled={downloadingDncId === row.id}
                                                onClick={() => handleDownloadDnc(row)}
                                                className="inline-flex min-w-[2.5rem] justify-center px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 font-bold border border-red-500/25 hover:bg-red-500/25 hover:border-red-400/40 cursor-pointer transition-colors underline-offset-2 hover:underline disabled:opacity-60"
                                            >
                                                {downloadingDncId === row.id ? '...' : row.dnc_removed}
                                            </button>
                                        ) : (
                                            <span className="text-red-400/60 font-bold">{row.dnc_removed}</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center"><span className="text-emerald-400 font-bold">{row.clean_count}</span></td>
                                    <td className="p-4 text-xs text-slate-400">{fmtDate(row.download_date)}</td>
                                    <td className="p-4 text-center">
                                        <button type="button" disabled={!row.can_redownload || downloadingId === row.id} onClick={() => handleDownloadClean(row)} className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold ${row.can_redownload ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                                            <FileDown className="w-4 h-4" />{downloadingId === row.id ? '...' : 'Download Clean'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!loading && rows.length > 0 && (
                    <div className="px-5 py-3 border-t border-white/5 text-xs text-slate-500">Showing {rows.length} of {total} downloads</div>
                )}
            </div>
        </div>
    );
};

export default AlreadyDownloaded;
