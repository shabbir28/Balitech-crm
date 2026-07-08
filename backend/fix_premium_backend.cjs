const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'controllers');

const filesToFix = [
  'premiumVendorController.js',
  'premiumCampaignController.js',
  'premiumSessionController.js',
  'premiumJobController.js',
  'premiumDataController.js',
  'premiumDownloadController.js'
];

for (const dest of filesToFix) {
  const filePath = path.join(srcDir, dest);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/upload_sessions/g, 'premium_sessions');
  content = content.replace(/upload_jobs/g, 'premium_jobs');
  
  // also check if any API path is wrong in backend routes
  // No, routes are defined in routes/premium*.js, wait let's fix those too if needed.

  fs.writeFileSync(filePath, content);
}

console.log("Backend tables fixed.");
