async function testDownload() {
    try {
        // We'll need a token, so let's log in as super_admin
        const db = require('./src/config/db');
        const userRes = await db.query("SELECT id FROM users WHERE role='super_admin' LIMIT 1");
        if (userRes.rows.length === 0) return console.log("No super_admin found");
        
        // Let's create a token for this user
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: userRes.rows[0].id, role: 'super_admin' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
        
        const res = await fetch('http://localhost:5000/api/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vendor_id: 'all',
                campaign_id: 'all',
                quantity: 10,
                states: [],
                min_age: '',
                max_age: '',
                force_scrub: false,
                async_scrub: false,
                job_id: '',
                include_downloaded: false
            })
        });
        
        const data = await res.json();
        if (!res.ok) {
            console.log("ERROR:", data);
        } else {
            console.log("SUCCESS:", data.summary);
        }
    } catch (e) {
        console.log("ERROR:", e.message);
    } finally {
        process.exit();
    }
}
require('dotenv').config();
testDownload();
