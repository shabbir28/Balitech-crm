import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getAreaCodeState } from '../utils/areaCodes';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const LeadsTable = () => {
    const [leads, setLeads] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDisposition, setFilterDisposition] = useState('');
    const limit = 20;

    const fetchLeads = async (pageToFetch, customOptions = {}) => {
        setLoading(true);
        try {
            const disp = customOptions.disposition !== undefined ? customOptions.disposition : filterDisposition;
            const res = await api.get(`/leads?page=${pageToFetch}&limit=${limit}&search=${encodeURIComponent(search)}&disposition=${encodeURIComponent(disp)}`);
            setLeads(res.data.data);
            setTotal(res.data.total);
            setPage(res.data.page);
        } catch (err) {
            console.error('Failed to fetch leads', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            fetchLeads(1);
        }
    };

    const totalPages = Math.ceil(total / limit);

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name[0].toUpperCase();
    };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>All Data</h1>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
                        Browse and filter through all uploaded data records ({total.toLocaleString()} total)
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', background: '#0f1117',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 16px',
                        width: 320, transition: 'border-color 0.2s'
                    }}>
                        <Search size={16} color="#6b7280" />
                        <input 
                            type="text" 
                            placeholder="Search by state (e.g. New York), name, or phone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={handleSearch}
                            style={{
                                background: 'transparent', border: 'none', color: '#fff', fontSize: 13,
                                outline: 'none', width: '100%', marginLeft: 10
                            }}
                        />
                    </div>
                    
                    <select
                        value={filterDisposition}
                        onChange={e => {
                            setFilterDisposition(e.target.value);
                            fetchLeads(1, { disposition: e.target.value });
                        }}
                        style={{
                            background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                            padding: '9px 16px', color: filterDisposition ? '#f59e0b' : '#6b7280', fontSize: 13,
                            outline: 'none', cursor: 'pointer', transition: 'border-color 0.2s', appearance: 'none'
                        }}
                    >
                        <option value="">All Dispositions</option>
                        <option value="Interested">Interested</option>
                        <option value="Not Interested">Not Interested</option>
                        <option value="Callback">Callback</option>
                        <option value="Do Not Call">Do Not Call</option>
                        <option value="Wrong Number">Wrong Number</option>
                    </select>

                    <button 
                        onClick={() => fetchLeads(1)}
                        style={{
                            background: '#f59e0b', color: '#111', border: 'none', borderRadius: 10,
                            padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            transition: 'background 0.2s', boxShadow: '0 4px 14px rgba(245,158,11,0.2)'
                        }}
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{ background: '#13151e', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                {/* Table Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(200px, 1.5fr) 140px minmax(200px, 1.5fr) 100px 90px 140px 120px',
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    {['Name', 'Phone', 'Email', 'Area Code', 'State', 'Disposition', 'Status'].map(h => (
                        <span key={h} style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {h}
                        </span>
                    ))}
                </div>

                {/* Table Body */}
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>Loading data...</div>
                ) : leads.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                        <div style={{ fontSize: 40, marginBottom: 10 }}>📁</div>
                        <p style={{ margin: 0 }}>No data found</p>
                    </div>
                ) : (
                    leads.map((lead, i) => (
                        <div key={lead.id} style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(200px, 1.5fr) 140px minmax(200px, 1.5fr) 100px 90px 140px 120px',
                            padding: '16px 24px',
                            borderBottom: i < leads.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                            alignItems: 'center',
                            transition: 'background 0.2s',
                            cursor: 'default'
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            {/* Name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 16 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                    background: 'rgba(245,158,11,0.1)',
                                    border: '1px solid rgba(245,158,11,0.2)',
                                    display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center',
                                    color: '#f59e0b', fontSize: 13, fontWeight: 700
                                }}>
                                    {getInitials(lead.name)}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {lead.name || 'Unknown'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Phone */}
                            <div style={{ color: '#d1d5db', fontSize: 13, fontFamily: 'monospace', fontWeight: 500 }}>
                                {lead.phone}
                            </div>
                            
                            {/* Email */}
                            <div style={{ color: '#9ca3af', fontSize: 13, paddingRight: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {lead.email || '—'}
                            </div>

                            {/* Area Code */}
                            <div>
                                <span style={{
                                    display: 'inline-flex', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                    background: 'rgba(255,255,255,0.05)', color: '#d1d5db', border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {lead.area_code || '—'}
                                </span>
                            </div>

                            {/* State */}
                            <div>
                                <span style={{
                                    display: 'inline-flex', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                                    background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)'
                                }}>
                                    {getAreaCodeState(lead.area_code)}
                                </span>
                            </div>

                            {/* Disposition */}
                            <div>
                                <span style={{
                                    display: 'inline-flex', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                    color: '#d1d5db'
                                }}>
                                    {lead.disposition || '—'}
                                </span>
                            </div>

                            {/* Status */}
                            <div>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                    background: lead.status === 'available' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                                    color: lead.status === 'available' ? '#10b981' : '#9ca3af',
                                }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: lead.status === 'available' ? '#10b981' : '#9ca3af', boxShadow: lead.status === 'available' ? '0 0 8px rgba(16,185,129,0.6)' : 'none' }}></div>
                                    {lead.status === 'available' ? 'Available' : 'Unavailable'}
                                </span>
                            </div>
                        </div>
                    ))
                )}

                {/* Footer / Pagination */}
                <div style={{
                    padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <span style={{ color: '#6b7280', fontSize: 13 }}>
                        Showing {total === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} items
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => fetchLeads(Math.max(1, page - 1))} disabled={page === 1}
                            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: page === 1 ? '#374151' : '#9ca3af', cursor: page === 1 ? 'not-allowed' : 'pointer', borderRadius: 6, padding: '6px 10px' }}>
                            <ChevronLeft size={14} />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Calculate which pages to show (window around current page)
                            let start = Math.max(1, page - 2);
                            let end = Math.min(totalPages, start + 4);
                            if (end - start < 4) start = Math.max(1, end - 4);
                            const p = start + i;
                            if (p > totalPages) return null;
                            
                            return (
                                <button key={p} onClick={() => fetchLeads(p)}
                                    style={{
                                        width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer',
                                        background: page === p ? '#f59e0b' : 'none',
                                        color: page === p ? '#111' : '#9ca3af',
                                        fontWeight: page === p ? 700 : 400, fontSize: 13,
                                        transition: 'background 0.2s'
                                    }}>
                                    {p}
                                </button>
                            );
                        })}
                        <button onClick={() => fetchLeads(Math.min(totalPages, page + 1))} disabled={page === totalPages || totalPages === 0}
                            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: page === totalPages ? '#374151' : '#9ca3af', cursor: page === totalPages ? 'not-allowed' : 'pointer', borderRadius: 6, padding: '6px 10px' }}>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadsTable;
