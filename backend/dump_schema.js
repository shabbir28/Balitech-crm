const db = require('./src/config/db');

async function dumpSchema() {
    try {
        const queryLogs = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'download_logs';
        `;
        const resLogs = await db.query(queryLogs);
        console.log("download_logs schema:", resLogs.rows);

        const queryReqs = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'download_requests';
        `;
        const resReqs = await db.query(queryReqs);
        console.log("download_requests schema:", resReqs.rows);
    } catch(err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

dumpSchema();
