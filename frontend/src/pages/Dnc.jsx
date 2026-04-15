import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { Database, Search, UploadCloud, Trash2, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

const Dnc = () => {
    const [type, setType] = useState('DNC');
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const [importFile, setImportFile] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState('');

    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const queryString = useMemo(() => {
        return `/dnc?page=1&limit=50&type=${encodeURIComponent(type)}&search=${encodeURIComponent(search)}`;
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

    useEffect(() => {
        api.get('/campaigns')
            .then(res => setCampaigns(res.data.filter(c => c.status === 'Active')))
            .catch(e => console.error('Failed to load campaigns', e));
    }, []);

    const openDeleteConfirm = (id) => {
        setDeleteConfirmId(id);
    };

    const closeDeleteConfirm = () => {
        if (!isDeleting) {
            setDeleteConfirmId(null);
        }
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        setIsDeleting(true);
        try {
            await api.delete(`/dnc/${deleteConfirmId}`);
            fetchList();
            setDeleteConfirmId(null);
        } catch (e) {
            console.error('Failed to delete DNC', e);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 font-sans pb-12">
            
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 flex-wrap gap-6 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-rose-500" /> DNC & Sales Manager
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 font-medium">
                        Manage DNC and Sale numbers to ensure strict compliance before upload/download.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
                    
                    {/* Type Toggle */}
                    <div className="flex bg-[#0a0a0f] border border-white/10 rounded-xl p-1 shadow-inner w-full sm:w-auto">
                        {['DNC', 'SALE'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-[13px] font-bold transition-all ${
                                    type === t 
                                        ? t === 'DNC' 
                                            ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-[0_2px_10px_rgba(244,63,94,0.3)]' 
                                            : 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_2px_10px_rgba(16,185,129,0.3)]'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* Search Field */}
                    <div className="flex items-center bg-[#0a0a0f] border border-white/10 hover:border-brand-500/50 rounded-xl px-4 py-2.5 w-full sm:w-72 transition-all focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 group shadow-inner">
                        <Search className="w-4 h-4 text-slate-500 group-focus-within:text-brand-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search phone or source..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none text-white text-[13px] outline-none w-full ml-3 placeholder:text-slate-600 font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Import Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {/* Campaign Selection (Spans full top row if needed, or 1 column) */}
                <div className="bg-[#1e1e2d] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden xl:col-span-1 group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-brand-500/20 transition-all"></div>
                    <div className="relative z-10">
                        <label className="flex items-center gap-2 text-slate-300 text-[13px] font-bold mb-3 uppercase tracking-wider">
                            <Database className="w-4 h-4 text-brand-400" /> Target Campaign
                            <span className="text-rose-500 text-lg leading-none">*</span>
                        </label>
                        <select
                            value={selectedCampaign}
                            onChange={(e) => setSelectedCampaign(e.target.value)}
                            className="bg-[#0a0a0f] border border-white/10 hover:border-brand-500/50 rounded-xl px-4 py-3 outline-none cursor-pointer transition-all text-[14px] font-medium w-full shadow-inner focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-white appearance-none"
                        >
                            <option value="" className="text-slate-500">-- Select a Campaign for Import --</option>
                            {campaigns.map(c => (
                                <option key={c.campaign_id} value={c.campaign_id} className="text-white bg-[#1e1e2d] py-2">
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-3 font-medium flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Required before importing any file
                        </p>
                    </div>
                </div>

                {/* Import SALE Card */}
                <div className={`bg-[#1e1e2d] rounded-2xl border p-6 shadow-xl relative overflow-hidden transition-all ${selectedCampaign && importFile ? 'border-emerald-500/30' : 'border-white/5'}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <label className="flex items-center gap-2 text-slate-300 text-[13px] font-bold mb-4 uppercase tracking-wider">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Import SALE List
                        </label>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="file"
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[13px] file:font-semibold file:bg-[#0a0a0f] file:text-brand-400 hover:file:bg-white/5 file:cursor-pointer file:transition-colors file:border file:border-white/10 border border-white/10 rounded-xl bg-[#0a0a0f] file:shadow-inner cursor-pointer"
                                />
                            </div>
                            
                            <button
                                onClick={() => {
                                    const form = new FormData();
                                    if (!importFile || !selectedCampaign) return;
                                    form.append('file', importFile);
                                    form.append('type', 'SALE');
                                    form.append('campaign_id', selectedCampaign);
                                    api.post('/dnc/import', form, {
                                        headers: { 'Content-Type': 'multipart/form-data' },
                                    }).then(() => {
                                        setImportFile(null);
                                        fetchList();
                                    });
                                }}
                                disabled={!importFile || !selectedCampaign}
                                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[13px] font-bold transition-all active:scale-[0.98] ${
                                    importFile && selectedCampaign 
                                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)]' 
                                        : 'bg-[#0a0a0f] border border-white/5 text-slate-600 cursor-not-allowed'
                                }`}
                            >
                                <UploadCloud className="w-4 h-4" /> Execute SALE Import
                            </button>
                        </div>
                    </div>
                </div>

                {/* Import DNC Card */}
                <div className={`bg-[#1e1e2d] rounded-2xl border p-6 shadow-xl relative overflow-hidden transition-all ${selectedCampaign && importFile ? 'border-rose-500/30' : 'border-white/5'}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[50px] pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <label className="flex items-center gap-2 text-slate-300 text-[13px] font-bold mb-4 uppercase tracking-wider">
                            <ShieldAlert className="w-4 h-4 text-rose-400" /> Import DNC List
                        </label>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="file"
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[13px] file:font-semibold file:bg-[#0a0a0f] file:text-rose-400 hover:file:bg-white/5 file:cursor-pointer file:transition-colors file:border file:border-white/10 border border-white/10 rounded-xl bg-[#0a0a0f] file:shadow-inner cursor-pointer"
                                />
                            </div>
                            
                            <button
                                onClick={() => {
                                    const form = new FormData();
                                    if (!importFile || !selectedCampaign) return;
                                    form.append('file', importFile);
                                    form.append('type', 'DNC');
                                    form.append('campaign_id', selectedCampaign);
                                    api.post('/dnc/import', form, {
                                        headers: { 'Content-Type': 'multipart/form-data' },
                                    }).then(() => {
                                        setImportFile(null);
                                        fetchList();
                                    });
                                }}
                                disabled={!importFile || !selectedCampaign}
                                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[13px] font-bold transition-all active:scale-[0.98] ${
                                    importFile && selectedCampaign 
                                        ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-[0_4px_14px_rgba(244,63,94,0.3)] hover:shadow-[0_6px_20px_rgba(244,63,94,0.4)]' 
                                        : 'bg-[#0a0a0f] border border-white/5 text-slate-600 cursor-not-allowed'
                                }`}
                            >
                                <UploadCloud className="w-4 h-4" /> Execute DNC Import
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-[#1e1e2d] rounded-[2rem] border border-white/5 overflow-x-auto shadow-2xl relative">
                {/* Decorative glow */}
                <div className="absolute bottom-0 right-0 w-full h-1/2 bg-brand-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

                <div className="min-w-[1000px] relative z-10">
                    {/* Table Header */}
                    <div className="grid grid-cols-[180px_120px_200px_minmax(200px,1fr)_180px_120px] p-5 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0">
                        {['Phone Number', 'Record Type', 'Associated Campaign', 'Original Source', 'Date Added', 'Action'].map((h) => (
                            <span key={h} className="text-slate-400 text-[11px] font-bold uppercase tracking-widest pl-2">
                                {h}
                            </span>
                        ))}
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-white/5">
                        {loading ? (
                            <div className="p-16 text-center text-brand-400 animate-pulse font-medium tracking-widest uppercase text-sm">Loading records...</div>
                        ) : rows.length === 0 ? (
                            <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                                <ShieldAlert className="w-12 h-12 mb-4 opacity-20" strokeWidth={1.5} />
                                <p className="font-medium text-[15px] mb-1 text-slate-400">No {type} records found</p>
                                <p className="text-xs">Your compliance database for this filter is empty.</p>
                            </div>
                        ) : (
                            rows.map((r) => (
                                <div key={r.id} className="grid grid-cols-[180px_120px_200px_minmax(200px,1fr)_180px_120px] p-4 items-center hover:bg-white/5 transition-colors group">
                                    
                                    {/* Phone */}
                                    <div className="pl-2">
                                        <span className="text-slate-300 font-mono text-[14px] bg-[#0a0a0f] border border-white/5 px-3 py-1.5 rounded-lg shadow-sm group-hover:text-white transition-colors">
                                            {r.phone}
                                        </span>
                                    </div>
                                    
                                    {/* Type */}
                                    <div className="pl-2">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm ${
                                            r.dnc_type === 'DNC' 
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        }`}>
                                            {r.dnc_type}
                                        </span>
                                    </div>
                                    
                                    {/* Campaign */}
                                    <div className="text-white font-bold text-[13px] truncate pr-4 pl-2 group-hover:text-brand-300 transition-colors">
                                        {r.campaign_name || '—'}
                                    </div>
                                    
                                    {/* Source */}
                                    <div className="text-slate-400 text-[13px] pr-4 pl-2 font-medium truncate italic hover:text-slate-300 transition-colors cursor-default" title={r.source}>
                                        {r.source || 'Manual Entry'}
                                    </div>
                                    
                                    {/* Created At */}
                                    <div className="text-slate-500 text-[12px] font-mono pl-2">
                                        {r.created_at ? new Date(r.created_at).toLocaleString(undefined, {
                                            year: 'numeric', month: 'short', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        }) : '—'}
                                    </div>
                                    
                                    {/* Action */}
                                    <div className="pl-2">
                                        <button
                                            onClick={() => openDeleteConfirm(r.id)}
                                            className="bg-red-500/5 hover:bg-red-500/20 text-red-400/80 hover:text-red-400 border border-transparent hover:border-red-500/30 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Remove
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1e1e2d] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
                        {/* Decorative glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[50px] pointer-events-none"></div>
                        
                        <div className="p-6 relative z-10">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                                    <Trash2 className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Remove Record?</h3>
                                    <p className="text-slate-400 text-[13px] leading-relaxed">
                                        Are you sure you want to delete this {type} record? This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    onClick={closeDeleteConfirm}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-slate-300 hover:text-white hover:bg-white/5 border border-transparent transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_4px_14px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)] transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isDeleting ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            Deleting...
                                        </>
                                    ) : (
                                        'Yes, Remove Record'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Scoped styles for file inputs are applied via Tailwind classes */}
        </div>
    );
};

export default Dnc;
