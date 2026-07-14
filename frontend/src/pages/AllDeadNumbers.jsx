import React, { useState, useEffect, useCallback } from 'react';
import {
    ShieldBan, Search, RefreshCw, ChevronLeft, ChevronRight,
    Phone, User, CalendarDays, Database, FileText, X
} from 'lucide-react';
import api from '../services/api';

/* ───────────────── helpers ───────────────── */
const fmt = (n) => (n ?? 0).toLocaleString();

function SourceBadge({ source }) {
    if (!source) return <span style={{ color: '#475569', fontSize: 12 }}>—</span>;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            color: '#818cf8', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 8,
            maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
            <FileText size={10} />
            {source}
        </span>
    );
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
            + '  '
            + d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return '—'; }
}

/* ───────────────── Component ───────────────── */
const AllDeadNumbers = () => {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/dead-numbers', { params: { page, limit, search } });
            setData(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            console.error('Failed to fetch dead numbers', err);
        } finally {
            setLoading(false);
        }
    }, [page, limit, search]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };
    const clearSearch = () => { setSearchInput(''); setSearch(''); setPage(1); };

    const totalPages = Math.ceil(total / limit);
    const startRow = total === 0 ? 0 : (page - 1) * limit + 1;
    const endRow = Math.min(page * limit, total);

    return (
        <div style={{ padding: '28px 24px', maxWidth: 1200, margin: '0 auto', fontFamily: 'inherit' }}>

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: 'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(244,63,94,0.15))',
                        border: '1px solid rgba(239,68,68,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 24px rgba(239,68,68,0.2)',
                    }}>
                        <ShieldBan size={26} color="#f87171" />
                    </div>
                    <div>
                        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                            All Dead Numbers
                        </h1>
                        <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Database size={13} />
                            Total: <strong style={{ color: '#94a3b8' }}>{fmt(total)}</strong> records
                        </p>
                    </div>
                </div>

                {/* Search + Refresh */}
                <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                        <input
                            type="text"
                            placeholder="Search phone or source..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            style={{
                                paddingLeft: 36, paddingRight: searchInput ? 32 : 14, paddingTop: 9, paddingBottom: 9,
                                background: '#0f1220', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 11, color: '#e2e8f0', fontSize: 13, outline: 'none', width: 260,
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,0.4)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                        {searchInput && (
                            <button type="button" onClick={clearSearch} style={{
                                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2,
                            }}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <button type="submit" style={{
                        padding: '9px 18px', borderRadius: 11,
                        background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                        border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        boxShadow: '0 2px 12px rgba(239,68,68,0.3)',
                    }}>
                        Search
                    </button>
                    <button
                        type="button"
                        onClick={() => { setPage(1); fetchData(); }}
                        title="Refresh"
                        style={{
                            width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                            background: '#0f1220', cursor: 'pointer', color: '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <RefreshCw size={15} style={loading ? { animation: 'spin 0.8s linear infinite', color: '#f87171' } : {}} />
                    </button>
                </form>
            </div>

            {/* ── TABLE CARD ── */}
            <div style={{
                background: 'linear-gradient(160deg,#141727 0%,#0f1220 100%)',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20,
                overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} /> Phone number</span></th>
                                <th style={thStyle}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={12} /> Source / file</span></th>
                                <th style={thStyle}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={12} /> Added by</span></th>
                                <th style={thStyle}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={12} /> Date added</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '60px 0', textAlign: 'center' }}>
                                        <RefreshCw size={24} color="#ef4444" style={{ animation: 'spin 0.8s linear infinite', display: 'block', margin: '0 auto 12px' }} />
                                        <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>Loading records...</p>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '64px 0', textAlign: 'center' }}>
                                        <ShieldBan size={36} color="#1e293b" style={{ display: 'block', margin: '0 auto 14px' }} />
                                        <p style={{ color: '#334155', fontSize: 14, fontWeight: 600, margin: 0 }}>No records found</p>
                                        {search && <p style={{ color: '#1e293b', fontSize: 12, margin: '6px 0 0' }}>Clear search and try again</p>}
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, idx) => (
                                    <tr key={row.phone} style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.035)',
                                        transition: 'background 0.15s',
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ ...tdStyle, color: '#334155', fontSize: 12, width: 50 }}>
                                            {startRow + idx}
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <Phone size={13} color="#f87171" />
                                                </div>
                                                <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>
                                                    {row.phone}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            <SourceBadge source={row.source} />
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                <div style={{
                                                    width: 26, height: 26, borderRadius: 7,
                                                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                }}>
                                                    <User size={11} color="#818cf8" />
                                                </div>
                                                <span style={{ color: '#94a3b8', fontSize: 13 }}>
                                                    {row.created_by_username || 'System'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{ color: '#64748b', fontSize: 12 }}>{formatDate(row.created_at)}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── PAGINATION ── */}
                {totalPages > 0 && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.05)',
                        background: 'rgba(255,255,255,0.01)', flexWrap: 'wrap', gap: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: '#475569', fontSize: 12 }}>Rows per page:</span>
                            <select
                                value={limit}
                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                style={{
                                    background: '#0f1220', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8, color: '#e2e8f0', fontSize: 12, padding: '4px 8px', outline: 'none', cursor: 'pointer',
                                }}
                            >
                                {[20, 50, 100, 500].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <span style={{ color: '#334155', fontSize: 12 }}>
                                Showing <strong style={{ color: '#94a3b8' }}>{fmt(startRow)}–{fmt(endRow)}</strong> of <strong style={{ color: '#94a3b8' }}>{fmt(total)}</strong>
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                style={pageBtn(page === 1)}
                            >
                                <ChevronLeft size={15} />
                            </button>

                            {/* Page number pills */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let p;
                                if (totalPages <= 5) p = i + 1;
                                else if (page <= 3) p = i + 1;
                                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                                else p = page - 2 + i;
                                return (
                                    <button key={p} onClick={() => setPage(p)} style={{
                                        width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                        background: p === page ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.04)',
                                        color: p === page ? '#fff' : '#64748b',
                                        boxShadow: p === page ? '0 2px 10px rgba(239,68,68,0.3)' : 'none',
                                    }}>
                                        {p}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                style={pageBtn(page === totalPages)}
                            >
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

const thStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    whiteSpace: 'nowrap',
};

const tdStyle = {
    padding: '13px 16px',
    verticalAlign: 'middle',
};

const pageBtn = (disabled) => ({
    width: 32, height: 32, borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: disabled ? '#1e293b' : '#64748b',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: disabled ? 0.4 : 1,
});

export default AllDeadNumbers;
