import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { Database, Search, UploadCloud, Plus, Trash2 } from 'lucide-react';

const Dnc = () => {
  const [type, setType] = useState('BLA');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newPhone, setNewPhone] = useState('');
  const [newSource, setNewSource] = useState('');

  const [importFile, setImportFile] = useState(null);

  const queryString = useMemo(() => {
    return `/dnc?page=1&limit=50&type=${encodeURIComponent(type)}&search=${encodeURIComponent(
      search,
    )}`;
  }, [type, search]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get(queryString);
      setRows(res.data.data || []);
    } catch (e) {
      console.error('Failed to load DNC', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const addOne = async () => {
    try {
      await api.post('/dnc', { phone: newPhone, type, source: newSource || undefined });
      setNewPhone('');
      setNewSource('');
      fetchList();
    } catch (e) {
      console.error('Failed to add DNC', e);
    }
  };

  const doImport = async () => {
    if (!importFile) return;
    try {
      const form = new FormData();
      form.append('file', importFile);
      form.append('type', type);
      await api.post('/dnc/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportFile(null);
      fetchList();
    } catch (e) {
      console.error('Failed to import DNC', e);
    }
  };

  const deleteRow = async (id) => {
    const ok = window.confirm('Delete this DNC number?');
    if (!ok) return;
    try {
      await api.delete(`/dnc/${id}`);
      fetchList();
    } catch (e) {
      console.error('Failed to delete DNC', e);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 22,
          flexWrap: 'wrap',
          gap: 12,
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
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>
              DNC (Do Not Call)
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
              Manage BLA/Sale DNC numbers (excluded from upload & download).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            {['BLA', 'SALE'].map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  background: type === t ? '#f59e0b' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: type === t ? '#111' : '#9ca3af',
                  borderRadius: 999,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {t}
              </button>
            ))}
          </div>

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
              placeholder="Search phone/source..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            background: '#13151e',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.06)',
            padding: 14,
          }}
        >
          <div style={{ color: '#9ca3af', fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
            Add single number
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Phone (10 digits)"
              style={{
                flex: 1,
                minWidth: 220,
                background: '#0f1117',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '10px 12px',
                color: '#fff',
                outline: 'none',
                fontSize: 13,
              }}
            />
            <input
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="Source (optional)"
              style={{
                flex: 1,
                minWidth: 220,
                background: '#0f1117',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '10px 12px',
                color: '#fff',
                outline: 'none',
                fontSize: 13,
              }}
            />
            <button
              onClick={addOne}
              style={{
                background: '#f59e0b',
                color: '#111',
                border: 'none',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>

        <div
          style={{
            background: '#13151e',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.06)',
            padding: 14,
          }}
        >
          <div style={{ color: '#9ca3af', fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
            Import file
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="file"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              style={{ color: '#9ca3af' }}
            />
            <button
              onClick={doImport}
              disabled={!importFile}
              style={{
                background: importFile ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                color: importFile ? '#111' : '#6b7280',
                border: 'none',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 800,
                cursor: importFile ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <UploadCloud size={16} />
              Import {type}
            </button>
          </div>
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
            gridTemplateColumns: '180px 80px 220px 170px 120px',
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          {['Phone', 'Type', 'Source', 'Created At', 'Action'].map((h) => (
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
          <div style={{ padding: 50, textAlign: 'center', color: '#6b7280' }}>
            Loading DNC...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 50, textAlign: 'center', color: '#6b7280' }}>
            No DNC numbers found.
          </div>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 80px 220px 170px 120px',
                padding: '12px 18px',
                borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                alignItems: 'center',
                color: '#e5e7eb',
                fontSize: 13,
              }}
            >
              <div style={{ fontFamily: 'monospace' }}>{r.phone}</div>
              <div style={{ fontWeight: 800, color: r.dnc_type === 'BLA' ? '#fbbf24' : '#93c5fd' }}>
                {r.dnc_type}
              </div>
              <div style={{ color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.source || '—'}
              </div>
              <div style={{ color: '#9ca3af', fontSize: 12 }}>
                {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
              </div>
              <div>
                <button
                  onClick={() => deleteRow(r.id)}
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171',
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dnc;

