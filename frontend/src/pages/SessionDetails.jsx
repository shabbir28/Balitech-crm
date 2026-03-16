import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Settings, UserCircle, RefreshCcw, FileText, Calendar, Database, Clock, ChevronRight } from 'lucide-react';

const SessionDetails = () => {
    const { id } = useParams();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSession = () => {
        api.get(`/sessions/${id}`)
            .then(res => setSession(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchSession();
        // Optional: Poll for job updates
        const interval = setInterval(fetchSession, 5000);
        return () => clearInterval(interval);
    }, [id]);

    if (loading) return <div className="p-8 text-center">Loading Session Details...</div>;
    if (!session) return <div className="p-8 text-center text-red-500">Session Not Found</div>;

    const totalUploadedSize = session.jobs.reduce((sum, job) => sum + parseInt(job.file_size || 0), 0);
    const totalRows = session.jobs.reduce((sum, job) => sum + parseInt(job.total_rows || 0), 0);
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 text-gray-800">
            {/* Header Breadcrumb equivalent */}
            <div className="flex items-center space-x-2 text-sm text-gray-500 bg-gray-900 px-4 py-3 rounded-xl shadow-lg border border-gray-800">
                <span className="text-orange-500 font-bold flex items-center">
                    <Database className="w-4 h-4 mr-2" /> Sessions
                </span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-300 font-mono truncate max-w-xs">{session.id}</span>
                
                <div className="ml-auto flex items-center space-x-4 text-gray-400">
                    <Settings className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                    <UserCircle className="w-6 h-6 hover:text-white cursor-pointer transition-colors" />
                </div>
            </div>

            <div className="bg-[#2A2B36] rounded-2xl p-6 shadow-xl border border-gray-700 text-gray-200">
                <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                    <h2 className="text-xl font-semibold">Jobs: <span className="text-white">{session.jobs.length}</span></h2>
                    <div className="flex space-x-2">
                        <span className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold">Start</span>
                        <span className="bg-gray-600 text-white text-xs px-3 py-1 rounded-full font-bold cursor-pointer hover:bg-gray-500" onClick={fetchSession}>
                           <RefreshCcw className="inline w-3 h-3 mr-1"/> Refresh
                        </span>
                    </div>
                </div>

                {/* File Information Section */}
                <div className="mb-6">
                    <h3 className="text-orange-400 font-bold flex items-center mb-4 text-lg">
                        <FileText className="mr-2" /> File Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-[#363744] p-4 rounded-xl border border-gray-600">
                            <p className="text-orange-400 text-sm font-bold mb-1">Vendor/Campaign</p>
                            <p className="text-sm truncate text-white">{session.vendor_name} ({session.campaign_type})</p>
                        </div>
                        <div className="bg-[#363744] p-4 rounded-xl border border-gray-600">
                            <p className="text-orange-400 text-sm font-bold mb-1">Total Files Size</p>
                            <p className="text-sm text-white">{formatBytes(totalUploadedSize)}</p>
                        </div>
                        <div className="bg-[#363744] p-4 rounded-xl border border-gray-600">
                            <p className="text-orange-400 text-sm font-bold mb-1">Import Type</p>
                            <p className="text-sm text-white">Mixed</p>
                        </div>
                        <div className="bg-[#363744] p-4 rounded-xl border border-gray-600">
                            <p className="text-orange-400 text-sm font-bold mb-1">Total Rows</p>
                            <p className="text-sm text-white">{totalRows}</p>
                        </div>
                    </div>
                </div>

                {/* Durations Section */}
                <div className="mb-8">
                    <h3 className="text-orange-400 font-bold flex items-center mb-4 text-lg">
                        <Clock className="mr-2" /> Durations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-[#363744] p-4 rounded-xl border border-gray-600">
                            <p className="text-orange-400 text-sm font-bold mb-1">Start Time</p>
                            <p className="text-sm text-white">{new Date(session.created_at).toLocaleString()}</p>
                        </div>
                        <div className="bg-[#363744] p-4 rounded-xl border border-gray-600">
                            <p className="text-orange-400 text-sm font-bold mb-1">End Time</p>
                            <p className="text-sm text-white">N/A</p>
                        </div>
                        <div className="bg-[#363744] p-4 rounded-xl border border-gray-600">
                            <p className="text-orange-400 text-sm font-bold mb-1">Last Processed</p>
                            <p className="text-sm text-white">{session.jobs.length > 0 ? new Date(session.jobs[session.jobs.length-1].created_at).toLocaleString() : 'N/A'}</p>
                        </div>
                        <div className="bg-[#363744] p-4 rounded-xl border border-gray-600">
                            <p className="text-orange-400 text-sm font-bold mb-1">Created At</p>
                            <p className="text-sm text-white">{new Date(session.created_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Jobs Table Section */}
                <div className="border-t border-gray-700 pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Jobs</h3>
                        <div className="flex space-x-3">
                            <Link to={`/sessions/${id}/add-job`} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg">
                                Add Job +
                            </Link>
                            <button className="bg-orange-500 hover:bg-orange-600 opacity-50 cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold transition-colors">
                                Add Bulk Jobs +
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#363744] text-gray-300 font-bold">
                                <tr>
                                    <th className="p-3 rounded-tl-lg">No</th>
                                    <th className="p-3">File</th>
                                    <th className="p-3">Size</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-center">Progress</th>
                                    <th className="p-3">File Link</th>
                                    <th className="p-3 text-center">Rows</th>
                                    <th className="p-3 rounded-tr-lg">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {session.jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="p-6 text-center text-gray-500">No jobs added yet. Click "Add Job +" to start uploading lists.</td>
                                    </tr>
                                ) : (
                                    session.jobs.map((job, index) => (
                                        <tr key={job.id} className="border-b border-gray-700 hover:bg-[#363744] transition-colors">
                                            <td className="p-3 text-gray-400">{index + 1}</td>
                                            <td className="p-3 font-medium text-white max-w-[200px] truncate" title={job.file_name}>{job.file_name}</td>
                                            <td className="p-3 text-gray-400">{formatBytes(parseInt(job.file_size))}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    job.status === 'Completed' ? 'bg-green-900 text-green-300' :
                                                    job.status === 'Failed' ? 'bg-red-900 text-red-300' :
                                                    'bg-yellow-900 text-yellow-300'
                                                }`}>
                                                    {job.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                {job.status === 'Completed' ? '100%' : job.status === 'Failed' ? '0%' : '50%'}
                                            </td>
                                            <td className="p-3 text-blue-400 cursor-pointer hover:underline">Download</td>
                                            <td className="p-3 text-center text-gray-300 font-mono">{job.total_rows}</td>
                                            <td className="p-3 text-red-400 text-xs max-w-[150px] truncate" title={job.error_message}>{job.error_message || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionDetails;
