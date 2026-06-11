/**
 * DNC Sync Auth Middleware
 * Validates a static Bearer token for server-to-server integration.
 * This is intentionally SEPARATE from the CRM user JWT auth.
 */
const dncSyncAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authorization token is required.' });
    }

    const secret = process.env.DNC_SYNC_SECRET;
    if (!secret) {
        console.error('DNC_SYNC_SECRET is not configured in .env');
        return res.status(500).json({ success: false, message: 'Server configuration error.' });
    }

    if (token !== secret) {
        return res.status(403).json({ success: false, message: 'Invalid or unauthorized token.' });
    }

    return next();
};

module.exports = dncSyncAuth;
