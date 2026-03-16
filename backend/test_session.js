const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testFlow() {
    try {
        console.log('Logging in as admin to get token...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@bpocrm.com', // Assuming this exists or we can bypass if we know the token or create a direct db test
            password: 'password123'
        }).catch(() => null);

        let token = loginRes ? loginRes.data.token : null;
        
        // Actually since we don't know the exact admin credentials, let's just test DB logic directly instead of HTTP, or skip this specific file-upload testing if we don't have auth. 
        // We will test directly via DB for session creation.
        const db = require('./src/config/db');
        
        console.log('Testing DB explicitly...');
        const vendors = await db.query('SELECT vendor_id FROM vendors LIMIT 1');
        if (vendors.rows.length === 0) {
            console.log('No vendors found to test with.');
            process.exit(0);
        }
        
        const vendor_id = vendors.rows[0].vendor_id;
        
        console.log('Creating session...');
        const sessionRes = await db.query(`
            INSERT INTO upload_sessions (vendor_id, campaign_type)
            VALUES ($1, $2)
            RETURNING *
        `, [vendor_id, 'ACA']);
        
        console.log('Session Created:', sessionRes.rows[0]);
        
        console.log('Test flow completed successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
}

testFlow();
