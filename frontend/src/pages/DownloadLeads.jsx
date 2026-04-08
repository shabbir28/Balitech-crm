import React, { useState, useEffect, useRef, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
    Send, Download, AlertCircle, ChevronDown, Check,
    Clock, CheckCircle2, XCircle, RefreshCw, FileDown,
    Building2, Hash, Calendar, Info, Sparkles, ArrowRight
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
    <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-[0.12em]">
            {label}{required && <span className="text-orange-500">*</span>}
        </label>
        {children}
        {hint && <p className="text-[11px] text-slate-600 leading-relaxed">{hint}</p>}
    </div>
);

const SelectInput = ({ value, onChange, disabled, required, placeholder, children }) => (
    <div className="relative">
        <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className="w-full bg-[#0d0f1a] border border-white/8 text-white rounded-xl py-3.5 px-4 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-white/15"
        >
            {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
    </div>
);

// ─────────────────────────────────────────────────────────────
const DownloadLeads = () => {
    const { user } = useContext(AuthContext);
    const isSuperAdmin = user?.role === 'super_admin';
    const isAdmin      = user?.role === 'admin';

    const [vendors, setVendors]         = useState([]);
    const [campaigns, setCampaigns]     = useState([]);
    const [loadingV, setLoadingV]       = useState(true);
    const [loadingC, setLoadingC]       = useState(true);

    const [form, setForm] = useState({ states: [], campaign_id: '', vendor_id: '', quantity: 1000 });
    const [submitting, setSubmitting]   = useState(false);
    const [error, setError]             = useState('');
    const [successMsg, setSuccessMsg]   = useState('');

    const [stateOpen, setStateOpen]     = useState(false);
    const stateRef = useRef(null);

    const [myRequests, setMyRequests]   = useState([]);
    const [loadingReq, setLoadingReq]   = useState(false);
    const [dlId, setDlId]               = useState(null);

    useEffect(() => {
        Promise.all([api.get('/vendors'), api.get('/campaigns')])
            .then(([v, c]) => { setVendors(v.data); setCampaigns(c.data.filter(x => x.status === 'Active')); })
            .catch(() => {})
            .finally(() => { setLoadingV(false); setLoadingC(false); });
    }, []);

    const fetchMyReqs = async () => {
        if (!isAdmin) return;
        setLoadingReq(true);
        try { const r = await api.get('/download/requests/mine'); setMyRequests(r.data); }
        catch {} finally { setLoadingReq(false); }
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
                const res = await api.post('/download', form, { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const a = document.createElement('a');
                a.href = url; a.setAttribute('download', `leads_${Date.now()}.csv`);
                document.body.appendChild(a); a.click(); a.remove();
                setSuccessMsg('Download started successfully!');
            } else {
                await api.post('/download/request', form);
                setSuccessMsg('Request submitted! SuperAdmin will review it shortly.');
                setForm({ states: [], campaign_id: '', vendor_id: '', quantity: 1000 });
                fetchMyReqs();
            }
        } catch (err) {
            if (err.response?.data instanceof Blob) {
                const txt = await err.response.data.text();
                try { setError(JSON.parse(txt).message); } catch { setError('Request failed.'); }
            } else { setError(err.response?.data?.message || 'Request failed.'); }
        } finally { setSubmitting(false); }
    };

    const handleDownloadCSV = async (req) => {
        setDlId(req.id);
        try {
            const res = await api.get(`/download/requests/${req.id}/file`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url; a.setAttribute('download', `approved_leads_${req.id}.csv`);
            document.body.appendChild(a); a.click(); a.remove();
        } catch { alert('Download failed. Try again.'); }
        finally { setDlId(null); }
    };

    const selectedVendor = vendors.find(v => String(v.vendor_id) === String(form.vendor_id));

    return (
        <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── Page hero ─────────────────────────────────── */}
            <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1040] via-[#16112e] to-[#0f0f1a] border border-white/8 p-8">
                {/* Decorative blobs */}
                <div className="absolute -top-16 -right-16 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center shadow-[0_8px_24px_rgba(249,115,22,0.35)]">
                            {isSuperAdmin ? <Download className="h-7 w-7 text-white" /> : <Send className="h-7 w-7 text-white" />}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">
                                {isSuperAdmin ? 'Export Data' : 'Download Request'}
                            </h1>
                            <p className="text-slate-400 text-sm mt-0.5">
                                {isSuperAdmin
                                    ? 'Directly export targeted leads as CSV'
                                    : 'Submit a request — SuperAdmin will approve & prepare your data'}
                            </p>
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <Info className="h-4 w-4 text-blue-400 shrink-0" />
                            <p className="text-xs text-blue-300 font-medium">Requires SuperAdmin approval</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                {/* ── LEFT: Form ──────────────────────────────── */}
                <div className="xl:col-span-3 space-y-6">

                    {/* Form card */}
                    <div className="bg-[#13151f] border border-white/[0.07] rounded-2xl overflow-hidden shadow-2xl">
                        {/* Card header */}
                        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
                            <Sparkles className="h-4 w-4 text-orange-400" />
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
                                            className="w-full bg-[#0d0f1a] border border-white/8 hover:border-white/15 text-white rounded-xl py-3.5 px-4 flex justify-between items-center transition-all text-sm"
                                        >
                                            <span className={form.states.length === 0 ? 'text-slate-500' : 'text-white font-medium'}>
                                                {form.states.length === 0 ? 'Any state...' : `${form.states.length} state${form.states.length > 1 ? 's' : ''} selected`}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${stateOpen ? 'rotate-180' : ''}`} />
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

                                {/* Campaign */}
                                <Field label="Campaign Filter" required hint="Select the campaign to export from">
                                    <SelectInput
                                        value={form.campaign_id}
                                        onChange={e => setForm({ ...form, campaign_id: e.target.value })}
                                        disabled={loadingC}
                                        required
                                    >
                                        <option value="" disabled>{loadingC ? 'Loading...' : 'Choose a campaign...'}</option>
                                        {campaigns.map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>)}
                                    </SelectInput>
                                </Field>
                            </div>

                            {/* Quantity */}
                            <Field label="Quantity" required hint="Max 50,000 per request recommended">
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                    <input
                                        type="number" min="1" max="50000" required
                                        value={form.quantity}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setForm({ ...form, quantity: val === '' ? '' : parseInt(val) });
                                        }}
                                        className="w-full bg-[#0d0f1a] border border-white/8 hover:border-white/15 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 text-white rounded-xl py-3.5 pl-11 pr-4 outline-none transition-all text-sm font-mono"
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
                    <div className="bg-[#13151f] border border-white/[0.07] rounded-2xl p-5">
                        <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-400" />
                            {isSuperAdmin ? 'Export Info' : 'How It Works'}
                        </h3>
                        {isAdmin ? (
                            <div className="space-y-3">
                                {[
                                    { step: '1', label: 'Fill out the form', desc: 'Select vendor, quantity and any filters' },
                                    { step: '2', label: 'Submit request', desc: 'Your request goes to SuperAdmin for review' },
                                    { step: '3', label: 'Get notified', desc: 'You\'ll receive a notification when approved' },
                                    { step: '4', label: 'Download CSV', desc: 'Click Download CSV in the requests table below' },
                                ].map(s => (
                                    <div key={s.step} className="flex items-start gap-3">
                                        <div className="h-6 w-6 rounded-lg bg-brand-500/20 border border-brand-500/30 text-brand-400 text-xs font-black flex items-center justify-center shrink-0">{s.step}</div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{s.label}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2 text-sm text-slate-400">
                                <p>As <strong className="text-white">SuperAdmin</strong>, your downloads are <strong className="text-orange-400">instant</strong> — no approval needed.</p>
                                <p className="mt-2">Leads are immediately marked as <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded text-orange-300">downloaded</code> and deducted from the pool.</p>
                            </div>
                        )}
                    </div>

                    {/* Selected summary */}
                    <div className="bg-[#13151f] border border-white/[0.07] rounded-2xl p-5 space-y-3">
                        <h3 className="font-bold text-white text-sm">Request Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-slate-500">Vendor</span>
                                <span className="text-white font-medium">{selectedVendor?.name || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-slate-500">Quantity</span>
                                <span className="text-orange-400 font-mono font-bold">{form.quantity?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-slate-500">States</span>
                                <span className="text-white">{form.states.length > 0 ? `${form.states.length} selected` : 'All'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-slate-500">Campaign</span>
                                <span className="text-white">{campaigns.find(c => String(c.campaign_id) === String(form.campaign_id))?.name || 'All'}</span>
                            </div>
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
                                            {['#', 'Vendor', 'Quantity', 'States', 'Campaign', 'Requested', 'Status', 'Action'].map(h => (
                                                <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em] whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {myRequests.map((req, i) => (
                                            <tr key={req.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-5 py-4 text-slate-600 font-mono text-xs">{i + 1}</td>
                                                <td className="px-5 py-4">
                                                    <span className="font-semibold text-white">{req.vendor_name || '—'}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="font-mono text-orange-400 font-bold">{req.quantity?.toLocaleString()}</span>
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
        </div>
    );
};

export default DownloadLeads;
