import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { CampaignDirectory } from '../components/RecordDirectory';

const SafeQuoteCampaigns = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const canManage = user?.role === 'super_admin' || user?.role === 'admin';
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, isDeleting: false });
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    const fetchCampaigns = async () => {
        try { const res = await api.get('/safe-quote-campaigns'); setCampaigns(res.data); }
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
            await api.delete(`/safe-quote-campaigns/${deleteModal.id}`);
            showNotification('Campaign deleted');
            fetchCampaigns();
            setDeleteModal({ isOpen: false, id: null, isDeleting: false });
        } catch { showNotification('Failed to delete campaign', 'error'); setDeleteModal(p => ({ ...p, isDeleting: false })); }
    };

    return (
        <CampaignDirectory
            title="Safe Quote Campaigns"
            accent="#f59e0b"
            loading={loading}
            campaigns={campaigns}
            variant="described"
            onAdd={() => navigate('/safe-quote-campaigns/add')}
            
            onEdit={(id) => navigate(`/safe-quote-campaigns/edit/${id}`)}
            onDelete={(id) => setDeleteModal({ isOpen: true, id, isDeleting: false })}
            canManage={canManage}
            deleteModal={deleteModal}
            notification={notification}
            onCancelDelete={() => setDeleteModal({ isOpen: false, id: null, isDeleting: false })}
            onConfirmDelete={executeDelete}
            emptyLabel="No Safe Quote campaigns yet."
        />
    );
};

export default SafeQuoteCampaigns;
