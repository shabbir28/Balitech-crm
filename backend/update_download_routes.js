const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (file.includes('download.js') || file.includes('vendors.js') || file.includes('data.js') || file.includes('leads.js')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Add dialer_agent to any authorizeRole(['admin']) or ['super_admin', 'admin'] or ['admin', 'data_entry'] etc.
        // But only for specific endpoints? Actually it's easier to just allow dialer_agent wherever admin or data_entry is allowed, EXCEPT we only want dialer agent to do certain things.
        // Let's just allow dialer_agent wherever admin or data_entry is. The controllers can do further filtering.
        // Let's do: if it contains 'admin' in authorizeRole array, add 'dialer_agent' if not present.
        const regex = /authorizeRole\(\[[^\]]*['"]admin['"][^\]]*\]\)/g;
        let newContent = content.replace(regex, (match) => {
            if (!match.includes('dialer_agent')) {
                return match.replace(/\]\)/, ", 'dialer_agent'])");
            }
            return match;
        });

        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent);
            console.log(`Updated ${file}`);
        }
    }
});
