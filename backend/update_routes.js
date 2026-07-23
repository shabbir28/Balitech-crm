const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(dir);

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('data_entry')) {
        // Regex to find 'data_entry' followed by quotes, and insert 'dialer_agent'
        const regex = /(['"]data_entry['"])(?!\s*,\s*['"]dialer_agent['"])/g;
        const newContent = content.replace(regex, "$1, 'dialer_agent'");
        
        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent);
            console.log(`Updated ${file}`);
        }
    }
});
