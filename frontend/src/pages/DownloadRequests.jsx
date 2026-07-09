import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
    ClipboardList, RefreshCw, CheckCircle2, XCircle, Clock,
    AlertCircle, MapPin, CalendarDays, X, Check, ChevronDown, ChevronUp,
    Inbox, Filter, Eye, Layers, ArrowLeftRight, Activity, Zap, CheckCircle
} from 'lucide-react';

const fmtDate = (d) => d
    ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

const fmtTimeAgo = (d) => {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

// ── Status Badge
const StatusBadge = ({ status }) => {
    const cfg = {
        pending:  { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: <Clock className="h-3.5 w-3.5 mr-1.5" />, label: 'Action Required' },
        accepted: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />, label: 'Approved' },
        rejected: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', icon: <XCircle className="h-3.5 w-3.5 mr-1.5" />, label: 'Declined' },
    }[status] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', icon: null, label: status };
    
    return (
        <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`}>
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
                        Approving will immediately lock the requested leads and prepare the CSV payload.
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
            const [resLeads, resPremium, resRefine] = await Promise.all([
                api.get('/download/requests').catch(() => ({ data: [] })),
                api.get('/premium-download/requests').catch(() => ({ data: [] })),
                api.get('/refine-download/requests').catch(() => ({ data: [] }))
            ]);
            
            const leads = (resLeads.data || []).map(r => ({ ...r, moduleType: 'leads', typeLabel: 'Leads' }));
            const premium = (resPremium.data || []).map(r => ({ ...r, moduleType: 'premium', typeLabel: 'Premium Data' }));
            const refine = (resRefine.data || []).map(r => ({ ...r, moduleType: 'refine', typeLabel: 'Refine Data' }));
            
            setRequests([...leads, ...premium, ...refine]);
        }
        catch { showToast('Failed to load requests from server.', 'error'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleAccept = async () => {
        const req = acceptModal; setAcceptModal(null); setProcessing(`${req.moduleType}-${req.id}`);
        const endpoint = req.moduleType === 'premium' ? '/premium-download/requests' : req.moduleType === 'refine' ? '/refine-download/requests' : '/download/requests';
        try {
            await api.patch(`${endpoint}/${req.id}`, { action: 'accept' });
            showToast('Request fulfilled successfully.', 'success');
            fetchRequests();
        } catch (e) { showToast(e.response?.data?.message || 'Failed to process approval.', 'error'); }
        finally { setProcessing(null); }
    };

    const handleReject = async (reason) => {
        const req = rejectModal; setRejectModal(null); setProcessing(`${req.moduleType}-${req.id}`);
        const endpoint = req.moduleType === 'premium' ? '/premium-download/requests' : req.moduleType === 'refine' ? '/refine-download/requests' : '/download/requests';
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
            return d * (new Date(a.requested_at) - new Date(b.requested_at));
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

            <div className="w-full max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
                
                {/* ── Page Header  */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-brand-500/20 to-purple-500/20 blur-lg rounded-full" />
                        <div className="relative flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-orange-500 flex items-center justify-center border border-white/10 shadow-lg">
                                <Activity className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-extrabold text-white tracking-tight">Review Requests</h1>
                        </div>
                        <p className="text-slate-400 text-sm font-medium ml-16">Review, approve, or deny administrative lead export requests.</p>
                    </div>

                    <button
                        onClick={fetchRequests}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white font-bold transition-all shadow-sm h-11"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : 'text-slate-400'}`} />
                        Refresh Data
                    </button>
                </div>

                {/* ── Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[
                        { id: 'pending', title: 'Awaiting Action', count: counts.pending, color: 'text-amber-400', bg: 'bg-gradient-to-br from-amber-500/20 to-orange-600/5', border: 'border-amber-500/30', shadow: filterStatus === 'pending' ? 'shadow-[0_0_25px_rgba(245,158,11,0.15)]' : '', icon: <Inbox className="w-6 h-6" /> },
                        { id: 'accepted', title: 'Exported Leads', count: counts.accepted, color: 'text-emerald-400', bg: 'bg-gradient-to-br from-emerald-500/20 to-teal-600/5', border: 'border-emerald-500/30', shadow: filterStatus === 'accepted' ? 'shadow-[0_0_25px_rgba(16,185,129,0.15)]' : '', icon: <CheckCircle2 className="w-6 h-6" /> },
                        { id: 'rejected', title: 'Declined Requests', count: counts.rejected, color: 'text-rose-400', bg: 'bg-gradient-to-br from-rose-500/20 to-red-600/5', border: 'border-rose-500/30', shadow: filterStatus === 'rejected' ? 'shadow-[0_0_25px_rgba(225,29,72,0.15)]' : '', icon: <XCircle className="w-6 h-6" /> }
                    ].map(stat => (
                        <div 
                            key={stat.id} 
                            onClick={() => setFilterStatus(stat.id === filterStatus ? 'all' : stat.id)}
                            className={`relative overflow-hidden rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 ${stat.shadow} ${filterStatus === stat.id ? `bg-[#1a1c28] border-2 ${stat.border} scale-[1.02]` : 'bg-[#13151f] border border-white/[0.05] hover:border-white/20'}`}
                        >
                            {filterStatus === stat.id && <div className={`absolute inset-0 opacity-10 ${stat.bg} pointer-events-none`} />}
                            
                            <div className="flex items-start justify-between relative z-10">
                                <div>
                                    <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">{stat.title}</h3>
                                    <div className="text-4xl font-black text-white tracking-tight">{stat.count}</div>
                                </div>
                                <div className={`p-3 rounded-2xl ${stat.bg} border ${stat.border} ${stat.color} shadow-inner`}>
                                    {stat.icon}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                    <div className="flex p-1.5 bg-[#0a0a0f] border border-white/5 rounded-xl shadow-inner">
                        {['all', 'pending', 'accepted', 'rejected'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all duration-200 flex items-center gap-2 ${
                                    filterStatus === s 
                                        ? 'bg-[#1e1e2d] text-white shadow-md border border-white/10' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                {s === 'all' ? 'All' : s}
                                <span className={`text-[10px] py-0.5 px-2 rounded-md ${filterStatus === s ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-slate-500'}`}>
                                    {s === 'all' ? requests.length : counts[s]}
                                </span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#13151f] border border-white/5 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:border-white/20 transition-colors shadow-sm"
                    >
                        <CalendarDays className="w-4 h-4 text-brand-500" />
                        Sort by Date
                        {sortDir === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                </div>

                {/* ── Data List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-[#13151f] rounded-3xl border border-white/5">
                            <RefreshCw className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                            <p className="text-slate-400 text-sm font-medium">Retrieving requests securely...</p>
                        </div>
                    ) : displayed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-[#13151f] rounded-3xl border border-white/5 text-center px-4 shadow-sm">
                            <div className="w-20 h-20 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-full flex items-center justify-center mb-5 shadow-inner">
                                <Inbox className="w-10 h-10 text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No requests found</h3>
                            <p className="text-slate-400 text-sm font-medium max-w-md">
                                {filterStatus === 'pending' ? 'Inbox zero! No pending requests require your attention right now.' : 'There are no records matching your current filter.'}
                            </p>
                        </div>
                    ) : (
                        displayed.map((req) => {
                            const adminName = [req.admin_first_name, req.admin_last_name].filter(Boolean).join(' ') || req.admin_username;
                            const isProcessing = processing === `${req.moduleType}-${req.id}`;
                            const isExpanded = expandedRow === `${req.moduleType}-${req.id}`;

                            return (
                                <div key={`${req.moduleType}-${req.id}`} className={`bg-[#13151f] border ${isExpanded ? 'border-brand-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-white/[0.05] hover:border-white/20 hover:bg-[#161824]'} rounded-2xl overflow-hidden transition-all duration-200`}>
                                    <div 
                                        className="p-5 flex items-center gap-6 cursor-pointer"
                                        onClick={() => setExpandedRow(isExpanded ? null : `${req.moduleType}-${req.id}`)}
                                    >
                                        <div className="flex items-center gap-4 w-[250px] shrink-0">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-orange-600/20 border border-brand-500/30 text-brand-500 flex items-center justify-center text-sm font-black shadow-inner">
                                                {adminName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm truncate">{adminName}</p>
                                                <p className="text-slate-500 text-xs font-medium mt-0.5">{fmtTimeAgo(req.requested_at)}</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Vendor</p>
                                                <p className="text-sm font-semibold text-slate-200 truncate">{req.vendor_name || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Records Requested</p>
                                                <p className="text-sm font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded-md inline-block">
                                                    {req.quantity?.toLocaleString()} <span className="text-slate-400 text-xs font-sans ml-1">{req.typeLabel}</span>
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Campaign</p>
                                                {req.campaign_name ? (
                                                    <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 truncate max-w-full">
                                                        {req.campaign_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm font-medium text-slate-500">Unassigned</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 w-32 text-right">
                                            <StatusBadge status={req.status} />
                                        </div>

                                        <div className="shrink-0 flex items-center justify-end w-40 gap-2" onClick={e => e.stopPropagation()}>
                                            {req.status === 'pending' ? (
                                                isProcessing ? (
                                                    <div className="flex items-center justify-center w-full">
                                                        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setRejectModal(req); }}
                                                            className="flex-1 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                                                        >
                                                            Decline
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setAcceptModal(req); }}
                                                            className="flex-1 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                                                        >
                                                            Approve
                                                        </button>
                                                    </>
                                                )
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setExpandedRow(isExpanded ? null : `${req.moduleType}-${req.id}`); }}
                                                    className="w-full py-2 rounded-xl text-xs font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                                >
                                                    View Details {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Details Panel */}
                                    {isExpanded && (
                                        <div className="border-t border-white/5 bg-[#0a0a0f] p-6 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />
                                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                                
                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-[11px] font-bold text-brand-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                            <Clock className="w-3.5 h-3.5" /> Timeline
                                                        </h4>
                                                        <div className="bg-[#13151f] p-4 rounded-xl border border-white/5 space-y-3">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-medium text-slate-500">Submitted</span>
                                                                <span className="text-sm font-bold text-white">{fmtDate(req.requested_at)}</span>
                                                            </div>
                                                            {req.status !== 'pending' && (
                                                                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                                                    <span className="text-xs font-medium text-slate-500">Reviewed On</span>
                                                                    <span className="text-sm font-bold text-white">{fmtDate(req.reviewed_at)}</span>
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
