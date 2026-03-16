import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2, Edit, Eye, X } from 'lucide-react';

const Vendors = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modals state
    const [showFormModal, setShowFormModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    
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
            const res = await api.get('/vendors');
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
                await api.put(`/vendors/${editingId}`, formData);
            } else {
                await api.post('/vendors', formData);
            }
            setShowFormModal(false);
            fetchVendors();
        } catch {
            alert('Failed to save vendor');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) return;
        try {
            await api.delete(`/vendors/${id}`);
            fetchVendors();
        } catch {
            alert('Failed to delete vendor');
        }
    };

    if (loading) return <div className="text-gray-400">Loading Vendors...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white tracking-tight">Vendor Management</h1>
                <button 
                    onClick={handleOpenAdd}
                    className="btn-primary flex items-center px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold rounded-xl shadow-lg transition-all"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Vendor
                </button>
            </div>

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
                        {vendors.map(vendor => (
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
                                        className="text-amber-400 hover:text-amber-300 transition-colors"
                                        title="Edit Vendor"
                                    >
                                        <Edit className="h-4 w-4 inline" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(vendor.vendor_id)}
                                        className="text-red-500 hover:text-red-400 transition-colors"
                                        title="Delete Vendor"
                                    >
                                        <Trash2 className="h-4 w-4 inline" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {vendors.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    No vendors found. Add a vendor to get started.
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
                                <input required className="w-full bg-[#13151e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                                    <input className="w-full bg-[#13151e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Phone No</label>
                                    <input className="w-full bg-[#13151e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                                <select className="w-full bg-[#13151e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Suspended">Suspended</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Comment</label>
                                <textarea rows="3" className="w-full bg-[#13151e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all" value={formData.comment} onChange={e => setFormData({...formData, comment: e.target.value})}></textarea>
                            </div>
                            
                            <div className="flex justify-end space-x-3 pt-6 border-t border-white/10">
                                <button type="button" onClick={() => setShowFormModal(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold rounded-xl shadow-lg transition-all">
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

export default Vendors;
