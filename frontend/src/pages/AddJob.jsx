import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { UploadCloud, CheckCircle, ArrowRight, Settings, UserCircle, Database, ChevronRight, FileX } from 'lucide-react';

const AddJob = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file to import');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', id);

        setUploading(true);
        setError('');
        
        try {
            const res = await api.post('/jobs', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
            setStep(4); // Skip direct to end for now
        } catch (err) {
            setError(err.response?.data?.message || 'Server error uploading file');
        } finally {
            setUploading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 text-gray-800">
            {/* Header Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-500 bg-gray-900 px-4 py-3 rounded-xl shadow-lg border border-gray-800">
                <span className="text-orange-500 font-bold flex items-center cursor-pointer" onClick={() => navigate(`/sessions/${id}`)}>
                    <Database className="w-4 h-4 mr-2" /> Import Contact
                </span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-300 font-mono truncate max-w-xs">{id}</span>
                
                <div className="ml-auto flex items-center space-x-4 text-gray-400">
                    <Settings className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
                    <UserCircle className="w-6 h-6 hover:text-white cursor-pointer transition-colors" />
                </div>
            </div>

            <div className="bg-[#EFEFEF] rounded-2xl min-h-[600px] shadow-xl relative overflow-hidden flex flex-col items-center pt-10">
                {/* Stepper */}
                <div className="w-full max-w-4xl px-8 mb-12 relative z-10">
                    <div className="flex justify-between items-center relative">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-300 -z-10 rounded"></div>
                        
                        {['Import File', 'Map Columns', 'Preview', 'Import'].map((label, index) => {
                            const stepNum = index + 1;
                            const isActive = step === stepNum;
                            const isPast = step > stepNum;
                            
                            return (
                                <div key={label} className="flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold relative z-10 border-4 ${
                                        isActive ? 'bg-orange-500 text-white border-white' : 
                                        isPast ? 'bg-orange-400 text-white border-white' :
                                        'bg-gray-200 text-gray-500 border-white'
                                    }`}>
                                        {isPast ? <CheckCircle className="w-5 h-5" /> : stepNum}
                                    </div>
                                    <span className={`text-sm mt-3 font-semibold ${isActive ? 'text-orange-600' : 'text-gray-500'}`}>
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 w-full bg-[#62626E] mt-4 p-12 text-gray-200 flex flex-col rounded-b-2xl relative z-10">
                    {step === 1 && (
                        <div className="w-full max-w-4xl mx-auto flex">
                            <div className="flex-1">
                                <h2 className="text-3xl font-bold text-white mb-2">Import File</h2>
                                <p className="text-gray-300 mb-8">Click here to import CSV, Excel, or TXT</p>
                                
                                <div className="border-2 border-dashed border-gray-400 rounded-xl p-10 text-center hover:bg-[#52525E] transition-colors relative">
                                    <input 
                                        type="file" 
                                        accept=".csv, .xls, .xlsx" 
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex justify-center mb-4">
                                        <div className="bg-gray-200 text-[#62626E] p-3 rounded-lg">
                                            <UploadCloud className="w-8 h-8" />
                                        </div>
                                    </div>
                                    <p className="text-white font-medium">Click or drag and drop to import CSV, Excel, or TXT</p>
                                    <p className="text-gray-400 text-sm mt-2">Maximum file size: 50MB</p>
                                </div>

                                {file && (
                                    <div className="mt-8">
                                        <h3 className="text-lg font-bold text-white mb-2">File Details:</h3>
                                        <div className="space-y-1">
                                            <p><span className="text-gray-400">Name:</span> {file.name}</p>
                                            <p><span className="text-gray-400">Size:</span> {formatBytes(file.size)}</p>
                                            <p><span className="text-gray-400">Type:</span> {file.type || 'text/csv'}</p>
                                        </div>
                                        
                                        <div className="bg-orange-900/40 border border-orange-500/50 p-4 rounded-lg mt-4 flex items-start">
                                            <FileX className="w-5 h-5 text-orange-400 mr-3 mt-0.5" />
                                            <div>
                                                <h4 className="font-bold text-orange-400">Automatic Row Cleanup</h4>
                                                <p className="text-sm text-gray-300 mt-1">Our system will automatically scan this file and skip any entirely empty rows during processing to ensure clean data insertion.</p>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex justify-end">
                                            <button 
                                                onClick={handleUpload}
                                                disabled={uploading}
                                                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-bold transition-colors shadow-lg flex items-center text-lg"
                                            >
                                                {uploading ? 'Processing File...' : 'Start Import'} <ArrowRight className="ml-2 w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {error && (
                                    <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mt-6">
                                        {error}
                                    </div>
                                )}
                            </div>
                            
                            {/* Illustration placeholder (mimicking the second image) */}
                            <div className="hidden md:flex w-1/3 ml-12 items-center justify-center">
                                <div className="bg-[#EFEFEF] w-64 h-48 rounded-lg shadow-2xl relative">
                                    <div className="absolute -left-12 bottom-0 w-24 h-40 bg-orange-400 rounded-t-lg transform -skew-x-12 opacity-80"></div>
                                    <div className="absolute -right-8 bottom-0 w-16 h-32 bg-blue-400 rounded-t-lg transform skew-x-12 opacity-80"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {step === 4 && result && (
                        <div className="w-full max-w-md mx-auto text-center py-10">
                            <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
                            <h2 className="text-3xl font-bold text-white mb-4">Import Successful!</h2>
                            <div className="bg-[#52525E] rounded-xl p-6 text-left mb-8">
                                <ul className="space-y-3">
                                    <li className="flex justify-between border-b border-gray-600 pb-2">
                                        <span className="text-gray-400">Total Valid Rows:</span>
                                        <span className="font-bold text-white">{result.total_processed}</span>
                                    </li>
                                    <li className="flex justify-between border-b border-gray-600 pb-2">
                                        <span className="text-gray-400">Successfully Inserted:</span>
                                        <span className="font-bold text-green-400">{result.inserted}</span>
                                    </li>
                                    <li className="flex justify-between pb-2">
                                        <span className="text-gray-400">Duplicates Skipped:</span>
                                        <span className="font-bold text-yellow-400">{result.duplicates_skipped}</span>
                                    </li>
                                </ul>
                                <div className="mt-4 pt-4 border-t border-gray-600 text-sm text-center text-gray-400">
                                    Note: Completely empty rows in the excel/csv file were automatically ignored during this process.
                                </div>
                            </div>
                            <button 
                                onClick={() => navigate(`/sessions/${id}`)}
                                className="bg-gray-200 hover:bg-white text-gray-900 px-8 py-3 rounded-lg font-bold transition-colors w-full"
                            >
                                Return to Session
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddJob;
