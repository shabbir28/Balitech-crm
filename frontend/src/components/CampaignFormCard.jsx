import React from 'react';
import { ArrowLeft } from 'lucide-react';

const fieldClass = 'w-full bg-[#0c0e16] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-white/25 focus:ring-2 focus:ring-white/5 transition-all';

export const CampaignField = ({ label, children }) => (
    <label className="block">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">{label}</span>
        {children}
    </label>
);

export const campaignInputClass = fieldClass;

const CampaignFormCard = ({
    title,
    subtitle,
    onBack,
    accent = '#f59e0b',
    error,
    submitting,
    onSubmit,
    children,
}) => (
    <div className="min-h-[70vh] flex items-start justify-center pt-2">
        <div className="w-full max-w-[440px]">
            <button
                type="button"
                onClick={onBack}
                className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
                <span className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center" style={{ color: accent }}>
                    <ArrowLeft className="w-3.5 h-3.5" />
                </span>
                Back
            </button>

            <form
                onSubmit={onSubmit}
                className="rounded-2xl border border-white/10 bg-[#161822] shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden"
            >
                <div className="h-1" style={{ background: accent }} />
                <div className="px-6 pt-6 pb-5">
                    <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
                    {subtitle && <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>}
                </div>

                <div className="px-6 pb-6 space-y-4">
                    {error && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-300">
                            {error}
                        </div>
                    )}
                    {children}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full h-10 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-opacity"
                        style={{ background: accent }}
                    >
                        {submitting ? 'Saving…' : 'Save campaign'}
                    </button>
                </div>
            </form>
        </div>
    </div>
);

export default CampaignFormCard;
