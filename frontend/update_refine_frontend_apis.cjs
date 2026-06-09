const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'pages');

const filesToUpdate = [
  'RefineVendors.jsx',
  'RefineCampaigns.jsx',
  'RefineUploadLeads.jsx',
  'RefineSessionsList.jsx',
  'RefineSessionDetails.jsx',
  'RefineDownloadLeads.jsx',
  'RefineAlreadyDownloaded.jsx',
  'RefineDnc.jsx'
];

for (const file of filesToUpdate) {
  const filePath = path.join(srcDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file}, not found.`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace API endpoints
  content = content.replace(/\/api\/vendors/g, '/api/refine-vendors');
  content = content.replace(/\/api\/campaigns/g, '/api/refine-campaigns');
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}

console.log("Frontend files updated.");
