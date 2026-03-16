const db = require('./src/config/db');

async function migrate() {
    try {
        await db.query(`
            ALTER TABLE vendors 
            ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
            ADD COLUMN IF NOT EXISTS comment TEXT,
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active'
        `);
        console.log('Migration successful: Added phone, comment, and status to vendors table.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}
migrate();
