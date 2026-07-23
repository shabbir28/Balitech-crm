const fs = require('fs');
const path = require('path');
const filepath = path.join(__dirname, 'src', 'controllers', 'mixedDownloadController.js');
let content = fs.readFileSync(filepath, 'utf8');

// Replace the insert query
content = content.replace(
  /INSERT INTO mixed_download_logs \(user_id, quantity, states, min_age, max_age, csv_payload, approved_by\) VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7\)/g,
  'INSERT INTO mixed_download_logs (user_id, quantity, states, min_age, max_age, csv_payload) VALUES ($1, $2, $3, $4, $5, $6)'
);

// Remove the req.user.id from the array passed to query
content = content.replace(
  /req\.user\.id\n\s*\]\n\s*\);/g,
  '\n      ]\n    );'
);

// And we also need to change the values placeholder count from $7 to $6
// Wait, the regex replacement already handled that? Let me be exact:
content = content.replace(
    /csvDataString,\s*req\.user\.id\s*\]/g,
    'csvDataString\n      ]'
);


fs.writeFileSync(filepath, content);
console.log('Fixed approved_by');
