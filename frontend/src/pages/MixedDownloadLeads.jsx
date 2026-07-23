import React, { useState, useEffect, useRef, useContext } from 'react';
import api from '../services/api';
import {
    Send, Download, AlertCircle, ChevronDown, Check,
    Clock, CheckCircle2, XCircle, RefreshCw, FileDown,
    Building2, Hash, Calendar, Info, Sparkles, ArrowRight, BarChart3, MapPin, Layers
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const SCRUB_POLL_INTERVAL_MS = 5000;
const SCRUB_POLL_MAX_MS = 60 * 60 * 1000;

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
            className="w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 text-white rounded-xl py-3.5 px-4 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/60 transition-all cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-violet-500/30 shadow-inner group-hover:bg-[#0a0c14]/80"
        >
            {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-violet-400 transition-colors" />
    </div>
);

const downloadFromApiUrl = async (url, filename) => {
    if (!url) return;

    const apiPath = String(url).startsWith('/api/')
        ? String(url).replace(/^\/api/, '')
        : String(url);

    const res = await api.get(apiPath, { responseType: 'blob' });

    const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename || 'mixed_download.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
};

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

const ScrubSummaryInline = ({ data, onClose, scrubPolling }) => {
    if (!data) return null;

    const { summary, badCsv } = data;
    const isPending = summary.scrubPending === true || scrubPolling;

    const handleDownloadBad = async () => {
        const badFileName = data.badFileName || (summary.fileName || `mixed_leads_${Date.now()}.csv`).replace('.csv', '_bad_dnc.csv');

        if (data.badDownloadUrl) {
            return downloadFromApiUrl(data.badDownloadUrl, badFileName);
        }

        if (!badCsv) return;
        downloadBlob(badCsv, badFileName);
    };

    const handleDownloadGood = async () => {
        const goodFileName = data.fileName || summary.fileName || `mixed_leads_${Date.now()}.csv`;

        if (data.downloadUrl) {
            return downloadFromApiUrl(data.downloadUrl, goodFileName);
        }

        if (!data.csv) return;
        downloadBlob(data.csv, goodFileName);
    };

        const badTotal = Number(summary.blacklist || 0) + Number(summary.stateDnc || 0) + Number(summary.federalDnc || 0) + Number(summary.badPhone || 0);
    const goodTotal = Number(summary.good || data.count || 0);
    const displayTotal = goodTotal + badTotal;
    const hasBadLeads = badTotal > 0;

    if (summary.scrubFailed) {
        return (
            <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                <p className="text-sm font-bold text-red-300">Scrub failed</p>
                <p className="text-xs text-red-200/80 mt-1">{summary.scrubError || 'Background scrub could not complete.'}</p>
            </div>
        );
    }

    return (
        <div className="mt-6 bg-[#13151f]/80 backdrop-blur-xl border border-white/[0.07] rounded-2xl p-6 shadow-2xl relative animate-fade-in">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                        <Sparkles className="h-4.5 w-4.5 text-white animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">Last Export Scrub Summary</h3>
                        <p className="text-[11px] text-slate-500">Blacklist Alliance TCPA & DNC results</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-slate-550 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-colors shrink-0"
                    title="Clear Summary"
                >
                    <XCircle className="h-5 w-5" />
                </button>
            </div>

            {isPending && (
                <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
                    <RefreshCw className="h-5 w-5 text-amber-400 shrink-0 animate-spin mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-200">Scrub in progress…</p>
                        <p className="text-[11px] text-amber-100/70 mt-1 leading-relaxed">
                            Large exports run Blacklist Alliance in the background. This page will update automatically with the full breakdown when done.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-3 rounded-xl bg-[#0a0c14]/40 border border-white/5 text-[11px]">
                <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                    <span className="font-semibold text-white">{summary.scrubDate || new Date().toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 min-w-0">
                    <Layers className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                    <span className="font-semibold text-violet-400 truncate" title={summary.fileName}>{summary.fileName || 'mixed_leads.csv'}</span>
                </div>
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5 ${isPending ? 'opacity-60' : ''}`}>
                <div className="bg-slate-500/5 border border-white/5 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total</p>
                    <p className="text-base font-mono font-black text-white">{displayTotal.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5">Good Leads</p>
                    <p className="text-base font-mono font-black text-emerald-400">{summary.good?.toLocaleString()}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider mb-0.5">Blacklist</p>
                    <p className="text-base font-mono font-black text-red-400">{summary.blacklist?.toLocaleString()}</p>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-orange-400 font-bold uppercase tracking-wider mb-0.5">State DNC</p>
                    <p className="text-base font-mono font-black text-orange-400">{summary.stateDnc?.toLocaleString()}</p>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-orange-500 font-bold uppercase tracking-wider mb-0.5">Fed DNC</p>
                    <p className="text-base font-mono font-black text-orange-500">{summary.federalDnc?.toLocaleString()}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider mb-0.5">Bad Phone</p>
                    <p className="text-base font-mono font-black text-red-500">{summary.badPhone?.toLocaleString()}</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider mb-0.5">Errors</p>
                    <p className="text-base font-mono font-black text-amber-500">{summary.errors?.toLocaleString()}</p>
                </div>
            </div>

            {!isPending && (
                <div className="flex flex-col gap-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Choose Download</p>
                    <div className="grid grid-cols-1 gap-2">
                        {(data.csv || data.downloadUrl) && (
                            <button
                                type="button"
                                onClick={handleDownloadGood}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-400/40 text-emerald-400 font-bold text-xs rounded-xl transition-all"
                            >
                                <FileDown className="h-4 w-4 shrink-0" />
                                Download Good Leads Only&nbsp;&nbsp;<span className="bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono">{summary.good?.toLocaleString()}</span>
                            </button>
                        )}
                        {hasBadLeads && (badCsv || data.badDownloadUrl) && (
                            <button
                                type="button"
                                onClick={handleDownloadBad}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 hover:border-red-400/40 text-red-400 font-bold text-xs rounded-xl transition-all"
                            >
                                <FileDown className="h-4 w-4 shrink-0" />
                                Download Bad/DNC Leads Only&nbsp;&nbsp;<span className="bg-red-500/20 px-2 py-0.5 rounded-full font-mono">{badTotal.toLocaleString()}</span>
                            </button>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};


const MixedDownloadLeads = () => {
    const { user } = useContext(AuthContext);
    const isSuperAdmin = user?.role === 'super_admin';
    const isAdmin = user?.role === 'admin';
    const canDownloadDirectly = isSuperAdmin || isAdmin;

    const [vanVendors, setVanVendors]         = useState([]);
    const [refineVendors, setRefineVendors]   = useState([]);
    const [premiumVendors, setPremiumVendors] = useState([]);
    const [loadingV, setLoadingV]       = useState(true);

    const [vanCampaigns, setVanCampaigns]         = useState([]);
    const [refineCampaigns, setRefineCampaigns]   = useState([]);
    const [premiumCampaigns, setPremiumCampaigns] = useState([]);

    const [filters, setFilters] = useState([]);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [selectedFilterId, setSelectedFilterId] = useState('');

    const [form, setForm] = useState({
        states: [],
        quantity: 1000,
        van_percentage: 50,
        refine_percentage: 30,
        premium_percentage: 20,
        van_vendor: 'all',
        refine_vendor: 'all',
        premium_vendor: 'all',
        campaign_id: null,
        global_campaign: 'all',
        van_campaign: 'all',
        refine_campaign: 'all',
        premium_campaign: 'all',
        quality: 'All',
        min_age: '',
        max_age: '',
        include_downloaded: false,
    });
    const [submitting, setSubmitting]   = useState(false);
    const [error, setError]             = useState('');
    const [successMsg, setSuccessMsg]   = useState('');

    const [stateOpen, setStateOpen]     = useState(false);
    const stateRef = useRef(null);

    const [scrubSummaryData, setScrubSummaryData] = useState(null);
    const [scrubPolling] = useState(false);
    const scrubPollCancelRef = useRef(false);


    useEffect(() => {
        Promise.all([
            api.get('/van-campaigns').catch(() => ({ data: [] })),
            api.get('/refine-campaigns').catch(() => ({ data: [] })),
            api.get('/premium-campaigns').catch(() => ({ data: [] }))
        ]).then(([vanRes, refRes, premRes]) => {
            setVanCampaigns(vanRes.data.filter(c => c.status === 'Active') || []);
            setRefineCampaigns(refRes.data.filter(c => c.status === 'Active') || []);
            setPremiumCampaigns(premRes.data.filter(c => c.status === 'Active') || []);
        });
            
        Promise.all([
            api.get('/van-vendors?counts=true').catch(() => ({ data: [] })),
            api.get('/refine-vendors?counts=true').catch(() => ({ data: [] })),
            api.get('/premium-vendors?counts=true').catch(() => ({ data: [] }))
        ])
        .then(([vanRes, refineRes, premiumRes]) => {
            setVanVendors(vanRes.data || []);
            setRefineVendors(refineRes.data || []);
            setPremiumVendors(premiumRes.data || []);
        })
        .finally(() => setLoadingV(false));

        api.get('/filters')
            .then(res => setFilters(res.data))
            .catch(() => {})
            .finally(() => setLoadingFilters(false));
    }, []);

    useEffect(() => () => {
        scrubPollCancelRef.current = true;
    }, []);

    useEffect(() => {
        const h = (e) => { if (stateRef.current && !stateRef.current.contains(e.target)) setStateOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);


    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.quantity || form.quantity <= 0) { setError('Please enter a valid quantity.'); return; }
        const van = parseInt(form.van_percentage) || 0;
        const refine = parseInt(form.refine_percentage) || 0;
        const premium = parseInt(form.premium_percentage) || 0;

        if (van + refine + premium !== 100) {
            setError('Percentages must sum up to exactly 100.');
            return;
        }

        setSubmitting(true); setError(''); setSuccessMsg('');
        try {
            const timeoutMs = 30 * 60 * 1000;
            if (canDownloadDirectly) {
                const res = await api.post('/mixed-download', form, { timeout: timeoutMs });
                setScrubSummaryData(res.data);
                setSuccessMsg('Export complete! Choose what to download from the summary below.');
            } else {
                const res = await api.post('/mixed-download/request', form);
                setSuccessMsg(res.data.message || 'Request submitted successfully to Super Admin.');
            }
        } catch (err) {
            const status = err.response?.status;
            if (status === 502 || status === 504) {
                setError('Gateway timeout — the server is still processing. Try a smaller quantity.');
            } else if (err.code === 'ECONNABORTED') {
                setError('Request timed out on the client side. The download may still finish in the background.');
            } else {
                setError(err.response?.data?.message || 'Request failed.');
            }
        } finally { setSubmitting(false); }
    };

    return (
        <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#120a2e] via-[#0d0a1c] to-[#0a0714] border border-white/5 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-500/10 rounded-full blur-[80px] pointer-events-none -translate-x-1/2 translate-y-1/2" />
                
                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-violet-500/20 rounded-2xl blur-xl group-hover:bg-violet-500/30 transition-all duration-500" />
                            <div className="relative h-16 w-16 bg-[#0a0c14] border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-all duration-300">
                                <Download className="h-7 w-7 text-violet-400" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60 tracking-tight">
                                Mixed Data Download
                            </h1>
                            <p className="text-sm text-slate-400 mt-2 font-medium max-w-xl leading-relaxed">
                                Download leads by combining Van Desk, Refine, and Premium data using custom percentages.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-3 space-y-6">
                    <div className="bg-[#13151f] border border-white/[0.07] rounded-3xl p-7 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

                        {error && (
                            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-red-300">Error</h4>
                                    <p className="text-xs text-red-200/80 mt-1">{error}</p>
                                </div>
                            </div>
                        )}
                        {successMsg && (
                            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-emerald-300">Success</h4>
                                    <p className="text-xs text-emerald-200/80 mt-1">{successMsg}</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                
                                {/* Percents & Vendors */}
                                <div className="space-y-4">
                                    <Field label="Van Desk %" required hint="Percentage of Van Desk leads">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={form.van_percentage}
                                            disabled={user?.role !== 'super_admin'}
                                            onChange={e => setForm({ ...form, van_percentage: e.target.value })}
                                            className={`w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-violet-500/60 transition-all text-sm ${user?.role !== 'super_admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            placeholder="50"
                                        />
                                    </Field>
                                    <Field label="Van Desk Vendor">
                                        <SelectInput
                                            value={form.van_vendor}
                                            onChange={e => setForm({ ...form, van_vendor: e.target.value })}
                                            disabled={loadingV}
                                        >
                                            <option value="all">All Vendors</option>
                                            {vanVendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.name} ({v.available_leads || 0} available)</option>)}
                                        </SelectInput>
                                    </Field>
                                </div>

                                <div className="space-y-4">
                                    <Field label="Refine %" required hint="Percentage of Refine leads">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={form.refine_percentage}
                                            disabled={user?.role !== 'super_admin'}
                                            onChange={e => setForm({ ...form, refine_percentage: e.target.value })}
                                            className={`w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-violet-500/60 transition-all text-sm ${user?.role !== 'super_admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            placeholder="30"
                                        />
                                    </Field>
                                    <Field label="Refine Vendor">
                                        <SelectInput
                                            value={form.refine_vendor}
                                            onChange={e => setForm({ ...form, refine_vendor: e.target.value })}
                                            disabled={loadingV}
                                        >
                                            <option value="all">All Vendors</option>
                                            {refineVendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.name} ({v.available_leads || 0} available)</option>)}
                                        </SelectInput>
                                    </Field>
                                </div>

                                <div className="space-y-4">
                                    <Field label="Premium %" required hint="Percentage of Premium leads">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={form.premium_percentage}
                                            disabled={user?.role !== 'super_admin'}
                                            onChange={e => setForm({ ...form, premium_percentage: e.target.value })}
                                            className={`w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-violet-500/60 transition-all text-sm ${user?.role !== 'super_admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            placeholder="20"
                                        />
                                    </Field>
                                    <Field label="Premium Vendor">
                                        <SelectInput
                                            value={form.premium_vendor}
                                            onChange={e => setForm({ ...form, premium_vendor: e.target.value })}
                                            disabled={loadingV}
                                        >
                                            <option value="all">All Vendors</option>
                                            {premiumVendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.name} ({v.available_leads || 0} available)</option>)}
                                        </SelectInput>
                                    </Field>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Global Campaign Selection */}
                                <Field label="Campaign Filter" hint="Select campaign for all 3 data modules">
                                    <SelectInput
                                        value={form.global_campaign}
                                        onChange={e => {
                                            const selectedName = e.target.value;
                                            const vanC = vanCampaigns.find(c => c.name === selectedName);
                                            const refC = refineCampaigns.find(c => c.name === selectedName);
                                            const premC = premiumCampaigns.find(c => c.name === selectedName);
                                            
                                            setForm({
                                                ...form,
                                                global_campaign: selectedName,
                                                campaign_id: selectedName === 'all' ? null : ((vanC || refC || premC)?.campaign_id || null),
                                                van_campaign: vanC ? String(vanC.campaign_id) : (selectedName === 'all' ? 'all' : ''),
                                                refine_campaign: refC ? selectedName : (selectedName === 'all' ? 'all' : ''),
                                                premium_campaign: premC ? selectedName : (selectedName === 'all' ? 'all' : '')
                                            });
                                        }}
                                    >
                                        <option value="all">All Campaigns</option>
                                        {[...new Set([
                                            ...vanCampaigns.map(c => c.name),
                                            ...refineCampaigns.map(c => c.name),
                                            ...premiumCampaigns.map(c => c.name)
                                        ])].map((name, i) => (
                                            <option key={i} value={name}>{name}</option>
                                        ))}
                                    </SelectInput>
                                </Field>

                                {/* Data Filter Preset */}
                                <Field label="Data Filter Preset" hint="Auto-selects states for you">
                                    <SelectInput
                                        value={selectedFilterId}
                                        onChange={e => {
                                            const filterId = e.target.value;
                                            setSelectedFilterId(filterId);
                                            const selectedFilter = filters.find(f => String(f.id) === String(filterId));
                                            if (selectedFilter && selectedFilter.states) {
                                                setForm(prev => ({ ...prev, states: selectedFilter.states }));
                                            }
                                        }}
                                        disabled={loadingFilters}
                                    >
                                        <option value="" disabled>{loadingFilters ? 'Loading filters...' : 'Choose a preset...'}</option>
                                        {filters.map(f => (
                                            <option key={f.id} value={f.id}>{f.name} ({f.states?.length || 0} states)</option>
                                        ))}
                                    </SelectInput>
                                </Field>

                                {/* Quantity Input */}
                                <Field label="Total Quantity" required hint="Total leads to fetch. Will be split by percentages.">
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={form.quantity}
                                            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                            className="w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 text-white rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/60 transition-all font-mono text-sm shadow-inner"
                                            placeholder="Enter total quantity"
                                        />
                                    </div>
                                </Field>

                                {/* Multi-State Select */}
                                <Field label="Filter by States" hint="Leave empty for all states">
                                    <div className="relative" ref={stateRef}>
                                        <button
                                            type="button"
                                            onClick={() => setStateOpen(!stateOpen)}
                                            className="w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 text-left rounded-xl py-3.5 px-4 flex justify-between items-center transition-all text-sm group shadow-inner hover:bg-[#0a0c14]/80 hover:border-violet-500/30"
                                        >
                                            <span className={form.states.length === 0 ? "text-slate-500" : "text-white font-medium"}>
                                                {form.states.length === 0 ? "All States" : `${form.states.length} selected`}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform text-slate-500 ${stateOpen ? 'rotate-180 text-violet-400' : 'group-hover:text-violet-400'}`} />
                                        </button>
                                        
                                        {stateOpen && (
                                            <div className="absolute z-50 w-[300px] sm:w-full mt-1.5 bg-[#16192a] border border-white/10 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-h-[300px] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                <div className="p-3 border-b border-white/10 bg-[#11131f]">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <MapPin className="h-4 w-4 text-slate-400" />
                                                        <span className="text-xs font-bold text-white uppercase tracking-wider">Select States</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setForm(p => ({ ...p, states: US_STATES.map(s => s.abbr) }))}
                                                            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors border border-white/5"
                                                        >
                                                            Select All
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setForm(p => ({ ...p, states: [] }))}
                                                            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors border border-white/5"
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="p-2 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ffffff20 transparent' }}>
                                                    <div className="grid grid-cols-2 gap-1">
                                                        {US_STATES.map((s) => {
                                                            const checked = form.states.includes(s.abbr);
                                                            return (
                                                                <label key={s.abbr} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${checked ? 'bg-violet-500/10 border-violet-500/30' : 'border-transparent hover:bg-white/5 hover:border-white/10'}`}>
                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-violet-500 border-violet-400' : 'border-white/20 bg-black/20'}`}>
                                                                        {checked && <Check className="h-3 w-3 text-white" />}
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className={`text-xs font-semibold truncate ${checked ? 'text-violet-300' : 'text-slate-300'}`}>{s.name}</span>
                                                                        <span className="text-[9px] text-slate-500">{s.abbr}</span>
                                                                    </div>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Field>

                                {/* Age Range */}
                                <Field label="Age Range" hint="Leave empty for any age">
                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min="18"
                                                placeholder="Min"
                                                value={form.min_age}
                                                onChange={(e) => setForm({ ...form, min_age: e.target.value })}
                                                className="w-full bg-[#0a0c14]/50 border border-white/10 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-violet-500/60 transition-all text-sm placeholder:text-slate-600 shadow-inner"
                                            />
                                        </div>
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min="18"
                                                placeholder="Max"
                                                value={form.max_age}
                                                onChange={(e) => setForm({ ...form, max_age: e.target.value })}
                                                className="w-full bg-[#0a0c14]/50 border border-white/10 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:border-violet-500/60 transition-all text-sm placeholder:text-slate-600 shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </Field>

                            </div>

                            <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={form.include_downloaded}
                                            onChange={(e) => setForm({ ...form, include_downloaded: e.target.checked })}
                                            className="peer sr-only"
                                        />
                                        <div className="w-5 h-5 rounded border border-white/20 bg-black/20 peer-checked:bg-violet-500 peer-checked:border-violet-500 transition-all flex items-center justify-center group-hover:border-violet-500/50">
                                            <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Re-download</span>
                                        <p className="text-[10px] text-slate-500">Include previously downloaded leads</p>
                                    </div>
                                </label>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="relative flex items-center gap-2 bg-white text-black hover:bg-slate-200 px-8 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{canDownloadDirectly ? 'Export Mixed Data' : 'Submit Download Request'}</span>
                                            <Send className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    <ScrubSummaryInline 
                        data={scrubSummaryData} 
                        onClose={() => setScrubSummaryData(null)} 
                        scrubPolling={scrubPolling}
                    />

                </div>

                {/* ── RIGHT: Info / Summary ────────────────────── */}
                <div className="xl:col-span-2 space-y-4">
                    {/* Selected States Summary */}
                    <div className="bg-gradient-to-b from-[#161824] to-[#13151f] border border-white/[0.07] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-5">
                            <MapPin className="h-4.5 w-4.5 text-violet-400" />
                            Selected States
                        </h3>
                        
                        <div className="space-y-3 text-[13px]">
                            {form.states.length === 0 ? (
                                <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/5 border-dashed">
                                    <p className="text-xs text-slate-500">All States Selected.</p>
                                </div>
                            ) : (
                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                                        {form.states.map(stateAbbr => {
                                            const stateName = US_STATES.find(s => s.abbr === stateAbbr)?.name || stateAbbr;
                                            return (
                                                <div key={stateAbbr} className="group relative bg-[#0a0c14]/60 border border-white/10 hover:border-violet-500/40 rounded-xl p-2.5 overflow-hidden transition-all duration-300 shadow-sm flex flex-col items-center justify-center min-h-[60px]">
                                                    <div className="font-mono font-black text-[14px] text-white tracking-tight leading-none">
                                                        {stateAbbr}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mt-1 truncate max-w-full">
                                                        {stateName}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info card */}
                    <div className="bg-[#13151f]/80 backdrop-blur-xl border border-white/[0.07] rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mt-4">
                        <h3 className="font-bold text-white text-sm mb-5 flex items-center gap-2">
                            <Info className="h-4.5 w-4.5 text-blue-400" />
                            Export Workflow
                        </h3>
                        <div className="space-y-3 text-[13px] text-slate-400 leading-relaxed">
                            <p>This action combines leads from <strong className="text-white">Van Desk</strong>, <strong className="text-white">Refine</strong>, and <strong className="text-white">Premium</strong> based on your percentages.</p>
                            <p>Leads are immediately marked as <code className="text-[11px] bg-white/5 px-1.5 py-0.5 rounded text-orange-300 font-mono">downloaded</code> and deducted from the available pools.</p>
                            <p>Automatic <strong className="text-emerald-400">DNC scrubbing</strong> occurs in the background.</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MixedDownloadLeads;
