const bcrypt = require('bcryptjs');
const db = require('./src/config/db');
(async () => {
    try {
        const hash = await bcrypt.hash('123456', 10);
        await db.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hash, 'sad@gmail.com']);
        console.log("Password reset successfully to 123456");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
