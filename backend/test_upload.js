const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function runTest() {
    try {
        // Find an active session or create one
        // For simplicity, let's just create a dummy session, but we need a vendor
        const db = require('./src/config/db');
        const vendorCheck = await db.query('SELECT vendor_id FROM vendors LIMIT 1');
        if (vendorCheck.rows.length === 0) {
            console.log('No vendors found.');
            process.exit(1);
        }
        const vendor_id = vendorCheck.rows[0].vendor_id;
        
        const sessionResult = await db.query(
            "INSERT INTO upload_sessions (vendor_id, campaign_type) VALUES ($1, 'MEDICARE') RETURNING id",
            [vendor_id]
        );
        const session_id = sessionResult.rows[0].id;
        console.log('Created session:', session_id);

        const form = new FormData();
        // Create a dummy excel file buffer for testing or use an existing one
        const xlsx = require('xlsx');
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet([{ Name: 'Test', Phone: '1234567890', Email: 'test@test.com' }]);
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        fs.writeFileSync('test_upload.xlsx', buf);

        form.append('session_id', session_id);
        form.append('file', fs.createReadStream('test_upload.xlsx'));

        const response = await axios.post('http://localhost:5000/api/jobs', form, {
            headers: {
                ...form.getHeaders()
            }
        });
        
        console.log('Success:', response.data);
    } catch (error) {
        console.error('Error status:', error.response?.status);
        console.error('Error data:', error.response?.data);
    }
    process.exit(0);
}

runTest();
