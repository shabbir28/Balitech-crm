import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Download, Filter, UserCircle, Calendar, Hash, ShieldCheck } from 'lucide-react';

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/download/logs')
            .then(res => setLogs(res.data))
            .catch(err => console.error('Failed to fetch logs:', err))
            .finally(() => setLoading(false));
    }, []);

    const getAgentDisplay = (log) => {
        if (log.user_first_name || log.user_last_name) {
            return `${log.user_first_name || ''} ${log.user_last_name || ''}`.trim();
        }
        return log.username || 'Deleted User';
    };

    const getApproverDisplay = (log) => {
        if (log.approved_by_first_name || log.approved_by_last_name) {
            return `${log.approved_by_first_name || ''} ${log.approved_by_last_name || ''}`.trim();
        }
        return log.approved_by_username || null;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 font-sans pb-12">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Download className="w-8 h-8 text-brand-400" /> Download Logs
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 font-medium">Audit trail of all data extraction and export activities.</p>
                </div>
                <div className="bg-[#1e1e2d] border border-white/5 rounded-2xl px-5 py-3 shadow-lg flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Total Exports</span>
                        <span className="text-xl font-bold text-white leading-none">{logs.length}</span>
                    </div>
                </div>
            </div>

            <div className="bg-[#1e1e2d] rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden relative">
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="overflow-x-auto relative z-10 w-full">
                    <table className="w-full text-left text-[14px]">
                        <thead className="bg-[#0a0a0f]/80 backdrop-blur-md text-slate-400 font-bold uppercase tracking-widest text-[11px] border-b border-white/10">
                            <tr>
                                <th className="p-5 font-bold">
                                    <div className="flex items-center gap-2"><UserCircle className="w-4 h-4 opacity-70" /> Agent</div>
                                </th>
                                <th className="p-5 font-bold">
                                    <div className="flex items-center gap-2"><Hash className="w-4 h-4 opacity-70" /> Quantity</div>
                                </th>
                                <th className="p-5 font-bold">
                                    <div className="flex items-center gap-2"><Filter className="w-4 h-4 opacity-70" /> Filters Applied</div>
                                </th>
                                <th className="p-5 font-bold">Vendor</th>
                                <th className="p-5 font-bold">
                                    <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 opacity-70" /> Approved By</div>
                                </th>
                                <th className="p-5 font-bold">
                                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 opacity-70" /> Timestamp</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-brand-400 animate-pulse font-medium tracking-widest uppercase text-sm">
                                        Fetching logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-16 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Download className="w-12 h-12 mb-4 opacity-20" />
                                            <p className="font-medium text-sm">No download activity recorded.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => {
                                    const approver = getApproverDisplay(log);
                                    return (
                                        <tr key={log.id} className="hover:bg-white/5 transition-colors group bg-[#1e1e2d]">

                                            {/* Agent */}
                                            <td className="p-5 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                                        {(log.username || 'U').charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-white capitalize group-hover:text-brand-300 transition-colors">
                                                        {getAgentDisplay(log)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Quantity */}
                                            <td className="p-5 whitespace-nowrap">
                                                <span className="bg-[#0a0a0f] border border-white/5 text-brand-400 font-mono font-bold px-3 py-1.5 rounded-lg shadow-inner">
                                                    {log.quantity.toLocaleString()}
                                                </span>
                                            </td>

                                            {/* Filters */}
                                            <td className="p-5 whitespace-nowrap">
                                                {(log.country_code || log.area_code) ? (
                                                    <div className="flex items-center gap-2">
                                                        {log.country_code && (
                                                            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] px-2 py-1 rounded-md font-bold tracking-widest uppercase">
                                                                CC: {log.country_code}
                                                            </span>
                                                        )}
                                                        {log.area_code && (
                                                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] px-2 py-1 rounded-md font-bold tracking-widest uppercase">
                                                                AC: {log.area_code}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 text-xs font-medium italic">No Filters</span>
                                                )}
                                            </td>

                                            {/* Vendor */}
                                            <td className="p-5 whitespace-nowrap">
                                                {log.vendor_name
                                                    ? <span className="text-slate-300 font-medium">{log.vendor_name}</span>
                                                    : <span className="text-slate-600 font-medium">—</span>
                                                }
                                            </td>

                                            {/* Approved By */}
                                            <td className="p-5 whitespace-nowrap">
                                                {approver ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                                            {approver.charAt(0)}
                                                        </div>
                                                        <span className="text-emerald-300 font-semibold capitalize">{approver}</span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                                                        <ShieldCheck className="w-3 h-3" />
                                                        Direct (SuperAdmin)
                                                    </span>
                                                )}
                                            </td>

                                            {/* Timestamp */}
                                            <td className="p-5 whitespace-nowrap">
                                                <div className="text-slate-400 text-xs font-mono bg-[#0a0a0f] border border-white/5 px-3 py-1.5 rounded-lg max-w-fit">
                                                    {new Date(log.download_date).toLocaleString(undefined, {
                                                        year: 'numeric', month: 'short', day: 'numeric',
                                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Logs;
