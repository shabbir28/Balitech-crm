const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'pages');

const pagesToClone = [
  { src: 'RefineUploadLeads.jsx', dest: 'PremiumUploadLeads.jsx' },
  { src: 'RefineAddCampaign.jsx', dest: 'PremiumAddCampaign.jsx' },
  { src: 'RefineAddJob.jsx', dest: 'PremiumAddJob.jsx' }
];

for (const { src, dest } of pagesToClone) {
  let content = fs.readFileSync(path.join(srcDir, src), 'utf8');
  
  // Replace API endpoints
  content = content.replace(/\/api\/refine-sessions/g, '/api/premium-sessions');
  content = content.replace(/\/api\/refine-jobs/g, '/api/premium-jobs');
  content = content.replace(/\/api\/refine-data/g, '/api/premium-data');
  content = content.replace(/\/api\/refine-download/g, '/api/premium-download');
  content = content.replace(/\/api\/refine-dnc/g, '/api/premium-dnc');
  content = content.replace(/\/api\/refine-vendors/g, '/api/premium-vendors');
  content = content.replace(/\/api\/refine-campaigns/g, '/api/premium-campaigns');
  
  // For components naming
  const componentName = src.split('.')[0];
  const newComponentName = dest.split('.')[0];
  content = content.replace(new RegExp(`function ${componentName}`, 'g'), `function ${newComponentName}`);
  content = content.replace(new RegExp(`const ${componentName}`, 'g'), `const ${newComponentName}`);
  content = content.replace(new RegExp(`export default ${componentName}`, 'g'), `export default ${newComponentName}`);
  
  // Replace Navigation strings
  content = content.replace(/\/refine-sessions/g, '/premium-sessions');
  content = content.replace(/\/refine-upload/g, '/premium-upload');
  content = content.replace(/\/refine-data/g, '/premium-data');
  content = content.replace(/\/refine-download/g, '/premium-download');
  content = content.replace(/\/refine-already-downloaded/g, '/premium-already-downloaded');
  
  // Replace Visual Titles
  content = content.replace(/Refine Vendors/g, "Premium Vendors");
  content = content.replace(/Refine Campaigns/g, "Premium Campaigns");
  content = content.replace(/Refine Sessions/g, "Premium Sessions");
  content = content.replace(/Upload Refine Data/g, "Upload Premium Data");
  content = content.replace(/Refine Data/g, "Premium Data");
  content = content.replace(/Download Refined Data/g, "Download Premium Data");
  content = content.replace(/Refined Download Requests/g, "Premium Download Requests");
  content = content.replace(/Refined Downloaded Leads/g, "Premium Downloaded Leads");

  // Fix any remaining UI labels
  content = content.replace(/'Refine '/g, "'Premium '");
  content = content.replace(/"Refine "/g, '"Premium "');

  fs.writeFileSync(path.join(srcDir, dest), content);
}

console.log("Additional frontend duplication complete.");
