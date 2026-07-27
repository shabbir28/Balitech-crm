import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { UploadCloud, CheckCircle, ChevronRight, Settings, UserCircle, Database, FileSpreadsheet, X } from 'lucide-react';

const BULK_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_WAIT_MS = 30 * 60 * 1000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const uploadAndPoll = async (formData, fileLabel, onUploadProgress) => {
    const initRes = await api.post('/wc-db-jobs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: BULK_UPLOAD_TIMEOUT_MS,
        onUploadProgress: (e) => { if (onUploadProgress && e.total) onUploadProgress(Math.round((e.loaded * 100) / e.total)); }
    });
    const jobId = initRes.data?.job_id;
    if (!jobId) throw Object.assign(new Error('No job_id returned'), { failedFile: fileLabel });
    const deadline = Date.now() + POLL_MAX_WAIT_MS;
    while (Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        const pollRes = await api.get(`/wc-db-jobs/${jobId}/status`);
        const job = pollRes.data;
        if (job.status === 'Completed') {
            return {
                total_processed: job.total_rows || 0,
                fresh_count: job.fresh_count || 0,
                existing_count: job.existing_count || 0,
                duplicates_in_file: job.duplicates_in_file || 0,
                dnc_skipped: job.dnc_skipped || 0,
                dead_skipped: job.dead_skipped || 0,
                sales_skipped: job.sales_skipped || 0,
                inserted: job.inserted || 0,
                premium_overlap: job.premium_overlap || 0,
                refine_overlap: job.refine_overlap || 0,
                van_desk_overlap: job.van_desk_overlap || 0,
                raw_overlap: job.raw_overlap || 0,
            };
        }
        if (job.status === 'Failed') throw Object.assign(new Error(job.error_message || 'Upload failed'), { failedFile: fileLabel });
    }
    throw Object.assign(new Error('Upload timed out'), { failedFile: fileLabel });
};

