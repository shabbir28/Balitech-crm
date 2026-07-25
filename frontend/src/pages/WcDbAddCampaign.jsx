import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft } from 'lucide-react';

const WcDbAddCampaign = ({ editMode = false }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(editMode);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ name: '', comments: '', status: 'Active' });

    useEffect(() => {
        if (editMode && id) {
            api.get(`/wc-db-campaigns/${id}`).then(res => {
                const data = res.data;
                setFormData({ name: data.name || '', comments: data.description || '', status: data.status || 'Active' });
            }).catch(() => setError('Failed to load campaign data'))
            .finally(() => setLoading(false));
        }
    }, [editMode, id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) { setError('Campaign Name is required'); return; }
        setSubmitting(true); setError('');
        try {
            const payload = { name: formData.name, description: formData.comments, status: formData.status };
            if (editMode) await api.put(`/wc-db-campaigns/${id}`, payload);
            else await api.post('/wc-db-campaigns', payload);
            navigate('/wc-db-campaigns');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save campaign');
        } finally { setSubmitting(false); }
    };

    if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

    return (
        <div className="min-h-screen font-sans" style={{ background: '#323644', margin: '-2rem', padding: '2rem' }}>
            <div className="flex items-center space-x-4 mb-8 text-white">
                <button onClick={() => navigate('/wc-db-campaigns')} className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center hover:bg-cyan-400 transition-colors shadow-md">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h1 className="text-xl font-bold tracking-wide">{editMode ? 'Edit WC DB Campaign' : 'Add WC DB Campaign'}</h1>
            </div>

            <div className="max-w-3xl pl-4">
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-white mb-2">Enter Details</h2>
                    <p className="text-gray-400 text-sm">Fill in the details for the WC DB campaign.</p>
                </div>

                {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-sm font-medium">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="border border-white/10 rounded-2xl p-6 lg:p-8 relative">
                        <div className="absolute inset-0 bg-[#3a3e4e] rounded-2xl opacity-40 -z-10" />
                        <div className="space-y-6">
                            <div className="flex items-center">
                                <label className="w-32 text-white font-bold text-sm tracking-wide">Name</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    placeholder="Enter Campaign Name"
                                    className="flex-1 bg-[#4E515E] border-none rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:ring-1 focus:ring-cyan-500 outline-none text-sm shadow-inner" />
                            </div>
                            <div className="h-px bg-white/5 w-full" />
                            <div className="flex items-start">
                                <label className="w-32 text-white font-bold text-sm tracking-wide mt-3">Description</label>
                                <textarea value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})}
                                    placeholder="Enter Description" rows="3"
                                    className="flex-1 bg-[#4E515E] border-none rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:ring-1 focus:ring-cyan-500 outline-none text-sm shadow-inner resize-none" />
                            </div>
                            {editMode && (
                                <>
                                    <div className="h-px bg-white/5 w-full" />
                                    <div className="flex items-center">
                                        <label className="w-32 text-white font-bold text-sm tracking-wide">Status</label>
                                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                                            className="flex-1 bg-[#4E515E] border-none rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500 outline-none text-sm shadow-inner">
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-8">
                        <button type="submit" disabled={submitting}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold tracking-wide shadow-md transition-all ${submitting ? 'bg-cyan-600/50 text-white/50 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-500'}`}>
                            {submitting ? 'Saving...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WcDbAddCampaign;
