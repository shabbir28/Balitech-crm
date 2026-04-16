import React, { useEffect, useState } from 'react';
import api from '../services/api';

const IpGuard = ({ children }) => {
    const [ipValid, setIpValid] = useState(null);

    useEffect(() => {
        const checkIp = async () => {
            try {
                // If the IP is blocked, the backend destroys the socket directly,
                // which results in a network error (no response).
                await api.get('/auth/verify-ip');
                setIpValid(true);
            } catch {
                // Any error on this specific startup endpoint means we failed to connect
                // or were actively blocked (socket destroyed).
                setIpValid(false);
            }
        };
        checkIp();
    }, []);

    // While checking, optionally show nothing to avoid a flash of the UI
    if (ipValid === null) {
        return null; 
    }

    if (ipValid === false) {
        // Render plain text as requested by the user
        return (
            <div style={{ fontFamily: 'sans-serif', padding: '20px', background: '#fff', color: '#000', height: '100vh' }}>
                this site can not reached
            </div>
        );
    }

    return children;
};

export default IpGuard;