const WcDbAddJob = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isBulk = new URLSearchParams(location.search).get('bulk') === 'true';

    const [step, setStep] = useState(1);
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [fileProgresses, setFileProgresses] = useState({});
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const formatBytes = (b) => { if (!b) return '0 Bytes'; const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(b) / Math.log(k)); return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]; };

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        if (selected.length > 0) { 
            setFiles(isBulk ? selected : [selected[0]]); 
            setError(''); 
            setResult(null); 
            setStep(1); 
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) { setError('Please select at least one file to upload'); return; }
        setUploading(true); setError(''); setResult(null); setFileProgresses({});
        const aggregate = { total_processed: 0, fresh_count: 0, existing_count: 0, duplicates_in_file: 0, dnc_skipped: 0, dead_skipped: 0, inserted: 0, premium_overlap: 0, refine_overlap: 0, van_desk_overlap: 0, raw_overlap: 0, failed_files: [] };
        try {
            for (let i = 0; i < files.length; i++) {
                const fileLabel = files[i]?.name || `File ${i + 1}`;
                try {
                    const formData = new FormData();
                    formData.append('file', files[i]);
                    formData.append('session_id', id);
                    const data = await uploadAndPoll(formData, fileLabel, (pct) => setFileProgresses(prev => ({ ...prev, [i]: pct })));
                    setProgress(Math.round(((i + 1) / files.length) * 100));
                    aggregate.total_processed += data.total_processed || 0;
                    aggregate.fresh_count += data.fresh_count || 0;
                    aggregate.existing_count += data.existing_count || 0;
                    aggregate.duplicates_in_file += data.duplicates_in_file || 0;
                    aggregate.dnc_skipped += data.dnc_skipped || 0;
                    aggregate.dead_skipped += data.dead_skipped || 0;
                    aggregate.sales_skipped += data.sales_skipped || 0;
                    aggregate.inserted += data.inserted || 0;
                    aggregate.premium_overlap += data.premium_overlap || 0;
                    aggregate.refine_overlap += data.refine_overlap || 0;
                    aggregate.van_desk_overlap += data.van_desk_overlap || 0;
                    aggregate.raw_overlap += data.raw_overlap || 0;
                } catch (fileErr) {
                    const detail = fileErr.response?.data?.error || fileErr.response?.data?.message || fileErr.message;
                    aggregate.failed_files.push({ name: fileLabel, error: detail });
                    setFileProgresses(prev => ({ ...prev, [i]: -1 }));
                    setProgress(Math.round(((i + 1) / files.length) * 100));
                }
            }
            setProgress(100); setResult(aggregate); setStep(2);
        } catch (err) {
            const detail = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(detail || 'Server error uploading file(s)');
        } finally { setUploading(false); }
    };

    const stepLabels = ['Upload File', 'Results'];

    return (
        <div className="w-full flex justify-center pb-20 font-sans">
            <div className="w-full max-w-4xl space-y-6 text-slate-200">
                {/* Breadcrumb */}
                <div className="flex items-center space-x-2 text-[13px] text-slate-400 bg-[#1e1e2d] px-5 py-3.5 rounded-2xl shadow-sm border border-white/5">
                    <span className="text-cyan-400 font-bold flex items-center cursor-pointer hover:text-cyan-300 transition-colors" onClick={() => navigate(`/wc-db-sessions/${id}`)}>
                        <Database className="w-4 h-4 mr-2" /> WC DB Session
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-slate-300 font-mono truncate max-w-xs">{id}</span>
                    <div className="ml-auto flex items-center space-x-4 text-slate-500">
                        <Settings className="w-[18px] h-[18px] hover:text-white cursor-pointer" />
                        <UserCircle className="w-6 h-6 hover:text-white cursor-pointer" />
                    </div>
                </div>

                <div className="bg-[#1e1e2d] rounded-[2rem] shadow-2xl border border-white/5 relative overflow-hidden flex flex-col items-center pt-8 sm:pt-12">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

                    {/* Stepper */}
                    <div className="w-full max-w-3xl px-4 sm:px-12 mb-10 relative z-10">
                        <div className="absolute top-[28px] left-[15%] right-[15%] h-[2px] bg-white/5 -z-10 rounded-full" />
                        <div className="absolute top-[28px] left-[15%] h-[2px] bg-cyan-500 -z-10 rounded-full transition-all duration-500" style={{ width: step === 1 ? '0%' : '100%' }} />
                        <div className="flex justify-between items-start relative z-10">
                            {stepLabels.map((label, index) => {
                                const stepNum = index + 1;
                                const isActive = step === stepNum;
                                const isPast = step > stepNum;
                                return (
                                    <div key={label} className="flex flex-col items-center w-32 text-center">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isActive || isPast ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] border border-cyan-400/50 scale-110' : 'bg-[#0a0a0f] text-slate-500 border border-white/10'}`}>
                                            {isPast ? <CheckCircle className="w-6 h-6 stroke-[3]" /> : <span className="font-bold text-lg">{stepNum}</span>}
                                        </div>
                                        <span className={`text-[13px] mt-4 font-semibold tracking-wide ${isActive || isPast ? 'text-cyan-400' : 'text-slate-500'}`}>{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 w-full bg-[#0a0a0f]/40 sm:p-12 p-6 text-slate-200 flex flex-col border-t border-white/5 relative z-10 min-h-[400px]">
                        {step === 1 && (
                            <div className="w-full max-w-2xl mx-auto animate-fade-in">
                                <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">{isBulk ? 'Bulk Upload WC DB Files' : 'Upload WC DB File'}</h2>
                                <p className="text-slate-400 mb-8 text-[14px] font-medium">Upload your CSV, Excel, or TXT file{isBulk ? 's' : ''}. Duplicates and DNC/Dead numbers will be auto-skipped.</p>
                                <div className="group relative border-2 border-dashed border-white/20 hover:border-cyan-500/50 rounded-3xl p-10 text-center bg-[#1e1e2d]/50 hover:bg-cyan-500/5 transition-all duration-300 cursor-pointer">
                                    <input 
                                        type="file" 
                                        accept=".csv, .xls, .xlsx, .txt" 
                                        multiple 
                                        onChange={handleFileChange} 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                                    />
                                    <div className="flex justify-center mb-5">
                                        <div className="bg-[#0a0a0f] text-cyan-400 p-4 rounded-2xl border border-white/5 shadow-inner group-hover:scale-110 transition-transform duration-300 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                                            <UploadCloud className="w-8 h-8" />
                                        </div>
                                    </div>
                                    <p className="text-white font-bold text-lg mb-1">Click or drag and drop to import</p>
                                    <p className="text-slate-500 text-sm font-medium">CSV, XLS, XLSX, TXT — Max 50MB each</p>
                                </div>

                                {files.length > 0 && (
                                    <div className="mt-8 animate-fade-in">
                                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3">Added Files ({files.length})</h3>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {files.map((f, i) => (
                                                <div key={i} className="flex flex-col bg-[#1e1e2d] border border-white/5 py-3 px-4 rounded-xl">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                                                            <span className="text-slate-200 truncate text-[14px] font-medium max-w-xs">{f.name}</span>
                                                        </div>
                                                        <span className="text-slate-500 text-xs font-mono bg-[#0a0a0f] px-2 py-1 rounded-md border border-white/5">{formatBytes(f.size)}</span>
                                                    </div>
                                                    {fileProgresses[i] !== undefined && (
                                                        <div className="mt-3">
                                                            <div className="flex justify-between mb-1">
                                                                <span className={`text-[9px] font-bold uppercase tracking-widest ${fileProgresses[i] === -1 ? 'text-red-400' : 'text-cyan-400'}`}>{fileProgresses[i] === -1 ? 'Failed' : fileProgresses[i] === 100 ? 'Processing...' : `Uploading ${fileProgresses[i]}%`}</span>
                                                                <span className="text-[9px] text-slate-500 font-mono">{fileProgresses[i] === -1 ? '—' : `${fileProgresses[i]}%`}</span>
                                                            </div>
                                                            <div className="w-full h-1 bg-[#0a0a0f] rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full transition-all ${fileProgresses[i] === -1 ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${Math.max(0, fileProgresses[i])}%` }} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="mt-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 text-sm animate-fade-in">
                                        <X className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
                                    </div>
                                )}

                                {uploading && (
                                    <div className="mt-6 space-y-2">
                                        <div className="flex justify-between text-[12px] text-slate-400">
                                            <span>Processing {files.length} file(s)...</span><span className="font-mono text-cyan-400">{progress}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-[#0a0a0f] rounded-full overflow-hidden border border-white/5">
                                            <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]" style={{ width: `${progress}%` }} />
                                        </div>
                                        <p className="text-[11px] text-slate-500 text-center animate-pulse">Please wait — processing may take a few minutes for large files...</p>
                                    </div>
                                )}

                                <div className="mt-8 flex gap-4">
                                    <button onClick={() => navigate(`/wc-db-sessions/${id}`)} disabled={uploading} className="px-6 py-3 bg-[#0a0a0f] hover:bg-white/5 border border-white/10 text-slate-300 rounded-xl font-semibold text-[13px] disabled:opacity-50">Cancel</button>
                                    <button onClick={handleUpload} disabled={uploading || files.length === 0}
                                        className={`flex-1 py-3 rounded-xl font-bold text-white text-[13px] flex items-center justify-center gap-2 transition-all ${uploading || files.length === 0 ? 'bg-cyan-500/40 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-[0_4px_14px_rgba(6,182,212,0.3)]'}`}>
                                        {uploading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing {files.length} file(s)...</> : <><UploadCloud className="w-4 h-4" /> {isBulk ? 'Bulk Upload to WC DB' : 'Upload to WC DB'}</>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && result && (
                            <div className="w-full max-w-2xl mx-auto animate-fade-in">
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                                    </div>
                                    <h2 className="text-2xl font-extrabold text-white mb-1">WC DB Upload Complete</h2>
                                    <p className="text-slate-400 text-[14px]">Files processed and numbers added to WC DB.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {[
                                        { label: 'Total Rows Processed', val: result.total_processed, color: 'slate' },
                                        { label: 'Fresh Numbers', val: result.fresh_count, color: 'cyan' },
                                        { label: 'Inserted into DB', val: result.inserted, color: 'emerald' },
                                        { label: 'Already Present', val: result.existing_count, color: 'amber' },
                                        { label: 'Duplicates in File', val: result.duplicates_in_file, color: 'orange' },
                                        { label: 'DNC Skipped', val: result.dnc_skipped, color: 'purple' },
                                        { label: 'Dead Skipped', val: result.dead_skipped, color: 'red' },
                                        { label: 'Sales Skipped', val: result.sales_skipped, color: 'pink' },
                                    ].map(({ label, val, color }) => (
                                        <div key={label} className={`bg-[#0a0a0f] rounded-xl border border-${color}-500/20 p-4 relative overflow-hidden ${color === 'slate' ? 'col-span-2' : ''}`}>
                                            <div className={`absolute top-0 left-0 w-1 h-full bg-${color}-500`} />
                                            <p className={`text-${color}-400 text-[10px] uppercase tracking-widest font-bold ml-2 mb-1`}>{label}</p>
                                            <p className="text-2xl font-extrabold text-white ml-2">{(val || 0).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl mb-6">
                                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">Overlap Information (Info Only)</h3>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { label: 'Premium', val: result.premium_overlap, color: 'teal' },
                                            { label: 'Refine', val: result.refine_overlap, color: 'teal' },
                                            { label: 'Van Desk', val: result.van_desk_overlap, color: 'violet' },
                                            { label: 'Raw Data', val: result.raw_overlap, color: 'slate' },
                                        ].map(({ label, val, color }) => (
                                            <div key={label} className={`bg-[#0a0a0f] rounded-lg border border-${color}-500/20 p-3 text-center`}>
                                                <p className={`text-${color}-400 text-[10px] uppercase font-bold mb-1`}>{label}</p>
                                                <p className="text-lg font-bold text-white">{(val || 0).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {result.failed_files?.length > 0 && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                                        <p className="text-red-400 font-bold text-sm mb-2">Failed Files ({result.failed_files.length})</p>
                                        {result.failed_files.map((f, i) => <p key={i} className="text-red-300 text-xs truncate">{f.name}: {f.error}</p>)}
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button onClick={() => { setStep(1); setFiles([]); setResult(null); setProgress(0); setFileProgresses({}); }} className="flex-1 py-3 bg-[#0a0a0f] hover:bg-white/5 border border-white/10 text-slate-300 rounded-xl font-semibold text-[13px]">Upload More</button>
                                    <button onClick={() => navigate(`/wc-db-sessions/${id}`)} className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl font-bold text-[13px]">Back to Session</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WcDbAddJob;
