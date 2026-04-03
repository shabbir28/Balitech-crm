import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, Edit2, AlertCircle, X, Search, Check } from 'lucide-react';
import SecurityService from '../services/security.service';

const SecuritySettings = () => {
    const [ips, setIps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({ id: null, ip_address: '', description: '', is_whitelisted: true });
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchIPs();
    }, []);

    const fetchIPs = async () => {
        try {
            setLoading(true);
            const data = await SecurityService.getAllIPs();
            setIps(data);
        } catch (error) {
            console.error('Failed to fetch IPs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (ip = null) => {
        if (ip) {
            setFormData(ip);
        } else {
            setFormData({ id: null, ip_address: '', description: '', is_whitelisted: true });
        }
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ id: null, ip_address: '', description: '', is_whitelisted: true });
        setFormErrors({});
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormErrors({});
        
        if (!formData.ip_address) {
            setFormErrors({ ip_address: 'IP Address is required' });
            return;
        }

        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(formData.ip_address) && formData.ip_address !== '127.0.0.1' && formData.ip_address !== '::1') {
            // relaxed for potential CIDR or other formats if needed, but basic IPv4 check is good
            // will just warn if completely invalid
        }

        try {
            setIsSubmitting(true);
            if (formData.id) {
                await SecurityService.updateIP(formData.id, formData);
            } else {
                await SecurityService.addIP(formData);
            }
            fetchIPs();
            handleCloseModal();
        } catch (error) {
            if (error.response && error.response.data && error.response.data.error) {
                setFormErrors({ general: error.response.data.error });
            } else {
                setFormErrors({ general: 'Failed to save IP Address' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this IP address?')) {
            try {
                await SecurityService.deleteIP(id);
                fetchIPs();
            } catch (error) {
                console.error('Failed to delete IP:', error);
                alert('Failed to delete IP');
            }
        }
    };

    const toggleStatus = async (ip) => {
        try {
            await SecurityService.updateIP(ip.id, { ...ip, is_whitelisted: !ip.is_whitelisted });
            fetchIPs();
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    const filteredIps = ips.filter(ip => 
        ip.ip_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ip.description && ip.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="w-full">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        Security Settings
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Manage IP whitelisting to control access to the CRM</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-brand-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search IPs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.04] transition-all text-sm"
                        />
                    </div>
                    
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(249,115,22,0.2)] active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add IP</span>
                    </button>
                </div>
            </div>

            {/* Empty State Warning */}
            {ips.length === 0 && !loading && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-semibold text-amber-400">Security Bypass Active</h4>
                        <p className="text-sm text-amber-500/80 mt-1">The whitelist is currently empty. This means IP-based access control is disabled and the CRM can be accessed from any IP address. Add an IP to enable restricting access.</p>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#1e1e2d]/50 backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="text-left py-4 px-6 text-xs uppercase tracking-wider font-semibold text-slate-400">IP Address</th>
                                <th className="text-left py-4 px-6 text-xs uppercase tracking-wider font-semibold text-slate-400">Description</th>
                                <th className="text-left py-4 px-6 text-xs uppercase tracking-wider font-semibold text-slate-400">Status</th>
                                <th className="text-left py-4 px-6 text-xs uppercase tracking-wider font-semibold text-slate-400 rounded-tr-2xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="py-12 text-center text-slate-400">Loading IPs...</td>
                                </tr>
                            ) : filteredIps.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-12 text-center text-slate-500">No matching IP addresses found.</td>
                                </tr>
                            ) : (
                                filteredIps.map(ip => (
                                    <tr key={ip.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="text-sm font-medium text-white">{ip.ip_address}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-sm text-slate-400 max-w-[200px] truncate">{ip.description || '-'}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <button 
                                                onClick={() => toggleStatus(ip)}
                                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${ip.is_whitelisted ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                            >
                                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${ip.is_whitelisted ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleOpenModal(ip)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-brand-400/10 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(ip.id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Authentic Mockup Look Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0b0c10]/80 backdrop-blur-sm" onClick={handleCloseModal} />
                    
                    <div className="relative w-full max-w-[500px] bg-[#1a1f2e] border border-[#2a3042] rounded-[24px] shadow-2xl overflow-hidden">
                        <div className="p-8">
                            <h2 className="text-xl font-bold text-white mb-8">{formData.id ? 'Edit IP Address' : 'Add IP Address'}</h2>

                            <form onSubmit={handleSave} className="space-y-6">
                                {formErrors.general && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                                        {formErrors.general}
                                    </div>
                                )}

                                {/* IP Address Input (Orange Theme) */}
                                <div className="space-y-1">
                                    <div className={`relative border rounded-xl bg-transparent transition-all duration-300 ${formErrors.ip_address ? 'border-pink-500' : 'border-[#d97732]'}`}>
                                        <label className={`absolute -top-2.5 left-3 px-1 text-xs font-semibold bg-[#1a1f2e] ${formErrors.ip_address ? 'text-pink-500' : 'text-white'}`}>
                                            IP Address<span className="text-pink-500 ml-0.5">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.ip_address}
                                            onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                                            placeholder="e.g. 192.168.1.1"
                                            className="w-full bg-transparent text-white px-4 py-3 placeholder:text-[#5e6678] outline-none text-[15px]"
                                            autoFocus
                                        />
                                    </div>
                                    {formErrors.ip_address && (
                                        <p className="text-pink-500 text-sm pl-1">{formErrors.ip_address}</p>
                                    )}
                                </div>

                                {/* Description Input */}
                                <div className="relative border border-[#2a3042] rounded-xl bg-transparent">
                                    <label className="absolute -top-2.5 left-3 px-1 text-xs font-semibold text-white bg-[#1a1f2e]">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        className="w-full bg-transparent text-white px-4 py-3 placeholder:text-transparent outline-none text-[15px] min-h-[100px] resize-y"
                                    />
                                    <div className="absolute bottom-3 right-3 opacity-30 pointer-events-none">
                                        <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M5 0V5H0" stroke="white" strokeWidth="1"/>
                                        </svg>
                                    </div>
                                </div>

                                {/* Toggle Switch */}
                                <div className="flex items-center justify-between p-4 border border-[#2a3042] rounded-xl">
                                    <span className="text-white font-bold text-[15px]">Whitelist this IP?</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({...formData, is_whitelisted: !formData.is_whitelisted})}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.is_whitelisted ? 'bg-[#d97732]' : 'bg-[#2a3042]'}`}
                                    >
                                        <span className={`pointer-events-none inline-flex h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out items-center justify-center ${formData.is_whitelisted ? 'translate-x-5' : 'translate-x-0'}`}>
                                            {formData.is_whitelisted && <Check className="h-3 w-3 text-[#d97732]" strokeWidth={4} />}
                                        </span>
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-6 py-2.5 rounded-[12px] border border-[#522b2b] text-[#522b2b] hover:bg-black/20 text-sm font-semibold transition-colors"
                                        style={{ color: '#eb5e5e', borderColor: '#eb5e5e' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-6 py-2.5 rounded-[12px] bg-[#8a6843] hover:bg-[#a67e53] text-[#ffe8d6] text-sm font-semibold transition-colors disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Saving...' : (formData.id ? 'Save changes' : 'Add IP')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecuritySettings;
