import React, { useState, useEffect, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
    Send, Download, AlertCircle, ChevronDown, Check,
    Clock, CheckCircle2, XCircle, RefreshCw, FileDown,
    Building2, Hash, Calendar, Info, Sparkles, ArrowRight, BarChart3, MapPin
} from 'lucide-react';

const US_STATES = [
    { name: 'Alabama', abbr: 'AL' }, { name: 'Alaska', abbr: 'AK' }, { name: 'Arizona', abbr: 'AZ' }, { name: 'Arkansas', abbr: 'AR' },
    { name: 'California', abbr: 'CA' }, { name: 'Colorado', abbr: 'CO' }, { name: 'Connecticut', abbr: 'CT' }, { name: 'Delaware', abbr: 'DE' },
    { name: 'Florida', abbr: 'FL' }, { name: 'Georgia', abbr: 'GA' }, { name: 'Hawaii', abbr: 'HI' }, { name: 'Idaho', abbr: 'ID' },
    { name: 'Illinois', abbr: 'IL' }, { name: 'Indiana', abbr: 'IN' }, { name: 'Iowa', abbr: 'IA' }, { name: 'Kansas', abbr: 'KS' },
    { name: 'Kentucky', abbr: 'KY' }, { name: 'Louisiana', abbr: 'LA' }, { name: 'Maine', abbr: 'ME' }, { name: 'Maryland', abbr: 'MD' },
    { name: 'Massachusetts', abbr: 'MA' }, { name: 'Michigan', abbr: 'MI' }, { name: 'Minnesota', abbr: 'MN' }, { name: 'Mississippi', abbr: 'MS' },
    { name: 'Missouri', abbr: 'MO' }, { name: 'Montana', abbr: 'MT' }, { name: 'Nebraska', abbr: 'NE' }, { name: 'Nevada', abbr: 'NV' },
    { name: 'New Hampshire', abbr: 'NH' }, { name: 'New Jersey', abbr: 'NJ' }, { name: 'New Mexico', abbr: 'NM' }, { name: 'New York', abbr: 'NY' },
    { name: 'North Carolina', abbr: 'NC' }, { name: 'North Dakota', abbr: 'ND' }, { name: 'Ohio', abbr: 'OH' }, { name: 'Oklahoma', abbr: 'OK' },
    { name: 'Oregon', abbr: 'OR' }, { name: 'Pennsylvania', abbr: 'PA' }, { name: 'Rhode Island', abbr: 'RI' }, { name: 'South Carolina', abbr: 'SC' },
    { name: 'South Dakota', abbr: 'SD' }, { name: 'Tennessee', abbr: 'TN' }, { name: 'Texas', abbr: 'TX' }, { name: 'Utah', abbr: 'UT' },
    { name: 'Vermont', abbr: 'VT' }, { name: 'Virginia', abbr: 'VA' }, { name: 'Washington', abbr: 'WA' }, { name: 'West Virginia', abbr: 'WV' },
    { name: 'Wisconsin', abbr: 'WI' }, { name: 'Wyoming', abbr: 'WY' }, { name: 'District of Columbia', abbr: 'DC' }
];

