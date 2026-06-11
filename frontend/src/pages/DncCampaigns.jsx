import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck, RefreshCw, AlertCircle, InboxIcon,
    FileText, TrendingUp, CheckCircle2, XCircle, Copy,
    ArrowRight, Calendar, BarChart3,
} from 'lucide-react';
import { fetchCampaignSummary } from '../services/dncChecker.service';

const fmtNum = (n) => (n ?? 0).toLocaleString();
const fmtDate = (d) => {
    if (!d) return 'No data yet';
    return new Date(d).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const CAMPAIGN_COLORS = {
    'Medicare':          { accent: 'from-blue-500/20 to-blue-600/10',    border: 'border-blue-500/25',    text: 'text-blue-400',    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20'    },
    'ACA':               { accent: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/25', text: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    'FE':                { accent: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/25',  text: 'text-purple-400',  badge: 'bg-purple-500/15 text-purple-400 border-purple-500/20'  },
    'Home Improvement':  { accent: 'from-amber-500/20 to-amber-600/10',   border: 'border-amber-500/25',   text: 'text-amber-400',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20'   },
    'Solar':             { accent: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/25',  text: 'text-orange-400',  badge: 'bg-orange-500/15 text-orange-400 border-orange-500/20'  },
    'Hospital Indemnity':{ accent: 'from-rose-500/20 to-rose-600/10',     border: 'border-rose-500/25',    text: 'text-rose-400',    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/20'    },
};

const DEFAULT_COLOR = { accent: 'from-slate-500/20 to-slate-600/10', border: 'border-slate-500/25', text: 'text-slate-400', badge: 'bg-slate-500/15 text-slate-400 border-slate-500/20' };

const MatchRate = ({ matched, total }) => {
    if (!total) return <span className="text-slate-600 text-[12px]">—</span>;
    const pct = Math.round((matched / total) * 100);
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                    style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-red-400 font-semibold shrink-0 w-8 text-right">{pct}%</span>
        </div>
    );
};

const DncCampaigns = () => {
    const navigate = useNavigate();
    const [data,    setData]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchCampaignSummary();
            setData(res.data.data);
        } catch (e) {
            setError(e?.response?.data?.message || 'Failed to load campaigns. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCampaignClick = (campaign) => {
        navigate(`/dnc-checker/uploaded-files?campaign=${encodeURIComponent(campaign)}`);
    };

    // Aggregate totals
    const totals = data.reduce((acc, c) => ({
        files:    acc.files    + (c.total_files || 0),
        rows:     acc.rows     + (c.total_rows  || 0),
        matched:  acc.matched  + (c.total_matched || 0),
        clean:    acc.clean    + (c.total_clean  || 0),
    }), { files: 0, rows: 0, matched: 0, clean: 0 });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/20 flex items-center justify-center shadow-lg">
                        <ShieldCheck className="h-5 w-5 text-teal-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">DNC Checker Campaigns</h1>
                        <p className="text-slate-500 text-[13px] mt-0.5">Aggregate statistics per campaign</p>
                    </div>
                </div>
                <button onClick={fetchData} disabled={loading}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/8 text-slate-400 hover:text-white hover:border-white/15 transition-all text-[12px] font-medium disabled:opacity-50">
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
                </button>
            </div>

            {/* Overall summary strip */}
            {!loading && !error && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Files',   value: fmtNum(totals.files),   icon: FileText,    cls: 'text-blue-400',    bg: 'from-blue-500/10 to-blue-500/5',    border: 'border-blue-500/20' },
                        { label: 'Total Rows',    value: fmtNum(totals.rows),    icon: BarChart3,   cls: 'text-purple-400',  bg: 'from-purple-500/10 to-purple-500/5', border: 'border-purple-500/20' },
                        { label: 'DNC Matched',   value: fmtNum(totals.matched), icon: TrendingUp,  cls: 'text-red-400',     bg: 'from-red-500/10 to-red-500/5',       border: 'border-red-500/20' },
                        { label: 'Total Clean',   value: fmtNum(totals.clean),   icon: CheckCircle2,cls: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-500/5',border: 'border-emerald-500/20' },
                    ].map(c => {
                        const Icon = c.icon;
                        return (
                            <div key={c.label} className={`rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} p-4 flex items-center gap-3`}>
                                <div className={`h-9 w-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0 ${c.cls}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{c.label}</p>
                                    <p className={`text-lg font-bold ${c.cls}`}>{c.value}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="h-10 w-10 rounded-full border-2 border-teal-500/30 border-t-teal-400 animate-spin" />
                    <p className="text-slate-500 text-sm font-medium">Loading campaigns…</p>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                    <p className="text-red-400 font-semibold text-sm">{error}</p>
                    <button onClick={fetchData} className="text-[12px] text-brand-400 hover:underline">Retry</button>
                </div>
            )}

            {/* Campaign Cards Grid */}
            {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {data.map(c => {
                        const colors = CAMPAIGN_COLORS[c.campaign] || DEFAULT_COLOR;
                        const hasData = c.total_files > 0;
                        return (
                            <div
                                key={c.campaign}
                                onClick={() => handleCampaignClick(c.campaign)}
                                className={`group relative bg-gradient-to-br ${colors.accent} border ${colors.border} rounded-2xl p-5 cursor-pointer hover:scale-[1.01] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all duration-200 overflow-hidden`}
                            >
                                {/* Background glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/[0.02] -translate-y-8 translate-x-8 blur-2xl pointer-events-none" />

                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${colors.badge}`}>
                                            {c.campaign}
                                        </span>
                                        {!hasData && (
                                            <span className="ml-2 text-[10px] text-slate-600 font-medium">No data yet</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 group-hover:text-white transition-colors">
                                        <span className="hidden group-hover:block font-medium">View files</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {[
                                        { label: 'Files',    value: fmtNum(c.total_files),    cls: colors.text },
                                        { label: 'Rows',     value: fmtNum(c.total_rows),     cls: 'text-white' },
                                        { label: 'Matched',  value: fmtNum(c.total_matched),  cls: 'text-red-400' },
                                        { label: 'Clean',    value: fmtNum(c.total_clean),    cls: 'text-emerald-400' },
                                        { label: 'Invalid',  value: fmtNum(c.total_invalid),  cls: 'text-amber-400' },
                                        { label: 'Dupes',    value: fmtNum(c.total_duplicates),cls: 'text-purple-400' },
                                    ].map(s => (
                                        <div key={s.label} className="bg-black/20 backdrop-blur-sm rounded-xl p-2.5 border border-white/5">
                                            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">{s.label}</p>
                                            <p className={`text-[14px] font-bold ${s.cls}`}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Match rate bar */}
                                <MatchRate matched={c.total_matched} total={c.total_rows} />

                                {/* Last checked */}
                                <div className="flex items-center gap-1.5 mt-3">
                                    <Calendar className="h-3 w-3 text-slate-600" />
                                    <span className="text-[10px] text-slate-600">Last checked: {fmtDate(c.last_checked_at)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DncCampaigns;
