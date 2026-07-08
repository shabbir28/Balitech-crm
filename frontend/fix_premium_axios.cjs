const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'pages');

const filesToFix = [
  'PremiumVendors.jsx',
  'PremiumCampaigns.jsx',
  'PremiumSessionsList.jsx',
  'PremiumSessionDetails.jsx',
  'PremiumLeadsTable.jsx',
  'PremiumDownloadLeads.jsx',
  'PremiumAlreadyDownloaded.jsx',
  'PremiumUploadLeads.jsx',
  'PremiumAddCampaign.jsx',
  'PremiumAddJob.jsx'
];

for (const dest of filesToFix) {
  const filePath = path.join(srcDir, dest);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace Axios endpoints globally
  content = content.replace(/\/refine-sessions/g, '/premium-sessions');
  content = content.replace(/\/refine-jobs/g, '/premium-jobs');
  content = content.replace(/\/refine-data/g, '/premium-data');
  content = content.replace(/\/refine-download/g, '/premium-download');
  content = content.replace(/\/refine-dnc/g, '/premium-dnc');
  content = content.replace(/\/refine-vendors/g, '/premium-vendors');
  content = content.replace(/\/refine-campaigns/g, '/premium-campaigns');

  fs.writeFileSync(filePath, content);
}

console.log("Axios endpoint fix complete.");
