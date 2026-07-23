const db = require('./src/config/db');
(async () => {
  try {
    await db.query('ALTER TABLE users DROP CONSTRAINT users_role_check;');
    await db.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'data_entry', 'dialer_agent'));");
    console.log('Constraint updated successfully');
  } catch(e) {
    console.error('Error updating constraint:', e);
  } finally {
    process.exit();
  }
})();
