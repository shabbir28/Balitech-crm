const db = require('../config/db');

const enforceIPWhitelist = async (req, res, next) => {
    try {
        // Extract client IP (handle proxies if behind Nginx/Cloudflare)
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        
        // If x-forwarded-for contains multiple IPs, the first one is the client
        if (clientIp && clientIp.includes(',')) {
            clientIp = clientIp.split(',')[0].trim();
        }

        // Normalize IPv6 localhost to IPv4
        if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
            clientIp = '127.0.0.1';
        }

        // 1. Check if the whitelist table is completely empty (Fail-Open behavior)
        const { rows: countRows } = await db.query('SELECT COUNT(*) FROM ip_whitelist');
        const count = parseInt(countRows[0].count, 10);

        if (count === 0) {
            // Whitelist is unconfigured. Allow all.
            return next();
        }

        // 2. Table is configured. Check if the specific IP exists and is globally whitelisted
        const { rows } = await db.query(
            'SELECT is_whitelisted FROM ip_whitelist WHERE ip_address = $1',
            [clientIp]
        );

        if (rows.length === 0 || rows[0].is_whitelisted === false) {
            console.log(`[Security] Blocked unauthorized IP connection attempt: ${clientIp}`);
            return res.status(403).json({ 
                error: 'Access Denied', 
                message: 'Your IP address is not authorized to access this API. Please contact the administrator.' 
            });
        }

        // IP is authorized
        next();
    } catch (err) {
        console.error('Error in enforceIPWhitelist middleware:', err);
        // On database error, it's safer to fail-open or respond with 500. Let's respond with 500.
        res.status(500).json({ error: 'Internal Server Error during security check' });
    }
};

module.exports = enforceIPWhitelist;
