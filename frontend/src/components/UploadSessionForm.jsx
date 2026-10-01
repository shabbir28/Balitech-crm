import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, ChevronDown, Database, Target } from 'lucide-react';

const selectClass = 'w-full h-11 bg-[#0c0e16] border border-white/10 rounded-xl pl-10 pr-9 text-sm text-white outline-none focus:border-white/25 appearance-none';

const STEPS = [
    { id: 1, label: 'Vendor', icon: Building2 },
    { id: 2, label: 'Campaign', icon: Target },
    { id: 3, label: 'Jobs', icon: Database },
];

const UploadSessionForm = ({
    title,
    subtitle,
    accent = '#f59e0b',
    vendors,
    campaigns,
    vendorId,
    campaignId,
    onVendor,
    onCampaign,
    error,
    submitting,
    onSubmit,
}) => {
    const [step, setStep] = useState(1);
    const [localError, setLocalError] = useState('');
    const message = localError || error;
    const vendor = vendors.find((item) => String(item.vendor_id) === String(vendorId));

    const goNext = () => {
        if (!vendorId) {
            setLocalError('Select a vendor first.');
            return;
        }
        setLocalError('');
        setStep(2);
    };

    const createSession = (e) => {
        e.preventDefault();
        if (!campaignId) {
            setLocalError('Select a campaign.');
            return;
        }
        setLocalError('');
        onSubmit(e);
    };

    return (
        <div className="w-full max-w-[520px] mx-auto pt-2">
            <div className="mb-4 flex items-center gap-2">
                {STEPS.map((item, index) => {
                    const Icon = item.icon;
                    const active = step === item.id;
                    const done = step > item.id;
                    return (
                        <React.Fragment key={item.id}>
                            <div className="flex items-center gap-2 min-w-0">
                                <span
                                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold border"
                                    style={
                                        active || done
                                            ? { background: accent, borderColor: accent, color: '#fff' }
                                            : { background: '#0c0e16', borderColor: 'rgba(255,255,255,0.1)', color: '#64748b' }
                                    }
                                >
                                    {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                                </span>
                                <span className={`text-xs font-semibold truncate ${active || done ? 'text-white' : 'text-slate-500'}`}>
                                    {item.label}
                                </span>
                            </div>
                            {index < STEPS.length - 1 && (
                                <span className="h-px flex-1 bg-white/10" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <form
                onSubmit={step === 2 ? createSession : (e) => e.preventDefault()}
                className="rounded-2xl border border-white/10 bg-[#161822] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
            >
                <div className="h-1" style={{ background: accent }} />
                <div className="px-6 pt-5 pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: accent }}>{subtitle}</p>
                    <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        {step === 1 ? 'Choose the vendor this file belongs to.' : 'Choose the campaign, then start the session.'}
                    </p>
                </div>

                <div className="px-6 pb-6 space-y-4">
                    {message && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-300">{message}</div>
                    )}

                    {step === 1 && (
                        <>
                            <label className="block">
                                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Vendor</span>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <select className={selectClass} value={vendorId} onChange={(e) => { onVendor(e.target.value); setLocalError(''); }}>
                                        <option value="">Choose a vendor</option>
                                        {vendors.map((item) => (
                                            <option key={item.vendor_id} value={item.vendor_id}>{item.name}{item.company ? ` (${item.company})` : ''}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                </div>
                            </label>
                            <button type="button" onClick={goNext} className="w-full h-10 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2" style={{ background: accent }}>
                                Next <ArrowRight className="w-4 h-4" />
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            {vendor && (
                                <div className="rounded-xl border border-white/10 bg-[#0c0e16] px-3 py-2.5 text-xs text-slate-400">
                                    Vendor <span className="text-white font-semibold">{vendor.name}</span>
                                </div>
                            )}
                            <label className="block">
                                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Campaign</span>
                                <div className="relative">
                                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <select className={selectClass} value={campaignId} onChange={(e) => { onCampaign(e.target.value); setLocalError(''); }}>
                                        <option value="">Choose a campaign</option>
                                        {campaigns.map((item) => (
                                            <option key={item.campaign_id} value={item.campaign_id}>{item.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                </div>
                                {campaigns.length === 0 && <p className="text-[11px] text-slate-500 mt-1.5">No active campaigns.</p>}
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setLocalError(''); setStep(1); }}
                                    className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-300 border border-white/10 bg-[#0c0e16] inline-flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                                <button type="submit" disabled={submitting} className="flex-1 h-10 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: accent }}>
                                    {submitting ? 'Starting…' : 'Start session'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </form>
        </div>
    );
};

export default UploadSessionForm;
