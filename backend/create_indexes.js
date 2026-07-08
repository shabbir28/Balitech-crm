const db = require('./src/config/db');
async function createIndexes() {
    try {
        console.log("Creating idx_leads_status_uploaded...");
        await db.query("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_status_uploaded ON leads (status, uploaded_at);");
        
        console.log("Creating idx_refine_data_status_uploaded...");
        await db.query("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refine_data_status_uploaded ON refine_data (status, uploaded_at);");
        
        console.log("Indexes created successfully!");
    } catch (e) {
        console.log("ERROR:", e.message);
    } finally {
        process.exit();
    }
}
require('dotenv').config();
createIndexes();
