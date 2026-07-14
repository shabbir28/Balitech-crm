import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';
import {
    ShieldBan, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle,
    X, Loader2, BarChart3, FileDigit, Phone, Trash2, Sparkles, TrendingUp, Info
} from 'lucide-react';

/* ───────────────────────── helpers ───────────────────────── */
const fmt = (n) => (n ?? 0).toLocaleString();

const CAMPAIGN_META = {
    ACA: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', label: 'ACA' },
    MEDICARE: { color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)', label: 'Medicare' },
    FE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', label: 'Final Expense' },
};

function getCampaignStyle(key) {
    const k = key?.toUpperCase();
    if (k?.includes('ACA')) return CAMPAIGN_META.ACA;
    if (k?.includes('MEDICARE') || k?.includes('MED')) return CAMPAIGN_META.MEDICARE;
    if (k?.includes('FE') || k?.includes('FINAL') || k?.includes('EXPENSE')) return CAMPAIGN_META.FE;
    return { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', label: key };
}

/* ───────────────────────── Stat Card ───────────────────────── */
function StatCard({ icon, label, value, color, glow }) {
    const IconComp = icon;
    return (
        <div style={{
            background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
            border: `1px solid ${color}30`,
            borderRadius: 16,
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: glow ? `0 0 24px ${color}25` : 'none',
            transition: 'transform 0.2s',
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${color}20`, border: `1px solid ${color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
                <IconComp size={20} color={color} />
            </div>
            <div>
                <p style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, margin: 0 }}>{label}</p>
                <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '2px 0 0', lineHeight: 1 }}>{fmt(value)}</p>
            </div>
        </div>
    );
}

