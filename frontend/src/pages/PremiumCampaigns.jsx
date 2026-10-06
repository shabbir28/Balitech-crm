import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CampaignDirectory } from '../components/RecordDirectory';

const PremiumCampaigns = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, isDeleting: false });
    const navigate = useNavigate();

    const fetchCampaigns = async () => {
        try {
            const res = await api.get('/premium-campaigns');
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

    const executeDelete = async () => {
        setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
        try {
            await api.delete(`/premium-campaigns/${deleteModal.id}`);
            fetchCampaigns();
            setDeleteModal({ isOpen: false, id: null, isDeleting: false });
        } catch (err) {
            console.error('Error deleting campaign:', err);
            alert('Failed to delete campaign');
            setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
        }
    };

    const handleOpenView = (campaign) => {
        setSelectedCampaign(campaign);
        setShowViewModal(true);
    };


    return (
        <CampaignDirectory
            title="Campaign Management"
            accent="#f59e0b"
            loading={loading}
            campaigns={campaigns}
            variant="dated"
            onAdd={() => navigate('/premium-campaigns/add')}
            onEdit={(id) => navigate(`/premium-campaigns/edit/${id}`)}
            onView={handleOpenView}
            onDelete={(id) => setDeleteModal({ isOpen: true, id, isDeleting: false })}
            deleteModal={deleteModal}
            onCancelDelete={() => setDeleteModal({ isOpen: false, id: null, isDeleting: false })}
            onConfirmDelete={executeDelete}
            showViewModal={showViewModal}
            selectedCampaign={selectedCampaign}
            onCloseView={() => setShowViewModal(false)}
            emptyLabel="No campaigns yet. Add one to start."
        />
    );
};

export default PremiumCampaigns;
