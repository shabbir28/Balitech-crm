import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import CampaignFormCard, { CampaignField, campaignInputClass } from '../components/CampaignFormCard';

const PremiumAddCampaign = ({ editMode = false }) => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(editMode);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ name: '', start_date: '', comments: '', status: 'Active' });

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                const res = await api.get(`/premium-campaigns/${id}`);
                const data = res.data;
                const formattedDate = data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : '';
                setFormData({
                    name: data.name || '',
                    start_date: formattedDate,
                    comments: data.comments || '',
                    status: data.status || 'Active'
                });
            } catch (err) {
                setError('Failed to load campaign data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (editMode && id) fetchCampaign();
    }, [editMode, id]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) { setError('Campaign Name is required'); return; }
        setSubmitting(true);
        setError('');
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('start_date', formData.start_date);
            data.append('comments', formData.comments);
            data.append('status', formData.status);
            if (editMode) {
                await api.put(`/premium-campaigns/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await api.post('/premium-campaigns', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            navigate('/premium-campaigns');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save campaign');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-slate-400 p-8 text-sm">Loading campaign…</div>;

    return (
        <CampaignFormCard
            title={editMode ? 'Edit campaign' : 'New campaign'}
            subtitle="Premium Data"
            accent="#a855f7"
            onBack={() => navigate('/premium-campaigns')}
            error={error}
            submitting={submitting}
            onSubmit={handleSubmit}
        >
            <CampaignField label="Name">
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Campaign name" className={campaignInputClass} />
            </CampaignField>
            <CampaignField label="Start date">
                <input name="start_date" type="date" value={formData.start_date} onChange={handleChange} className={`${campaignInputClass} [color-scheme:dark]`} />
            </CampaignField>
            <CampaignField label="Comments">
                <textarea name="comments" value={formData.comments} onChange={handleChange} rows={3} placeholder="Short note" className={`${campaignInputClass} resize-none`} />
            </CampaignField>
            {editMode && (
                <CampaignField label="Status">
                    <select name="status" value={formData.status} onChange={handleChange} className={campaignInputClass}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </CampaignField>
            )}
        </CampaignFormCard>
    );
};

export default PremiumAddCampaign;
