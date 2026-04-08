import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
    ClipboardList, RefreshCw, CheckCircle2, XCircle, Clock,
    AlertCircle, MapPin, CalendarDays, X, Check, ChevronDown, ChevronUp,
    Inbox, Filter, Eye, Layers, ArrowLeftRight
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
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            {cfg.icon}{cfg.label}
        </div>
    );
};

// ── Reject Modal
const RejectModal = ({ req, onConfirm, onCancel }) => {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0d0f1a]/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#13151f] border border-white/[0.07] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                            <XCircle className="w-6 h-6 text-rose-500" />
                        </div>
                        <div className="pt-1">
                            <h3 className="text-xl font-semibold text-white tracking-tight">Decline Request</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Deny export request from <span className="text-white font-medium">{req.admin_first_name || req.admin_username}</span>.
                            </p>
                        </div>
                    </div>

                    <div className="bg-[#0d0f1a] rounded-xl border border-white/[0.07] p-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Vendor</p>
                                <p className="text-sm text-white font-medium">{req.vendor_name || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Requested Leads</p>
                                <p className="text-sm text-white font-mono font-medium">{req.quantity?.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white flex justify-between">
                            Reason for Declining <span className="text-slate-500 font-normal">Optional</span>
                        </label>
                        <textarea
                            rows={3}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Provide feedback to the admin..."
                            className="w-full bg-[#0d0f1a] border border-white/10 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 text-white rounded-lg py-3 px-4 resize-none outline-none transition-all text-sm placeholder:text-slate-600"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end px-6 py-4 bg-[#0d0f1a] border-t border-white/[0.07] gap-3">
                    <button onClick={onCancel} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-transparent hover:bg-white/5 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(reason)}
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-colors shadow-sm"
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0d0f1a]/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#13151f] border border-white/[0.07] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="pt-1">
                        <h3 className="text-xl font-semibold text-white tracking-tight">Approve Export</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Review details before fulfilling <span className="text-white font-medium">{req.admin_first_name || req.admin_username}</span>'s request.
                        </p>
                    </div>
                </div>

                <div className="bg-[#0d0f1a] rounded-xl border border-white/[0.07] p-5 grid grid-cols-2 gap-y-5 gap-x-6 mb-6">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase mb-1">Vendor</p>
                        <p className="text-sm text-white font-medium">{req.vendor_name || '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase mb-1">Total Leads</p>
                        <p className="text-sm text-white font-mono font-medium">{req.quantity?.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase mb-1">Filters Applied</p>
                        <p className="text-sm text-white font-medium truncate" title={req.states?.join(', ')}>
                            {req.states?.length ? `${req.states.length} States Selected` : 'None (National)'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase mb-1">Campaign Route</p>
                        <p className="text-sm text-emerald-400 font-medium truncate">{req.campaign_name || 'Unassigned'}</p>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200/90 leading-relaxed">
                        Approving will immediately lock the requested leads and prepare the CSV payload.
                        <strong className="block mt-1 font-semibold">This action cannot be undone.</strong>
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-end px-6 py-4 bg-[#0d0f1a] border-t border-white/[0.07] gap-3">
                <button onClick={onCancel} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-transparent hover:bg-white/5 transition-colors">
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2"
                >
                    <Check className="w-4 h-4" /> Approve & Fulfill
                </button>
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
const DownloadRequests = () => {
    const [requests, setRequests]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [processing, setProcessing] = useState(null);
    const [filterStatus, setFilterStatus] = useState('pending');
    const [sortDir, setSortDir]     = useState('desc');
    const [rejectModal, setRejectModal] = useState(null);
    const [acceptModal, setAcceptModal] = useState(null);
    const [expandedRow, setExpandedRow] = useState(null);
    const [toast, setToast]         = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try { const r = await api.get('/download/requests'); setRequests(r.data); }
        catch { showToast('Failed to load requests from server.', 'error'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleAccept = async () => {
        const req = acceptModal; setAcceptModal(null); setProcessing(req.id);
        try {
            await api.patch(`/download/requests/${req.id}`, { action: 'accept' });
            showToast('Request fulfilled successfully.', 'success');
            fetchRequests();
        } catch (e) { showToast(e.response?.data?.message || 'Failed to process approval.', 'error'); }
        finally { setProcessing(null); }
    };

    const handleReject = async (reason) => {
        const req = rejectModal; setRejectModal(null); setProcessing(req.id);
        try {
            await api.patch(`/download/requests/${req.id}`, { action: 'reject', rejection_reason: reason });
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
                    <div className="bg-[#13151f] border border-white/[0.07] shadow-2xl rounded-xl p-4 flex items-start gap-3">
                        {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                        <div className="flex-1 pt-0.5">
                            <p className="text-sm font-medium text-white">{toast.msg}</p>
                        </div>
                        <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {rejectModal && <RejectModal req={rejectModal} onConfirm={handleReject} onCancel={() => setRejectModal(null)} />}
            {acceptModal && <AcceptModal req={acceptModal} onConfirm={handleAccept} onCancel={() => setAcceptModal(null)} />}

            <div className="w-full max-w-[1600px] mx-auto pt-6 px-4 sm:px-6 lg:px-8">
                
                {/* ── Page Header  */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                                <ArrowLeftRight className="w-4 h-4 text-white" />
                            </div>
                            <h1 className="text-2xl font-semibold text-white tracking-tight">Review Requests</h1>
                        </div>
                        <p className="text-slate-400 text-sm">Review, approve, or deny administrative lead export requests.</p>
                    </div>

                    <button
                        onClick={fetchRequests}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#13151f] hover:bg-white/5 border border-white/[0.07] hover:border-white/15 rounded-lg text-sm text-white font-medium transition-all shadow-sm h-10"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </button>
                </div>

                {/* ── Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {[
                        { id: 'pending', title: 'Awaiting Action', count: counts.pending, color: 'text-amber-400', icon: <Inbox className="w-5 h-5" /> },
                        { id: 'accepted', title: 'Exported', count: counts.accepted, color: 'text-emerald-400', icon: <CheckCircle2 className="w-5 h-5" /> },
                        { id: 'rejected', title: 'Declined', count: counts.rejected, color: 'text-rose-400', icon: <XCircle className="w-5 h-5" /> }
                    ].map(stat => (
                        <div 
                            key={stat.id} 
                            onClick={() => setFilterStatus(stat.id === filterStatus ? 'all' : stat.id)}
                            className={`bg-[#13151f] border rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg ${filterStatus === stat.id ? 'border-brand-500/50 shadow-sm' : 'border-white/[0.07]'}`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-slate-400">{stat.title}</h3>
                                <div className={`p-2 rounded-md bg-[#0d0f1a] border border-white/5 ${stat.color}`}>
                                    {stat.icon}
                                </div>
                            </div>
                            <div className="text-3xl font-semibold text-white tracking-tight">{stat.count}</div>
                        </div>
                    ))}
                </div>

                {/* ── Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4 border-b border-white/[0.07] pb-4">
                    <div className="flex p-1 bg-[#13151f] border border-white/[0.07] rounded-lg">
                        {['all', 'pending', 'accepted', 'rejected'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                                    filterStatus === s 
                                        ? 'bg-white/10 text-white shadow-sm' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {s === 'all' ? 'All' : s}
                                <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${filterStatus === s ? 'bg-white/10 text-white' : 'bg-[#0d0f1a] text-slate-500'}`}>
                                    {s === 'all' ? requests.length : counts[s]}
                                </span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        <CalendarDays className="w-4 h-4" />
                        Sort by Date
                        {sortDir === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                </div>

                {/* ── Data Table */}
                <div className="bg-[#13151f] border border-white/[0.07] rounded-xl overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <RefreshCw className="w-8 h-8 text-slate-600 animate-spin mb-4" />
                            <p className="text-slate-400 text-sm">Retrieving requests...</p>
                        </div>
                    ) : displayed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                            <div className="w-16 h-16 bg-[#0d0f1a] border border-white/5 rounded-full flex items-center justify-center mb-4">
                                <ClipboardList className="w-8 h-8 text-slate-600" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-1">No requests found</h3>
                            <p className="text-slate-400 text-sm max-w-sm">
                                {filterStatus === 'pending' ? 'Inbox zero! No pending requests require your attention right now.' : 'There are no records matching your current filter.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-white/[0.07] bg-[#0d0f1a]">
                                        <th className="w-10 px-4 py-3"></th>
                                        <th className="px-4 py-3 font-medium text-slate-400">Requested By</th>
                                        <th className="px-4 py-3 font-medium text-slate-400">Target Vendor</th>
                                        <th className="px-4 py-3 font-medium text-slate-400">Records</th>
                                        <th className="px-4 py-3 font-medium text-slate-400">Campaign</th>
                                        <th className="px-4 py-3 font-medium text-slate-400">Submitted</th>
                                        <th className="px-4 py-3 font-medium text-slate-400">Status</th>
                                        <th className="px-4 py-3 font-medium text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {displayed.map((req) => {
                                        const adminName = [req.admin_first_name, req.admin_last_name].filter(Boolean).join(' ') || req.admin_username;
                                        const isProcessing = processing === req.id;
                                        const isExpanded = expandedRow === req.id;

                                        return (
                                            <React.Fragment key={req.id}>
                                                <tr className={`hover:bg-white/[0.02] transition-colors ${!req.is_read && req.status === 'pending' ? 'bg-brand-500/5' : 'bg-transparent'}`}>
                                                    <td className="px-4 py-3.5">
                                                        <button 
                                                            onClick={() => setExpandedRow(isExpanded ? null : req.id)}
                                                            className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center text-xs font-medium">
                                                                {adminName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="text-white font-medium">{adminName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-200">{req.vendor_name || '—'}</td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="font-mono text-slate-200">{req.quantity?.toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${req.campaign_name ? 'bg-indigo-500/10 text-indigo-400' : 'bg-white/5 text-slate-400'}`}>
                                                            {req.campaign_name || 'Unassigned'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-400">
                                                        {fmtTimeAgo(req.requested_at)}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <StatusBadge status={req.status} />
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        {req.status === 'pending' ? (
                                                            isProcessing ? (
                                                                <div className="inline-block w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin mr-6" />
                                                            ) : (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => setRejectModal(req)}
                                                                        className="px-3 py-1.5 rounded-md text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                                                    >
                                                                        Decline
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setAcceptModal(req)}
                                                                        className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <span className="text-slate-600 text-sm">Resolved</span>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <tr className="bg-white/[0.01]">
                                                        <td colSpan={8} className="px-4 py-6 border-t border-white/[0.04]">
                                                            <div className="max-w-4xl mx-auto space-y-6">
                                                                <div>
                                                                    <h4 className="text-sm font-medium text-white mb-3">Request Details (Ref #{req.id})</h4>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                        <div className="bg-[#0d0f1a] p-3 rounded-lg border border-white/5">
                                                                            <p className="text-xs text-slate-500 mb-1">Date Submitted</p>
                                                                            <p className="text-sm text-slate-200">{fmtDate(req.requested_at)}</p>
                                                                        </div>
                                                                        {req.status !== 'pending' && (
                                                                            <div className="bg-[#0d0f1a] p-3 rounded-lg border border-white/5">
                                                                                <p className="text-xs text-slate-500 mb-1">Reviewed On</p>
                                                                                <p className="text-sm text-slate-200">{fmtDate(req.reviewed_at)}</p>
                                                                            </div>
                                                                        )}
                                                                        {req.reviewed_by_username && (
                                                                            <div className="bg-[#0d0f1a] p-3 rounded-lg border border-white/5">
                                                                                <p className="text-xs text-slate-500 mb-1">Auditor</p>
                                                                                <p className="text-sm text-slate-200">{req.reviewed_by_username}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <h4 className="text-sm font-medium text-white mb-3">Geographic Filters</h4>
                                                                    {req.states?.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {req.states.map(s => (
                                                                                <span key={s} className="px-2.5 py-1 bg-white/5 text-slate-200 rounded text-xs font-medium">
                                                                                    {s}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-slate-500">National (No state filters applied)</p>
                                                                    )}
                                                                </div>

                                                                {req.status === 'rejected' && req.rejection_reason && (
                                                                    <div>
                                                                        <h4 className="text-sm font-medium text-rose-400 mb-3">Decline Notice</h4>
                                                                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-lg text-sm text-rose-200">
                                                                            {req.rejection_reason}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {!loading && displayed.length > 0 && (
                    <div className="mt-4 px-2 text-xs font-medium text-slate-500 flex items-center justify-between">
                        <p>Showing {displayed.length} result{displayed.length !== 1 ? 's' : ''}</p>
                        {counts.pending > 0 && (
                            <p className="text-amber-500/80">{counts.pending} pending action{counts.pending !== 1 ? 's' : ''}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DownloadRequests;
