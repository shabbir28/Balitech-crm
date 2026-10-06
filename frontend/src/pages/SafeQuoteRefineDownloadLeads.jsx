import React, { useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
    Download, AlertCircle, ChevronDown, CheckCircle2, Check, Sparkles,
    ArrowRight, BarChart3, Building2, Hash, MapPin, FileDown, XCircle
} from 'lucide-react';

const downloadBlob = (text, name) => {
    const blob = new Blob([text || ''], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

const ScrubSummary = ({ data, onClose, onRequest, requesting }) => {
    if (!data?.summary) return null;
    const { summary, badCsv } = data;
    const goodCsv = data.goodCsv || data.csv;
    const badTotal = (summary.blacklist || 0) + (summary.stateDnc || 0) + (summary.federalDnc || 0) + (summary.badPhone || 0);
    const cards = [
        ['Total', summary.total, 'text-white', 'bg-slate-500/5 border-white/5'],
        ['Good Leads', summary.good, 'text-emerald-400', 'bg-emerald-500/10 border-emerald-500/20'],
        ['Blacklist', summary.blacklist, 'text-red-400', 'bg-red-500/10 border-red-500/20'],
        ['State DNC', summary.stateDnc, 'text-orange-400', 'bg-orange-500/10 border-orange-500/20'],
        ['Fed DNC', summary.federalDnc, 'text-orange-500', 'bg-orange-500/10 border-orange-500/20'],
        ['Bad Phone', summary.badPhone, 'text-red-500', 'bg-red-500/10 border-red-500/20'],
        ['Errors', summary.errors, 'text-amber-400', 'bg-amber-500/10 border-amber-500/20'],
        ['Suppress', summary.suppress, 'text-slate-300', 'bg-slate-500/10 border-slate-500/20'],
    ];
    const downloadGood = () => downloadBlob(goodCsv, summary.fileName || 'safe_quote_refine.csv');
    const downloadBad = () => downloadBlob(badCsv, (summary.fileName || 'safe_quote_refine.csv').replace('.csv', '_bad_leads.csv'));
    const downloadAll = () => {
        const base = summary.fileName || `safe_quote_refine_${Date.now()}.csv`;
        let merged = goodCsv || '';
        if (goodCsv && badCsv && String(badCsv).trim()) {
            const goodLines = String(goodCsv).trim().split('\n');
            const badLines = String(badCsv).trim().split('\n').slice(1);
            merged = [...goodLines, ...badLines].join('\n');
        } else {
            merged = goodCsv || badCsv || '';
        }
        downloadBlob(merged, base.replace(/\.csv$/i, '_all.csv'));
    };
    return (
        <div className="mt-6 bg-[#13151f]/80 border border-white/[0.07] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">{onRequest ? 'BLA Preview Summary' : 'Last Export Scrub Summary'}</h3>
                        <p className="text-[11px] text-slate-500">Blacklist Alliance TCPA & DNC results</p>
                    </div>
                </div>
                <button type="button" onClick={onClose} className="text-slate-500 hover:text-white hover:bg-white/5 p-1.5 rounded-lg"><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-3 rounded-xl bg-[#0a0c14]/40 border border-white/5 text-[11px]">
                <span className="font-semibold text-white">{summary.scrubDate || new Date().toLocaleString()}</span>
                <span className="font-semibold text-amber-400 truncate">{onRequest ? 'Preview (not downloaded yet)' : (summary.fileName || 'safe_quote_refine.csv')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                {cards.map(([label, value, color, box]) => (
                    <div key={label} className={`border rounded-xl p-2.5 text-center ${box}`}>
                        <p className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${color}`}>{label}</p>
                        <p className={`text-base font-mono font-black ${color}`}>{(value || 0).toLocaleString()}</p>
                    </div>
                ))}
            </div>
            {onRequest ? (
                <button type="button" onClick={onRequest} disabled={requesting || !summary.good} className="w-full py-3.5 rounded-xl bg-amber-500 text-black text-sm font-bold disabled:opacity-50">
                    {requesting ? 'Sending request...' : `Request Good Data Download  ${(summary.good || 0).toLocaleString()} leads`}
                </button>
            ) : (
                <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Choose Download</p>
                    {goodCsv && (
                        <button type="button" onClick={downloadGood} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl">
                            <FileDown className="h-4 w-4" /> Download Good Leads Only <span className="bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono">{(summary.good || 0).toLocaleString()}</span>
                        </button>
                    )}
                    {badCsv && badTotal > 0 && (
                        <button type="button" onClick={downloadBad} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 font-bold text-xs rounded-xl">
                            <FileDown className="h-4 w-4" /> Download Bad/DNC Leads Only <span className="bg-red-500/20 px-2 py-0.5 rounded-full font-mono">{badTotal.toLocaleString()}</span>
                        </button>
                    )}
                    {(goodCsv || badCsv) && (
                        <button type="button" onClick={downloadAll} className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-300 font-bold text-xs rounded-xl">
                            <FileDown className="h-4 w-4" /> Download Full File (Good + Bad) <span className="bg-amber-500/20 px-2 py-0.5 rounded-full font-mono">{(summary.total || 0).toLocaleString()}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

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
    { name: 'Wisconsin', abbr: 'WI' }, { name: 'Wyoming', abbr: 'WY' }, { name: 'District of Columbia', abbr: 'DC' },
];

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
            className="w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 text-white rounded-xl py-3.5 px-4 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/60 transition-all cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-amber-500/30 shadow-inner"
        >
            {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
    </div>
);

const inputClass = 'w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 hover:border-amber-500/30 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 text-white rounded-xl py-3.5 px-4 outline-none transition-all text-sm font-mono shadow-inner';

const SafeQuoteRefineDownloadLeads = () => {
    const { user } = useContext(AuthContext);
    const isSuperAdmin = user?.role === 'super_admin';
    const isRequester = user?.role === 'admin' || user?.role === 'data_entry' || user?.role === 'dialer_agent';
    const [vendors, setVendors] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [campaignId, setCampaignId] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [minDuration, setMinDuration] = useState('');
    const [maxDuration, setMaxDuration] = useState('');
    const [includeDownloaded, setIncludeDownloaded] = useState(false);
    const [states, setStates] = useState([]);
    const [stateOpen, setStateOpen] = useState(false);
    const stateRef = useRef(null);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingCounts, setLoadingCounts] = useState(false);
    const [stateCounts, setStateCounts] = useState({});
    const [countsTick, setCountsTick] = useState(0);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [summaryData, setSummaryData] = useState(null);
    const [requesting, setRequesting] = useState(false);
    const [myRequests, setMyRequests] = useState([]);

    const loadOptions = async (campaignName = '') => {
        setLoadingOptions(true);
        try {
            const res = await api.get(`/safe-quote-refine-download/options${campaignName ? `?campaign=${encodeURIComponent(campaignName)}` : ''}`);
            setVendors(res.data.vendors || []);
            if (!campaignName) setCampaigns(res.data.campaigns || []);
            setVendorId((current) => {
                const list = res.data.vendors || [];
                return list.some((v) => String(v.vendor_id) === String(current)) ? current : '';
            });
        } catch (err) {
            console.error(err);
            setVendors([]);
        } finally {
            setLoadingOptions(false);
        }
    };

    useEffect(() => {
        loadOptions();
    }, []);

    useEffect(() => {
        const close = (event) => {
            if (stateRef.current && !stateRef.current.contains(event.target)) setStateOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    useEffect(() => {
        if (!vendorId) {
            setStateCounts({});
            return undefined;
        }
        const timeoutId = setTimeout(() => {
            setLoadingCounts(true);
            const campaign = campaigns.find((c) => c.campaign_id === campaignId);
            api.post('/safe-quote-refine-download/state-counts', {
                vendor_id: vendorId,
                campaign_type: campaign ? campaign.name : null,
                min_duration: minDuration === '' ? null : parseInt(minDuration, 10),
                max_duration: maxDuration === '' ? null : parseInt(maxDuration, 10),
                states,
                include_downloaded: includeDownloaded,
            })
                .then((res) => setStateCounts(res.data || {}))
                .catch(() => setStateCounts({}))
                .finally(() => setLoadingCounts(false));
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [vendorId, campaignId, campaigns, minDuration, maxDuration, states, countsTick, includeDownloaded]);

    const selectedCampaign = campaigns.find((c) => c.campaign_id === campaignId);
    const selectedVendor = vendors.find((v) => String(v.vendor_id) === String(vendorId));

    const handleCampaign = (value) => {
        setCampaignId(value);
        const campaign = campaigns.find((c) => c.campaign_id === value);
        loadOptions(campaign ? campaign.name : '');
    };

    const payload = () => ({
        vendor_id: vendorId,
        campaign_type: selectedCampaign ? selectedCampaign.name : null,
        quantity: parseInt(quantity, 10),
        min_duration: minDuration === '' ? null : parseInt(minDuration, 10),
        max_duration: maxDuration === '' ? null : parseInt(maxDuration, 10),
        states,
        include_downloaded: includeDownloaded,
    });

    const loadMyRequests = async () => {
        if (!isRequester) return;
        try {
            const res = await api.get('/safe-quote-refine-download/requests/mine');
            setMyRequests(res.data || []);
        } catch { /* list is optional */ }
    };

    useEffect(() => { loadMyRequests(); }, [isRequester]);

    const handleDownload = async (e) => {
        e.preventDefault();
        setError('');
        setNotice('');
        if (!vendorId) {
            setError('Select a vendor that has Safe Quote Refine data.');
            return;
        }
        const qty = parseInt(quantity, 10);
        if (!Number.isFinite(qty) || qty < 1) {
            setError('Enter a quantity.');
            return;
        }
        setLoading(true);
        try {
            const path = isSuperAdmin ? '/safe-quote-refine-download' : '/safe-quote-refine-download/preview-scrub';
            const res = await api.post(path, payload(), { timeout: 10 * 60 * 1000 });
            setSummaryData(res.data);
            setCountsTick((n) => n + 1);
            loadOptions(selectedCampaign ? selectedCampaign.name : '');
        } catch (err) {
            setError(err.response?.data?.message || 'Download failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRequest = async () => {
        setRequesting(true);
        setError('');
        try {
            await api.post('/safe-quote-refine-download/request', { ...payload(), bla_summary: summaryData?.summary });
            setNotice('Request sent. Super Admin approval ke baad file download hogi.');
            setSummaryData(null);
            loadMyRequests();
        } catch (err) {
            setError(err.response?.data?.message || 'Request failed');
        } finally {
            setRequesting(false);
        }
    };

    const downloadApproved = async (id) => {
        try {
            const res = await api.get(`/safe-quote-refine-download/requests/${id}/file`, { timeout: 10 * 60 * 1000 });
            setSummaryData(res.data);
            setCountsTick((n) => n + 1);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not open the approved file');
        }
    };

    return (
        <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#120a2e] via-[#0d0a1c] to-[#0a0714] border border-white/5 p-5 shadow-xl">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[100px] pointer-events-none opacity-50 translate-x-1/3 -translate-y-1/3" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none opacity-40 -translate-x-1/3 translate-y-1/3" />
                <div className="relative z-10 flex items-center gap-5">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-600/20 border border-white/10 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                        <Download className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/50 tracking-tight">Safe Quote Refine Export</h1>
                        <p className="text-slate-400 text-sm mt-1 font-medium">Export refine leads by vendor, campaign, and call duration.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-3">
                    <div className="bg-[#13151f]/70 backdrop-blur-2xl border border-white/[0.07] rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.3)] relative">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3 bg-white/[0.02]">
                            <Sparkles className="h-4 w-4 text-amber-400" />
                            <span className="font-bold text-white text-sm">Configure Download Parameters</span>
                        </div>
                        <form onSubmit={handleDownload} className="p-6 space-y-5">
                            <Field label="Campaign Filter" hint="Campaigns with refine data only">
                                <SelectInput value={campaignId} onChange={(e) => handleCampaign(e.target.value)} disabled={loadingOptions}>
                                    <option value="">{loadingOptions ? 'Loading...' : 'All refine campaigns'}</option>
                                    {campaigns.map((c) => <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>)}
                                </SelectInput>
                            </Field>

                            <Field label="Vendor Source" required hint="Vendors with a refine upload only">
                                <SelectInput value={vendorId} onChange={(e) => setVendorId(e.target.value)} disabled={loadingOptions} required>
                                    <option value="" disabled>{loadingOptions ? 'Loading...' : vendors.length === 0 ? 'No vendor has refine data yet' : 'Choose a vendor...'}</option>
                                    {vendors.map((v) => {
                                        const pool = includeDownloaded
                                            ? Number(v.available_leads || 0) + Number(v.downloaded_leads || 0)
                                            : Number(v.available_leads || 0);
                                        return (
                                            <option key={v.vendor_id} value={v.vendor_id}>
                                                {v.name} — {pool.toLocaleString()} {includeDownloaded ? 're-downloadable' : 'available'}
                                            </option>
                                        );
                                    })}
                                </SelectInput>
                                {selectedVendor && (
                                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-amber-600/10 border border-amber-500/20 rounded-lg w-fit">
                                        <Building2 className="h-3.5 w-3.5 text-amber-400" />
                                        <span className="text-xs font-semibold text-amber-200">{selectedVendor.name}</span>
                                    </div>
                                )}
                                {vendorId && (
                                    <label className="mt-3 flex items-start gap-3 cursor-pointer bg-black/20 p-3 rounded-xl border border-white/5 hover:border-amber-500/30 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={includeDownloaded}
                                            onChange={(e) => setIncludeDownloaded(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-amber-500/40 text-amber-500 focus:ring-amber-500/30"
                                        />
                                        <span className="text-[13px] text-slate-300 leading-relaxed">
                                            <span className="font-bold text-amber-300 block mb-0.5">Export this vendor again</span>
                                            Include numbers already downloaded for this vendor. DNC, Sale, and Separation stay excluded.
                                            {selectedVendor && (
                                                <span className="text-amber-400/90 font-semibold">
                                                    {' '}({(Number(selectedVendor.available_leads || 0) + Number(selectedVendor.downloaded_leads || 0)).toLocaleString()} in pool)
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                )}
                            </Field>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field label="State Filter" hint="Leave empty for all states">
                                    <div className="relative" ref={stateRef}>
                                        <button
                                            type="button"
                                            onClick={() => setStateOpen((open) => !open)}
                                            className="w-full bg-[#0a0c14]/50 border border-white/10 hover:border-amber-500/30 text-white rounded-xl py-3.5 px-4 flex justify-between items-center text-sm"
                                        >
                                            <span className={states.length === 0 ? 'text-slate-500' : 'text-white font-medium'}>
                                                {states.length === 0 ? 'Any state...' : `${states.length} state${states.length > 1 ? 's' : ''} selected`}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 text-slate-500 ${stateOpen ? 'rotate-180 text-amber-400' : ''}`} />
                                        </button>
                                        {stateOpen && (
                                            <div className="absolute z-50 w-full mt-1.5 bg-[#16192a] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-auto">
                                                <div className="p-1.5 space-y-0.5">
                                                    {US_STATES.map((s) => (
                                                        <div
                                                            key={s.abbr}
                                                            onClick={() => setStates((current) => current.includes(s.abbr) ? current.filter((item) => item !== s.abbr) : [...current, s.abbr])}
                                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${states.includes(s.abbr) ? 'bg-amber-600/10 text-amber-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                                        >
                                                            <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${states.includes(s.abbr) ? 'bg-amber-600 border-amber-500' : 'border-slate-600'}`}>
                                                                {states.includes(s.abbr) && <Check className="h-2.5 w-2.5 text-white" />}
                                                            </div>
                                                            {s.name} <span className="text-xs opacity-50 ml-auto">{s.abbr}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Min Duration" hint="Seconds">
                                        <input type="number" min="0" value={minDuration} onChange={(e) => setMinDuration(e.target.value)} className={inputClass} placeholder="10" />
                                    </Field>
                                    <Field label="Max Duration" hint="Seconds">
                                        <input type="number" min="0" value={maxDuration} onChange={(e) => setMaxDuration(e.target.value)} className={inputClass} placeholder="60" />
                                    </Field>
                                </div>
                            </div>

                            <Field label="Quantity" required hint="Max 100,000 per request">
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                    <input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputClass} pl-11`} placeholder="1000" />
                                </div>
                            </Field>

                            {error && (
                                <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-xl p-4">
                                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-300">{error}</p>
                                </div>
                            )}
                            {notice && (
                                <div className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-emerald-300">{notice}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !vendorId}
                                className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-sm transition-all duration-200 ${
                                    loading || !vendorId
                                        ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                                        : 'bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white shadow-[0_8px_24px_rgba(249,115,22,0.3)] hover:-translate-y-0.5'
                                }`}
                            >
                                {loading ? (
                                    <><div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Scrubbing with Blacklist Alliance...</>
                                ) : isRequester ? (
                                    <><Sparkles className="h-5 w-5" />Preview BLA Summary<ArrowRight className="h-4 w-4 ml-1" /></>
                                ) : (
                                    <><Download className="h-5 w-5" />Export to CSV<ArrowRight className="h-4 w-4 ml-1" /></>
                                )}
                            </button>
                            {isRequester && myRequests.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Your requests</p>
                                    {myRequests.slice(0, 6).map((req) => (
                                        <div key={req.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                                            <div className="min-w-0">
                                                <p className="text-[13px] text-white font-semibold truncate">{req.vendor_name || 'Vendor'} · {Number(req.quantity || 0).toLocaleString()}</p>
                                                <p className="text-[11px] text-slate-500 capitalize">{req.status}</p>
                                            </div>
                                            {req.status === 'accepted' && (
                                                <button type="button" onClick={() => downloadApproved(req.id)} className="text-[11px] font-bold text-emerald-300 shrink-0">Open summary</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </form>
                        {summaryData && (
                            <div className="px-6 pb-6">
                                <ScrubSummary
                                    data={summaryData}
                                    requesting={requesting}
                                    onRequest={isRequester && !summaryData.goodCsv && !summaryData.csv ? handleRequest : null}
                                    onClose={() => setSummaryData(null)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="xl:col-span-2">
                    <div className="bg-gradient-to-b from-[#161824] to-[#13151f] border border-white/[0.07] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />
                        <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-5">
                            <BarChart3 className="h-4 w-4 text-amber-400" />
                            Data Availability Overview
                        </h3>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 mb-3">
                            <span className="text-slate-400 font-medium text-[13px]">Selected Vendor</span>
                            <span className="text-white font-bold tracking-wide text-[13px] truncate max-w-[180px]">{selectedVendor?.name || '—'}</span>
                        </div>
                        {selectedVendor && (
                            <div className="grid grid-cols-4 gap-2">
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5 text-center">
                                    <span className="text-[9px] text-blue-400/80 font-bold uppercase tracking-wider">Total Leads</span>
                                    <p className="text-blue-400 font-mono font-black text-[13px] mt-1">{Number(selectedVendor.total_leads || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                                    <span className="text-[9px] text-emerald-400/80 font-bold uppercase tracking-wider">Available</span>
                                    <p className="text-emerald-400 font-mono font-black text-[13px] mt-1">{Number(selectedVendor.available_leads || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 text-center">
                                    <span className="text-[9px] text-orange-400/80 font-bold uppercase tracking-wider">Downloaded</span>
                                    <p className="text-orange-400 font-mono font-black text-[13px] mt-1">{Number(selectedVendor.downloaded_leads || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-center">
                                    <span className="text-[9px] text-red-400/80 font-bold uppercase tracking-wider">DNC</span>
                                    <p className="text-red-400 font-mono font-black text-[13px] mt-1">{Number(selectedVendor.dnc_leads || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        )}
                        {selectedVendor && (
                            <div className="mt-6 pt-5 border-t border-white/10">
                                <div className="flex items-center justify-between mb-4 gap-3">
                                    <h4 className="text-[11px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5 text-amber-400" />
                                        State Breakdown
                                    </h4>
                                    <div className="flex items-center gap-3">
                                        {loadingCounts && <div className="h-3 w-3 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />}
                                        {Object.keys(stateCounts).length > 0 && (
                                            <div className="text-[10px] text-slate-400 font-bold bg-white/[0.03] px-2 py-1 rounded border border-white/5">
                                                Total: <span className="text-emerald-400">{Object.values(stateCounts).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {!loadingCounts && Object.keys(stateCounts).length === 0 && (
                                    <div className="text-center py-6 bg-white/[0.02] rounded-xl border border-white/5 border-dashed">
                                        <p className="text-xs text-slate-500">No available leads for this vendor.</p>
                                    </div>
                                )}
                                <div className="max-h-[280px] overflow-y-auto pr-1">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {Object.entries(stateCounts)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([state, count]) => {
                                                const stateName = US_STATES.find((s) => s.abbr === state)?.name || state;
                                                return (
                                                    <div key={state} className="bg-[#0a0c14]/60 border border-white/10 rounded-xl px-2.5 py-2">
                                                        <p className="text-[12px] font-semibold text-white leading-tight break-words">{stateName}</p>
                                                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">{state}</p>
                                                        <p className="font-mono font-black text-[13px] leading-none mt-1.5 text-emerald-400">{Number(count).toLocaleString()}</p>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">leads</p>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        )}
                        {!selectedVendor && (vendors.length === 0 ? (
                            <p className="text-sm text-slate-500 py-6 text-center">No refine uploads yet.</p>
                        ) : (
                            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                                {vendors.map((v) => (
                                    <button
                                        key={v.vendor_id}
                                        type="button"
                                        onClick={() => setVendorId(String(v.vendor_id))}
                                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-amber-500/30 hover:bg-amber-500/5 transition-colors text-left"
                                    >
                                        <span className="text-[13px] font-semibold text-white truncate">{v.name}</span>
                                        <span className="text-[11px] font-mono font-bold text-emerald-400 shrink-0">{Number(v.available_leads || 0).toLocaleString()} available</span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SafeQuoteRefineDownloadLeads;