const StatusBadge = ({ status }) => {
    const cfg = {
        pending:  { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25',    icon: <Clock className="h-3 w-3" />,        label: 'Pending'  },
        accepted: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Approved' },
        rejected: { cls: 'bg-red-500/15 text-red-400 border-red-500/25',          icon: <XCircle className="h-3 w-3" />,      label: 'Rejected' },
    }[status] || { cls: '', icon: null, label: status };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.cls}`}>
            {cfg.icon}{cfg.label}
        </span>
    );
};

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// ── Custom Select ─────────────────────────────────────────────
const Field = ({ label, required, hint, children }) => (
    <div className="space-y-2.5">
        <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
            {label}{required && <span className="text-orange-500">*</span>}
        </label>
        {children}
        {hint && <p className="text-[11px] text-slate-500 font-medium">{hint}</p>}
    </div>
);

const SelectInput = ({ value, onChange, disabled, required, children }) => (
    <div className="relative group">
        <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className="w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 text-white rounded-xl py-3.5 px-4 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/60 transition-all cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-brand-500/30 shadow-inner group-hover:bg-[#0a0c14]/80"
        >
            {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-brand-400 transition-colors" />
    </div>
);

// Helper function to trigger browser download of plain text content as a CSV file
const downloadBlob = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ── Scrub Summary Modal Component ─────────────────────────────
const ScrubSummaryModal = ({ data, onClose }) => {
    if (!data) return null;

    const { summary, badCsv } = data;



    const handleDownloadBad = () => {
        if (!badCsv) return;
        const badFileName = (summary.fileName || `leads_${Date.now()}.csv`).replace('.csv', '_bad_leads.csv');
        downloadBlob(badCsv, badFileName);
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in overflow-hidden">
            <div className="relative w-full max-w-5xl bg-[#13151f] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh] min-w-0">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between bg-[#161824] w-full min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                            <Sparkles className="h-5 w-5 text-white animate-pulse" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-black text-white tracking-tight truncate">Lead Scrubbing Complete</h2>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">Blacklist Alliance TCPA & DNC scrubbing summary results</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white hover:bg-white/5 p-2 rounded-lg transition-colors shrink-0 ml-2"
                    >
                        <XCircle className="h-6 w-6" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto overflow-x-hidden space-y-6 flex-1 w-full min-w-0">
                    
                    {/* Scrub details info block */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/40 p-4 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                            <Calendar className="h-5 w-5 text-slate-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Scrub Date & Time</p>
                                <p className="text-sm font-semibold text-white truncate">{summary.scrubDate || new Date().toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 min-w-0">
                            <Building2 className="h-5 w-5 text-slate-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Scrubbed File / Session</p>
                                <p className="text-sm font-semibold text-brand-400 truncate" title={summary.fileName}>
                                    {summary.fileName || 'leads_scrubbed.csv'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Table Title */}
                    <div className="w-full min-w-0">
                        <h3 className="text-sm font-bold text-white mb-3">Scrub Statistics:</h3>
                        <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-950/20 w-full">
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-center text-xs min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-[#161824] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            <th className="px-4 py-3.5 whitespace-nowrap">Total</th>
                                            <th className="px-4 py-3.5 whitespace-nowrap">Blacklist</th>
                                            <th className="px-4 py-3.5 whitespace-nowrap">Suppress</th>
                                            <th className="px-4 py-3.5 whitespace-nowrap">State DNC</th>
                                            <th className="px-4 py-3.5 whitespace-nowrap">Federal DNC</th>
                                            <th className="px-4 py-3.5 whitespace-nowrap">Wireless</th>
                                            <th className="px-4 py-3.5 whitespace-nowrap">Landline</th>
                                            <th className="px-4 py-3.5 text-emerald-400 whitespace-nowrap">Good</th>
                                            <th className="px-4 py-3.5 text-amber-500 whitespace-nowrap">Errors</th>
                                            <th className="px-4 py-3.5 text-red-400 whitespace-nowrap">Bad Phone #</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 font-mono text-sm font-bold">
                                        <tr className="text-white">
                                            <td className="px-4 py-4 text-slate-300 whitespace-nowrap">{summary.total?.toLocaleString()}</td>
                                            <td className="px-4 py-4 text-red-400 whitespace-nowrap">{summary.blacklist?.toLocaleString()}</td>
                                            <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{summary.suppress?.toLocaleString() || 0}</td>
                                            <td className="px-4 py-4 text-orange-400 whitespace-nowrap">{summary.stateDnc?.toLocaleString()}</td>
                                            <td className="px-4 py-4 text-orange-500 whitespace-nowrap">{summary.federalDnc?.toLocaleString()}</td>
                                            <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{summary.wireless?.toLocaleString() || 0}</td>
                                            <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{summary.landline?.toLocaleString() || 0}</td>
                                            <td className="px-4 py-4 bg-emerald-500/10 text-emerald-400 whitespace-nowrap">{summary.good?.toLocaleString()}</td>
                                            <td className="px-4 py-4 text-amber-500 whitespace-nowrap">{summary.errors?.toLocaleString()}</td>
                                            <td className="px-4 py-4 text-red-500 whitespace-nowrap">{summary.badPhone?.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Explanatory Note */}
                    <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 text-xs text-slate-400 leading-relaxed">
                        <Info className="h-4.5 w-4.5 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold text-white block mb-0.5">Automated Compliance Routing:</span>
                            All the bad numbers identified above (DNC, State/Federal matching, TCPA litigants) have been automatically saved into your CRM's DNC Module. The corresponding leads' dispositions in the main database have also been locked as <strong className="text-red-400">DNC</strong> so they will never be picked up for any future campaigns or exports.
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-5 border-t border-white/[0.06] bg-[#161824] flex items-center justify-between flex-wrap gap-4 w-full min-w-0">
                    {/* Bad download option */}
                    {summary.blacklist + summary.stateDnc + summary.federalDnc + summary.badPhone > 0 ? (
                        <button
                            onClick={handleDownloadBad}
                            className="flex items-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/30 text-red-400 font-bold text-xs rounded-xl transition-all whitespace-nowrap"
                        >
                            <FileDown className="h-4 w-4 shrink-0" />
                            Download Bad Data ({((summary.blacklist || 0) + (summary.stateDnc || 0) + (summary.federalDnc || 0) + (summary.badPhone || 0)).toLocaleString()} leads)
                        </button>
                    ) : (
                        <div className="text-xs text-slate-500 italic">No bad/DNC records scrubbed in this run.</div>
                    )}

                    {/* Close summary option */}
                    <div className="flex items-center gap-3 sm:ml-auto flex-wrap">
                        <button
                            onClick={onClose}
                            className="px-4 py-3 bg-white/5 hover:bg-white/8 border border-white/8 rounded-xl text-xs text-slate-300 font-bold transition-all whitespace-nowrap"
                        >
                            Close Summary
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};

// ─────────────────────────────────────────────────────────────
const DownloadLeads = () => {
    const { user } = useContext(AuthContext);
    const isSuperAdmin = user?.role === 'super_admin';
    const isAdmin      = user?.role === 'admin';

    const [vendors, setVendors]         = useState([]);
    const [campaigns, setCampaigns]     = useState([]);
    const [loadingV, setLoadingV]       = useState(true);
    const [loadingC, setLoadingC]       = useState(true);

    const [form, setForm] = useState({ states: [], campaign_id: '', vendor_id: '', quantity: 1000, min_age: '', max_age: '' });
    const [submitting, setSubmitting]   = useState(false);
    const [error, setError]             = useState('');
    const [successMsg, setSuccessMsg]   = useState('');

    const [stateOpen, setStateOpen]     = useState(false);
    const stateRef = useRef(null);

    const [myRequests, setMyRequests]   = useState([]);
    const [loadingReq, setLoadingReq]   = useState(false);
    const [dlId, setDlId]               = useState(null);
    const [scrubSummaryData, setScrubSummaryData] = useState(null);

    const [stateCounts, setStateCounts] = useState({});
    const [loadingCounts, setLoadingCounts] = useState(false);

    useEffect(() => {
        Promise.all([api.get('/vendors?counts=true'), api.get('/campaigns')])
            .then(([v, c]) => { setVendors(v.data); setCampaigns(c.data.filter(x => x.status === 'Active')); })
            .catch(() => {})
            .finally(() => { setLoadingV(false); setLoadingC(false); });
    }, []);

    // Fetch state counts whenever filters change and a vendor is selected
    useEffect(() => {
        if (form.vendor_id) {
            const timeoutId = setTimeout(() => {
                setLoadingCounts(true);
                api.post('/download/state-counts', {
                    vendor_id: form.vendor_id,
                    campaign_id: form.campaign_id,
                    states: form.states,
                    min_age: form.min_age,
                    max_age: form.max_age
                })
                .then(res => setStateCounts(res.data))
                .catch(err => console.error('Failed to fetch state counts', err))
                .finally(() => setLoadingCounts(false));
            }, 500); // debounce to avoid too many requests while typing age/quantity
            return () => clearTimeout(timeoutId);
        } else {
            const timeoutId = setTimeout(() => setStateCounts({}), 0);
            return () => clearTimeout(timeoutId);
        }
    }, [form.vendor_id, form.campaign_id, form.states, form.min_age, form.max_age]);

    const fetchMyReqs = async () => {
        if (!isAdmin) return;
        setLoadingReq(true);
        try { const r = await api.get('/download/requests/mine'); setMyRequests(r.data); }
        catch (err) { console.error(err); } finally { setLoadingReq(false); }
    };
    useEffect(() => { fetchMyReqs(); }, []); // eslint-disable-line

    useEffect(() => {
        const h = (e) => { if (stateRef.current && !stateRef.current.contains(e.target)) setStateOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const toggleState = (abbr) => setForm(p => ({
        ...p,
        states: p.states.includes(abbr) ? p.states.filter(s => s !== abbr) : [...p.states, abbr]
    }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.vendor_id) { setError('Please select a vendor.'); return; }
        if (!form.campaign_id) { setError('Please select a campaign.'); return; }
        if (!form.quantity || form.quantity <= 0) { setError('Please enter a valid quantity.'); return; }
        setSubmitting(true); setError(''); setSuccessMsg('');
        try {
            if (isSuperAdmin) {
                const useAsyncScrub = Number(form.quantity) >= 50000;
                const body = { ...form, async_scrub: useAsyncScrub };
                const timeoutMs = useAsyncScrub ? 8 * 60 * 1000 : 30 * 60 * 1000;
                const res = await api.post('/download', body, { timeout: timeoutMs });
                setScrubSummaryData(res.data);
                setSuccessMsg(
                    useAsyncScrub
                        ? 'CSV download ready. Blacklist scrub is running in background; DNC stats update after completion.'
                        : 'Export scrubbing complete! View summary details below.'
                );
                
                // Refetch vendors to update stats
                api.get('/vendors?counts=true').then(v => setVendors(v.data)).catch(() => {});
            } else {
                await api.post('/download/request', form);
                setSuccessMsg('Request submitted! SuperAdmin will review it shortly.');
                setForm({ states: [], campaign_id: '', vendor_id: '', quantity: 1000, min_age: '', max_age: '' });
                fetchMyReqs();
                
                // Refetch vendors to update stats (though usually won't change until approved)
                api.get('/vendors?counts=true').then(v => setVendors(v.data)).catch(() => {});
            }
        } catch (err) {
            const status = err.response?.status;
            if (status === 502 || status === 504) {
                setError('Gateway timeout — the server is still processing. Try a smaller quantity, or ask SuperAdmin to increase nginx proxy_read_timeout.');
            } else if (err.code === 'ECONNABORTED') {
                setError('Request timed out on the client side. The download may still finish in the background — check Already Downloaded shortly.');
            } else {
                setError(err.response?.data?.message || 'Request failed.');
            }
        } finally { setSubmitting(false); }
    };

    const handleDownloadCSV = async (req) => {
        setDlId(req.id);
        try {
            const res = await api.get(`/download/requests/${req.id}/file`);
            setScrubSummaryData(res.data);
        } catch { alert('Download failed. Try again.'); }
        finally { setDlId(null); }
    };

    let selectedVendor = null;
    if (form.vendor_id === 'all') {
        const totalLeads = vendors.reduce((acc, v) => acc + parseInt(v.total_leads || 0), 0);
        const downloadedLeads = vendors.reduce((acc, v) => acc + parseInt(v.downloaded_leads || 0), 0);
        const availableLeads = vendors.reduce((acc, v) => acc + parseInt(v.available_leads || 0), 0);
        selectedVendor = {
            vendor_id: 'all',
            name: 'All Vendors',
            total_leads: totalLeads,
            downloaded_leads: downloadedLeads,
            available_leads: availableLeads
        };
    } else {
        selectedVendor = vendors.find(v => String(v.vendor_id) === String(form.vendor_id));
    }

    return (
        <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── Page hero ─────────────────────────────────── */}
            <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#120a2e] via-[#0d0a1c] to-[#0a0714] border border-white/5 p-8 shadow-2xl">
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none opacity-50 translate-x-1/3 -translate-y-1/3" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none opacity-40 -translate-x-1/3 translate-y-1/3" />

                <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-5">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-400/20 to-violet-600/20 border border-white/10 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-400 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            {isSuperAdmin ? <Download className="h-8 w-8 text-white relative z-10" /> : <Send className="h-8 w-8 text-white relative z-10" />}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/50 tracking-tight">
                                {isSuperAdmin ? 'Export Data' : 'Download Request'}
                            </h1>
                            <p className="text-slate-400 text-sm mt-1 font-medium max-w-lg leading-relaxed">
                                {isSuperAdmin
                                    ? 'Directly export targeted leads as CSV using advanced demographic filters.'
                                    : 'Submit a request to extract specific datasets. A SuperAdmin will review and prepare your data.'}
                            </p>
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl backdrop-blur-md">
                            <Info className="h-4 w-4 text-blue-400 shrink-0" />
                            <p className="text-xs text-blue-300 font-medium tracking-wide uppercase">Approval Required</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                {/* ── LEFT: Form ──────────────────────────────── */}
                <div className="xl:col-span-3 space-y-6">

                    {/* Form card */}
                    <div className="bg-[#13151f]/70 backdrop-blur-2xl border border-white/[0.07] rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.3)] relative">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                        
                        {/* Card header */}
                        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3 bg-white/[0.02]">
                            <Sparkles className="h-4 w-4 text-brand-400" />
                            <span className="font-bold text-white text-sm">Configure Download Parameters</span>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">

                            {/* Vendor */}
                            <Field label="Vendor Source" required hint="Select the vendor whose data you want to export">
                                <SelectInput
                                    value={form.vendor_id}
                                    onChange={e => setForm({ ...form, vendor_id: e.target.value })}
                                    disabled={loadingV}
                                >
                                    <option value="" disabled>{loadingV ? 'Loading...' : 'Choose a vendor...'}</option>
                                    <option value="all">All Vendors</option>
                                    {vendors.map(v => (
                                        <option key={v.vendor_id} value={v.vendor_id}>
                                            {v.name}{v.available_leads != null ? ` — ${v.available_leads.toLocaleString()} available` : ''}
                                        </option>
                                    ))}
                                </SelectInput>
                                {/* Vendor preview pill */}
                                {selectedVendor && (
                                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-brand-500/8 border border-brand-500/15 rounded-lg w-fit">
                                        <Building2 className="h-3.5 w-3.5 text-brand-400" />
                                        <span className="text-xs font-semibold text-brand-300">{selectedVendor.name}</span>
                                    </div>
                                )}
                            </Field>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* State Filter */}
                                <Field label="State Filter" hint="Leave empty for all states">
                                    <div className="relative" ref={stateRef}>
                                        <button
                                            type="button"
                                            onClick={() => setStateOpen(o => !o)}
                                            className="w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 hover:bg-[#0a0c14]/80 hover:border-brand-500/30 text-white rounded-xl py-3.5 px-4 flex justify-between items-center transition-all text-sm group shadow-inner"
                                        >
                                            <span className={form.states.length === 0 ? 'text-slate-500' : 'text-white font-medium'}>
                                                {form.states.length === 0 ? 'Any state...' : `${form.states.length} state${form.states.length > 1 ? 's' : ''} selected`}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 text-slate-500 group-hover:text-brand-400 transition-transform ${stateOpen ? 'rotate-180 text-brand-400' : ''}`} />
                                        </button>
                                        {stateOpen && (
                                            <div className="absolute z-50 w-full mt-1.5 bg-[#16192a] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-auto">
                                                <div className="p-1.5 space-y-0.5">
                                                    {US_STATES.map(s => (
                                                        <div
                                                            key={s.abbr}
                                                            onClick={() => toggleState(s.abbr)}
                                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${form.states.includes(s.abbr) ? 'bg-brand-500/10 text-brand-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                                        >
                                                            <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all ${form.states.includes(s.abbr) ? 'bg-brand-500 border-brand-500' : 'border-slate-600'}`}>
                                                                {form.states.includes(s.abbr) && <Check className="h-2.5 w-2.5 text-white" />}
                                                            </div>
                                                            {s.name} <span className="text-xs opacity-50 ml-auto">{s.abbr}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Field>

                                {/* Age Range */}
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Min Age" hint="Optional">
                                        <input
                                            type="number" min="0" max="120"
                                            value={form.min_age}
                                            onChange={e => setForm({ ...form, min_age: e.target.value })}
                                            className="w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 hover:bg-[#0a0c14]/80 hover:border-brand-500/30 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 text-white rounded-xl py-3.5 px-4 outline-none transition-all text-sm font-mono shadow-inner"
                                            placeholder="25"
                                        />
                                    </Field>
                                    <Field label="Max Age" hint="Optional">
                                        <input
                                            type="number" min="0" max="120"
                                            value={form.max_age}
                                            onChange={e => setForm({ ...form, max_age: e.target.value })}
                                            className="w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 hover:bg-[#0a0c14]/80 hover:border-brand-500/30 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 text-white rounded-xl py-3.5 px-4 outline-none transition-all text-sm font-mono shadow-inner"
                                            placeholder="65"
                                        />
                                    </Field>
                                </div>
                            </div>

                            {/* Campaign */}
                            <Field label="Campaign Filter" required hint="Select the campaign to export from">
                                <SelectInput
                                    value={form.campaign_id}
                                    onChange={e => setForm({ ...form, campaign_id: e.target.value })}
                                    disabled={loadingC}
                                    required
                                >
                                    <option value="" disabled>{loadingC ? 'Loading...' : 'Choose a campaign...'}</option>
                                    <option value="all">All Campaigns</option>
                                    {campaigns.map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>)}
                                </SelectInput>
                            </Field>

                            {/* Quantity */}
                            <Field label="Quantity" required hint="Max 100,000 per request recommended">
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                    <input
                                        type="number" min="1" max="100000" required
                                        value={form.quantity}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setForm({ ...form, quantity: val === '' ? '' : parseInt(val) });
                                        }}
                                        className="w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 hover:bg-[#0a0c14]/80 hover:border-brand-500/30 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 text-white rounded-xl py-3.5 pl-11 pr-4 outline-none transition-all text-sm font-mono shadow-inner"
                                        placeholder="1000"
                                    />
                                </div>
                            </Field>

                            {/* Alerts */}
                            {error && (
                                <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-xl p-4">
                                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-300">{error}</p>
                                </div>
                            )}
                            {successMsg && (
                                <div className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-emerald-300">{successMsg}</p>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={submitting || !form.vendor_id}
                                className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-sm transition-all duration-200 ${
                                    submitting || !form.vendor_id
                                        ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                                        : isSuperAdmin
                                            ? 'bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white shadow-[0_8px_24px_rgba(249,115,22,0.3)] hover:shadow-[0_12px_32px_rgba(249,115,22,0.4)] hover:-translate-y-0.5'
                                            : 'bg-gradient-to-r from-brand-500 to-violet-600 hover:from-brand-400 hover:to-violet-500 text-white shadow-[0_8px_24px_rgba(59,130,246,0.3)] hover:shadow-[0_12px_32px_rgba(59,130,246,0.4)] hover:-translate-y-0.5'
                                }`}
                            >
                                {submitting ? (
                                    <><div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
                                ) : isSuperAdmin ? (
                                    <><Download className="h-5 w-5" />Export to CSV<ArrowRight className="h-4 w-4 ml-1" /></>
                                ) : (
                                    <><Send className="h-5 w-5" />Send Download Request<ArrowRight className="h-4 w-4 ml-1" /></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── RIGHT: Info / Summary ────────────────────── */}
                <div className="xl:col-span-2 space-y-4">

                    {/* Info card */}
                    <div className="bg-[#13151f]/80 backdrop-blur-xl border border-white/[0.07] rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <h3 className="font-bold text-white text-sm mb-5 flex items-center gap-2">
                            <Info className="h-4.5 w-4.5 text-blue-400" />
                            {isSuperAdmin ? 'Export Workflow' : 'How It Works'}
                        </h3>
                        {isAdmin ? (
                            <div className="space-y-4">
                                {[
                                    { step: '1', label: 'Configure Filters', desc: 'Select vendor, quantity and targeted demographics' },
                                    { step: '2', label: 'Submit Request', desc: 'Your export request is sent for SuperAdmin review' },
                                    { step: '3', label: 'Processing', desc: 'Leads are automatically scrubbed against DNC lists' },
                                    { step: '4', label: 'Download CSV', desc: 'Securely download your clean data file' },
                                ].map(s => (
                                    <div key={s.step} className="flex items-start gap-3.5 group">
                                        <div className="h-7 w-7 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-black flex items-center justify-center shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-all shadow-sm shadow-brand-500/10">{s.step}</div>
                                        <div>
                                            <p className="text-[13px] font-bold text-white mb-0.5">{s.label}</p>
                                            <p className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3 text-[13px] text-slate-400 leading-relaxed">
                                <p>As <strong className="text-white">SuperAdmin</strong>, your downloads are <strong className="text-orange-400">instant</strong> — no approval needed.</p>
                                <p>Leads are immediately marked as <code className="text-[11px] bg-white/5 px-1.5 py-0.5 rounded text-orange-300 font-mono">downloaded</code> and deducted from the available pool.</p>
                                <p>Automatic <strong className="text-emerald-400">DNC scrubbing</strong> occurs in the background for large batches.</p>
                            </div>
                        )}
                    </div>

                    {/* Selected summary & State Breakdown */}
                    <div className="bg-gradient-to-b from-[#161824] to-[#13151f] border border-white/[0.07] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-5">
                            <BarChart3 className="h-4.5 w-4.5 text-brand-400" />
                            Data Availability Overview
                        </h3>
                        
                        <div className="space-y-3 text-[13px]">
                            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                <span className="text-slate-400 font-medium">Selected Vendor</span>
                                <span className="text-white font-bold tracking-wide">{selectedVendor?.name || '—'}</span>
                            </div>
                            
                            {selectedVendor && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col justify-center items-center text-center">
                                        <span className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider mb-1">Available Leads</span>
                                        <span className="text-emerald-400 font-mono font-black text-lg">{parseInt(selectedVendor.available_leads).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex flex-col justify-center items-center text-center">
                                        <span className="text-[10px] text-orange-400/80 font-bold uppercase tracking-wider mb-1">Downloaded</span>
                                        <span className="text-orange-400 font-mono font-black text-lg">{parseInt(selectedVendor.downloaded_leads).toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {/* State Breakdown Section */}
                            {form.vendor_id && (
                                <div className="mt-6 pt-5 border-t border-white/10">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                                        <h4 className="text-[11px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 text-brand-400" />
                                            State Breakdown
                                        </h4>
                                        
                                        {/* Header right controls */}
                                        <div className="flex items-center gap-3">
                                            {loadingCounts && <div className="h-3 w-3 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin" />}
                                            {Object.keys(stateCounts).length > 0 && (
                                                <div className="text-[10px] text-slate-400 font-bold bg-white/[0.03] px-2 py-1 rounded border border-white/5">
                                                    Total: <span className="text-emerald-400">{Object.values(stateCounts).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {!loadingCounts && Object.keys(stateCounts).length === 0 && (
                                        <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/5 border-dashed">
                                            <p className="text-xs text-slate-500">No leads found for these filters.</p>
                                        </div>
                                    )}

                                    {/* Scrollable grid of mini-cards */}
                                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-1.5">
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {Object.entries(stateCounts)
                                                .sort((a, b) => b[1] - a[1]) // Sort by count descending
                                                .map(([state, count]) => {
                                                    const maxCount = Math.max(...Object.values(stateCounts));
                                                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                                    const stateName = US_STATES.find(s => s.abbr === state)?.name || state;

                                                    return (
                                                        <div key={state} className="group relative bg-[#0a0c14]/50 border border-white/5 hover:border-brand-500/30 rounded-xl p-2 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-brand-500/10 hover:bg-[#0a0c14]/80 flex flex-col justify-between min-h-[56px]">
                                                            {/* Progress bar indicator at bottom */}
                                                            <div 
                                                                className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-1000 ease-out z-0 opacity-80" 
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                            
                                                            <div className="relative z-10 flex justify-between items-start mb-0.5">
                                                                <span className="text-[10px] font-black text-white leading-none">{state}</span>
                                                            </div>
                                                            
                                                            <div className="relative z-10">
                                                                <div className={`font-mono font-black text-[11px] tracking-tight leading-none ${count > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                                                                    {count.toLocaleString()}
                                                                </div>
                                                                <div className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 truncate max-w-full">
                                                                    {stateName}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>



            {/* ── MY REQUESTS TABLE (Admin only) ──────────────── */}
            {isAdmin && (
                <div className="mt-10">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-lg font-black text-white">My Download Requests</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Track the status of your submitted requests</p>
                        </div>
                        <button
                            onClick={fetchMyReqs}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/8 border border-white/8 rounded-xl text-xs text-slate-300 font-semibold transition-all hover:border-white/15"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loadingReq ? 'animate-spin' : ''}`} />Refresh
                        </button>
                    </div>

                    {loadingReq ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-7 w-7 border-2 border-brand-500/50 border-t-brand-400 rounded-full animate-spin" />
                        </div>
                    ) : myRequests.length === 0 ? (
                        <div className="bg-[#13151f] border border-white/[0.07] rounded-2xl p-14 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center mx-auto mb-4">
                                <Send className="h-7 w-7 text-slate-700" />
                            </div>
                            <p className="text-slate-400 font-bold">No requests yet</p>
                            <p className="text-slate-600 text-sm mt-1">Submit your first request using the form above</p>
                        </div>
                    ) : (
                        <div className="bg-[#13151f] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                                            {['#', 'Vendor', 'Quantity', 'Age Range', 'States', 'Campaign', 'Requested', 'Status', 'Action'].map(h => (
                                                <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em] whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {myRequests.map((req, i) => (
                                            <tr key={req.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-5 py-4 text-slate-600 font-mono text-xs">{i + 1}</td>
                                                <td className="px-5 py-4">
                                                    <span className="font-semibold text-white">{req.vendor_name || 'All Vendors'}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="font-mono text-orange-400 font-bold">{req.quantity?.toLocaleString()}</span>
                                                </td>
                                                <td className="px-5 py-4 text-slate-400 text-xs font-mono whitespace-nowrap">
                                                    {req.min_age || req.max_age 
                                                        ? `${req.min_age || 0} — ${req.max_age || '∞'}`
                                                        : <span className="text-slate-600">All Ages</span>}
                                                </td>
                                                <td className="px-5 py-4 text-slate-400 text-xs">
                                                    {req.states?.length > 0
                                                        ? <span title={req.states.join(', ')}>{req.states.slice(0, 3).join(', ')}{req.states.length > 3 ? ` +${req.states.length - 3}` : ''}</span>
                                                        : <span className="text-slate-600">Any</span>}
                                                </td>
                                                <td className="px-5 py-4 text-slate-400">{req.campaign_name || <span className="text-slate-600">All</span>}</td>
                                                <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-3 w-3" />
                                                        {fmtDate(req.requested_at)}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusBadge status={req.status} />
                                                    {req.status === 'rejected' && req.rejection_reason && (
                                                        <p className="text-[10px] text-red-400/60 mt-1 max-w-[150px] truncate" title={req.rejection_reason}>
                                                            {req.rejection_reason}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {req.status === 'accepted' ? (
                                                        <button
                                                            onClick={() => handleDownloadCSV(req)}
                                                            disabled={dlId === req.id}
                                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/25 transition-all hover:-translate-y-0.5"
                                                        >
                                                            {dlId === req.id
                                                                ? <div className="h-3.5 w-3.5 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                                                                : <FileDown className="h-3.5 w-3.5" />}
                                                            Download CSV
                                                        </button>
                                                    ) : req.status === 'pending' ? (
                                                        <span className="text-[11px] text-amber-400/50 italic flex items-center gap-1.5">
                                                            <Clock className="h-3 w-3" />Awaiting
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-600 italic">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.01]">
                                <p className="text-[11px] text-slate-700">{myRequests.length} request{myRequests.length !== 1 ? 's' : ''} total</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* ── Interactive Scrub Summary Dialog Modal ── */}
            <ScrubSummaryModal data={scrubSummaryData} onClose={() => setScrubSummaryData(null)} />
        </div>
    );
};

export default DownloadLeads;
