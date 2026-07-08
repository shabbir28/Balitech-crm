const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'index.js');
let content = fs.readFileSync(file, 'utf8');
content += '\n'; // Trigger nodemon
fs.writeFileSync(file, content);
