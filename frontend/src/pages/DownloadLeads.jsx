import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Download, AlertCircle } from 'lucide-react';

const DownloadLeads = () => {
    const [vendors, setVendors] = useState([]);
    const [loadingVendors, setLoadingVendors] = useState(true);

    const [formData, setFormData] = useState({
        country_code: '',
        area_code: '',
        vendor_id: '',
        quantity: 1000
    });
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const res = await api.get('/vendors');
                setVendors(res.data);
            } catch (err) {
                console.error('Failed to load vendors', err);
            } finally {
                setLoadingVendors(false);
            }
        };
        fetchVendors();
    }, []);

    const handleDownload = async (e) => {
        e.preventDefault();
        
        if (!formData.vendor_id) {
            setError('Please select a specific vendor to download leads from.');
            return;
        }

        setDownloading(true);
        setError('');

        try {
            const res = await api.post('/download', formData, {
                responseType: 'blob'
            });
            
            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `leads_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
        } catch (err) {
            // Because responseType is blob, error message is a blob too. Need to read it.
            if (err.response && err.response.data instanceof Blob) {
                const text = await err.response.data.text();
                try {
                    const json = JSON.parse(text);
                    setError(json.message);
                } catch {
                    setError('Download failed. No leads matched criteria or server error.');
                }
            } else {
                setError('Download request failed');
            }
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Download Data</h1>

            <div className="card p-8">
                <form onSubmit={handleDownload} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Vendor (Required)</label>
                        <select 
                            required
                            className="input-field cursor-pointer" 
                            value={formData.vendor_id}
                            onChange={e => setFormData({...formData, vendor_id: e.target.value})}
                            disabled={loadingVendors}
                        >
                            <option value="" disabled>
                                {loadingVendors ? 'Loading vendors...' : '-- Choose a precise Vendor --'}
                            </option>
                            {vendors.map(v => (
                                <option key={v.vendor_id} value={v.vendor_id}>
                                    {v.name} {v.available_leads !== undefined ? `(${v.available_leads} available)` : ''}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Pick exactly whose data you want to securely download.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country Code (Optional)</label>
                            <input 
                                type="text" 
                                className="input-field placeholder-gray-400" 
                                placeholder="e.g. 1 for US" 
                                value={formData.country_code}
                                onChange={e => setFormData({...formData, country_code: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Area Code (Optional)</label>
                            <input 
                                type="text" 
                                className="input-field placeholder-gray-400" 
                                placeholder="e.g. 305" 
                                value={formData.area_code}
                                onChange={e => setFormData({...formData, area_code: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Required)</label>
                        <input 
                            type="number" 
                            min="1"
                            max="50000"
                            required
                            className="input-field" 
                            value={formData.quantity}
                            onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                        />
                        <p className="mt-1 text-xs text-gray-500">Maximum limit per request is strongly recommended to be &lt; 50,000 for stability.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center border border-red-100">
                            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" /> {error}
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                        <button 
                            type="submit" 
                            disabled={downloading || loadingVendors || !formData.vendor_id}
                            className="w-full btn-primary flex justify-center items-center py-3 text-lg"
                        >
                            <Download className="mr-3 h-6 w-6" /> {downloading ? 'Processing Download...' : 'Download CSV'}
                        </button>
                    </div>
                </form>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                <h4 className="font-bold text-yellow-800 mb-1">Important Note</h4>
                <p className="text-sm text-yellow-700">Downloading leads permanently assigns them to you and marks them as `<span className="font-mono bg-yellow-100 px-1 rounded">downloaded</span>`. Ensure your vendor and quantity are completely correct before executing.</p>
            </div>
        </div>
    );
};

export default DownloadLeads;
