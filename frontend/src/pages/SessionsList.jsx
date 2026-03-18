import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Database, Search, Calendar, UserCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const SessionsList = () => {
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchSessions = async (pageToFetch = 1) => {
    setLoading(true);
    try {
      const from = fromDate ? new Date(fromDate).toISOString() : '';
      const to = toDate ? new Date(`${toDate}T23:59:59`).toISOString() : '';
      const res = await api.get(
        `/sessions?page=${pageToFetch}&limit=${limit}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setSessions(res.data.data);
      setTotal(res.data.total);
      setPage(res.data.page);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.ceil(total / limit) || 1;

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
  };

  const formatShortId = (id) => {
    if (!id) return '';
    return String(id).slice(0, 8);
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('Delete this session? This will also delete its jobs.');
    if (!ok) return;
    try {
      await api.delete(`/sessions/${id}`);
      fetchSessions(1);
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Database size={16} color="#111827" />
          </div>
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#fff',
                margin: 0,
              }}
            >
              Session List
            </h1>
            <p
              style={{
                color: '#6b7280',
                fontSize: 13,
                margin: '4px 0 0',
              }}
            >
              Monitor all upload sessions and their processing status.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 700 }}>Date range</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                background: '#0f1117',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '8px 10px',
                color: '#d1d5db',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <span style={{ color: '#6b7280', fontSize: 12 }}>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                background: '#0f1117',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '8px 10px',
                color: '#d1d5db',
                fontSize: 12,
                outline: 'none',
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: '#0f1117',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '9px 12px',
              color: statusFilter !== 'All' ? '#f59e0b' : '#9ca3af',
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {['All', 'Pending', 'Processing', 'Completed', 'Failed'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#0f1117',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '8px 16px',
              width: 280,
            }}
          >
            <Search size={16} color="#6b7280" />
            <input
              type="text"
              placeholder="Search by vendor, campaign, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchSessions(1);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 13,
                outline: 'none',
                width: '100%',
                marginLeft: 10,
              }}
            />
          </div>
          <button
            onClick={() => fetchSessions(1)}
            style={{
              background: '#f59e0b',
              color: '#111',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </div>
      </div>

      <div
        style={{
          background: '#13151e',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              '240px 110px 160px 160px 140px 140px 140px 120px 160px 160px',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          {[
            'Session ID',
            'Total Jobs / Files',
            'Vendor Name',
            'Campaign',
            'Created By',
            'Start Time',
            'End Time',
            'Status',
            'Processed / Total',
            'Action',
          ].map((h) => (
            <span
              key={h}
              style={{
                color: '#6b7280',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <div
            style={{
              padding: 60,
              textAlign: 'center',
              color: '#6b7280',
            }}
          >
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div
            style={{
              padding: 60,
              textAlign: 'center',
              color: '#6b7280',
            }}
          >
            No sessions found.
          </div>
        ) : (
          sessions.map((s) => {
            const processed = parseInt(s.processed_rows || 0, 10);
            const totalRows = parseInt(s.total_rows || 0, 10);
            const progress =
              totalRows > 0 ? Math.round((processed / totalRows) * 100) : 0;
            const status = s.status || 'Pending';
            const totalJobs = parseInt(s.total_jobs || 0, 10);

            const statusColors =
              status === 'Completed'
                ? {
                    bg: 'rgba(16,185,129,0.12)',
                    fg: '#6ee7b7',
                  }
                : status === 'Processing'
                ? {
                    bg: 'rgba(245,158,11,0.12)',
                    fg: '#fbbf24',
                  }
                : status === 'Failed'
                ? {
                    bg: 'rgba(239,68,68,0.12)',
                    fg: '#fca5a5',
                  }
                : {
                    bg: 'rgba(55,65,81,0.6)',
                    fg: '#d1d5db',
                  };

            return (
              <div
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '240px 110px 160px 160px 140px 140px 140px 120px 160px 160px',
                  padding: '14px 20px',
                  borderBottom:
                    '1px solid rgba(255,255,255,0.04)',
                  alignItems: 'center',
                  fontSize: 13,
                  color: '#e5e7eb',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    paddingRight: 10,
                  }}
                  title={s.id}
                >
                  <span style={{ color: '#9ca3af' }}>{formatShortId(s.id)}</span>
                </div>
                <div style={{ fontFamily: 'monospace', color: '#d1d5db' }}>
                  {totalJobs}
                </div>
                <div
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    paddingRight: 10,
                  }}
                >
                  {s.vendor_name}
                </div>
                <div>{s.campaign_type}</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#9ca3af',
                  }}
                >
                  <UserCircle size={14} />
                  <span>{s.created_by_username || '—'}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#9ca3af',
                    fontSize: 12,
                  }}
                >
                  <Calendar size={14} />
                  <span>{formatDateTime(s.created_at)}</span>
                </div>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>
                  {formatDateTime(s.end_time)}
                </div>
                <div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: statusColors.bg,
                      color: statusColors.fg,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: statusColors.fg,
                        marginRight: 6,
                      }}
                    />
                    {status}
                  </span>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontFamily: 'monospace' }}>
                      {processed.toLocaleString()} / {totalRows.toLocaleString()}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 700 }}>
                      {progress}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                      marginTop: 6,
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, progress))}%`,
                        background:
                          status === 'Completed'
                            ? 'rgba(16,185,129,0.8)'
                            : status === 'Failed'
                            ? 'rgba(239,68,68,0.75)'
                            : 'rgba(245,158,11,0.75)',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Link
                    to={`/sessions/${s.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: '1px solid rgba(249,115,22,0.35)',
                      color: '#f97316',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Edit
                    <ChevronRight size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#f87171',
                      borderRadius: 999,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#6b7280',
          }}
        >
          <span>
            Showing {total === 0 ? 0 : (page - 1) * limit + 1}–
            {Math.min(page * limit, total)} of {total} sessions
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => fetchSessions(Math.max(1, page - 1))}
              disabled={page === 1}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.08)',
                color: page === 1 ? '#374151' : '#9ca3af',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                borderRadius: 6,
                padding: '4px 8px',
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchSessions(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || totalPages === 0}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.08)',
                color:
                  page === totalPages || totalPages === 0
                    ? '#374151'
                    : '#9ca3af',
                cursor:
                  page === totalPages || totalPages === 0
                    ? 'not-allowed'
                    : 'pointer',
                borderRadius: 6,
                padding: '4px 8px',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionsList;

