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
  
  // Replace axios paths
  content = content.replace(/api\.get\(['"`]\/vendors/g, "api.get('/refine-vendors");
  content = content.replace(/api\.post\(['"`]\/vendors/g, "api.post('/refine-vendors");
  content = content.replace(/api\.put\(['"`]\/vendors/g, "api.put('/refine-vendors");
  content = content.replace(/api\.delete\(['"`]\/vendors/g, "api.delete('/refine-vendors");

  content = content.replace(/api\.get\(['"`]\/campaigns/g, "api.get('/refine-campaigns");
  content = content.replace(/api\.post\(['"`]\/campaigns/g, "api.post('/refine-campaigns");
  content = content.replace(/api\.put\(['"`]\/campaigns/g, "api.put('/refine-campaigns");
  content = content.replace(/api\.delete\(['"`]\/campaigns/g, "api.delete('/refine-campaigns");
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}

console.log("Frontend API paths fully updated.");
