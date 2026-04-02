import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import {
    Search, Plus, ChevronLeft, ChevronRight,
    UserCircle, Trash2, Edit2, Eye, Filter, X, Check
} from 'lucide-react';

const ROLE_LABELS = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    data_entry: 'Data Entry',
};
const ROLE_COLORS = {
    super_admin: '#f59e0b',
    admin: '#6366f1',
    data_entry: '#10b981',
};

const Users = () => {
    const { user: currentUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [actionMenu, setActionMenu] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [toast, setToast] = useState(null);

    const isSuperAdmin = currentUser?.role === 'super_admin';

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit });
            if (search) params.append('search', search);
            if (filterRole) params.append('role', filterRole);
            if (filterStatus) params.append('status', filterStatus);
            const res = await api.get(`/users?${params.toString()}`);
            setUsers(res.data.users);
            setTotal(res.data.total);
        } catch {
            showToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, filterRole, filterStatus]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Reset to page 1 when search changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => setPage(1), 400);
        return () => clearTimeout(timer);
    }, [search]);

    const handleDelete = async (id) => {
        try {
            await api.delete(`/users/${id}`);
            showToast('User deactivated successfully');
            fetchUsers();
        } catch (err) {
            showToast(err?.response?.data?.message || 'Failed to deactivate user', 'error');
        } finally {
            setDeleteConfirm(null);
        }
    };

    const totalPages = Math.ceil(total / limit);

    const getInitials = (u) => {
        const fn = u.first_name || u.username || '';
        const ln = u.last_name || '';
        return ((fn[0] || '') + (ln[0] || '')).toUpperCase() || 'U';
    };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 24, right: 24, zIndex: 9999,
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: '#fff', padding: '12px 20px', borderRadius: 10,
                    fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: 8, animation: 'slideIn 0.3s ease'
                }}>
                    {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0 }}>Users</h1>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
                        Manage system users and their roles
                    </p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={() => navigate('/users/add')}
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#111',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
                            transition: 'transform 0.15s, box-shadow 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(245,158,11,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(245,158,11,0.4)'; }}
                    >
                        <Plus size={16} /> Add User
                    </button>
                )}
            </div>

            {/* Filters Bar */}
            <div style={{
                background: '#13151e', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: '16px 20px', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                    <input
                        type="text"
                        placeholder="Search by name, email..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        style={{
                            width: '100%', background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8, padding: '9px 12px 9px 36px', color: '#fff',
                            fontSize: 13, outline: 'none', boxSizing: 'border-box'
                        }}
                    />
                </div>
                {/* Role Filter */}
                <select
                    value={filterRole}
                    onChange={e => { setFilterRole(e.target.value); setPage(1); }}
                    style={{
                        background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8, padding: '9px 32px 9px 12px', color: filterRole ? '#f59e0b' : '#6b7280',
                        fontSize: 13, cursor: 'pointer', outline: 'none'
                    }}
                >
                    <option value="">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="data_entry">Data Entry</option>
                </select>
                {/* Status Filter */}
                <select
                    value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                    style={{
                        background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8, padding: '9px 32px 9px 12px', color: filterStatus ? '#f59e0b' : '#6b7280',
                        fontSize: 13, cursor: 'pointer', outline: 'none'
                    }}
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
                {(filterRole || filterStatus || search) && (
                    <button onClick={() => { setFilterRole(''); setFilterStatus(''); setSearch(''); setPage(1); }}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', cursor: 'pointer', borderRadius: 8, padding: '9px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <X size={13} /> Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div style={{ background: '#13151e', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                {/* Table Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '60px minmax(200px, 1.5fr) minmax(200px, 1.5fr) 140px 120px 120px 100px',
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    {['Profile', 'Full Name', 'Email Address', 'Phone Number', 'Role', 'Status', 'Action'].map(h => (
                        <span key={h} style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {h}
                        </span>
                    ))}
                </div>

                {/* Table Body */}
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>Loading users...</div>
                ) : users.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                        <div style={{ fontSize: 40, marginBottom: 10 }}>👥</div>
                        <p style={{ margin: 0 }}>No users found</p>
                    </div>
                ) : (
                    users.map((u, i) => (
                        <div key={u.id} style={{
                            display: 'grid',
                            gridTemplateColumns: '60px minmax(200px, 1.5fr) minmax(200px, 1.5fr) 140px 120px 120px 100px',
                            padding: '16px 24px',
                            borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                            alignItems: 'center',
                            transition: 'background 0.2s',
                            cursor: 'default'
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            {/* Profile */}
                            <div>
                                {u.profile_picture ? (
                                    <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${u.profile_picture}`} alt=""
                                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                                ) : (
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontSize: 14, fontWeight: 700
                                    }}>
                                        {getInitials(u)}
                                    </div>
                                )}
                            </div>
                            {/* Full Name */}
                            <div style={{ paddingRight: 16 }}>
                                <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}
                                </p>
                                <p style={{ color: '#9ca3af', fontSize: 12, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{u.username}</p>
                            </div>
                            {/* Email */}
                            <div style={{ color: '#9ca3af', fontSize: 13, paddingRight: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {u.email || '—'}
                            </div>
                            {/* Phone */}
                            <div style={{ color: '#9ca3af', fontSize: 13 }}>{u.phone || '—'}</div>
                            {/* Role */}
                            <div>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                    background: `${ROLE_COLORS[u.role] || '#6b7280'}15`,
                                    color: ROLE_COLORS[u.role] || '#9ca3af',
                                    border: `1px solid ${ROLE_COLORS[u.role] || '#6b7280'}30`,
                                }}>
                                    {ROLE_LABELS[u.role] || u.role}
                                </span>
                            </div>
                            {/* Status */}
                            <div>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                    background: u.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: u.status === 'active' ? '#10b981' : '#ef4444',
                                }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: u.status === 'active' ? '#10b981' : '#ef4444', boxShadow: u.status === 'active' ? '0 0 8px rgba(16,185,129,0.6)' : 'none' }}></div>
                                    {u.status === 'active' ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div style={{ position: 'relative' }}>
                                {isSuperAdmin && (
                                    <>
                                        <button
                                            onClick={() => setActionMenu(actionMenu === u.id ? null : u.id)}
                                            style={{
                                                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
                                                color: '#f59e0b', cursor: 'pointer', borderRadius: 8,
                                                padding: '6px 14px', fontSize: 12, fontWeight: 600
                                            }}>
                                            Action ▾
                                        </button>
                                        {actionMenu === u.id && (
                                            <div style={{
                                                position: 'absolute', right: 0, top: '110%', zIndex: 99,
                                                background: '#1a1d2a', border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: 10, overflow: 'hidden', minWidth: 140,
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                                            }}>
                                                <button onClick={() => { navigate(`/users/edit/${u.id}`); setActionMenu(null); }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: 13, transition: 'background 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                                    <Edit2 size={13} /> Edit
                                                </button>
                                                <button onClick={() => { setDeleteConfirm(u.id); setActionMenu(null); }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, transition: 'background 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                                    <Trash2 size={13} /> Deactivate
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {/* Footer */}
                <div style={{
                    padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <span style={{ color: '#6b7280', fontSize: 13 }}>
                        Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total} items
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: page === 1 ? '#374151' : '#9ca3af', cursor: page === 1 ? 'not-allowed' : 'pointer', borderRadius: 6, padding: '6px 10px' }}>
                            <ChevronLeft size={14} />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)}
                                style={{
                                    width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer',
                                    background: page === p ? '#f59e0b' : 'none',
                                    color: page === p ? '#111' : '#9ca3af',
                                    fontWeight: page === p ? 700 : 400, fontSize: 13
                                }}>{p}</button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: page === totalPages ? '#374151' : '#9ca3af', cursor: page === totalPages ? 'not-allowed' : 'pointer', borderRadius: 6, padding: '6px 10px' }}>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirm Modal */}
            {deleteConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }} onClick={() => setDeleteConfirm(null)}>
                    <div style={{
                        background: '#1a1d2a', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 16, padding: 28, maxWidth: 380, width: '90%',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Deactivate User?</h3>
                        <p style={{ color: '#9ca3af', margin: '0 0 24px', fontSize: 14 }}>This will deactivate the user account. They won't be able to log in.</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Deactivate</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Click Outside Handler */}
            {actionMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setActionMenu(null)} />}
        </div>
    );
};

export default Users;
