import React, { useEffect, useState } from 'react';
import api from '../services/api';

const IpGuard = ({ children }) => {
    const [ipValid, setIpValid] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const checkIp = async (attempt = 1) => {
            try {
                await api.get('/auth/verify-ip', { timeout: 10000 });
                if (!cancelled) setIpValid(true);
            } catch (err) {
                if (cancelled) return;

                // Network timeout ya server temporarily down — retry karo (max 3 baar)
                const isNetworkError = !err.response; // koi HTTP response nahi aya
                if (isNetworkError && attempt < 3) {
                    setTimeout(() => checkIp(attempt + 1), 3000 * attempt);
                    return;
                }

                // Agar backend ne explicitly 403/block kiya — tab band karo
                // Agar sirf network error hai aur retry bhi fail — app chalne do
                if (err.response && err.response.status === 403) {
                    setIpValid(false);
                } else {
                    // Timeout ya server down — app ko block mat karo
                    setIpValid(true);
                }
            }
        };

        checkIp();
        return () => { cancelled = true; };
    }, []);

    // Loading state — blank nahi, simple loader dikhao
    if (ipValid === null) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#0f172a',
                color: '#94a3b8',
                fontFamily: 'sans-serif',
                fontSize: '14px'
            }}>
                Loading...
            </div>
        );
    }

    if (ipValid === false) {
        return (
            <div style={{ fontFamily: 'sans-serif', padding: '20px', background: '#fff', color: '#000', height: '100vh' }}>
                this site can not reached
            </div>
        );
    }

    return children;
};

export default IpGuard;
