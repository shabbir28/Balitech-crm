const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'pages');

const pagesToClone = [
  { src: 'SessionsList.jsx', dest: 'RefineSessionsList.jsx' },
  { src: 'SessionDetails.jsx', dest: 'RefineSessionDetails.jsx' },
  { src: 'UploadLeads.jsx', dest: 'RefineUploadLeads.jsx' },
  { src: 'LeadsTable.jsx', dest: 'RefineLeadsTable.jsx' },
  { src: 'Dnc.jsx', dest: 'RefineDnc.jsx' },
  { src: 'DownloadLeads.jsx', dest: 'RefineDownloadLeads.jsx' },
  { src: 'AlreadyDownloaded.jsx', dest: 'RefineAlreadyDownloaded.jsx' },
  { src: 'Vendors.jsx', dest: 'RefineVendors.jsx' },
  { src: 'Campaigns.jsx', dest: 'RefineCampaigns.jsx' }
];

for (const { src, dest } of pagesToClone) {
  let content = fs.readFileSync(path.join(srcDir, src), 'utf8');
  
  // Replace API endpoints
  content = content.replace(/\/api\/sessions/g, '/api/refine-sessions');
  content = content.replace(/\/api\/jobs/g, '/api/refine-jobs');
  content = content.replace(/\/api\/leads/g, '/api/refine-data');
  content = content.replace(/\/api\/download/g, '/api/refine-download');
  content = content.replace(/\/api\/dnc/g, '/api/refine-dnc');
  
  // For components naming
  const componentName = src.split('.')[0];
  const newComponentName = dest.split('.')[0];
  content = content.replace(new RegExp(`function ${componentName}`, 'g'), `function ${newComponentName}`);
  content = content.replace(new RegExp(`const ${componentName}`, 'g'), `const ${newComponentName}`);
  content = content.replace(new RegExp(`export default ${componentName}`, 'g'), `export default ${newComponentName}`);
  
  // Replace Navigation strings
  content = content.replace(/\/sessions/g, '/refine-sessions');
  content = content.replace(/\/upload/g, '/refine-upload');
  content = content.replace(/\/leads/g, '/refine-data');
  content = content.replace(/\/download/g, '/refine-download');
  content = content.replace(/\/dnc/g, '/refine-dnc');
  content = content.replace(/\/already-downloaded/g, '/refine-already-downloaded');
  
  // Visual replacements
  content = content.replace(/'Upload Sessions'/g, "'Refine Sessions'");
  content = content.replace(/'Sessions'/g, "'Refine Sessions'");
  content = content.replace(/'Upload Leads'/g, "'Upload Refine Data'");
  content = content.replace(/'Leads Table'/g, "'Refine Data Table'");
  content = content.replace(/'Download Leads'/g, "'Download Refined Data'");
  content = content.replace(/'DNC Management'/g, "'Refine DNC'");
  content = content.replace(/'Vendors Management'/g, "'Refine Vendors'");
  content = content.replace(/'Campaigns Management'/g, "'Refine Campaigns'");

  fs.writeFileSync(path.join(srcDir, dest), content);
}

// App.jsx changes need to be made separately.
console.log("Pages duplicated successfully.");
