const fs = require('fs');
const files = [
  'd:/Bpo crm/frontend/src/pages/DownloadLeads.jsx',
  'd:/Bpo crm/frontend/src/pages/RefineDownloadLeads.jsx',
  'd:/Bpo crm/frontend/src/pages/PremiumDownloadLeads.jsx',
  'd:/Bpo crm/frontend/src/pages/VanDownloadLeads.jsx'
];

for (const f of files) {
  let content = fs.readFileSync(f, 'utf-8');
  content = content.replace(/if \(selectedFileId\) \{/g, 'if (selectedFileIds.length === 1) {');
  content = content.replace(/\$\{selectedFileId\}/g, '');
  content = content.replace(/\{selectedFileId \&\&/g, '{selectedFileIds.length === 1 &&');
  fs.writeFileSync(f, content);
}
console.log(done);
