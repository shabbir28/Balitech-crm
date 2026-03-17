import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, UploadCloud, X, FileText, Settings, File } from 'lucide-react';

const AddCampaign = ({ editMode = false }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(editMode);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        comments: '',
        status: 'Active'
    });
    
    const [file, setFile] = useState(null);
    const [existingFile, setExistingFile] = useState(null); // For edit mode

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                const res = await api.get(`/campaigns/${id}`);
                const data = res.data;
                const formattedDate = data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : '';
                
                setFormData({
                    name: data.name || '',
                    start_date: formattedDate,
                    comments: data.comments || '',
                    status: data.status || 'Active'
                });

                if (data.attachment_url) {
                    setExistingFile({
                        name: data.attachment_name,
                        url: data.attachment_url
                    });
                }
            } catch (err) {
                setError('Failed to load campaign data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (editMode && id) {
            fetchCampaign();
        }
    }, [editMode, id]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const removeFile = () => {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) {
            setError('Campaign Name is required');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('start_date', formData.start_date);
            data.append('comments', formData.comments);
            data.append('status', formData.status);
            
            if (file) {
                data.append('attachment', file);
            }

            if (editMode) {
                await api.put(`/campaigns/${id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/campaigns', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            navigate('/campaigns');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to save campaign');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-gray-400 p-8">Loading Campaign...</div>;

    return (
        <div className="min-h-screen font-sans" style={{ background: '#323644', margin: '-2rem', padding: '2rem' }}>
            {/* Header */}
            <div className="flex items-center space-x-4 mb-8 text-white">
                <button 
                    onClick={() => navigate('/campaigns')}
                    className="w-10 h-10 bg-[#f59e0b] rounded-full flex items-center justify-center hover:bg-amber-400 transition-colors shadow-md"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-900" />
                </button>
                <h1 className="text-xl font-bold tracking-wide">
                    {editMode ? 'Edit Campaign' : 'Add Campaigns'}
                </h1>
            </div>

            <div className="max-w-6xl pl-4">
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-white mb-2">Enter Details</h2>
                    <p className="text-gray-400 text-sm">Please put in the details to add campaign.</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col md:flex-row gap-6 items-stretch">
                        
                        {/* Left Form Panel */}
                        <div className="flex-1 bg-transparent border border-white/10 rounded-2xl p-6 lg:p-8 relative">
                            <div className="absolute inset-0 bg-[#3a3e4e] rounded-2xl opacity-40 -z-10"></div>
                            
                            <div className="space-y-6">
                                {/* Name Input Row */}
                                <div className="flex items-center">
                                    <label className="w-32 text-white font-bold text-sm tracking-wide">Name</label>
                                    <input 
                                        type="text" 
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter Full Name" 
                                        className="flex-1 bg-[#4E515E] border-none rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-sm shadow-inner"
                                    />
                                </div>
                                
                                {/* Divider line spanning across input area */}
                                <div className="h-px bg-white/5 w-full"></div>

                                {/* Start Date Row */}
                                <div className="flex items-center">
                                    <label className="w-32 text-white font-bold text-sm tracking-wide">Start Date</label>
                                    <div className="flex-1 relative">
                                        <input 
                                            name="start_date"
                                            value={formData.start_date}
                                            onChange={handleChange}
                                            type="date" 
                                            className="w-full bg-[#4E515E] border-none rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-amber-500 outline-none transition-all text-sm shadow-inner [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                <div className="h-px bg-white/5 w-full"></div>

                                {/* Comments Row */}
                                <div className="flex items-start">
                                    <label className="w-32 text-white font-bold text-sm tracking-wide mt-3">Comments</label>
                                    <textarea 
                                        name="comments"
                                        value={formData.comments}
                                        onChange={handleChange}
                                        placeholder="Enter Comments" 
                                        rows="3"
                                        className="flex-1 bg-[#4E515E] border-none rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-sm shadow-inner resize-none"
                                    ></textarea>
                                </div>
                                
                                {editMode && (
                                    <>
                                        <div className="h-px bg-white/5 w-full"></div>
                                        {/* Status Row for Editing */}
                                        <div className="flex items-center">
                                            <label className="w-32 text-white font-bold text-sm tracking-wide">Status</label>
                                            <select 
                                                name="status"
                                                value={formData.status}
                                                onChange={handleChange}
                                                className="flex-1 bg-[#4E515E] border-none rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-amber-500 outline-none transition-all text-sm shadow-inner"
                                            >
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right Attachment Panel */}
                        <div className="w-full md:w-80 border border-white/10 rounded-2xl p-6 lg:p-8 flex flex-col items-center relative"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            <div className="absolute inset-0 bg-[#3a3e4e] rounded-2xl opacity-40 -z-10"></div>
                            
                            <h3 className="text-[#EAD5AB] font-bold text-base mb-8 tracking-wide">Attachment</h3>
                            
                            {file ? (
                                <div className="w-full flex flex-col items-center mb-6 animate-fade-in group mt-auto">
                                    <div className="h-14 w-14 bg-[#4E515E] rounded-2xl flex items-center justify-center mb-3 text-[#EAD5AB] shadow-md relative">
                                        <FileText className="h-7 w-7" />
                                        <button 
                                            type="button"
                                            onClick={removeFile}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <p className="text-sm font-medium text-white text-center truncate w-full px-4" title={file.name}>{file.name}</p>
                                    <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            ) : existingFile && !editMode ? (
                                <div className="w-full flex flex-col items-center mb-6 mt-auto">
                                     <div className="h-14 w-14 bg-[#4E515E] rounded-2xl flex items-center justify-center mb-3 text-[#EAD5AB] shadow-md">
                                        <File className="h-7 w-7" />
                                    </div>
                                    <p className="text-sm font-medium text-white text-center truncate w-full px-4">{existingFile.name}</p>
                                </div>
                            ) : (
                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full text-center cursor-pointer transition-all flex flex-col items-center mb-4 mt-8"
                                >
                                    <div className="bg-[#E4D5B7] text-[#917646] font-bold text-sm px-6 py-2.5 w-full rounded-sm shadow-sm hover:brightness-95 transition-all">
                                        {existingFile ? 'Replace upload' : 'Click to upload'}
                                    </div>
                                </button>
                            )}
                            
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                                className="hidden" 
                                accept=".jpeg,.jpg,.png,.pdf"
                            />

                            <div className="text-center mt-auto">
                                <UploadCloud className="w-5 h-5 text-gray-400 mx-auto mb-2 opacity-60" />
                                <p className="text-xs text-gray-300 leading-relaxed font-medium">Click or drag files to upload</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Supported formats: JPEG, PNG, PDF</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <button 
                            type="submit" 
                            disabled={submitting}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold tracking-wide shadow-md transition-all ${
                                submitting ? 'bg-[#f59e0b]/50 text-white/50 cursor-not-allowed' : 'bg-[#Ebdba7] text-[#866629] hover:brightness-95'
                            }`}
                        >
                            {submitting ? 'Saving...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCampaign;
