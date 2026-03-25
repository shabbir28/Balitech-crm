import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { UploadCloud, CheckCircle, ArrowRight, Settings, UserCircle, Database, ChevronRight, FileX, FileSpreadsheet, Server, Cpu } from 'lucide-react';

const AddJob = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [step, setStep] = useState(1);
    const [files, setFiles] = useState([]);
    const [comparing, setComparing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [compareResult, setCompareResult] = useState(null);

    const isBulk = new URLSearchParams(location.search).get('bulk') === 'true';

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        if (selected.length > 0) {
            setFiles(isBulk ? selected : [selected[0]]);
            setError('');
            setCompareResult(null);
            setResult(null);
            setStep(1);
        }
    };

    const handleCompare = async () => {
        if (files.length === 0) {
            setError('Please select a file to compare');
            return;
        }

        setComparing(true);
        setError('');
        setCompareResult(null);
        setResult(null);

        const aggregate = {
            total_processed: 0,
            total_unique_phones: 0,
            duplicates_in_file: 0,
            fresh_count: 0,
            existing_count: 0,
            dnc_skipped: 0,
            dnc_skipped_dnc: 0,
            dnc_skipped_sale: 0,
            fresh_sample: [],
            existing_breakdown: {},
        };

        try {
            for (let i = 0; i < files.length; i++) {
                setProgress(Math.round(((i) / files.length) * 100));
                
                const formData = new FormData();
                formData.append('file', files[i]);
                formData.append('session_id', id);

                const res = await api.post('/jobs/compare', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                aggregate.total_processed += res.data.total_processed || 0;
                aggregate.total_unique_phones += res.data.total_unique_phones || 0;
                aggregate.duplicates_in_file += res.data.duplicates_in_file || 0;
                aggregate.fresh_count += res.data.fresh_count || 0;
                aggregate.existing_count += res.data.existing_count || 0;
                aggregate.dnc_skipped += res.data.dnc_skipped || 0;
                aggregate.dnc_skipped_dnc += res.data.dnc_skipped_dnc || 0;
                aggregate.dnc_skipped_sale += res.data.dnc_skipped_sale || 0;

                if (res.data.existing_breakdown) {
                    for (const [vendorName, count] of Object.entries(res.data.existing_breakdown)) {
                        aggregate.existing_breakdown[vendorName] = (aggregate.existing_breakdown[vendorName] || 0) + count;
                    }
                }

                if (Array.isArray(res.data.fresh_sample)) {
                    aggregate.fresh_sample.push(...res.data.fresh_sample);
                    aggregate.fresh_sample = aggregate.fresh_sample.slice(0, 25);
                }
            }
            
            setProgress(100);
            setCompareResult(aggregate);
            setStep(3); // Preview step
        } catch (err) {
            setError(err.response?.data?.message || 'Server error comparing file(s)');
        } finally {
            setComparing(false);
        }
    };

    const handleUploadFresh = async () => {
        if (files.length === 0) {
            setError('Please select a file to upload fresh numbers');
            return;
        }

        setUploading(true);
        setError('');
        setResult(null);

        const aggregate = {
            total_processed: 0,
            total_unique_phones: 0,
            duplicates_in_file: 0,
            fresh_count: 0,
            existing_count: 0,
            dnc_skipped: 0,
            dnc_skipped_dnc: 0,
            dnc_skipped_sale: 0,
            inserted: 0,
            updated: 0,
            duplicates_skipped: 0,
            existing_breakdown: {},
        };

        try {
            for (let i = 0; i < files.length; i++) {
                setProgress(Math.round(((i) / files.length) * 100));

                const formData = new FormData();
                formData.append('file', files[i]);
                formData.append('session_id', id);

                const res = await api.post('/jobs/upload-fresh', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                aggregate.total_processed += res.data.total_processed || 0;
                aggregate.total_unique_phones += res.data.total_unique_phones || 0;
                aggregate.duplicates_in_file += res.data.duplicates_in_file || 0;
                aggregate.fresh_count += res.data.fresh_count || 0;
                aggregate.existing_count += res.data.existing_count || 0;
                aggregate.dnc_skipped += res.data.dnc_skipped || 0;
                aggregate.dnc_skipped_dnc += res.data.dnc_skipped_dnc || 0;
                aggregate.dnc_skipped_sale += res.data.dnc_skipped_sale || 0;

                aggregate.inserted += res.data.inserted || 0;
                aggregate.updated += res.data.updated || 0;
                aggregate.duplicates_skipped += res.data.duplicates_skipped || 0;

                if (res.data.existing_breakdown) {
                    for (const [vendorName, count] of Object.entries(res.data.existing_breakdown)) {
                        aggregate.existing_breakdown[vendorName] = (aggregate.existing_breakdown[vendorName] || 0) + count;
                    }
                }
            }

            setProgress(100);
            setResult(aggregate);
            setStep(4); // Import step finished
        } catch (err) {
            setError(err.response?.data?.message || 'Server error uploading fresh file(s)');
        } finally {
            setUploading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="w-full flex justify-center pb-20 font-sans">
            <div className="w-full max-w-6xl space-y-6 text-slate-200">
                
                {/* Header Breadcrumb */}
                <div className="flex items-center space-x-2 text-[13px] text-slate-400 bg-[#1e1e2d] px-5 py-3.5 rounded-2xl shadow-sm border border-white/5 mx-auto">
                    <span className="text-brand-400 font-bold flex items-center cursor-pointer hover:text-brand-300 transition-colors" onClick={() => navigate(`/sessions/${id}`)}>
                        <Database className="w-4 h-4 mr-2" /> Import Contact
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-slate-300 font-mono truncate max-w-xs">{id}</span>
                    
                    <div className="ml-auto flex items-center space-x-4 text-slate-500">
                        <Settings className="w-[18px] h-[18px] hover:text-white cursor-pointer transition-colors" />
                        <UserCircle className="w-6 h-6 hover:text-white cursor-pointer transition-colors" />
                    </div>
                </div>

                <div className="bg-[#1e1e2d] rounded-[2rem] shadow-2xl border border-white/5 relative overflow-hidden flex flex-col items-center pt-8 sm:pt-12">
                    
                    {/* Stepper */}
                    <div className="w-full max-w-4xl px-4 sm:px-12 mb-10 sm:mb-14 relative z-10">
                        {/* Connecting Line */}
                        <div className="absolute top-[28px] left-[15%] right-[15%] h-[2px] bg-white/5 -z-10 rounded-full"></div>
                        
                        {/* Progress Line */}
                        <div className="absolute top-[28px] left-[15%] h-[2px] bg-brand-500 -z-10 rounded-full transition-all duration-500 ease-out" 
                             style={{ width: step === 1 ? '0%' : step === 2 ? '33.3%' : step === 3 ? '66.6%' : '100%' }}></div>

                        <div className="flex justify-between items-start relative z-10">
                            {['Import File', 'Map Columns', 'Preview', 'Import'].map((label, index) => {
                                const stepNum = index + 1;
                                const isActive = step === stepNum;
                                const isPast = step > stepNum;
                                
                                return (
                                    <div key={label} className="flex flex-col items-center w-24 sm:w-32 text-center group">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                                            isActive || isPast 
                                                ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-brand-400/50 scale-110' 
                                                : 'bg-[#0a0a0f] text-slate-500 border border-white/10'
                                        }`}>
                                            {isPast ? <CheckCircle className="w-6 h-6 stroke-[3]" /> : <span className="font-bold text-lg">{stepNum}</span>}
                                        </div>
                                        <span className={`text-[12px] sm:text-[13px] mt-4 font-semibold tracking-wide transition-colors ${
                                            isActive || isPast ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-400'
                                        }`}>
                                            {label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 w-full bg-[#0a0a0f]/40 sm:p-12 p-6 text-slate-200 flex flex-col border-t border-white/5 relative z-10 min-h-[400px]">
                        {step === 1 && (
                            <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-8 lg:gap-16 items-center">
                                <div className="flex-1 w-full animate-fade-in relative z-10">
                                    <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Import File</h2>
                                    <p className="text-slate-400 mb-8 text-[14px] font-medium">Click below to drop your CSV, Excel, or TXT file into the CRM securely.</p>
                                    
                                    <div className="group relative border-2 border-dashed border-white/20 hover:border-brand-500/50 rounded-3xl p-10 text-center bg-[#1e1e2d]/50 hover:bg-brand-500/5 transition-all duration-300">
                                        <input 
                                            type="file" 
                                            accept=".csv, .xls, .xlsx" 
                                            multiple={isBulk}
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        />
                                        <div className="flex justify-center mb-5">
                                            <div className="bg-[#0a0a0f] text-brand-400 p-4 rounded-2xl border border-white/5 shadow-inner group-hover:scale-110 transition-transform duration-300 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                                                <UploadCloud className="w-8 h-8" />
                                            </div>
                                        </div>
                                        <p className="text-white font-bold text-lg mb-1">Click or drag and drop to import</p>
                                        <p className="text-slate-500 text-sm font-medium">Maximum file size: 50MB</p>
                                    </div>

                                    {files.length > 0 && (
                                        <div className="mt-8 animate-fade-in">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Added Files</h3>
                                            </div>
                                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2 cursor-default">
                                                {files.map((f, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-[#1e1e2d] border border-white/5 py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <FileSpreadsheet className="w-4 h-4 text-brand-400" />
                                                            <span className="text-slate-200 truncate text-[14px] font-medium max-w-[200px] sm:max-w-xs">{f.name}</span>
                                                        </div>
                                                        <span className="text-slate-500 text-xs font-mono bg-[#0a0a0f] px-2 py-1 rounded-md border border-white/5">{formatBytes(f.size)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mt-6 flex items-start">
                                                <FileX className="w-5 h-5 text-amber-400 mr-3 mt-0.5 shrink-0" />
                                                <div>
                                                    <h4 className="font-bold text-amber-400 text-[14px]">Automatic Cleanup</h4>
                                                    <p className="text-[13px] text-amber-200/70 mt-1 font-medium leading-relaxed">System will auto-scan and skip any completely empty rows during processing to optimize database integrity.</p>
                                                </div>
                                            </div>

                                            <div className="mt-8 flex flex-col items-end">
                                                {comparing && isBulk && (
                                                    <div className="w-full mb-6">
                                                        <div className="flex justify-between text-[12px] font-bold text-brand-400 mb-2 tracking-wide uppercase">
                                                            <span>Comparing {files.length} files...</span>
                                                            <span>{progress}%</span>
                                                        </div>
                                                        <div className="w-full bg-[#1e1e2d] rounded-full h-1.5 overflow-hidden border border-white/5">
                                                            <div className="bg-brand-500 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.8)]" style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={handleCompare}
                                                    disabled={comparing}
                                                    className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-[0_4px_14px_rgba(59,130,246,0.3)] flex items-center gap-2 active:scale-[0.98] text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {comparing ? 'Comparing...' : isBulk ? 'Start Bulk Compare' : 'Start Compare'} <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mt-6 text-sm font-medium flex items-center gap-3 animate-fade-in">
                                            <div className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0"></div>
                                            {error}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Character Illustration: Import Bot */}
                                <div className="hidden md:flex flex-1 items-center justify-center relative w-full h-[350px]">
                                    {/* Glowing background */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-500/20 rounded-full blur-[80px] pointer-events-none"></div>

                                    <div className="relative z-10 animate-[bounce_4s_infinite]">
                                        {/* Bot Antenna */}
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-1.5 h-6 bg-slate-600 rounded-t-full flex justify-center">
                                            <div className="absolute -top-3 w-4 h-4 rounded-full bg-brand-400 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
                                        </div>
                                        
                                        {/* Bot Body/Head */}
                                        <div className="w-48 h-40 bg-gradient-to-b from-[#1e1e2d] to-[#0a0a0f] border-2 border-brand-500/40 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center relative overflow-hidden group">
                                            {/* Screen Face */}
                                            <div className="w-36 h-20 bg-[#050508] rounded-2xl flex flex-col items-center justify-center mt-2 border border-white/5 relative overflow-hidden shadow-inner">
                                                {/* Scanning line */}
                                                <div className="absolute -top-10 w-full h-1 bg-brand-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[ping_3s_infinite]" style={{ animationDuration: '2s' }}></div>
                                                
                                                {/* Eyes */}
                                                <div className="flex gap-8 mb-2 mt-1">
                                                    <div className="w-5 h-6 rounded-full bg-brand-400 shadow-[0_0_10px_rgba(59,130,246,0.8)] group-hover:scale-y-50 group-hover:bg-brand-300 transition-all duration-300"></div>
                                                    <div className="w-5 h-6 rounded-full bg-brand-400 shadow-[0_0_10px_rgba(59,130,246,0.8)] group-hover:scale-y-50 group-hover:bg-brand-300 transition-all duration-300"></div>
                                                </div>
                                                {/* Mouth / Data Loader */}
                                                <div className="w-12 h-2.5 bg-slate-800 rounded-full overflow-hidden mt-1.5 border border-white/5">
                                                    <div className="w-1/3 h-full bg-emerald-400 opacity-80" style={{ animation: 'bounce 1s infinite alternate' }}></div>
                                                </div>
                                            </div>
                                            
                                            {/* Neck/Collar detail */}
                                            <div className="absolute bottom-0 w-full h-4 bg-brand-500/10 blur-sm"></div>
                                        </div>

                                        {/* Floating Hands */}
                                        <div className="absolute top-[40%] -left-8 w-6 h-14 bg-[#1e1e2d] border border-brand-500/30 rounded-full animate-[bounce_3s_infinite_reverse] shadow-lg"></div>
                                        <div className="absolute top-[40%] -right-8 w-6 h-14 bg-[#1e1e2d] border border-brand-500/30 rounded-full animate-[bounce_2.5s_infinite_reverse] shadow-lg"></div>
                                        
                                        {/* Floating files getting "sucked" in */}
                                        <div className="absolute -top-16 -right-16 bg-[#0a0a0f] p-3 rounded-2xl border border-white/10 shadow-xl opacity-80 animate-[bounce_4s_infinite]">
                                            <FileSpreadsheet className="w-7 h-7 text-brand-400" />
                                        </div>
                                        <div className="absolute -bottom-10 -left-16 bg-[#0a0a0f] p-3.5 rounded-2xl border border-emerald-500/20 shadow-xl opacity-80 animate-[bounce_3s_infinite_reverse]">
                                            <Database className="w-7 h-7 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        </div>
                                    </div>
                                    
                                    {/* Data Stream base */}
                                    <div className="absolute bottom-10 w-full h-16 flex justify-center items-end gap-3 opacity-40">
                                        {[...Array(6)].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className="w-1.5 rounded-t-full" 
                                                style={{ 
                                                    height: `${Math.random() * 40 + 20}px`,
                                                    backgroundColor: i % 2 === 0 ? '#3b82f6' : '#10b981',
                                                    animation: `pulse ${Math.random() * 2 + 1}s infinite alternate`
                                                }}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {step === 3 && compareResult && (
                            <div className="w-full max-w-4xl mx-auto text-center py-4 animate-fade-in relative z-10">
                                {/* Ambient Glow */}
                                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                                <div className="mx-auto bg-[#1e1e2d]/60 backdrop-blur-md border border-white/5 shadow-2xl rounded-3xl p-8 sm:p-10 text-left relative overflow-hidden">
                                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Preview Results</h2>
                                    <p className="text-slate-400 text-[14px] font-medium mb-8">
                                        Fresh numbers will be uploaded to CRM. Existing, DNC, and Sale numbers will be skipped.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-8">
                                        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-brand-500/30 transition-colors">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-500"></div>
                                            <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-1 ml-2 text-left">Total Valid Rows</p>
                                            <p className="text-3xl font-extrabold text-white ml-2">{compareResult.total_processed}</p>
                                        </div>
                                        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-red-500/30 transition-colors">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50"></div>
                                            <p className="text-red-400/70 text-[11px] uppercase tracking-widest font-bold mb-1 ml-2 text-left">Invalid/Dupes</p>
                                            <p className="text-3xl font-extrabold text-white ml-2">{compareResult.duplicates_in_file}</p>
                                        </div>
                                        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-brand-500/50 transition-colors">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-brand-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                                            <p className="text-brand-400 text-[11px] uppercase tracking-widest font-bold mb-1 ml-2 text-left">Fresh Numbers</p>
                                            <p className="text-3xl font-extrabold text-white ml-2">{compareResult.fresh_count}</p>
                                        </div>
                                        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-colors flex flex-col">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/70"></div>
                                            <p className="text-amber-400/80 text-[11px] uppercase tracking-widest font-bold mb-1 ml-2 text-left">Already Present</p>
                                            <p className="text-3xl font-extrabold text-white ml-2">{compareResult.existing_count}</p>
                                            {compareResult.existing_breakdown && Object.keys(compareResult.existing_breakdown).length > 0 && (
                                                <div className="mt-3 ml-2 text-[11px] border-t border-white/5 pt-3 flex-grow overflow-y-auto max-h-24 custom-scrollbar">
                                                    {Object.entries(compareResult.existing_breakdown).map(([campaign, count]) => (
                                                        <div key={campaign} className="flex justify-between text-slate-400 py-0.5">
                                                            <span className="truncate pr-2" title={campaign}>{campaign}:</span>
                                                            <span className="font-mono text-slate-300">{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50"></div>
                                            <p className="text-purple-400/80 text-[11px] uppercase tracking-widest font-bold mb-1 ml-2 text-left">Total DNC Skipped</p>
                                            <p className="text-3xl font-extrabold text-white ml-2">{compareResult.dnc_skipped}</p>
                                        </div>
                                        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50"></div>
                                            <p className="text-purple-400/80 text-[11px] uppercase tracking-widest font-bold mb-1 ml-2 text-left">DNC / SALE Skipped</p>
                                            <p className="text-2xl font-extrabold text-white ml-2 mt-1">
                                                {compareResult.dnc_skipped_dnc} / {compareResult.dnc_skipped_sale}
                                            </p>
                                        </div>
                                    </div>

                                    {Array.isArray(compareResult.fresh_sample) && compareResult.fresh_sample.length > 0 && (
                                        <div className="mb-6 bg-[#0a0a0f] p-5 rounded-2xl border border-white/5">
                                            <p className="text-slate-400 font-bold text-[12px] uppercase tracking-widest mb-3">Fresh Sample Preview</p>
                                            <div className="flex flex-wrap gap-2">
                                                {compareResult.fresh_sample.map((x, idx) => (
                                                    <span key={`${x.phone}-${idx}`} className="bg-[#1e1e2d] text-slate-300 text-[11px] font-mono px-2.5 py-1 rounded-md border border-white/5">
                                                        {x.phone}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-white/5">
                                        <button
                                            onClick={() => setStep(1)}
                                            disabled={uploading}
                                            className="bg-[#0a0a0f] hover:bg-white/5 border border-white/10 text-slate-300 px-6 py-3.5 rounded-xl font-semibold transition-all flex items-center gap-2 active:scale-[0.98] text-[14px]"
                                        >
                                            <ArrowRight className="w-4 h-4 rotate-180" strokeWidth={2.5} /> Back
                                        </button>
                                        <button
                                            onClick={handleUploadFresh}
                                            disabled={uploading}
                                            className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-[0_4px_14px_rgba(59,130,246,0.3)] flex items-center gap-2 active:scale-[0.98] text-[14px]"
                                        >
                                            {uploading ? 'Processing Data...' : 'Upload Fresh Numbers'} <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                                        </button>
                                    </div>
                                    
                                    {uploading && isBulk && (
                                        <div className="mt-8">
                                            <div className="flex justify-between text-[12px] font-bold text-brand-400 mb-2 tracking-wide uppercase">
                                                <span>Uploading {files.length} files...</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="w-full bg-[#0a0a0f] rounded-full h-1.5 overflow-hidden border border-white/5">
                                                <div className="bg-brand-500 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.8)]" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 4 && result && (
                            <div className="w-full max-w-lg mx-auto text-center py-6 animate-fade-in relative z-10">
                                {/* Ambient Glow */}
                                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                                <div className="relative z-10">
                                    <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                        <CheckCircle className="w-12 h-12 text-emerald-400" />
                                    </div>
                                    <h2 className="text-3xl font-extrabold text-white mb-6 tracking-tight">Upload Successful!</h2>
                                    
                                    <div className="bg-[#1e1e2d]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 sm:p-8 text-left mb-8 shadow-2xl">
                                        <ul className="space-y-4 text-[14px]">
                                            <li className="flex justify-between border-b border-white/5 pb-3">
                                                <span className="text-slate-400 font-medium">Total Valid Rows</span>
                                                <span className="font-bold text-white">{result.total_processed}</span>
                                            </li>
                                            <li className="flex justify-between border-b border-white/5 pb-3">
                                                <span className="text-slate-400 font-medium">Invalid / Dupes Skipped</span>
                                                <span className="font-bold text-red-400">{result.duplicates_in_file || 0}</span>
                                            </li>
                                            <li className="flex justify-between border-b border-white/5 pb-3">
                                                <span className="text-slate-400 font-medium">Fresh Inserted</span>
                                                <span className="font-bold text-emerald-400 text-[16px]">{result.inserted}</span>
                                            </li>
                                            <li className="flex justify-between border-b border-white/5 pb-3">
                                                <span className="text-slate-400 font-medium">Already Present</span>
                                                <div className="text-right">
                                                    <span className="font-bold text-amber-400">{result.existing_count || 0}</span>
                                                    {result.existing_breakdown && Object.keys(result.existing_breakdown).length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {Object.entries(result.existing_breakdown).map(([campaign, count]) => (
                                                                <div key={campaign} className="flex justify-end gap-3 text-[12px] opacity-80">
                                                                    <span className="truncate max-w-[150px] font-medium" title={campaign}>{campaign}:</span>
                                                                    <span className="text-amber-300/80 font-mono">{count}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                            <li className="flex justify-between border-b border-white/5 pb-3">
                                                <span className="text-slate-400 font-medium">DNC Skipped Total</span>
                                                <span className="font-bold text-purple-400">{result.dnc_skipped || 0}</span>
                                            </li>
                                            <li className="flex justify-between pt-1">
                                                <span className="text-slate-400 font-medium">DNC / SALE Split</span>
                                                <span className="font-bold text-purple-400">
                                                    <span className="opacity-70">DNC: </span>{(result.dnc_skipped_dnc || 0)} <span className="mx-1 text-slate-600">|</span> <span className="opacity-70">SALE: </span>{(result.dnc_skipped_sale || 0)}
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/sessions/${id}`)}
                                        className="bg-[#0a0a0f] border border-white/10 hover:bg-white/5 text-slate-200 px-8 py-4 rounded-xl font-bold transition-all w-full shadow-sm active:scale-[0.98] text-[14px]"
                                    >
                                        Return to Session Overview
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddJob;
