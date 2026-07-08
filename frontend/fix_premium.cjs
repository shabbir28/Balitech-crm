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
  
  // Replace API endpoints globally
  content = content.replace(/\/api\/refine-sessions/g, '/api/premium-sessions');
  content = content.replace(/\/api\/refine-jobs/g, '/api/premium-jobs');
  content = content.replace(/\/api\/refine-data/g, '/api/premium-data');
  content = content.replace(/\/api\/refine-download/g, '/api/premium-download');
  content = content.replace(/\/api\/refine-dnc/g, '/api/premium-dnc');
  content = content.replace(/\/api\/refine-vendors/g, '/api/premium-vendors');
  content = content.replace(/\/api\/refine-campaigns/g, '/api/premium-campaigns');
  
  // Replace Navigation strings globally
  content = content.replace(/\/refine-sessions/g, '/premium-sessions');
  content = content.replace(/\/refine-upload/g, '/premium-upload');
  content = content.replace(/\/refine-data/g, '/premium-data');
  content = content.replace(/\/refine-download/g, '/premium-download');
  content = content.replace(/\/refine-already-downloaded/g, '/premium-already-downloaded');
  
  // Replace Visual Titles globally
  content = content.replace(/Refine Vendors/g, "Premium Vendors");
  content = content.replace(/Refine Vendor Management/g, "Premium Vendor Management");
  content = content.replace(/Refine Campaigns/g, "Premium Campaigns");
  content = content.replace(/Refine Campaign Management/g, "Premium Campaign Management");
  content = content.replace(/Refine Sessions/g, "Premium Sessions");
  content = content.replace(/Upload Refine Data/g, "Upload Premium Data");
  content = content.replace(/Refine Data/g, "Premium Data");
  content = content.replace(/Download Refined Data/g, "Download Premium Data");
  content = content.replace(/Refined Download Requests/g, "Premium Download Requests");
  content = content.replace(/Refined Downloaded Leads/g, "Premium Downloaded Leads");

  // Fix any remaining UI labels globally
  content = content.replace(/'Refine '/g, "'Premium '");
  content = content.replace(/"Refine "/g, '"Premium "');
  content = content.replace(/Refine /g, 'Premium ');

  fs.writeFileSync(filePath, content);
}

console.log("Fix complete.");
