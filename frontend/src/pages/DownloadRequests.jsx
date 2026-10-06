import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { fmtDbDateTime, fmtDbTimeAgo, parseDbTime } from '../utils/dbTime';

import {
    ClipboardList, RefreshCw, CheckCircle2, XCircle, Clock,
    AlertCircle, MapPin, CalendarDays, X, Check, ChevronDown, ChevronUp,
    Inbox, Filter, Eye, Layers, ArrowLeftRight, Activity, Zap, CheckCircle
} from 'lucide-react';

// ── Status Badge
const StatusBadge = ({ status }) => {
    const cfg = {
        pending:  { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: <Clock className="h-3 w-3 mr-1" />, label: 'Pending' },
        accepted: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', icon: <CheckCircle2 className="h-3 w-3 mr-1" />, label: 'Approved' },
        rejected: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', icon: <XCircle className="h-3 w-3 mr-1" />, label: 'Declined' },
    }[status] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', icon: null, label: status };
    
    return (
        <div className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold border whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            {cfg.icon}{cfg.label}
        </div>
    );
};

// ── Reject Modal
const RejectModal = ({ req, onConfirm, onCancel }) => {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#13151f] border border-white/[0.07] rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(225,29,72,0.1)] overflow-hidden scale-100 animate-in zoom-in-95 duration-200 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="p-8 relative z-10">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-600/5 flex items-center justify-center border border-rose-500/30 shadow-[0_0_20px_rgba(225,29,72,0.2)]">
                            <XCircle className="w-6 h-6 text-rose-500" />
                        </div>
                        <div className="pt-1">
                            <h3 className="text-2xl font-extrabold text-white tracking-tight">Decline Request</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Deny export request from <span className="text-white font-bold">{req.admin_first_name || req.admin_username}</span>.
                            </p>
                        </div>
                    </div>

                    <div className="bg-[#0a0a0f] rounded-2xl border border-white/5 p-5 mb-6 grid grid-cols-2 gap-4 shadow-inner">
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vendor</p>
                            <p className="text-sm text-white font-bold">{req.vendor_name || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Requested Leads</p>
                            <p className="text-sm text-rose-400 font-mono font-bold">
                                {req.quantity?.toLocaleString()} <span className="text-slate-400 font-sans text-xs ml-1">{req.typeLabel}</span>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-white flex justify-between uppercase tracking-wider text-[11px]">
                            Reason for Declining <span className="text-slate-500 font-medium normal-case tracking-normal">Optional</span>
                        </label>
                        <textarea
                            rows={3}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Provide feedback to the admin..."
                            className="w-full bg-[#0a0a0f] border border-white/10 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 text-white rounded-xl py-3 px-4 resize-none outline-none transition-all text-sm placeholder:text-slate-600 shadow-inner"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end px-8 py-5 bg-black/20 border-t border-white/5 gap-3 relative z-10">
                    <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(reason)}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 transition-all shadow-[0_4px_15px_rgba(225,29,72,0.3)] hover:shadow-[0_4px_20px_rgba(225,29,72,0.4)]"
                    >
                        Decline Request
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Accept Modal
const AcceptModal = ({ req, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-[#13151f] border border-white/[0.07] rounded-3xl w-full max-w-xl shadow-[0_0_50px_rgba(16,185,129,0.1)] overflow-hidden scale-100 animate-in zoom-in-95 duration-200 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="p-8 relative z-10">
                <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="pt-1">
                        <h3 className="text-2xl font-extrabold text-white tracking-tight">Approve Export</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Review details before fulfilling <span className="text-white font-bold">{req.admin_first_name || req.admin_username}</span>'s request.
                        </p>
                    </div>
                </div>

                <div className="bg-[#0a0a0f] rounded-2xl border border-white/5 p-6 grid grid-cols-2 gap-y-6 gap-x-6 mb-6 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Layers className="w-24 h-24" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vendor</p>
                        <p className="text-sm text-white font-bold">{req.vendor_name || '—'}</p>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Leads</p>
                        <p className="text-sm text-emerald-400 font-mono font-bold">
                            {req.quantity?.toLocaleString()} <span className="text-slate-400 font-sans text-xs ml-1">{req.typeLabel}</span>
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Age Range</p>
                        <p className="text-sm text-white font-mono font-medium bg-white/5 px-2 py-0.5 rounded-md inline-block">
                            {req.min_age || req.max_age ? `${req.min_age || 0} — ${req.max_age || '∞'}` : 'All Ages'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filters Applied</p>
                        <p className="text-sm text-white font-medium truncate" title={req.states?.join(', ')}>
                            {req.states?.length ? <span className="bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-md">{req.states.length} States</span> : <span className="text-slate-500">None (National)</span>}
                        </p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Campaign Route</p>
                        <p className="text-sm text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-lg inline-block">{req.campaign_name || 'Unassigned'}</p>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200/90 leading-relaxed font-medium">
                        Approving will immediately lock the requested leads. DNC scrubbing and CSV preparation happen in the <strong>background</strong> — the admin will receive a notification when the file is ready to download.
                        <strong className="block mt-1 font-extrabold text-amber-400">This action cannot be undone.</strong>
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-end px-8 py-5 bg-black/20 border-t border-white/5 gap-3 relative z-10">
                <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.4)] flex items-center gap-2"
                >
                    <CheckCircle className="w-4 h-4" /> Approve Export
                </button>
            </div>
        </div>
    </div>
);

const requestEndpoint = (moduleType) => {
    if (moduleType === 'mixed') return '/mixed-download/requests';
    if (moduleType === 'premium') return '/premium-download/requests';
    if (moduleType === 'refine') return '/refine-download/requests';
    if (moduleType === 'van') return '/van-download/requests';
    if (moduleType === 'safe_quote') return '/safe-quote-download/requests';
    if (moduleType === 'safe_quote_refine') return '/safe-quote-refine-download/requests';
    return '/download/requests';
};

const DownloadRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all'); // all, pending, accepted, rejected
    const [sortDir, setSortDir] = useState('desc');
    const [processing, setProcessing] = useState(null); // id of request being processed
    const [toast, setToast] = useState(null);
    const [rejectModal, setRejectModal] = useState(null);
    const [acceptModal, setAcceptModal] = useState(null);
    const [expandedRow, setExpandedRow] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const [resLeads, resPremium, resRefine, resVan, resMixed, resSafeQuote, resSafeQuoteRefine] = await Promise.all([
                api.get('/download/requests').catch(() => ({ data: [] })),
                api.get('/premium-download/requests').catch(() => ({ data: [] })),
                api.get('/refine-download/requests').catch(() => ({ data: [] })),
                api.get('/van-download/requests').catch(() => ({ data: [] })),
                api.get('/mixed-download/requests').catch(() => ({ data: [] })),
                api.get('/safe-quote-download/requests').catch(() => ({ data: [] })),
                api.get('/safe-quote-refine-download/requests').catch(() => ({ data: [] }))
            ]);
            
            const leads = (resLeads.data || []).map(r => ({ ...r, status: r.status?.toLowerCase(), moduleType: 'leads', typeLabel: 'Leads' }));
            const premium = (resPremium.data || []).map(r => ({ ...r, status: r.status?.toLowerCase(), moduleType: 'premium', typeLabel: 'Premium Data' }));
            const refine = (resRefine.data || []).map(r => ({ ...r, status: r.status?.toLowerCase(), moduleType: 'refine', typeLabel: 'Refine Data' }));
            const van = (resVan.data || []).map(r => ({ ...r, status: r.status?.toLowerCase(), moduleType: 'van', typeLabel: 'Van Data' }));
            const mixed = (resMixed.data || []).map(r => ({ ...r, status: r.status?.toLowerCase(), moduleType: 'mixed', typeLabel: 'Mixed Data' }));
            const safeQuote = (resSafeQuote.data || []).map(r => ({ ...r, status: r.status?.toLowerCase(), moduleType: 'safe_quote', typeLabel: 'Safe Quote' }));
            const safeQuoteRefine = (resSafeQuoteRefine.data || []).map(r => ({ ...r, status: r.status?.toLowerCase(), moduleType: 'safe_quote_refine', typeLabel: 'Safe Quote Refine' }));
            
            setRequests([...leads, ...premium, ...refine, ...van, ...mixed, ...safeQuote, ...safeQuoteRefine]);
        }
        catch { showToast('Failed to load requests from server.', 'error'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleAccept = async () => {
        const req = acceptModal; setAcceptModal(null); setProcessing(`${req.moduleType}-${req.id}`);
        const endpoint = requestEndpoint(req.moduleType);
        try {
            await api.patch(`${endpoint}/${req.id}`, { action: 'accept' });
            showToast('Request fulfilled successfully.', 'success');
            fetchRequests();
        } catch (e) { showToast(e.response?.data?.message || 'Failed to process approval.', 'error'); }
        finally { setProcessing(null); }
    };

    const handleReject = async (reason) => {
        const req = rejectModal; setRejectModal(null); setProcessing(`${req.moduleType}-${req.id}`);
        const endpoint = requestEndpoint(req.moduleType);
        try {
            await api.patch(`${endpoint}/${req.id}`, { action: 'reject', rejection_reason: reason });
            showToast('Request was declined.', 'success');
            fetchRequests();
        } catch (e) { showToast(e.response?.data?.message || 'Failed to decline request.', 'error'); }
        finally { setProcessing(null); }
    };

    const displayed = requests
        .filter(r => filterStatus === 'all' || r.status === filterStatus)
        .sort((a, b) => {
            const d = sortDir === 'desc' ? -1 : 1;
            return d * (parseDbTime(a.requested_at) - parseDbTime(b.requested_at));
        });

    const counts = {
        pending:  requests.filter(r => r.status === 'pending').length,
        accepted: requests.filter(r => r.status === 'accepted').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    };

    return (
        <div className="font-sans antialiased min-h-[calc(100vh-64px)] pb-12" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
            
            {/* Minimalist Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[200] max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-[#13151f] border border-white/[0.07] shadow-2xl rounded-2xl p-4 flex items-start gap-3">
                        {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                        <div className="flex-1">
                            <p className="text-sm font-bold text-white">{toast.msg}</p>
                        </div>
                        <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {rejectModal && <RejectModal req={rejectModal} onConfirm={handleReject} onCancel={() => setRejectModal(null)} />}
            {acceptModal && <AcceptModal req={acceptModal} onConfirm={handleAccept} onCancel={() => setAcceptModal(null)} />}

            <div className="w-full min-w-0">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-white tracking-tight">Review Requests</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Approve or decline export requests.</p>
                    </div>
                    <button
                        onClick={fetchRequests}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white font-semibold shrink-0"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : 'text-slate-400'}`} />
                        Refresh
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    {[
                        { id: 'pending', title: 'Awaiting Action', count: counts.pending, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: <Inbox className="w-4 h-4" /> },
                        { id: 'accepted', title: 'Exported Leads', count: counts.accepted, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: <CheckCircle2 className="w-4 h-4" /> },
                        { id: 'rejected', title: 'Declined Requests', count: counts.rejected, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: <XCircle className="w-4 h-4" /> }
                    ].map(stat => (
                        <button
                            key={stat.id}
                            type="button"
                            onClick={() => setFilterStatus(stat.id === filterStatus ? 'all' : stat.id)}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${filterStatus === stat.id ? `bg-[#1a1c28] border ${stat.border}` : 'bg-[#13151f] border border-white/[0.06] hover:border-white/15'}`}
                        >
                            <div className={`h-8 w-8 rounded-lg ${stat.bg} border ${stat.border} ${stat.color} flex items-center justify-center shrink-0`}>
                                {stat.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{stat.title}</p>
                                <p className="text-xl font-bold text-white leading-tight">{stat.count}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* ── Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                    <div className="flex flex-wrap p-1 bg-[#0a0a0f] border border-white/5 rounded-lg">
                        {['all', 'pending', 'accepted', 'rejected'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors flex items-center gap-1.5 ${
                                    filterStatus === s 
                                        ? 'bg-[#1e1e2d] text-white border border-white/10' 
                                        : 'text-slate-400 hover:text-white border border-transparent'
                                }`}
                            >
                                {s === 'all' ? 'All' : s}
                                <span className={`text-[10px] py-0.5 px-1.5 rounded ${filterStatus === s ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-slate-500'}`}>
                                    {s === 'all' ? requests.length : counts[s]}
                                </span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#13151f] border border-white/5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:border-white/20"
                    >
                        <CalendarDays className="w-4 h-4 text-brand-500" />
                        Sort by Date
                        {sortDir === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                </div>

                {/* ── Data List */}
                <div className="space-y-2 min-w-0">
                    {!loading && displayed.length > 0 && (
                        <div className="hidden md:grid grid-cols-[minmax(140px,1.1fr)_minmax(90px,0.8fr)_minmax(90px,0.7fr)_minmax(90px,0.8fr)_auto_auto] gap-3 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <span>Requester</span>
                            <span>Vendor</span>
                            <span>Records</span>
                            <span>Campaign</span>
                            <span>Status</span>
                            <span className="text-right">Action</span>
                        </div>
                    )}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 bg-[#13151f] rounded-xl border border-white/5">
                            <RefreshCw className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                            <p className="text-slate-400 text-sm font-medium">Retrieving requests securely...</p>
                        </div>
                    ) : displayed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 bg-[#13151f] rounded-xl border border-white/5 text-center px-4">
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-3">
                                <Inbox className="w-5 h-5 text-slate-500" />
                            </div>
                            <h3 className="text-sm font-semibold text-white mb-1">No requests found</h3>
                            <p className="text-slate-400 text-sm font-medium max-w-md">
                                {filterStatus === 'pending' ? 'Inbox zero! No pending requests require your attention right now.' : 'There are no records matching your current filter.'}
                            </p>
                        </div>
                    ) : (
                        displayed.map((req) => {
                            const adminName = [req.admin_first_name, req.admin_last_name].filter(Boolean).join(' ') || req.admin_username || 'Unknown Admin';
                            const isProcessing = processing === `${req.moduleType}-${req.id}`;
                            const isExpanded = expandedRow === `${req.moduleType}-${req.id}`;

                            return (
                                <div key={`${req.moduleType}-${req.id}`} className={`bg-[#13151f] border ${isExpanded ? 'border-brand-500/40' : 'border-white/[0.05]'} rounded-xl overflow-hidden`}>
                                    <div
                                        className="px-3 py-2.5 grid grid-cols-1 md:grid-cols-[minmax(140px,1.1fr)_minmax(90px,0.8fr)_minmax(90px,0.7fr)_minmax(90px,0.8fr)_auto_auto] gap-x-3 gap-y-2 items-center cursor-pointer"
                                        onClick={() => setExpandedRow(isExpanded ? null : `${req.moduleType}-${req.id}`)}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/25 text-brand-400 flex items-center justify-center text-[11px] font-bold shrink-0">
                                                {adminName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white font-semibold text-xs truncate">{adminName}</p>
                                                <p className="text-slate-500 text-[10px]">{fmtDbTimeAgo(req.requested_at)}</p>
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-slate-500 md:hidden">Vendor</p>
                                            <p className="text-xs font-medium text-slate-200 truncate">{req.vendor_name || '—'}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-mono font-semibold text-white">
                                                {req.quantity?.toLocaleString()} <span className="text-slate-500 text-[10px] font-sans">{req.typeLabel}</span>
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-300 truncate">{req.campaign_name || 'Unassigned'}</p>
                                        </div>
                                        <div className="shrink-0">
                                            <StatusBadge status={req.status} />
                                        </div>
                                        <div className="shrink-0 flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                            {req.status === 'pending' ? (
                                                isProcessing ? (
                                                    <div className="flex items-center justify-center w-full">
                                                        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setRejectModal(req); }}
                                                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20"
                                                        >
                                                            Decline
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setAcceptModal(req); }}
                                                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/20"
                                                        >
                                                            Approve
                                                        </button>
                                                    </>
                                                )
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setExpandedRow(isExpanded ? null : `${req.moduleType}-${req.id}`); }}
                                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-1 whitespace-nowrap"
                                                >
                                                    View Details {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Details Panel */}
                                    {isExpanded && (
                                        <div className="border-t border-white/5 bg-[#0a0a0f] p-4 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />
                                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                
                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                            <Clock className="w-3.5 h-3.5" /> Timeline
                                                        </h4>
                                                        <div className="bg-[#13151f] p-4 rounded-xl border border-white/5 space-y-3">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-medium text-slate-500">Submitted</span>
                                                                <span className="text-sm font-bold text-white">{fmtDbDateTime(req.requested_at)}</span>
                                                            </div>
                                                            {req.status !== 'pending' && (
                                                                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                                                    <span className="text-xs font-medium text-slate-500">Reviewed On</span>
                                                                    <span className="text-sm font-bold text-white">{fmtDbDateTime(req.reviewed_at)}</span>
                                                                </div>
                                                            )}
                                                            {req.reviewed_by_username && (
                                                                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                                                    <span className="text-xs font-medium text-slate-500">Auditor</span>
                                                                    <span className="text-sm font-bold text-white">{req.reviewed_by_username}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                            <MapPin className="w-3.5 h-3.5" /> Geographic Filters
                                                        </h4>
                                                        {req.states?.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {req.states.map(s => (
                                                                    <span key={s} className="px-3 py-1.5 bg-[#13151f] border border-white/10 text-slate-200 rounded-lg text-xs font-bold shadow-sm">
                                                                        {s}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="bg-[#13151f] border border-white/5 p-4 rounded-xl">
                                                                <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
                                                                    <CheckCircle2 className="w-4 h-4 text-slate-500" /> National (No state filters)
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                            <Filter className="w-3.5 h-3.5" /> Demographic Rules
                                                        </h4>
                                                        <div className="bg-[#13151f] p-4 rounded-xl border border-white/5">
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Age Range</p>
                                                            <p className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg inline-block">
                                                                {req.min_age || req.max_age ? `${req.min_age || 0} YRS — ${req.max_age || '∞'} YRS` : 'All Ages (No restrictions)'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {req.status === 'rejected' && req.rejection_reason && (
                                                        <div className="animate-in fade-in slide-in-from-bottom-2">
                                                            <h4 className="text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                                <AlertCircle className="w-3.5 h-3.5" /> Decline Notice
                                                            </h4>
                                                            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-sm font-medium text-rose-200 shadow-inner">
                                                                {req.rejection_reason}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {!loading && displayed.length > 0 && (
                    <div className="mt-8 text-center">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Showing {displayed.length} result{displayed.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DownloadRequests;
