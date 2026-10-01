import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import CampaignFormCard, { CampaignField, campaignInputClass } from '../components/CampaignFormCard';

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

    if (loading) return <div className="text-slate-400 p-8 text-sm">Loading campaign…</div>;

    return (
        <CampaignFormCard
            title={editMode ? 'Edit campaign' : 'New campaign'}
            subtitle="WC DB"
            accent="#0891b2"
            onBack={() => navigate('/wc-db-campaigns')}
            error={error}
            submitting={submitting}
            onSubmit={handleSubmit}
        >
            <CampaignField label="Name">
                <input className={campaignInputClass} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Campaign name" />
            </CampaignField>
            <CampaignField label="Description">
                <textarea className={`${campaignInputClass} resize-none`} rows={3} value={formData.comments} onChange={e => setFormData({ ...formData, comments: e.target.value })} placeholder="Short note" />
            </CampaignField>
            {editMode && (
                <CampaignField label="Status">
                    <select className={campaignInputClass} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </CampaignField>
            )}
        </CampaignFormCard>
    );
};

export default WcDbAddCampaign;
