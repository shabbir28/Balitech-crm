import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/download/logs')
            .then(res => {
                setLogs(res.data);
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Download Logs</h1>

            <div className="card overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Agent</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Filters Used</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vendor Filter</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading && <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>}
                        {!loading && logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 capitalize">{log.username || 'Deleted User'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-brand-600 font-bold">{log.quantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                    {(log.country_code || log.area_code) ? (
                                        <>CC: {log.country_code || '*'} | Area: {log.area_code || '*'}</>
                                    ) : 'No Filters'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{log.vendor_name || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(log.download_date).toLocaleString()}</td>
                            </tr>
                        ))}
                        {!loading && logs.length === 0 && (
                            <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No download activity recent enough.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Logs;
