const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src', 'routes');
['download.js', 'premium_download.js', 'refine_download.js', 'van_download.js', 'mixed_download.js'].forEach(file => {
    const filePath = path.join(dir, file);
    if(fs.existsSync(filePath)){
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content
            .replace(/authorizeRole\(\['admin'\]\)/g, "authorizeRole(['admin', 'data_entry', 'dialer_agent'])")
            .replace(/authorizeRole\(\['admin',\s*'data_entry'\]\)/g, "authorizeRole(['admin', 'data_entry', 'dialer_agent'])")
            .replace(/authorizeRole\(\['admin',\s*'dialer_agent'\]\)/g, "authorizeRole(['admin', 'data_entry', 'dialer_agent'])")
            .replace(/authorizeRole\(\['super_admin',\s*'admin'\]\)/g, "authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent'])");
        if(newContent !== content) {
            fs.writeFileSync(filePath, newContent);
            console.log('Updated ' + file);
        }
    }
});
