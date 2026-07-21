import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    Plus, X, CheckCircle, AlertTriangle, Target, Users2,
    Hash, Building2, Search, ChevronDown, Pencil, Trash2
} from 'lucide-react';

const EMPTY_FORM = { name: '', did: '', campaign_id: '' };

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modals
    const [modal, setModal] = useState(null); // 'add' | 'edit' | 'delete'
    const [activeClient, setActiveClient] = useState(null);

    // Form
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // Toast
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    /* ── Fetch ── */
    const fetchClients = async () => {
        try {
            const res = await api.get('/clients');
            setClients(res.data.clients || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchCampaigns = async () => {
        try {
            const res = await api.get('/campaigns');
            setCampaigns(res.data || []);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchClients(); fetchCampaigns(); }, []);

    /* ── Toast ── */
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
    };

    /* ── Open Modals ── */
    const openAdd = () => { setFormData(EMPTY_FORM); setActiveClient(null); setModal('add'); };
    const openEdit = (client) => {
        setFormData({ name: client.name || '', did: client.did || '', campaign_id: client.campaign_id || '' });
        setActiveClient(client);
        setModal('edit');
    };
    const openDelete = (client) => { setActiveClient(client); setModal('delete'); };
    const closeModal = () => { if (!saving) { setModal(null); setActiveClient(null); } };

    /* ── Submit Add ── */
    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/clients', formData);
            showToast('Client added successfully!');
            setModal(null);
            fetchClients();
        } catch { showToast('Failed to add client.', 'error'); }
        finally { setSaving(false); }
    };

    /* ── Submit Edit ── */
    const handleEdit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/clients/${activeClient.id}`, formData);
            showToast('Client updated successfully!');
            setModal(null);
            fetchClients();
        } catch { showToast('Failed to update client.', 'error'); }
        finally { setSaving(false); }
    };

    /* ── Delete ── */
    const handleDelete = async () => {
        setSaving(true);
        try {
            await api.delete(`/clients/${activeClient.id}`);
            showToast('Client deleted successfully!');
            setModal(null);
            fetchClients();
        } catch { showToast('Failed to delete client.', 'error'); }
        finally { setSaving(false); }
    };

    const filtered = clients.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.did?.toLowerCase().includes(search.toLowerCase()) ||
        c.campaign_name?.toLowerCase().includes(search.toLowerCase())
    );

    /* ── Shared Form JSX ── */
    

    return (
        <div className="max-w-[1300px] mx-auto space-y-6 pb-12 font-sans">

            {/* ── Toast ── */}
            {toast.show && (
                <div className={`fixed top-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all ${
                    toast.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/25 text-red-400'
                }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                    <span className="font-semibold text-sm">{toast.message}</span>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Users2 className="w-8 h-8 text-blue-500" /> Clients Management
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 font-medium">Manage your client accounts and linked campaigns.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    <div className="flex items-center bg-[#0a0a0f] border border-white/10 hover:border-blue-500/40 rounded-xl px-4 py-2.5 w-full sm:w-64 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 group shadow-inner">
                        <Search className="w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors shrink-0" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-transparent border-none text-white text-[13px] outline-none w-full ml-3 placeholder:text-slate-600 font-medium"
                        />
                    </div>
                    <button
                        onClick={openAdd}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(59,130,246,0.35)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.45)] transition-all active:scale-[0.98] text-sm whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" /> Add Client
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                    { icon: Users2, label: 'Total Clients', value: clients.length, color: 'blue' },
                    { icon: Target, label: 'With Campaign', value: clients.filter(c => c.campaign_id).length, color: 'indigo' },
                    { icon: Hash, label: 'With DID', value: clients.filter(c => c.did).length, color: 'emerald' },
                ].map((stat) => (
                    <div key={stat.label} className={`bg-[#1e1e2d] border border-white/5 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-lg col-span-${stat.label === 'With DID' ? '2 sm:col-span-1' : '1'}`}>
                        <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 border border-${stat.color}-500/20 flex items-center justify-center shrink-0`}>
                            <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                        </div>
                        <div>
                            <div className="text-2xl font-extrabold text-white">{stat.value}</div>
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Table ── */}
            <div className="bg-[#1e1e2d] rounded-[2rem] border border-white/5 overflow-x-auto shadow-2xl relative">
                <div className="absolute bottom-0 right-0 w-full h-1/3 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
                <div className="min-w-[780px] relative z-10">
                    <div className="grid grid-cols-[60px_1fr_160px_1fr_100px_100px] px-5 py-4 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0">
                        {['#', 'Client Name', 'DID', 'Campaign', 'Created', 'Actions'].map(h => (
                            <span key={h} className="text-slate-500 text-[11px] font-bold uppercase tracking-widest pl-2">{h}</span>
                        ))}
                    </div>

                    <div className="divide-y divide-white/5">
                        {loading ? (
                            <div className="py-16 text-center text-blue-400 animate-pulse font-medium tracking-widest uppercase text-sm">Loading clients...</div>
                        ) : filtered.length === 0 ? (
                            <div className="py-16 text-center flex flex-col items-center gap-3">
                                <Users2 className="w-12 h-12 text-slate-700" strokeWidth={1.5} />
                                <p className="text-slate-400 font-medium text-[15px]">No clients found</p>
                                <p className="text-slate-600 text-xs">Try a different search or add a new client.</p>
                            </div>
                        ) : (
                            filtered.map(client => (
                                <div key={client.id} className="grid grid-cols-[60px_1fr_160px_1fr_100px_100px] px-5 py-4 items-center hover:bg-white/[0.02] transition-colors group">
                                    <span className="pl-2 text-slate-600 font-bold text-[12px] font-mono">#{client.id}</span>

                                    <div className="pl-2 flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-300 font-bold text-sm group-hover:from-blue-600/30 transition-all">
                                            {client.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <span className="text-white font-semibold text-[13px] truncate group-hover:text-blue-300 transition-colors">{client.name}</span>
                                    </div>

                                    <div className="pl-2">
                                        {client.did
                                            ? <span className="text-slate-300 font-mono text-[12px] bg-[#0a0a0f] border border-white/5 px-2.5 py-1 rounded-lg">{client.did}</span>
                                            : <span className="text-slate-600 text-xs">—</span>}
                                    </div>

                                    <div className="pl-2">
                                        {client.campaign_name
                                            ? <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                                                <Target className="w-3 h-3 shrink-0" />{client.campaign_name}
                                              </span>
                                            : <span className="text-slate-600 text-xs">—</span>}
                                    </div>

                                    <div className="pl-2 text-slate-500 text-[12px] font-mono">
                                        {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                                    </div>

                                    {/* Actions */}
                                    <div className="pl-2 flex items-center gap-2">
                                        <button
                                            onClick={() => openEdit(client)}
                                            title="Edit client"
                                            className="w-8 h-8 rounded-xl bg-blue-500/5 hover:bg-blue-500/20 border border-transparent hover:border-blue-500/30 text-blue-400/70 hover:text-blue-400 flex items-center justify-center transition-all active:scale-95"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => openDelete(client)}
                                            title="Delete client"
                                            className="w-8 h-8 rounded-xl bg-red-500/5 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 text-red-400/70 hover:text-red-400 flex items-center justify-center transition-all active:scale-95"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── Add / Edit Modal ── */}
            {(modal === 'add' || modal === 'edit') && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1e1e2d] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
                        <div className={`h-1 w-full bg-gradient-to-r ${modal === 'edit' ? 'from-indigo-500 via-purple-500 to-pink-500' : 'from-blue-500 via-indigo-500 to-purple-500'}`} />
                        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[70px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

                        <div className="relative z-10 p-7">
                            <div className="flex items-center justify-between mb-7">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${modal === 'edit' ? 'bg-indigo-500/15 border-indigo-500/25' : 'bg-blue-500/15 border-blue-500/25'}`}>
                                        {modal === 'edit' ? <Pencil className="w-5 h-5 text-indigo-400" /> : <Users2 className="w-5 h-5 text-blue-400" />}
                                    </div>
                                    <div>
                                        <h2 className="text-[17px] font-extrabold text-white leading-tight">
                                            {modal === 'edit' ? 'Edit Client' : 'Add New Client'}
                                        </h2>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                            {modal === 'edit' ? `Editing: ${activeClient?.name}` : 'Fill in the details below'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <form onSubmit={modal === "edit" ? handleEdit : handleAdd} className="space-y-5">
            <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    Client Name <span className="text-red-400 text-base leading-none ml-0.5">*</span>
                </label>
                <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600 font-medium"
                />
            </div>

            <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" />
                    DID Number
                </label>
                <input
                    type="text"
                    value={formData.did}
                    onChange={e => setFormData({ ...formData, did: e.target.value })}
                    placeholder="e.g. 1234567890"
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600"
                />
            </div>

            <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    Campaign
                </label>
                <div className="relative">
                    <select
                        value={formData.campaign_id}
                        onChange={e => setFormData({ ...formData, campaign_id: e.target.value })}
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none pr-10 cursor-pointer"
                    >
                        <option value="">-- No Campaign --</option>
                        {campaigns.map(c => (
                            <option key={c.campaign_id} value={c.campaign_id} className="bg-[#1e1e2d]">
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-600 font-medium">Optional — link this client to a campaign.</p>
            </div>

            <div className="border-t border-white/[0.06] pt-5 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl font-semibold text-[13px] text-slate-400 hover:text-white hover:bg-white/5 border border-transparent transition-all disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] transition-all text-[13px] flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                    {saving ? (
                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                    ) : (
                        <><CheckCircle className="w-4 h-4" />{modal === 'edit' ? 'Update Client' : 'Save Client'}</>
                    )}
                </button>
            </div>
        </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Modal ── */}
            {modal === 'delete' && activeClient && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1e1e2d] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[50px] pointer-events-none" />
                        <div className="relative z-10 p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                    <Trash2 className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Delete Client?</h3>
                                    <p className="text-slate-400 text-[13px] leading-relaxed">
                                        Are you sure you want to delete <span className="text-white font-semibold">"{activeClient.name}"</span>? This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={saving}
                                    className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_4px_14px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)] transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                                >
                                    {saving
                                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting...</>
                                        : <><Trash2 className="w-4 h-4" />Yes, Delete</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;