/* ───────────────────────── Main Component ───────────────────────── */
const DeadNumbersUpload = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length > 0) {
            setFile(acceptedFiles[0]);
            setError(null);
            setResult(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
        maxFiles: 1,
    });

    const handleUpload = async () => {
        if (!file) { setError('Please select a file first'); return; }
        setLoading(true);
        setError(null);
        setResult(null);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await api.post('/dead-numbers/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResult(res.data);
            setFile(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Error processing file');
        } finally {
            setLoading(false);
        }
    };

    const breakdown = result?.campaign_breakdown || {};
    const hasBreakdown = Object.keys(breakdown).length > 0;

    return (
        <div style={{ padding: '28px 24px', maxWidth: 860, margin: '0 auto', fontFamily: 'inherit' }}>

            {/* ── PAGE HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: 'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(244,63,94,0.15))',
                    border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 24px rgba(239,68,68,0.2)',
                }}>
                    <ShieldBan size={26} color="#f87171" />
                </div>
                <div>
                    <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                        Dead Numbers Upload
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 13, margin: '3px 0 0' }}>
                        Upload the file and numbers will be processed instantly
                    </p>
                </div>
            </div>

            {/* ── ERROR ── */}
            {error && (
                <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
                }}>
                    <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0 }} />
                    <span style={{ color: '#fca5a5', fontSize: 13, flex: 1 }}>{error}</span>
                    <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 2 }}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ── DROPZONE ── */}
            <div style={{
                background: 'linear-gradient(160deg,#141727 0%,#0f1220 100%)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
                padding: 24, marginBottom: 20,
            }}>
                <div
                    {...getRootProps()}
                    style={{
                        border: `2px dashed ${isDragActive ? '#f87171' : 'rgba(255,255,255,0.12)'}`,
                        borderRadius: 16,
                        padding: '48px 24px',
                        textAlign: 'center',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.5 : 1,
                        background: isDragActive ? 'rgba(248,113,113,0.05)' : 'transparent',
                        transition: 'all 0.25s ease',
                    }}
                >
                    <input {...getInputProps()} />
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                        background: 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(244,63,94,0.08))',
                        border: '1px solid rgba(239,68,68,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.3s',
                    }}>
                        <UploadCloud size={32} color={isDragActive ? '#f87171' : '#64748b'} />
                    </div>
                    <h3 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>
                        {isDragActive ? 'Drop the file here...' : 'Drag & drop file or browse'}
                    </h3>
                    <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>
                        CSV, XLS, XLSX — must contain a phone number column
                    </p>
                    {!isDragActive && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            marginTop: 20, padding: '9px 22px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#cbd5e1', fontSize: 13, fontWeight: 600,
                        }}>
                            <FileSpreadsheet size={15} /> Browse Files
                        </div>
                    )}
                </div>

                {/* ── SELECTED FILE ── */}
                {file && (
                    <div style={{
                        marginTop: 16, padding: '14px 18px', borderRadius: 14,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <FileSpreadsheet size={20} color="#f87171" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                            <p style={{ color: '#475569', fontSize: 12, margin: '2px 0 0' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => setFile(null)}
                                disabled={loading}
                                style={{
                                    padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={loading}
                                style={{
                                    padding: '8px 22px', borderRadius: 9,
                                    background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                                    border: 'none', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
                                    boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
                                    opacity: loading ? 0.7 : 1,
                                }}
                            >
                                {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : <><UploadCloud size={15} /> Upload</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── LOADING BAR ── */}
            {loading && (
                <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
                }}>
                    <Loader2 size={18} color="#f87171" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <p style={{ color: '#fca5a5', fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>Processing numbers...</p>
                        <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: 999,
                                background: 'linear-gradient(90deg,#ef4444,#f97316)',
                                animation: 'progress 1.5s ease-in-out infinite',
                                width: '60%',
                            }} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── RESULT CARD ── */}
            {result && (
                <div style={{
                    background: 'linear-gradient(160deg,#0f1a14 0%,#0a1210 100%)',
                    border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20,
                    overflow: 'hidden', boxShadow: '0 8px 40px rgba(34,197,94,0.1)', marginBottom: 20,
                }}>
                    {/* Result Header */}
                    <div style={{
                        padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(34,197,94,0.05)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 11,
                                background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <CheckCircle2 size={20} color="#22c55e" />
                            </div>
                            <div>
                                <p style={{ color: '#22c55e', fontWeight: 800, fontSize: 15, margin: 0 }}>✅ Process completed!</p>
                                <p style={{ color: '#4ade80', fontSize: 12, margin: '1px 0 0', opacity: 0.7 }}>All numbers successfully added to the dead list</p>
                            </div>
                        </div>
                        <button onClick={() => setResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div style={{ padding: 22 }}>
                        {/* Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
                            <StatCard icon={FileDigit} label="Total numbers in file" value={result.total_in_file} color="#6366f1" glow />
                            <StatCard icon={Phone} label="Found in leads" value={result.total_found_in_leads} color="#ef4444" glow />
                            <StatCard icon={Sparkles} label="Fresh numbers" value={result.total_fresh_numbers} color="#22c55e" glow />
                            <StatCard icon={Trash2} label="Deleted from leads" value={result.total_deleted_from_main} color="#f97316" />
                        </div>

                        {/* Campaign Breakdown */}
                        {hasBreakdown && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <BarChart3 size={16} color="#a855f7" />
                                    <span style={{ color: '#a78bfa', fontSize: 13, fontWeight: 700 }}>
                                        Campaign breakdown — deleted from leads
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
                                    {Object.entries(breakdown).map(([campaign, count]) => {
                                        const style = getCampaignStyle(campaign);
                                        const pct = result.total_found_in_leads > 0
                                            ? Math.round((count / result.total_found_in_leads) * 100)
                                            : 0;
                                        return (
                                            <div key={campaign} style={{
                                                background: style.bg, border: `1px solid ${style.border}`,
                                                borderRadius: 13, padding: '14px 16px',
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                                    <span style={{ color: style.color, fontSize: 13, fontWeight: 700 }}>
                                                        {style.label || campaign}
                                                    </span>
                                                    <span style={{
                                                        background: `${style.color}20`, color: style.color,
                                                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                                                    }}>{pct}%</span>
                                                </div>
                                                <p style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1 }}>
                                                    {fmt(count)}
                                                </p>
                                                <div style={{ marginTop: 10, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
                                                    <div style={{
                                                        width: `${pct}%`, height: '100%', borderRadius: 999,
                                                        background: style.color, transition: 'width 0.6s ease',
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Summary text */}
                        <div style={{
                            marginTop: 16, padding: '12px 16px', borderRadius: 11,
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                        }}>
                            <TrendingUp size={15} color="#6366f1" style={{ flexShrink: 0, marginTop: 1 }} />
                            <p style={{ color: '#64748b', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                                <strong style={{ color: '#94a3b8' }}>Summary:</strong> The file contained{' '}
                                <strong style={{ color: '#a5b4fc' }}>{fmt(result.total_in_file)}</strong> numbers.{' '}
                                Out of these, <strong style={{ color: '#f87171' }}>{fmt(result.total_found_in_leads)}</strong> numbers were found in Leads —{' '}
                                which have now been permanently deleted.{' '}
                                <strong style={{ color: '#4ade80' }}>{fmt(result.total_fresh_numbers)}</strong> fresh numbers were added to the dead list
                                but were not present in leads.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── WARNING NOTE ── */}
            <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px',
                borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)',
            }}>
                <Info size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: '#fbbf24', fontSize: 12, margin: 0, lineHeight: 1.7, opacity: 0.9 }}>
                    <strong>Important Note:</strong> Processing large files (millions of numbers) may take a few minutes.
                    The system has to scan the Leads database to permanently delete them.
                </p>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes progress {
                    0% { width: 0%; margin-left: 0; }
                    50% { width: 60%; margin-left: 20%; }
                    100% { width: 0%; margin-left: 100%; }
                }
            `}</style>
        </div>
    );
};

export default DeadNumbersUpload;
