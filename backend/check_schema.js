const db = require('./src/config/db');

async function run() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS dead_numbers_stats (
            id SERIAL PRIMARY KEY,
            total_downloaded INT DEFAULT 0
        );
        INSERT INTO dead_numbers_stats (id, total_downloaded) 
        SELECT 1, 0 WHERE NOT EXISTS (SELECT 1 FROM dead_numbers_stats WHERE id = 1);
    `);
    console.log("Table created");
    console.log(res.rows);
    process.exit(0);
}

run();
