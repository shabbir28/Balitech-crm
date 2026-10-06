import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { VendorDirectory } from '../components/RecordDirectory';

const RefineVendors = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlSearch = searchParams.get('search') || '';
    const [localSearch, setLocalSearch] = useState(urlSearch);

    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modals state
    const [showFormModal, setShowFormModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, isDeleting: false });
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    
    // Form and selected vendor state
    const [editingId, setEditingId] = useState(null);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        phone: '', 
        comment: '', 
        status: 'Active' 
    });

    const fetchVendors = async () => {
        try {
            const res = await api.get('/refine-vendors?counts=false');
            setVendors(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    useEffect(() => {
        setLocalSearch(urlSearch);
    }, [urlSearch]);

    const activeSearch = (localSearch || urlSearch).trim();
    const filteredVendors = useMemo(() => {
        if (!activeSearch) return vendors;
        const q = activeSearch.toLowerCase();
        return vendors.filter((v) =>
            [v.name, v.email, v.phone, v.comment, v.company].some(
                (field) => field && String(field).toLowerCase().includes(q)
            )
        );
    }, [vendors, activeSearch]);

    const handleSearchChange = (value) => {
        setLocalSearch(value);
        if (value.trim()) {
            setSearchParams({ search: value.trim() }, { replace: true });
        } else {
            setSearchParams({}, { replace: true });
        }
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
    };

    const handleOpenAdd = () => {
        setEditingId(null);
        setFormData({ name: '', email: '', phone: '', comment: '', status: 'Active' });
        setShowFormModal(true);
    };

    const handleOpenEdit = (vendor) => {
        setEditingId(vendor.vendor_id);
        setFormData({
            name: vendor.name || '',
            email: vendor.email || '',
            phone: vendor.phone || '',
            comment: vendor.comment || '',
            status: vendor.status || 'Active'
        });
        setShowFormModal(true);
    };

    const handleOpenView = (vendor) => {
        setSelectedVendor(vendor);
        setShowViewModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/refine-vendors/${editingId}`, formData);
                showNotification('Vendor updated successfully');
            } else {
                await api.post('/refine-vendors', formData);
                showNotification('Vendor created successfully');
            }
            setShowFormModal(false);
            fetchVendors();
        } catch {
            showNotification('Failed to save vendor', 'error');
        }
    };

    const confirmDelete = (id) => {
        setDeleteModal({ isOpen: true, id, isDeleting: false });
    };

    const cancelDelete = () => {
        setDeleteModal({ isOpen: false, id: null, isDeleting: false });
    };

    const executeDelete = async () => {
        setDeleteModal(prev => ({ ...prev, isDeleting: true }));
        try {
            await api.delete(`/refine-vendors/${deleteModal.id}`);
            showNotification('Vendor deleted successfully');
            fetchVendors();
            setDeleteModal({ isOpen: false, id: null, isDeleting: false });
        } catch {
            showNotification('Failed to delete vendor', 'error');
            setDeleteModal(prev => ({ ...prev, isDeleting: false }));
        }
    };

    return (
        <VendorDirectory
            title="Refine Vendor Management"
            accent="#f59e0b"
            loading={loading}
            vendors={vendors}
            filteredVendors={filteredVendors}
            activeSearch={activeSearch}
            localSearch={localSearch}
            onSearchChange={handleSearchChange}
            notification={notification}
            deleteModal={deleteModal}
            onCancelDelete={cancelDelete}
            onConfirmDelete={executeDelete}
            onAskDelete={confirmDelete}
            showFormModal={showFormModal}
            onOpenAdd={handleOpenAdd}
            onCloseForm={() => setShowFormModal(false)}
            editingId={editingId}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onEdit={handleOpenEdit}
            showViewModal={showViewModal}
            selectedVendor={selectedVendor}
            onOpenView={handleOpenView}
            onCloseView={() => setShowViewModal(false)}
        />
    );
};

export default RefineVendors;
