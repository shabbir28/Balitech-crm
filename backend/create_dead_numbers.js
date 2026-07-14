const db = require('./src/config/db');
async function setup() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS dead_numbers (
                phone VARCHAR(20) PRIMARY KEY,
                source VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INT REFERENCES users(id)
            );
        `);
        console.log('Table dead_numbers created successfully');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}
setup();
