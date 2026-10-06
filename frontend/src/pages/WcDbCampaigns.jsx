import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CampaignDirectory } from '../components/RecordDirectory';

const WcDbCampaigns = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, isDeleting: false });
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    const fetchCampaigns = async () => {
        try { const res = await api.get('/wc-db-campaigns'); setCampaigns(res.data); }
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
            await api.delete(`/wc-db-campaigns/${deleteModal.id}`);
            showNotification('Campaign deleted');
            fetchCampaigns();
            setDeleteModal({ isOpen: false, id: null, isDeleting: false });
        } catch { showNotification('Failed to delete campaign', 'error'); setDeleteModal(p => ({ ...p, isDeleting: false })); }
    };

    return (
        <CampaignDirectory
            title="WC DB Campaigns"
            accent="#06b6d4"
            loading={loading}
            campaigns={campaigns}
            variant="described"
            onAdd={() => navigate('/wc-db-campaigns/add')}
            
            onEdit={(id) => navigate(`/wc-db-campaigns/edit/${id}`)}
            onDelete={(id) => setDeleteModal({ isOpen: true, id, isDeleting: false })}
            
            deleteModal={deleteModal}
            notification={notification}
            onCancelDelete={() => setDeleteModal({ isOpen: false, id: null, isDeleting: false })}
            onConfirmDelete={executeDelete}
            emptyLabel="No WC DB campaigns yet."
        />
    );
};

export default WcDbCampaigns;
