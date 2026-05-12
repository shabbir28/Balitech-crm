const db = require('./src/config/db');

async function checkCampaigns() {
    try {
        const res = await db.query('SELECT * FROM campaigns');
        console.log('Campaigns:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkCampaigns();
