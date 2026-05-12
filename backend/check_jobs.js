const db = require('./src/config/db');

async function checkJobs() {
    try {
        const res = await db.query(`
            SELECT j.file_name, j.import_type, j.total_rows, j.start_time, s.campaign_type
            FROM upload_jobs j
            JOIN upload_sessions s ON j.session_id = s.id
            WHERE s.campaign_type = 'Medicaree'
            ORDER BY j.start_time DESC
        `);
        console.log('Jobs for Medicaree:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkJobs();
