import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Trash2, Edit, Eye, X, Paperclip } from 'lucide-react';

const Campaigns = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const navigate = useNavigate();

    const fetchCampaigns = async () => {
        try {
            const res = await api.get('/campaigns');
            setCampaigns(res.data);
        } catch (err) {
            console.error('Error fetching campaigns:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;
        try {
            await api.delete(`/campaigns/${id}`);
            fetchCampaigns();
        } catch (err) {
            console.error('Error deleting campaign:', err);
            alert('Failed to delete campaign');
        }
    };

    const handleOpenView = (campaign) => {
        setSelectedCampaign(campaign);
        setShowViewModal(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-GB'); // dd/mm/yyyy roughly
    };

    if (loading) return <div className="text-gray-400">Loading Campaigns...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Management</h1>
                <button 
                    onClick={() => navigate('/campaigns/add')}
                    className="btn-primary flex items-center px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold rounded-xl shadow-lg transition-all"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Campaign
                </button>
            </div>

            <div className="card overflow-x-auto bg-[#1a1d2e] border border-white/[0.05] shadow-2xl rounded-2xl">
                <table className="min-w-full divide-y divide-white/[0.05] text-sm">
                    <thead className="bg-[#13151e]">
                        <tr>
                            <th className="px-6 py-4 tracking-wider text-left text-xs font-semibold text-gray-400 uppercase">Campaign Name</th>
                            <th className="px-6 py-4 tracking-wider text-left text-xs font-semibold text-gray-400 uppercase">Start Date</th>
                            <th className="px-6 py-4 tracking-wider text-left text-xs font-semibold text-gray-400 uppercase">Attachment</th>
                            <th className="px-6 py-4 tracking-wider text-left text-xs font-semibold text-gray-400 uppercase">Comments</th>
                            <th className="px-6 py-4 tracking-wider text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                            <th className="px-6 py-4 tracking-wider text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                        {campaigns.map(campaign => (
                            <tr key={campaign.campaign_id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{campaign.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">{formatDate(campaign.start_date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                                    {campaign.attachment_url ? (
                                        <a href={`http://localhost:5000${campaign.attachment_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-amber-400 hover:text-amber-300 transition-colors">
                                            <Paperclip className="h-4 w-4 mr-1" />
                                            <span className="truncate max-w-[120px]" title={campaign.attachment_name}>{campaign.attachment_name}</span>
                                        </a>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400 max-w-[200px] truncate" title={campaign.comments}>
                                    {campaign.comments || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                                        campaign.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {campaign.status || 'Active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                                    <button 
                                        onClick={() => handleOpenView(campaign)}
                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                        title="View Campaign"
                                    >
                                        <Eye className="h-4 w-4 inline" />
                                    </button>
                                    <button 
                                        onClick={() => navigate(`/campaigns/edit/${campaign.campaign_id}`)}
                                        className="text-amber-400 hover:text-amber-300 transition-colors"
                                        title="Edit Campaign"
                                    >
                                        <Edit className="h-4 w-4 inline" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(campaign.campaign_id)}
                                        className="text-red-500 hover:text-red-400 transition-colors"
                                        title="Delete Campaign"
                                    >
                                        <Trash2 className="h-4 w-4 inline" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {campaigns.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    No campaigns found. Add a campaign to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* View Details Modal */}
            {showViewModal && selectedCampaign && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">{selectedCampaign.name}</h2>
                                <span className={`px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${
                                    selectedCampaign.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                    {selectedCampaign.status || 'Active'}
                                </span>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-1.5 rounded-lg border border-white/10">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4 bg-[#13151e] p-5 rounded-xl border border-white/5">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Start Date</p>
                                <p className="text-gray-200 font-medium">{formatDate(selectedCampaign.start_date) || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Attachment</p>
                                {selectedCampaign.attachment_url ? (
                                    <a href={`http://localhost:5000${selectedCampaign.attachment_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors mt-1 text-sm font-medium">
                                        <Paperclip className="h-4 w-4 mr-2" />
                                        {selectedCampaign.attachment_name}
                                    </a>
                                ) : (
                                    <p className="text-gray-400 italic">No attachment</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date Created</p>
                                <p className="text-gray-200 font-medium">
                                    {new Date(selectedCampaign.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Comments & Notes</p>
                                <p className="text-gray-300 text-sm bg-white/[0.02] p-3 rounded-lg border border-white/[0.05] min-h-[60px]">
                                    {selectedCampaign.comments || 'No comments left for this campaign.'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setShowViewModal(false)} className="w-full px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Campaigns;
