import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Target, Plus, Trash2, Edit, AlertTriangle, CheckCircle } from 'lucide-react';

const VanCampaigns = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, isDeleting: false });
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    const fetchCampaigns = async () => {
        try { const res = await api.get('/van-campaigns'); setCampaigns(res.data); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCampaigns(); }, []);

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
    };

    const executeDelete = async () => {
        setDeleteModal(p => ({ ...p, isDeleting: true }));
        try {
            await api.delete(`/van-campaigns/${deleteModal.id}`);
            showNotification('Campaign deleted');
            fetchCampaigns();
            setDeleteModal({ isOpen: false, id: null, isDeleting: false });
        } catch { showNotification('Failed to delete campaign', 'error'); setDeleteModal(p => ({ ...p, isDeleting: false })); }
    };

    if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading Van Campaigns...</div>;

    return (
        <div className="space-y-6">
            {notification.show && (
                <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="font-semibold text-sm">{notification.message}</span>
                </div>
            )}

            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteModal({ isOpen: false, id: null, isDeleting: false })} />
                    <div className="bg-[#1e1e2d] border border-white/10 rounded-2xl w-full max-w-md relative z-10 overflow-hidden shadow-2xl">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20"><AlertTriangle className="w-6 h-6 text-red-500" /></div>
                            <h3 className="text-xl font-bold text-white mb-2">Delete Campaign?</h3>
                            <p className="text-slate-400 text-sm">This will permanently remove the campaign.</p>
                        </div>
                        <div className="bg-black/20 p-4 border-t border-white/5 flex justify-end gap-3">
                            <button disabled={deleteModal.isDeleting} onClick={() => setDeleteModal({ isOpen: false, id: null, isDeleting: false })} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                            <button disabled={deleteModal.isDeleting} onClick={executeDelete} className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 flex items-center gap-2">
                                {deleteModal.isDeleting ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"><Target className="h-5 w-5 text-violet-400" /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Van Campaigns</h1>
                        <p className="text-xs text-slate-500">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button id="van-add-campaign-btn" onClick={() => navigate('/van-campaigns/add')}
                    className="flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg transition-all shrink-0">
                    <Plus className="mr-2 h-4 w-4" /> Add Campaign
                </button>
            </div>

            <div className="overflow-x-auto bg-[#1a1d2e] border border-white/[0.05] shadow-2xl rounded-2xl">
                <table className="min-w-full divide-y divide-white/[0.05] text-sm">
                    <thead className="bg-[#13151e]">
                        <tr>
                            {['Campaign Name', 'Description', 'Status', 'Created', 'Actions'].map(h => (
                                <th key={h} className={`px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                        {campaigns.map(c => (
                            <tr key={c.campaign_id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{c.name}</td>
                                <td className="px-6 py-4 text-gray-400 max-w-xs truncate">{c.description || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{c.status}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                                    <button onClick={() => navigate(`/van-campaigns/edit/${c.campaign_id}`)} className="text-violet-400 hover:text-violet-300 transition-colors" title="Edit"><Edit className="h-4 w-4 inline" /></button>
                                    <button onClick={() => setDeleteModal({ isOpen: true, id: c.campaign_id, isDeleting: false })} className="text-red-500 hover:text-red-400 transition-colors" title="Delete"><Trash2 className="h-4 w-4 inline" /></button>
                                </td>
                            </tr>
                        ))}
                        {campaigns.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No van campaigns found. Add one to get started.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VanCampaigns;
