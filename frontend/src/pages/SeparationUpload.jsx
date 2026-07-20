import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { Database, Search, UploadCloud, Trash2, Pickaxe, CheckCircle2, AlertCircle, FolderDown, Hash, Users2 } from 'lucide-react';

const downloadBlob = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const SeparationUpload = () => {
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const [importFile, setImportFile] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [clients, setClients] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState('');
    const [selectedClient, setSelectedClient] = useState('');

    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [downloadCampaign, setDownloadCampaign] = useState('');
    const [downloadClient, setDownloadClient] = useState('');
    const [downloadQty, setDownloadQty] = useState(1000);
    const [exportCount, setExportCount] = useState(null);
    const [loadingExportCount, setLoadingExportCount] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState('');
    const [downloadSuccess, setDownloadSuccess] = useState('');
    
    const [uploading, setUploading] = useState(false);

    const queryString = useMemo(() => {
        return `/separation?page=1&limit=50&search=${encodeURIComponent(search)}`;
    }, [search]);

    const fetchList = async () => {
        setLoading(true);
        try {
            const res = await api.get(queryString);
            setRows(res.data.data || []);
        } catch (e) {
            console.error('Failed to load separation data', e);
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
        
        api.get('/clients')
            .then(res => setClients(res.data.clients || []))
            .catch(e => console.error('Failed to load clients', e));
    }, []);

    useEffect(() => {
        if (!downloadCampaign && !downloadClient) {
            setExportCount(null);
            return;
        }
        const timer = setTimeout(() => {
            setLoadingExportCount(true);
            setDownloadError('');
            api.get(`/separation/export-count?campaign_id=${encodeURIComponent(downloadCampaign)}&client_id=${encodeURIComponent(downloadClient)}`)
                .then(res => {
                    const count = res.data.count || 0;
                    setExportCount(count);
                    if (downloadQty > count && count > 0) {
                        setDownloadQty(count);
                    }
                })
                .catch(() => setExportCount(0))
                .finally(() => setLoadingExportCount(false));
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [downloadCampaign, downloadClient]);

    const handleDownload = async () => {
        if (!downloadCampaign && !downloadClient) {
            setDownloadError('Please select a campaign or client.');
            return;
        }
        if (exportCount === 0) {
            setDownloadError('No records to export for this selection.');
            return;
        }
        const qty = parseInt(downloadQty, 10);
        if (!qty || qty <= 0) {
            setDownloadError('Enter a valid quantity.');
            return;
        }
        if (exportCount != null && qty > exportCount) {
            setDownloadError(`Quantity cannot exceed available (${exportCount.toLocaleString()}).`);
            return;
        }
        setDownloading(true);
        setDownloadError('');
        setDownloadSuccess('');
        try {
            const res = await api.post('/separation/download', {
                campaign_id: downloadCampaign,
                client_id: downloadClient,
                quantity: qty,
            });
            downloadBlob(res.data.csv, res.data.fileName || `separation_export_${Date.now()}.csv`);
            setDownloadSuccess(`Downloaded ${res.data.count?.toLocaleString()} record(s).`);
        } catch (err) {
            setDownloadError(err.response?.data?.message || 'Download failed.');
        } finally {
            setDownloading(false);
        }
    };

    const handleUpload = async () => {
        if (!importFile || !selectedCampaign || !selectedClient) return;
        setUploading(true);
        try {
            const sessionRes = await api.post('/separation/sessions', {
                campaign_id: selectedCampaign,
                client_id: selectedClient
            });
            const sessionId = sessionRes.data.session.id;

            const formData = new FormData();
            formData.append('file', importFile);
            formData.append('session_id', sessionId);

            await api.post('/separation/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setImportFile(null);
            setTimeout(() => fetchList(), 2000); // Give background worker time
            setDownloadSuccess("File uploaded! Background processing started.");
            setTimeout(() => setDownloadSuccess(''), 5000);
        } catch (err) {
            setDownloadError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

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
            await api.delete(`/separation/${deleteConfirmId}`);
            fetchList();
            setDeleteConfirmId(null);
        } catch (e) {
            console.error('Failed to delete record', e);
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
                        <Pickaxe className="w-8 h-8 text-blue-500" /> Separation Manager
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 font-medium">
                        Manage separated data linked to specific campaigns and clients.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
                    {/* Search Field */}
                    <div className="flex items-center bg-[#0a0a0f] border border-white/10 hover:border-brand-500/50 rounded-xl px-4 py-2.5 w-full sm:w-72 transition-all focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 group shadow-inner">
                        <Search className="w-4 h-4 text-slate-500 group-focus-within:text-brand-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search phone, name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none text-white text-[13px] outline-none w-full ml-3 placeholder:text-slate-600 font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Download Section */}
            <div className="bg-[#1e1e2d] rounded-2xl border border-blue-500/20 p-6 shadow-xl relative mb-8">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none overflow-hidden rounded-2xl" />
                <div className="relative z-10 min-w-0">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                        <FolderDown className="w-5 h-5 text-blue-400 shrink-0" /> Download Separation Data
                    </h2>
                    <p className="text-xs text-slate-500 mb-5 font-medium">
                        Export separated data by campaign or client.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_minmax(140px,auto)] gap-4 items-end">
                        <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 min-h-[18px] leading-tight">
                                Campaign
                            </label>
                            <select
                                value={downloadCampaign}
                                onChange={(e) => setDownloadCampaign(e.target.value)}
                                className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-0 text-white text-[13px] w-full h-11 box-border outline-none focus:border-blue-500/50"
                            >
                                <option value="">Select campaign…</option>
                                <option value="all">All Campaigns</option>
                                {campaigns.map(c => (
                                    <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 min-h-[18px] leading-tight">
                                Client
                            </label>
                            <select
                                value={downloadClient}
                                onChange={(e) => setDownloadClient(e.target.value)}
                                className="bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-0 text-white text-[13px] w-full h-11 box-border outline-none focus:border-blue-500/50"
                            >
                                <option value="">Select client…</option>
                                <option value="all">All Clients</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="min-w-0 md:max-w-none xl:max-w-[140px]">
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 min-h-[18px] leading-tight">
                                Quantity <span className="text-blue-500">*</span>
                            </label>
                            <div className="relative h-11">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                                <input
                                    type="number"
                                    min={1}
                                    max={exportCount ?? 500000}
                                    value={downloadQty}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setDownloadQty(v === '' ? '' : parseInt(v, 10));
                                    }}
                                    className="w-full h-11 bg-[#0a0a0f] border border-white/10 rounded-xl py-0 pl-10 pr-4 text-white text-[13px] font-mono box-border outline-none focus:border-blue-500/50"
                                />
                            </div>
                        </div>

                        <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 min-h-[18px] leading-tight invisible" aria-hidden="true">
                                Export
                            </label>
                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={downloading || (!downloadCampaign && !downloadClient) || loadingExportCount || exportCount === 0}
                                title={exportCount === 0 ? 'No records available for this selection' : undefined}
                                className="w-full flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-[13px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-500 hover:to-indigo-500 transition-all"
                            >
                                {downloading ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                ) : (
                                    <FolderDown className="w-4 h-4 shrink-0" />
                                )}
                                <span className="truncate">{downloading ? 'Exporting…' : 'Download CSV'}</span>
                            </button>
                        </div>
                    </div>

                    {(downloadCampaign || downloadClient) && (
                        <p className="text-[11px] text-slate-500 mt-3">
                            {loadingExportCount ? 'Checking availability…' : (
                                <>Available for export: <span className="text-blue-400 font-bold">{(exportCount ?? 0).toLocaleString()}</span></>
                            )}
                        </p>
                    )}

                    {downloadError && (
                        <p className="mt-4 text-sm text-red-400 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {downloadError}
                        </p>
                    )}
                    {downloadSuccess && (
                        <p className="mt-4 text-sm text-emerald-400 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" /> {downloadSuccess}
                        </p>
                    )}
                </div>
            </div>

            {/* Import Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Campaign Selection */}
                <div className="bg-[#1e1e2d] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden group">
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
                    </div>
                </div>

                {/* Client Selection */}
                <div className="bg-[#1e1e2d] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-indigo-500/20 transition-all"></div>
                    <div className="relative z-10">
                        <label className="flex items-center gap-2 text-slate-300 text-[13px] font-bold mb-3 uppercase tracking-wider">
                            <Users2 className="w-4 h-4 text-indigo-400" /> Target Client
                            <span className="text-rose-500 text-lg leading-none">*</span>
                        </label>
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="bg-[#0a0a0f] border border-white/10 hover:border-indigo-500/50 rounded-xl px-4 py-3 outline-none cursor-pointer transition-all text-[14px] font-medium w-full shadow-inner focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white appearance-none"
                        >
                            <option value="" className="text-slate-500">-- Select a Client for Import --</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id} className="text-white bg-[#1e1e2d] py-2">
                                    {c.name} {c.did ? `(${c.did})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Import Data Card */}
                <div className={`bg-[#1e1e2d] rounded-2xl border p-6 shadow-xl relative overflow-hidden transition-all ${selectedCampaign && selectedClient && importFile ? 'border-blue-500/30' : 'border-white/5'}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[50px] pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <label className="flex items-center gap-2 text-slate-300 text-[13px] font-bold mb-4 uppercase tracking-wider">
                            <UploadCloud className="w-4 h-4 text-blue-400" /> Import File
                        </label>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="file"
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[13px] file:font-semibold file:bg-[#0a0a0f] file:text-blue-400 hover:file:bg-white/5 file:cursor-pointer file:transition-colors file:border file:border-white/10 border border-white/10 rounded-xl bg-[#0a0a0f] file:shadow-inner cursor-pointer"
                                />
                            </div>
                            
                            <button
                                onClick={handleUpload}
                                disabled={!importFile || !selectedCampaign || !selectedClient || uploading}
                                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[13px] font-bold transition-all active:scale-[0.98] ${
                                    importFile && selectedCampaign && selectedClient && !uploading
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_4px_14px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)]' 
                                        : 'bg-[#0a0a0f] border border-white/5 text-slate-600 cursor-not-allowed'
                                }`}
                            >
                                {uploading ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                ) : (
                                    <UploadCloud className="w-4 h-4" />
                                )}
                                {uploading ? 'Processing...' : 'Execute Import'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-[#1e1e2d] rounded-[2rem] border border-white/5 overflow-x-auto shadow-2xl relative">
                {/* Decorative glow */}
                <div className="absolute bottom-0 right-0 w-full h-1/2 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

                <div className="min-w-[1000px] relative z-10">
                    {/* Table Header */}
                    <div className="grid grid-cols-[150px_150px_200px_minmax(150px,1fr)_150px_150px_120px] p-5 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0">
                        {['Phone', 'Name', 'Email', 'Campaign', 'Client', 'Date Added', 'Action'].map((h) => (
                            <span key={h} className="text-slate-400 text-[11px] font-bold uppercase tracking-widest pl-2">
                                {h}
                            </span>
                        ))}
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-white/5">
                        {loading ? (
                            <div className="p-16 text-center text-blue-400 animate-pulse font-medium tracking-widest uppercase text-sm">Loading records...</div>
                        ) : rows.length === 0 ? (
                            <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                                <Pickaxe className="w-12 h-12 mb-4 opacity-20" strokeWidth={1.5} />
                                <p className="font-medium text-[15px] mb-1 text-slate-400">No separated records found</p>
                                <p className="text-xs">Your separation database for this filter is empty.</p>
                            </div>
                        ) : (
                            rows.map((r) => (
                                <div key={r.id} className="grid grid-cols-[150px_150px_200px_minmax(150px,1fr)_150px_150px_120px] p-4 items-center hover:bg-white/5 transition-colors group">
                                    
                                    {/* Phone */}
                                    <div className="pl-2">
                                        <span className="text-slate-300 font-mono text-[13px] bg-[#0a0a0f] border border-white/5 px-2 py-1 rounded-lg shadow-sm group-hover:text-white transition-colors">
                                            {r.phone}
                                        </span>
                                    </div>
                                    
                                    {/* Name */}
                                    <div className="text-white font-medium text-[13px] truncate pr-4 pl-2 group-hover:text-blue-300 transition-colors">
                                        {r.name || '—'}
                                    </div>
                                    
                                    {/* Email */}
                                    <div className="text-slate-400 text-[13px] pr-4 pl-2 font-medium truncate hover:text-slate-300 transition-colors">
                                        {r.email || '—'}
                                    </div>
                                    
                                    {/* Campaign */}
                                    <div className="text-white font-bold text-[13px] truncate pr-4 pl-2 group-hover:text-blue-300 transition-colors">
                                        {r.campaign_name || '—'}
                                    </div>

                                    {/* Client */}
                                    <div className="text-white font-bold text-[13px] truncate pr-4 pl-2 group-hover:text-blue-300 transition-colors">
                                        {r.client_name || '—'}
                                    </div>
                                    
                                    {/* Created At */}
                                    <div className="text-slate-500 text-[12px] font-mono pl-2">
                                        {(r.uploaded_at || r.created_at) ? new Date(r.uploaded_at || r.created_at).toLocaleString(undefined, {
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
                                        Are you sure you want to delete this record? This action cannot be undone.
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
        </div>
    );
};

export default SeparationUpload;
