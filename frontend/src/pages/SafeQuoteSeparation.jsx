import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Pickaxe, UploadCloud, Trash2, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

const SafeQuoteSeparation = () => {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [file, setFile] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [campaignId, setCampaignId] = useState('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);

    const load = async (query = search) => {
        setLoading(true);
        try {
            const res = await api.get(`/safe-quote-separation?page=1&limit=50&search=${encodeURIComponent(query || '')}`);
            setRows(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load separation numbers' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        api.get('/safe-quote-campaigns').then((res) => setCampaigns(res.data || [])).catch(() => {});
        load('');
    }, []);

    const handleImport = async () => {
        if (!file) {
            setMessage({ type: 'error', text: 'Choose a file first' });
            return;
        }
        setUploading(true);
        setMessage(null);
        try {
            const form = new FormData();
            form.append('file', file);
            if (campaignId) form.append('campaign_id', campaignId);
            const res = await api.post('/safe-quote-separation/import', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setMessage({ type: 'success', text: `${res.data.upserted.toLocaleString()} numbers saved to Safe Quote Separation` });
            setFile(null);
            await load(search);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Import failed' });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/safe-quote-separation/${id}`);
            await load(search);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Delete failed' });
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-10 space-y-6">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500 mb-2">Safe Quote</p>
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                    <Pickaxe className="text-amber-400" /> Safe Quote Separation
                </h1>
                <p className="text-slate-400 text-sm mt-2 max-w-2xl">
                    Numbers uploaded here stay inside Safe Quote. Lead upload skips them, and download never includes them.
                </p>
            </div>

            <div className="bg-[#1e1e2d] border border-white/10 rounded-2xl p-6">
                <h2 className="text-white font-bold mb-4">Upload separation file</h2>
                <div className="grid md:grid-cols-[1fr_220px_auto] gap-3 items-end">
                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">File</span>
                        <input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-2 block w-full text-sm text-slate-300" />
                    </label>
                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Campaign</span>
                        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="mt-2 w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                            <option value="">Optional</option>
                            {campaigns.map((c) => <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>)}
                        </select>
                    </label>
                    <button type="button" onClick={handleImport} disabled={uploading} className="h-11 px-5 rounded-xl bg-amber-600 text-white font-bold text-sm inline-flex items-center gap-2 disabled:opacity-60">
                        <UploadCloud size={16} /> {uploading ? 'Uploading…' : 'Import'}
                    </button>
                </div>
                {message && (
                    <div className={`mt-4 text-sm font-medium flex items-center gap-2 ${message.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                        {message.text}
                    </div>
                )}
            </div>

            <div className="bg-[#1e1e2d] border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') load(search); }}
                            placeholder="Search phone"
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white"
                        />
                    </div>
                    <span className="text-xs font-bold text-slate-500">{total.toLocaleString()} numbers</span>
                </div>
                <div className="divide-y divide-white/5">
                    {loading ? (
                        <div className="p-8 text-slate-500 text-sm">Loading…</div>
                    ) : rows.length === 0 ? (
                        <div className="p-8 text-slate-500 text-sm">No separation numbers yet.</div>
                    ) : rows.map((row) => (
                        <div key={row.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div>
                                <div className="text-white font-semibold">{row.phone}</div>
                                <div className="text-xs text-slate-500">{row.campaign_name || 'No campaign'}</div>
                            </div>
                            <button type="button" onClick={() => handleDelete(row.id)} className="text-rose-400 hover:text-rose-300">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SafeQuoteSeparation;
