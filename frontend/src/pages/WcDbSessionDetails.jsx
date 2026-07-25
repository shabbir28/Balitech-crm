import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Settings, UserCircle, RefreshCcw, FileText, Clock, Database, ChevronRight, PlayCircle, Plus, X, BarChart3, CheckCircle2, AlertCircle, Copy, Ban, TrendingUp } from 'lucide-react';

const WcDbSessionDetails = () => {
    const { id } = useParams();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [jobStatsModal, setJobStatsModal] = useState({ isOpen: false, job: null });

    const fetchSession = useCallback(() => {
        api.get(`/wc-db-sessions/${id}`)
            .then(res => setSession(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        fetchSession();
        const interval = setInterval(fetchSession, 10000);
        return () => clearInterval(interval);
    }, [fetchSession]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12 w-full h-[60vh] min-h-[400px]">
            <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping blur-md" />
                <div className="absolute inset-2 bg-cyan-400/30 rounded-full animate-pulse blur-sm" />
                <Database className="w-10 h-10 text-cyan-400 relative z-10 animate-spin" />
            </div>
            <span className="font-extrabold tracking-widest uppercase text-sm text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white animate-pulse">Syncing WC DB Session...</span>
        </div>
    );
    if (!session) return (
        <div className="flex flex-col items-center justify-center p-12 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-2xl mx-auto mt-10">
            <h2 className="text-xl font-bold mb-2">Session Not Found</h2>
            <p className="text-sm opacity-80">The requested WC DB upload session does not exist or has been removed.</p>
        </div>
    );

    const totalUploadedSize = session.jobs.reduce((sum, job) => sum + parseInt(job.file_size || 0), 0);
    const totalRows = session.jobs.reduce((sum, job) => sum + parseInt(job.total_rows || 0), 0);
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const openJobStats = (job) => { if (job.status === 'Completed') setJobStatsModal({ isOpen: true, job }); };

    return (
        <div className="max-w-7xl mx-auto space-y-6 text-slate-200 font-sans pb-12">
            {/* Job Stats Modal */}
            {jobStatsModal.isOpen && jobStatsModal.job && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setJobStatsModal({ isOpen: false, job: null })} />
                    <div className="bg-[#1e1e2d] border border-white/10 rounded-2xl w-full max-w-xl relative z-10 overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-white/8 bg-black/20">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center"><BarChart3 className="w-4 h-4 text-cyan-400" /></div>
                                <div>
                                    <h3 className="text-white font-bold text-[15px]">File Processing Stats</h3>
                                    <p className="text-slate-500 text-[11px] font-mono mt-0.5 truncate max-w-[280px]" title={jobStatsModal.job.file_name}>{jobStatsModal.job.file_name}</p>
                                </div>
                            </div>
                            <button onClick={() => setJobStatsModal({ isOpen: false, job: null })} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 grid grid-cols-2 gap-3">
                            <div className="col-span-2 bg-[#0a0a0f] rounded-xl border border-white/5 p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-slate-400" /></div>
                                <div><p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold">Total Valid Rows in File</p><p className="text-2xl font-extrabold text-white mt-0.5">{(jobStatsModal.job.total_rows || 0).toLocaleString()}</p></div>
                            </div>
                            {[
                                { label: 'Fresh Numbers', val: jobStatsModal.job.fresh_count, color: 'cyan', Icon: TrendingUp },
                                { label: 'Inserted in DB', val: jobStatsModal.job.inserted, color: 'emerald', Icon: CheckCircle2 },
                                { label: 'Already Present', val: jobStatsModal.job.existing_count, color: 'amber', Icon: AlertCircle },
                                { label: 'Duplicates in File', val: jobStatsModal.job.duplicates_in_file, color: 'orange', Icon: Copy },
                            ].map(({ label, val, color, Icon }) => (
                                <div key={label} className={`bg-[#0a0a0f] rounded-xl border border-${color}-500/20 p-4 relative overflow-hidden`}>
                                    <div className={`absolute top-0 left-0 w-1 h-full bg-${color}-500`} />
                                    <div className="flex items-center gap-2 mb-2 ml-2"><Icon className={`w-3.5 h-3.5 text-${color}-400`} /><p className={`text-${color}-400 text-[11px] uppercase tracking-widest font-bold`}>{label}</p></div>
                                    <p className="text-2xl font-extrabold text-white ml-2">{(val || 0).toLocaleString()}</p>
                                </div>
                            ))}
                            <div className="col-span-2 bg-[#0a0a0f] rounded-xl border border-purple-500/20 p-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                                <div className="flex items-center gap-2 mb-3 ml-2"><Ban className="w-3.5 h-3.5 text-purple-400" /><p className="text-purple-400 text-[11px] uppercase tracking-widest font-bold">DNC / Dead Skipped</p></div>
                                <div className="ml-2 flex items-center gap-6">
                                    <div><p className="text-slate-500 text-[10px] font-bold mb-0.5">DNC</p><p className="text-2xl font-extrabold text-white">{(jobStatsModal.job.dnc_skipped || 0).toLocaleString()}</p></div>
                                    <div className="w-px h-10 bg-white/5" />
                                    <div><p className="text-slate-500 text-[10px] font-bold mb-0.5">DEAD</p><p className="text-xl font-extrabold text-purple-300">{(jobStatsModal.job.dead_skipped || 0).toLocaleString()}</p></div>
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between">
                            <span className="text-slate-500 text-[11px] font-mono">Size: {formatBytes(parseInt(jobStatsModal.job.file_size || 0))}</span>
                            <button onClick={() => setJobStatsModal({ isOpen: false, job: null })} className="px-5 py-2 rounded-xl text-[13px] font-semibold text-slate-300 hover:text-white hover:bg-white/5">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-[13px] text-slate-400 bg-[#1e1e2d] px-5 py-3.5 rounded-2xl shadow-sm border border-white/5">
                <Link to="/wc-db-sessions" className="text-cyan-400 font-bold flex items-center hover:text-cyan-300 transition-colors"><Database className="w-4 h-4 mr-2" /> WC DB Sessions</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-300 font-mono truncate max-w-xs">{session.id}</span>
                <div className="ml-auto flex items-center space-x-4 text-slate-500">
                    <Settings className="w-[18px] h-[18px] hover:text-white cursor-pointer transition-colors" />
                    <UserCircle className="w-6 h-6 hover:text-white cursor-pointer transition-colors" />
                </div>
            </div>

            <div className="bg-[#1e1e2d] rounded-[2rem] p-8 sm:p-10 shadow-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-white/10 pb-6 relative z-10 gap-4">
                    <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
                        Active Jobs <span className="bg-[#0a0a0f] text-cyan-400 px-3 py-1 rounded-lg text-lg border border-white/5 font-mono">{session.jobs.length}</span>
                    </h2>
                    <div className="flex space-x-3">
                        <span className="bg-cyan-600/10 border border-cyan-600/20 text-cyan-500 text-xs px-4 py-1.5 rounded-full font-bold uppercase tracking-widest flex items-center">
                            <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Operational
                        </span>
                        <button className="bg-cyan-600/5 hover:bg-cyan-600/15 border border-cyan-600/20 hover:border-cyan-600/40 text-cyan-500 text-xs px-4 py-1.5 rounded-full font-bold uppercase tracking-widest cursor-pointer transition-all flex items-center active:scale-95" onClick={fetchSession}>
                            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Refresh
                        </button>
                    </div>
                </div>

                {/* Metadata */}
                <div className="mb-10 relative z-10">
                    <h3 className="text-cyan-500 font-bold flex items-center mb-5 text-sm uppercase tracking-widest"><FileText className="mr-2 w-4 h-4" strokeWidth={2.5} /> Session Metadata</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-colors md:col-span-2">
                            <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-1.5">Uploaded File(s)</p>
                            <p className="text-[14px] font-medium text-white truncate">{session.jobs.length > 0 ? (session.jobs.length === 1 ? session.jobs[0].file_name : `${session.jobs[0].file_name} (+${session.jobs.length - 1} more)`) : <span className="text-slate-500 italic">No files yet</span>}</p>
                        </div>
                        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-colors">
                            <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-1.5">Uploaded By</p>
                            <p className="text-[14px] font-medium text-white flex items-center truncate"><UserCircle className="w-4 h-4 mr-1.5 text-cyan-400 shrink-0" /> {session.created_by_username || 'System User'}</p>
                        </div>
                        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-colors md:col-span-2">
                            <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-1.5">Vendor / Campaign</p>
                            <p className="text-[15px] font-medium truncate text-white">{session.vendor_name} <span className="text-slate-500 mx-1">/</span> {session.campaign_type}</p>
                        </div>
                        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-colors">
                            <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-1.5">Total Upload Volume</p>
                            <p className="text-[15px] font-mono text-white">{formatBytes(totalUploadedSize)}</p>
                        </div>
                        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-colors">
                            <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-1.5">Aggregated Rows</p>
                            <p className="text-2xl font-extrabold text-white leading-none mt-1">{totalRows.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="mb-10 relative z-10">
                    <h3 className="text-cyan-500 font-bold flex items-center mb-5 text-sm uppercase tracking-widest"><Clock className="mr-2 w-4 h-4" strokeWidth={2.5} /> Timeline & Logs</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-[#0a0a0f] p-4 rounded-2xl border border-white/5"><p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-1">Initialization</p><p className="text-[13px] text-slate-300 font-mono">{new Date(session.created_at).toLocaleString()}</p></div>
                        <div className="bg-[#0a0a0f] p-4 rounded-2xl border border-white/5"><p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-1">Latest Activity</p><p className="text-[13px] text-slate-300 font-mono">{session.jobs.length > 0 ? new Date(session.jobs[session.jobs.length - 1].created_at).toLocaleString() : 'No active jobs'}</p></div>
                        <div className="bg-[#0a0a0f] p-4 rounded-2xl border border-white/5"><p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-1">Module</p><p className="text-[13px] text-cyan-400 font-bold">WC DB — Isolated</p></div>
                        <div className="bg-[#0a0a0f] p-4 rounded-2xl border border-white/5"><p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-1">System Load</p><p className="text-[13px] font-bold text-white flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />Normal</p></div>
                    </div>
                </div>

                {/* Jobs Table */}
                <div className="border-t border-white/10 pt-8 relative z-10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h3 className="text-xl font-extrabold text-white tracking-tight">Job Processing Queue</h3>
                        <div className="flex space-x-3 w-full sm:w-auto">
                            <Link to={`/wc-db-sessions/${id}/add-job?bulk=true`} className="flex-1 sm:flex-none bg-[#0a0a0f] hover:bg-white/5 border border-white/10 text-slate-300 px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center text-[13px] active:scale-[0.98]">
                                Bulk Upload
                            </Link>
                            <Link to={`/wc-db-sessions/${id}/add-job`} className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-[13px]">
                                Add New Job <Plus className="w-4 h-4" strokeWidth={3} />
                            </Link>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0a0a0f]">
                        <table className="w-full text-left text-[13px]">
                            <thead className="bg-[#1e1e2d] text-slate-400 font-bold uppercase tracking-widest text-[11px] border-b border-white/5">
                                <tr>
                                    {['# ID', 'Filename', 'Filesize', 'Status', 'Progress', 'Resource', 'Rows', 'System Messages'].map(h => <th key={h} className="p-4 font-bold">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {session.jobs.length === 0 ? (
                                    <tr><td colSpan="8" className="p-12 text-center">
                                        <div className="flex flex-col items-center text-slate-500">
                                            <Database className="w-10 h-10 mb-3 opacity-20" />
                                            <p className="font-medium text-sm">Upload queue is empty.</p>
                                            <p className="text-xs mt-1">Click "Add New Job" to begin ingesting files.</p>
                                        </div>
                                    </td></tr>
                                ) : session.jobs.map((job, index) => (
                                    <tr key={job.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 text-slate-500 font-mono font-medium">{String(index + 1).padStart(2, '0')}</td>
                                        <td className="p-4 max-w-[200px]">
                                            <button onClick={() => openJobStats(job)} title={job.status === 'Completed' ? `Click to view stats for ${job.file_name}` : job.file_name}
                                                className={`flex items-center gap-2 text-left ${job.status === 'Completed' ? 'cursor-pointer hover:text-cyan-300 text-slate-200' : 'cursor-default text-slate-400'} transition-colors`}>
                                                <FileText className={`w-3.5 h-3.5 shrink-0 ${job.status === 'Completed' ? 'text-cyan-400' : 'text-slate-600'}`} />
                                                <span className="font-bold truncate max-w-[160px]">{job.file_name}</span>
                                                {job.status === 'Completed' && <span className="text-[9px] bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 px-1.5 py-0.5 rounded font-bold shrink-0">STATS</span>}
                                            </button>
                                        </td>
                                        <td className="p-4 text-slate-400 font-mono">{formatBytes(parseInt(job.file_size))}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center max-w-fit ${job.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : job.status === 'Failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${job.status === 'Completed' ? 'bg-emerald-400' : job.status === 'Failed' ? 'bg-red-400' : 'bg-amber-400'}`} />{job.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3 justify-center">
                                                <span className="text-slate-400 font-mono text-[11px] w-8 text-right">{job.status === 'Completed' ? '100%' : job.status === 'Failed' ? '0%' : '50%'}</span>
                                                <div className="w-16 h-1.5 bg-[#1e1e2d] rounded-full overflow-hidden border border-white/5">
                                                    <div className={`h-full rounded-full ${job.status === 'Completed' ? 'bg-emerald-500' : job.status === 'Failed' ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: job.status === 'Completed' ? '100%' : job.status === 'Failed' ? '0%' : '50%' }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4"><span className="text-slate-600 text-xs font-mono">—</span></td>
                                        <td className="p-4 text-center text-slate-300 font-mono font-bold bg-[#1e1e2d]/50 border-x border-white/5">{job.total_rows?.toLocaleString() || '0'}</td>
                                        <td className="p-4">
                                            {job.error_message ? <div className="text-red-400 bg-red-500/10 px-3 py-1.5 rounded text-xs max-w-[200px] truncate border border-red-500/20" title={job.error_message}>{job.error_message}</div> : <span className="text-slate-600 italic">No execution errors...</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WcDbSessionDetails;
