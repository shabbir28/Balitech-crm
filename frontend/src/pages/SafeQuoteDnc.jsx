import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { Search, UploadCloud, Trash2, ShieldAlert, CheckCircle2, AlertCircle, FolderDown } from 'lucide-react';

const downloadBlob = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const fieldClass = 'w-full h-10 bg-[#0c0e16] border border-white/10 rounded-xl px-3 text-sm text-white outline-none focus:border-white/25';

const SafeQuoteDnc = () => {
    const [type, setType] = useState('DNC');
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const [saleFile, setSaleFile] = useState(null);
    const [dncFile, setDncFile] = useState(null);
    const [separationFile, setSeparationFile] = useState(null);
    const [importing, setImporting] = useState('');
    const [importNote, setImportNote] = useState('');
    const saleInputRef = useRef(null);
    const dncInputRef = useRef(null);
    const separationInputRef = useRef(null);
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState('');

    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [downloadCampaign, setDownloadCampaign] = useState('');
    const [downloadType, setDownloadType] = useState('ALL');
    const [downloadQty, setDownloadQty] = useState(1000);
    const [exportCount, setExportCount] = useState(null);
    const [loadingExportCount, setLoadingExportCount] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState('');
    const [downloadSuccess, setDownloadSuccess] = useState('');

    const queryString = useMemo(() => {
        return `/safe-quote-dnc?page=1&limit=50&type=${encodeURIComponent(type)}&search=${encodeURIComponent(search)}`;
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
        api.get('/safe-quote-campaigns')
            .then(res => setCampaigns(res.data.filter(c => c.status === 'Active')))
            .catch(e => console.error('Failed to load campaigns', e));
    }, []);

    useEffect(() => {
        if (!downloadCampaign) {
            setExportCount(null);
            return;
        }
        const timer = setTimeout(() => {
            setLoadingExportCount(true);
            setDownloadError('');
            api.get(`/safe-quote-dnc/export-count?campaign_id=${encodeURIComponent(downloadCampaign)}&type=${encodeURIComponent(downloadType)}`)
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
    }, [downloadCampaign, downloadType]);

    const handleDownloadDnc = async () => {
        if (!downloadCampaign) {
            setDownloadError('Please select a campaign.');
            return;
        }
        if (exportCount === 0) {
            setDownloadError('No records to export for this campaign and type. Try All Campaigns or No campaign linked.');
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
            const res = await api.post('/safe-quote-dnc/download', {
                campaign_id: downloadCampaign,
                type: downloadType,
                quantity: qty,
            });
            downloadBlob(res.data.csv, res.data.fileName || `dnc_export_${Date.now()}.csv`);
            setDownloadSuccess(`Downloaded ${res.data.count?.toLocaleString()} record(s).`);
        } catch (err) {
            setDownloadError(err.response?.data?.message || 'Download failed.');
        } finally {
            setDownloading(false);
        }
    };

    const importList = async (kind, file, inputRef) => {
        if (!file || !selectedCampaign) return;
        setImporting(kind);
        setImportNote('');
        try {
            const form = new FormData();
            form.append('file', file);
            form.append('type', kind);
            form.append('campaign_id', selectedCampaign);
            await api.post('/safe-quote-dnc/import', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (kind === 'SALE') setSaleFile(null);
            if (kind === 'DNC') setDncFile(null);
            if (kind === 'SEPARATION') setSeparationFile(null);
            if (inputRef.current) inputRef.current.value = '';
            setType(kind);
            setImportNote(`${kind === 'SEPARATION' ? 'Separation' : kind} list imported.`);
            fetchList();
        } catch (err) {
            setImportNote(err.response?.data?.message || 'Import failed.');
        } finally {
            setImporting('');
        }
    };

    const openDeleteConfirm = (id) => setDeleteConfirmId(id);
    const closeDeleteConfirm = () => {
        if (!isDeleting) setDeleteConfirmId(null);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        setIsDeleting(true);
        try {
            await api.delete(`/safe-quote-dnc/${deleteConfirmId}`);
            fetchList();
            setDeleteConfirmId(null);
        } catch (e) {
            console.error('Failed to delete DNC', e);
        } finally {
            setIsDeleting(false);
        }
    };

    const imports = [
        { kind: 'DNC', label: 'DNC', file: dncFile, setFile: setDncFile, inputRef: dncInputRef, tone: 'text-rose-300' },
        { kind: 'SALE', label: 'Sale', file: saleFile, setFile: setSaleFile, inputRef: saleInputRef, tone: 'text-emerald-300' },
        { kind: 'SEPARATION', label: 'Separation', file: separationFile, setFile: setSeparationFile, inputRef: separationInputRef, tone: 'text-amber-300' },
    ];

    const tabs = [
        { id: 'DNC', label: 'DNC', active: 'bg-rose-500 text-white' },
        { id: 'SALE', label: 'Sale', active: 'bg-emerald-500 text-white' },
        { id: 'SEPARATION', label: 'Separation', active: 'bg-amber-500 text-white' },
    ];

    return (
        <div className="max-w-[1180px] mx-auto space-y-5 pb-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400">Safe Quote</p>
                    <h1 className="text-2xl font-bold text-white tracking-tight mt-1">DNC, Sale & Separation</h1>
                    <p className="text-xs text-slate-500 mt-1">Saved numbers are skipped on upload and download.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="flex bg-[#161822] border border-white/10 rounded-xl p-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setType(tab.id)}
                                className={`px-4 h-9 rounded-lg text-xs font-bold ${type === tab.id ? tab.active : 'text-slate-400 hover:text-white'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center h-10 bg-[#161822] border border-white/10 rounded-xl px-3 sm:w-64">
                        <Search className="w-4 h-4 text-slate-500 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search phone"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none text-white text-sm outline-none w-full ml-2 placeholder:text-slate-600"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="rounded-2xl border border-white/10 bg-[#161822] overflow-hidden">
                    <div className="h-1 bg-violet-500" />
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <FolderDown className="w-4 h-4 text-violet-300" />
                            <h2 className="text-sm font-bold text-white">Export</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block sm:col-span-2">
                                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Campaign</span>
                                <select value={downloadCampaign} onChange={(e) => setDownloadCampaign(e.target.value)} className={fieldClass}>
                                    <option value="">Select campaign</option>
                                    <option value="all">All campaigns</option>
                                    <option value="unassigned">No campaign linked</option>
                                    {campaigns.map(c => (
                                        <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Type</span>
                                <select value={downloadType} onChange={(e) => setDownloadType(e.target.value)} className={fieldClass}>
                                    <option value="ALL">All types</option>
                                    <option value="DNC">DNC only</option>
                                    <option value="SALE">Sale only</option>
                                    <option value="SEPARATION">Separation only</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Quantity</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={exportCount ?? 500000}
                                    value={downloadQty}
                                    onChange={(e) => setDownloadQty(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                    className={fieldClass}
                                />
                            </label>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-500">
                                {downloadCampaign
                                    ? (loadingExportCount ? 'Checking…' : `Available ${Number(exportCount || 0).toLocaleString()}`)
                                    : 'Pick a campaign to export'}
                            </p>
                            <button
                                type="button"
                                onClick={handleDownloadDnc}
                                disabled={downloading || !downloadCampaign || loadingExportCount || exportCount === 0}
                                className="h-10 px-4 rounded-xl text-sm font-bold text-white bg-violet-600 disabled:opacity-50"
                            >
                                {downloading ? 'Exporting…' : 'Download CSV'}
                            </button>
                        </div>
                        {downloadError && (
                            <p className="mt-3 text-xs text-rose-300 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {downloadError}</p>
                        )}
                        {downloadSuccess && (
                            <p className="mt-3 text-xs text-emerald-300 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {downloadSuccess}</p>
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-[#161822] overflow-hidden">
                    <div className="h-1 bg-amber-500" />
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <UploadCloud className="w-4 h-4 text-amber-300" />
                            <h2 className="text-sm font-bold text-white">Import</h2>
                        </div>
                        <label className="block mb-3">
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Campaign</span>
                            <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} className={fieldClass}>
                                <option value="">Select campaign</option>
                                {campaigns.map(c => (
                                    <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>
                                ))}
                            </select>
                        </label>
                        <div className="space-y-2">
                            {imports.map((item) => (
                                <div key={item.kind} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0c0e16] px-3 py-2">
                                    <span className={`w-20 shrink-0 text-xs font-bold ${item.tone}`}>{item.label}</span>
                                    <button
                                        type="button"
                                        onClick={() => item.inputRef.current?.click()}
                                        className="min-w-0 flex-1 text-left text-xs text-slate-400 truncate"
                                        title={item.file?.name || 'Choose file'}
                                    >
                                        {item.file?.name || 'Choose file'}
                                    </button>
                                    <input
                                        ref={item.inputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => item.setFile(e.target.files?.[0] || null)}
                                    />
                                    <button
                                        type="button"
                                        disabled={!item.file || !selectedCampaign || importing === item.kind}
                                        onClick={() => importList(item.kind, item.file, item.inputRef)}
                                        className="h-8 px-3 rounded-lg text-xs font-bold text-white bg-white/10 disabled:opacity-40 shrink-0"
                                    >
                                        {importing === item.kind ? '…' : 'Import'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        {importNote && <p className="mt-3 text-xs text-slate-400">{importNote}</p>}
                    </div>
                </section>
            </div>

            <section className="rounded-2xl border border-white/10 bg-[#161822] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white">{type === 'SEPARATION' ? 'Separation' : type} records</h2>
                    <span className="text-xs text-slate-500">{loading ? 'Loading…' : `${rows.length.toLocaleString()} shown`}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                                <th className="px-5 py-3 font-semibold">Phone</th>
                                <th className="px-3 py-3 font-semibold">Type</th>
                                <th className="px-3 py-3 font-semibold">Campaign</th>
                                <th className="px-3 py-3 font-semibold">Added</th>
                                <th className="px-5 py-3 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">Loading records…</td></tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center">
                                        <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                                        <p className="text-sm text-slate-400">No {type === 'SEPARATION' ? 'Separation' : type} records</p>
                                    </td>
                                </tr>
                            ) : rows.map((r) => (
                                <tr key={r.id} className="border-t border-white/5">
                                    <td className="px-5 py-3 font-mono text-sm text-white">{r.phone}</td>
                                    <td className="px-3 py-3">
                                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                            r.dnc_type === 'DNC' ? 'bg-rose-500/15 text-rose-300' :
                                            r.dnc_type === 'SEPARATION' ? 'bg-amber-500/15 text-amber-300' :
                                            'bg-emerald-500/15 text-emerald-300'
                                        }`}>{r.dnc_type === 'SEPARATION' ? 'Separation' : r.dnc_type}</span>
                                    </td>
                                    <td className="px-3 py-3 text-sm text-slate-300">{r.campaign_name || '—'}</td>
                                    <td className="px-3 py-3 text-xs text-slate-500">
                                        {r.created_at ? new Date(r.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button type="button" onClick={() => openDeleteConfirm(r.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-300 hover:text-rose-200">
                                            <Trash2 className="w-3.5 h-3.5" /> Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-[#161822] border border-white/10 rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-white">Remove this record?</h3>
                        <p className="text-sm text-slate-400 mt-2">This number will leave the {type === 'SEPARATION' ? 'Separation' : type} list.</p>
                        <div className="flex justify-end gap-2 mt-6">
                            <button type="button" onClick={closeDeleteConfirm} disabled={isDeleting} className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-300 border border-white/10">Cancel</button>
                            <button type="button" onClick={confirmDelete} disabled={isDeleting} className="h-10 px-4 rounded-xl text-sm font-bold text-white bg-rose-600 disabled:opacity-60">
                                {isDeleting ? 'Removing…' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SafeQuoteDnc;
