import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Plus, Trash2, Edit, Eye, X, AlertTriangle, CheckCircle, Search } from 'lucide-react';

const VanVendors = () => {
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
            const res = await api.get('/van-vendors?counts=false');
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

    const clearSearch = () => handleSearchChange('');

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
                await api.put(`/van-vendors/${editingId}`, formData);
                showNotification('Vendor updated successfully');
            } else {
                await api.post('/van-vendors', formData);
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
            await api.delete(`/van-vendors/${deleteModal.id}`);
            showNotification('Vendor deleted successfully');
            fetchVendors();
            setDeleteModal({ isOpen: false, id: null, isDeleting: false });
        } catch {
            showNotification('Failed to delete vendor', 'error');
            setDeleteModal(prev => ({ ...prev, isDeleting: false }));
        }
    };

    if (loading) return <div className="text-gray-400">Loading Vendors...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-white tracking-tight">Van Vendor Management</h1>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            value={localSearch}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search vendor name, email, phone..."
                            className="w-full pl-10 pr-10 py-2.5 bg-[#13151e] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-violet-500/50 placeholder:text-slate-600"
                        />
                        {localSearch && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={handleOpenAdd}
                        className="btn-primary flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-semibold rounded-xl shadow-lg transition-all shrink-0"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Vendor
                    </button>
                </div>
            </div>

            {activeSearch && (
                <p className="text-sm text-slate-500">
                    Showing <span className="text-violet-400 font-semibold">{filteredVendors.length}</span> vendor(s) for &quot;{activeSearch}&quot;
                </p>
            )}

            {/* Notification Toast */}
            {notification.show && (
                <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-fade-in ${
                    notification.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="font-semibold text-sm">{notification.message}</span>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelDelete}></div>
                    <div className="bg-[#1e1e2d] border border-white/10 rounded-2xl w-full max-w-md relative z-10 overflow-hidden shadow-2xl animate-fade-in scale-in">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Delete Vendor?</h3>
                            <p className="text-slate-400 text-[14px] leading-relaxed">
                                Are you sure you want to delete this vendor? 
                                <br/><span className="text-red-400 font-medium">This action cannot be undone and may affect associated campaigns.</span>
                            </p>
                        </div>
                        <div className="bg-black/20 p-4 border-t border-white/5 flex items-center justify-end gap-3">
                            <button
                                disabled={deleteModal.isDeleting}
                                onClick={cancelDelete}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={deleteModal.isDeleting}
                                onClick={executeDelete}
                                className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all flex items-center gap-2 group disabled:opacity-50"
                            >
                                {deleteModal.isDeleting ? (
                                    <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                )}
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card overflow-x-auto bg-[#1a1d2e] border border-white/[0.05] shadow-2xl rounded-2xl">
                <table className="min-w-full divide-y divide-white/[0.05] text-sm">
                    <thead className="bg-[#13151e]">
                        <tr>
                            <th className="px-6 py-4 tracking-wider text-left text-xs font-semibold text-gray-400 uppercase">Vendor Name</th>
                            <th className="px-6 py-4 tracking-wider text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
                            <th className="px-6 py-4 tracking-wider text-left text-xs font-semibold text-gray-400 uppercase">Phone No</th>
                            <th className="px-6 py-4 tracking-wider text-left text-xs font-semibold text-gray-400 uppercase">Comment</th>
                            <th className="px-6 py-4 tracking-wider text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                            <th className="px-6 py-4 tracking-wider text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                        {filteredVendors.map(vendor => (
                            <tr key={vendor.vendor_id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{vendor.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">{vendor.email || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400">{vendor.phone || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-400 max-w-[200px] truncate" title={vendor.comment}>
                                    {vendor.comment || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                                        vendor.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {vendor.status || 'Active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                                    <button 
                                        onClick={() => handleOpenView(vendor)}
                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                        title="View Vendor"
                                    >
                                        <Eye className="h-4 w-4 inline" />
                                    </button>
                                    <button 
                                        onClick={() => handleOpenEdit(vendor)}
                                        className="text-violet-400 hover:text-violet-300 transition-colors"
                                        title="Edit Vendor"
                                    >
                                        <Edit className="h-4 w-4 inline" />
                                    </button>
                                    <button 
                                        onClick={() => confirmDelete(vendor.vendor_id)}
                                        className="text-red-500 hover:text-red-400 transition-colors"
                                        title="Delete Vendor"
                                    >
                                        <Trash2 className="h-4 w-4 inline" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredVendors.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    {activeSearch
                                        ? `No vendors match "${activeSearch}".`
                                        : 'No vendors found. Add a vendor to get started.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add / Edit Form Modal */}
            {showFormModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Vendor' : 'Add New Vendor'}</h2>
                            <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                                <input required className="w-full bg-[#13151e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all" type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                                    <input className="w-full bg-[#13151e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Phone No</label>
                                    <input className="w-full bg-[#13151e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all" type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                                <select className="w-full bg-[#13151e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Suspended">Suspended</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Comment</label>
                                <textarea rows="3" className="w-full bg-[#13151e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all" value={formData.comment} onChange={e => setFormData({...formData, comment: e.target.value})}></textarea>
                            </div>
                            
                            <div className="flex justify-end space-x-3 pt-6 border-t border-white/10">
                                <button type="button" onClick={() => setShowFormModal(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-semibold rounded-xl shadow-lg transition-all">
                                    {editingId ? 'Update Vendor' : 'Save Vendor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {showViewModal && selectedVendor && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">{selectedVendor.name}</h2>
                                <span className={`px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${
                                    selectedVendor.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                    {selectedVendor.status || 'Active'}
                                </span>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-white bg-white/5 p-1.5 rounded-lg border border-white/10">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4 bg-[#13151e] p-5 rounded-xl border border-white/5">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</p>
                                <p className="text-gray-200 font-medium">{selectedVendor.email || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone Number</p>
                                <p className="text-gray-200 font-medium">{selectedVendor.phone || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date Created</p>
                                <p className="text-gray-200 font-medium">
                                    {new Date(selectedVendor.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Comments & Notes</p>
                                <p className="text-gray-300 text-sm bg-white/[0.02] p-3 rounded-lg border border-white/[0.05] min-h-[60px]">
                                    {selectedVendor.comment || 'No comments left for this vendor.'}
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

export default VanVendors;
