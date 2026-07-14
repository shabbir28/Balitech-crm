import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Search, Plus, Filter, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const Filters = () => {
    const { token } = useContext(AuthContext);
    const [filters, setFilters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFilter, setEditingFilter] = useState(null);
    const [formData, setFormData] = useState({ name: '', states: [] });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchFilters = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/filters', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFilters(response.data);
        } catch (err) {
            console.error('Error fetching filters:', err);
            setError('Failed to fetch filters');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchFilters();
    }, [fetchFilters]);

    const handleOpenModal = (filter = null) => {
        setEditingFilter(filter);
        if (filter) {
            setFormData({ name: filter.name, states: filter.states || [] });
        } else {
            setFormData({ name: '', states: [] });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingFilter(null);
        setFormData({ name: '', states: [] });
    };

    const toggleStateSelection = (state) => {
        setFormData(prev => {
            const isSelected = prev.states.includes(state);
            return {
                ...prev,
                states: isSelected 
                    ? prev.states.filter(s => s !== state)
                    : [...prev.states, state]
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            if (editingFilter) {
                await api.put(`/filters/${editingFilter.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSuccess('Filter updated successfully');
            } else {
                await api.post('/filters', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSuccess('Filter created successfully');
            }
            fetchFilters();
            handleCloseModal();
        } catch (err) {
            console.error('Error saving filter:', err);
            setError(err.response?.data?.message || 'Failed to save filter');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this filter?")) return;
        try {
            await api.delete(`/filters/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess('Filter deleted successfully');
            fetchFilters();
        } catch (err) {
            console.error('Error deleting filter:', err);
            setError('Failed to delete filter');
        }
    };

    const filteredList = filters.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
        <div className="p-6 md:p-8 space-y-8 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-slate-400 flex items-center gap-4">
                        <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                            <Filter className="w-6 h-6 text-brand-400" />
                        </div>
                        Data Filters
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 font-medium tracking-wide">Create and manage preset state groups for quick data extraction</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
                    <div className="relative group w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search presets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 hover:border-brand-500/30 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 transition-all shadow-inner placeholder:text-slate-500"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="group bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" /> New Preset
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}
            
            {success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm flex items-center gap-3">
                    <Filter className="w-5 h-5" />
                    {success}
                </div>
            )}

            {/* List */}
            <div className="bg-[#0a0c14]/40 backdrop-blur-xl border border-white-[0.05] rounded-3xl overflow-hidden shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                
                {loading ? (
                    <div className="p-20 text-center text-brand-400/80 font-bold tracking-widest uppercase text-sm animate-pulse">Loading Filters...</div>
                ) : filteredList.length === 0 ? (
                    <div className="p-20 text-center text-slate-400 flex flex-col items-center">
                        <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-full mb-6 relative">
                            <div className="absolute inset-0 bg-brand-500/20 blur-2xl rounded-full" />
                            <Filter className="w-12 h-12 relative z-10 text-slate-500" />
                        </div>
                        <p className="text-xl font-bold text-white mb-2">No presets found</p>
                        <p className="text-sm text-slate-500 max-w-sm">Create a new filter preset to group specific states together for faster exports.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-[#111422]/80 border-b border-white/[0.05]">
                                <tr>
                                    <th className="px-8 py-5 font-bold tracking-widest uppercase text-[10px] text-slate-500 w-[25%]">Preset Name</th>
                                    <th className="px-8 py-5 font-bold tracking-widest uppercase text-[10px] text-slate-500">States Included</th>
                                    <th className="px-8 py-5 font-bold tracking-widest uppercase text-[10px] text-slate-500 w-[20%] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {filteredList.map(filter => (
                                    <tr key={filter.id} className="hover:bg-brand-500/[0.03] transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/10 to-indigo-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-black shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                                                    {filter.name.substring(0,2).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-white text-[15px] tracking-wide">{filter.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-wrap gap-2">
                                                {filter.states?.length > 0 ? filter.states.map(state => (
                                                    <span key={state} className="px-2.5 py-1 rounded-lg bg-[#16192a] border border-white/[0.08] text-[11px] font-black text-emerald-400 shadow-sm">
                                                        {state}
                                                    </span>
                                                )) : (
                                                    <span className="text-slate-600 font-medium text-xs bg-white/[0.02] px-3 py-1 rounded-lg">No states defined</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-30 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenModal(filter)} className="p-2.5 text-slate-400 hover:text-brand-400 hover:bg-brand-500/15 rounded-xl transition-colors hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(filter.id)} className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/15 rounded-xl transition-colors hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-[#1e2136] border border-white/15 rounded-3xl w-full max-w-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] scale-100 transition-transform duration-300 relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-indigo-500" />
                        
                        <div className="flex items-center justify-between p-8 border-b border-white/[0.05] shrink-0 bg-[#0a0c14]/50">
                            <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-wide">
                                <div className="p-2 bg-brand-500/10 rounded-xl border border-brand-500/20">
                                    <Filter className="w-5 h-5 text-brand-400" />
                                </div>
                                {editingFilter ? 'Edit Preset' : 'Create New Preset'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                                <div>
                                    <label className="block text-[11px] font-black tracking-widest uppercase text-slate-400 mb-3">Preset Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Premium D5, ACA States, etc."
                                        className="w-full bg-[#16192b] border border-white/20 rounded-2xl px-5 py-4 text-[15px] font-bold text-white focus:outline-none focus:border-brand-500/80 focus:ring-1 focus:ring-brand-500/50 transition-all placeholder:text-slate-500 placeholder:font-medium shadow-inner"
                                    />
                                </div>
                                
                                <div>
                                    <label className="flex items-center justify-between text-[11px] font-black tracking-widest uppercase text-slate-400 mb-4">
                                        <span>Select States to Include</span>
                                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                            {formData.states.length} Selected
                                        </span>
                                    </label>
                                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
                                        {US_STATES.map(state => {
                                            const isSelected = formData.states.includes(state);
                                            return (
                                                <button
                                                    key={state}
                                                    type="button"
                                                    onClick={() => toggleStateSelection(state)}
                                                    className={`py-3 text-[13px] font-black rounded-xl border transition-all duration-300 ${
                                                        isSelected 
                                                            ? 'bg-gradient-to-br from-brand-500 to-indigo-600 border-brand-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-105' 
                                                            : 'bg-[#1a1d2d] border-white/10 text-slate-300 hover:bg-white/[0.08] hover:border-white/30 hover:text-white shadow-sm'
                                                    }`}
                                                >
                                                    {state}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 px-8 border-t border-white/[0.05] flex justify-end gap-4 shrink-0 bg-[#0a0c14]/50">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white px-8 py-3 rounded-xl text-sm font-black tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] disabled:opacity-50 flex items-center gap-2 hover:-translate-y-0.5"
                                >
                                    {isSubmitting ? 'Saving...' : editingFilter ? 'Save Changes' : 'Create Preset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Filters;
