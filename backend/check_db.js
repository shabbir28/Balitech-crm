const db = require('./src/config/db');

async function checkLeads() {
    try {
        const res = await db.query('SELECT campaign_type, count(*) FROM leads GROUP BY campaign_type');
        console.log('Leads breakdown:', res.rows);
        
        const campaigns = await db.query('SELECT name, type FROM campaigns');
        console.log('Campaigns:', campaigns.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkLeads();
