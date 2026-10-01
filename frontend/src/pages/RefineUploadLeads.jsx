import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import UploadSessionForm from '../components/UploadSessionForm';

const RefineUploadLeads = () => {
    const [vendors, setVendors] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState('');
    const [campaignType, setCampaignType] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        api.get('/refine-vendors?counts=false').then(res => setVendors(res.data)).catch(console.error);
        api.get('/refine-campaigns').then(res => setCampaigns(res.data.filter(c => c.status === 'Active'))).catch(console.error);
    }, []);

    const isCompareMode =
        location.pathname === '/compare' ||
        new URLSearchParams(location.search).get('compare') === 'true';

    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (!selectedVendor || !campaignType) {
            setError('Select a vendor and a campaign.');
            return;
        }
        setCreating(true);
        setError('');
        try {
            const selectedCampaignObj = campaigns.find(c => c.campaign_id === campaignType);
            const campaignName = selectedCampaignObj ? selectedCampaignObj.name : campaignType;
            const res = await api.post('/refine-sessions', { vendor_id: selectedVendor, campaign_type: campaignName });
            if (isCompareMode) navigate(`/refine-sessions/${res.data.id}/add-job?mode=compare`);
            else navigate(`/refine-sessions/${res.data.id}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Server error creating session');
        } finally {
            setCreating(false);
        }
    };

    return (
        <UploadSessionForm
            title="Upload data"
            subtitle="Refine"
            accent="#14b8a6"
            vendors={vendors}
            campaigns={campaigns}
            vendorId={selectedVendor}
            campaignId={campaignType}
            onVendor={(value) => { setSelectedVendor(value); setError(''); }}
            onCampaign={(value) => { setCampaignType(value); setError(''); }}
            error={error}
            submitting={creating}
            onSubmit={handleCreateSession}
        />
    );
};

export default RefineUploadLeads;
