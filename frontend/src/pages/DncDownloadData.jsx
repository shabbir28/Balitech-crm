import React, { useState, useEffect, useMemo } from 'react';
import { 
    DownloadCloud, CheckCircle2, ChevronDown, Database,
    RefreshCw, Filter, ShieldCheck, Search, LayoutDashboard
} from 'lucide-react';
import { fetchUploadedFiles, analyzeCleanFile } from '../services/dncChecker.service';

const CAMPAIGNS = ['Medicare', 'ACA', 'FE', 'Home Improvement', 'Solar', 'Hospital Indemnity'];
const fmtNum = (n) => (n ?? 0).toLocaleString();

const DncDownloadData = () => {
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [campaign, setCampaign] = useState('');
    const [selectedJobId, setSelectedJobId] = useState('');
    
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState(null);

    const fetchJobs = async (camp) => {
        setLoadingJobs(true);
        setError(null);
        try {
            const res = await fetchUploadedFiles({ campaign: camp, status: 'completed', limit: 500 });
            setJobs(res.data.data || []);
        } catch {
            setError('Failed to fetch files.');
        } finally {
            setLoadingJobs(false);
        }
    };

    useEffect(() => {
        if (campaign) {
            fetchJobs(campaign);
            setSelectedJobId('');
            setAnalysisResult(null);
        } else {
            setJobs([]);
            setSelectedJobId('');
            setAnalysisResult(null);
        }
    }, [campaign]);

    const selectedJob = useMemo(() => jobs.find(j => j.id.toString() === selectedJobId), [jobs, selectedJobId]);

    const handleAnalyze = async () => {
        if (!selectedJob) return;
        setAnalyzing(true);
        setError(null);
        setAnalysisResult(null);
        try {
            const res = await analyzeCleanFile(selectedJob.id);
            if (res.data.success) {
                setAnalysisResult(res.data);
            } else {
                setError(res.data.message || 'Analysis failed.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error occurred during analysis.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleDownloadFresh = () => {
        if (!analysisResult?.freshNumbers) return;
        
        const csvContent = analysisResult.freshNumbers.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `fresh_clean_${selectedJob?.id || 'leads'}_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sans">
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="h-12 w-12 bg-gradient-to-br from-brand-500/20 to-blue-500/20 border border-brand-500/30 rounded-xl flex items-center justify-center shadow-lg">
                    <Database className="h-6 w-6 text-brand-400" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">Download Clean Data</h1>
                    <p className="text-sm text-slate-400 mt-1">Compare uploaded DNC files against your existing database to extract net new leads.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Panel: Query Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-2 mb-6">
                            <Search className="h-5 w-5 text-brand-400" />
                            <h2 className="text-base font-semibold text-white">Query Configuration</h2>
                        </div>

                        <div className="space-y-5">
                            {/* Campaign */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Campaign</label>
                                <div className="relative">
                                    <select 
                                        value={campaign} 
                                        onChange={e => setCampaign(e.target.value)}
                                        className="w-full bg-[#13151f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 appearance-none transition-colors cursor-pointer">
                                        <option value="" disabled className="text-slate-500">Select Campaign</option>
                                        {CAMPAIGNS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* File */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Data File</label>
                                <div className="relative">
                                    <select 
                                        value={selectedJobId} 
                                        onChange={e => { setSelectedJobId(e.target.value); setAnalysisResult(null); }}
                                        disabled={!campaign || loadingJobs || jobs.length === 0}
                                        className="w-full bg-[#13151f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 appearance-none disabled:opacity-50 transition-colors cursor-pointer">
                                        <option value="" disabled className="text-slate-500">
                                            {loadingJobs ? 'Loading files...' : (campaign && jobs.length === 0 ? 'No files found' : 'Select File')}
                                        </option>
                                        {jobs.map(job => (
                                            <option key={job.id} value={job.id}>
                                                {job.file_name} ({fmtNum(job.clean)})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            <button 
                                onClick={handleAnalyze}
                                disabled={!selectedJobId || analyzing}
                                className="w-full mt-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(var(--brand-500-rgb),0.39)] disabled:opacity-60 disabled:cursor-not-allowed">
                                {analyzing ? (
                                    <><RefreshCw className="h-5 w-5 animate-spin" /> Analyzing Data...</>
                                ) : (
                                    <><LayoutDashboard className="h-5 w-5" /> Compare & Analyze</>
                                )}
                            </button>

                            {error && (
                                <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 shrink-0" />
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Results */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Top Stat Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col justify-center">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Uploaded</span>
                            <span className="text-2xl font-bold text-white">{selectedJob ? fmtNum(selectedJob.total_rows) : '-'}</span>
                        </div>
                        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col justify-center">
                            <span className="text-xs font-semibold text-red-400/80 uppercase tracking-wider mb-1">DNC Flagged</span>
                            <span className="text-2xl font-bold text-red-400">{selectedJob ? fmtNum(selectedJob.matched) : '-'}</span>
                        </div>
                        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col justify-center">
                            <span className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-1">Clean Output</span>
                            <span className="text-2xl font-bold text-emerald-400">{selectedJob ? fmtNum(selectedJob.clean) : '-'}</span>
                        </div>
                    </div>

                    {/* Main Analysis Container */}
                    <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-8 shadow-xl min-h-[380px] flex flex-col relative overflow-hidden">
                        
                        {!analysisResult ? (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-60">
                                <Filter className="h-14 w-14 text-slate-600 mb-4" />
                                <h3 className="text-lg font-medium text-slate-300">Ready for Analysis</h3>
                                <p className="text-sm text-slate-500 mt-2 max-w-sm text-center">Select your desired campaign and data file to start comparing with existing leads.</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col animate-in fade-in duration-500">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                                    <div>
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            <CheckCircle2 className="h-6 w-6 text-brand-400" /> Comparison Results
                                        </h2>
                                        <p className="text-sm text-slate-400 mt-1">Review the breakdown of existing duplicates and fresh leads.</p>
                                    </div>
                                    <button 
                                        onClick={handleDownloadFresh}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all shadow-[0_4px_14px_0_rgba(16,185,129,0.3)]">
                                        <DownloadCloud className="h-5 w-5" /> Download Fresh Leads
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                                    
                                    {/* Left Card: Fresh */}
                                    <div className="bg-[#13151f] rounded-2xl border border-emerald-500/20 p-6 flex flex-col justify-center relative overflow-hidden shadow-inner">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <Database className="h-24 w-24 text-emerald-500" />
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-sm font-semibold text-emerald-400/80 uppercase tracking-widest mb-2">Net Fresh Leads</p>
                                            <p className="text-5xl font-black text-emerald-400 mb-2 drop-shadow-md">{fmtNum(analysisResult.newLeads)}</p>
                                            <p className="text-sm text-slate-400">Ready to be downloaded and imported into your campaigns.</p>
                                        </div>
                                    </div>

                                    {/* Right Card: Duplicates */}
                                    <div className="bg-[#13151f] rounded-2xl border border-white/10 p-6 flex flex-col shadow-inner">
                                        <div className="mb-4">
                                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">Already in DB</p>
                                            <p className="text-3xl font-bold text-white">{fmtNum(analysisResult.existing)}</p>
                                        </div>

                                        <div className="flex-1 flex flex-col mt-4">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Campaign Breakdown</p>
                                            <div className="flex-1 overflow-y-auto max-h-[140px] space-y-2 pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ffffff10 transparent' }}>
                                                {Object.entries(analysisResult.existingBreakdown || {}).length > 0 ? (
                                                    Object.entries(analysisResult.existingBreakdown)
                                                        .sort((a,b) => b[1] - a[1])
                                                        .map(([camp, count]) => (
                                                        <div key={camp} className="flex items-center justify-between p-3 rounded-lg bg-[#1a1d2e] border border-white/5">
                                                            <span className="text-sm font-medium text-slate-300 truncate max-w-[150px]">{camp}</span>
                                                            <span className="text-sm font-bold text-white bg-white/10 px-2 py-0.5 rounded shadow-sm">{fmtNum(count)}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-slate-500 italic">No duplicates found.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default DncDownloadData;
