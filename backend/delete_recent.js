const db = require('./src/config/db');
async function del() {
  try {
    await db.query('BEGIN');
    await db.query("DELETE FROM premium_data WHERE job_id = 'bab0df77-ec1f-407e-8f72-5d32e34a7d87'");
    await db.query("DELETE FROM premium_jobs WHERE id = 'bab0df77-ec1f-407e-8f72-5d32e34a7d87'");
    await db.query('COMMIT');
    console.log('Deleted successfully');
    process.exit(0);
  } catch(e) {
    await db.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  }
}
del();
