const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const controllersDir = path.join(__dirname, 'src', 'controllers');

const filesToDuplicate = [
  { type: 'route', src: 'sessions.js', dest: 'premium_sessions.js' },
  { type: 'route', src: 'jobs.js', dest: 'premium_jobs.js' },
  { type: 'route', src: 'leads.js', dest: 'premium_data.js' },
  { type: 'route', src: 'download.js', dest: 'premium_download.js' },
  { type: 'route', src: 'dnc.js', dest: 'premium_dnc.js' },
  { type: 'route', src: 'vendors.js', dest: 'premium_vendors.js' },
  { type: 'route', src: 'campaigns.js', dest: 'premium_campaigns.js' },
  
  { type: 'controller', src: 'sessionController.js', dest: 'premiumSessionController.js' },
  { type: 'controller', src: 'jobController.js', dest: 'premiumJobController.js' },
  { type: 'controller', src: 'leadController.js', dest: 'premiumDataController.js' },
  { type: 'controller', src: 'downloadController.js', dest: 'premiumDownloadController.js' },
  { type: 'controller', src: 'dncController.js', dest: 'premiumDncController.js' },
  { type: 'controller', src: 'vendorController.js', dest: 'premiumVendorController.js' },
  { type: 'controller', src: 'campaignController.js', dest: 'premiumCampaignController.js' },
];

for (const { type, src, dest } of filesToDuplicate) {
  const dir = type === 'route' ? routesDir : controllersDir;
  let content = fs.readFileSync(path.join(dir, src), 'utf8');
  
  // Replacements for table names
  content = content.replace(/refine_sessions/g, 'premium_sessions');
  content = content.replace(/refine_jobs/g, 'premium_jobs');
  content = content.replace(/refine_data/g, 'premium_data');
  content = content.replace(/refine_download_requests/g, 'premium_download_requests');
  content = content.replace(/refine_download_logs/g, 'premium_download_logs');
  content = content.replace(/refine_dnc_numbers/g, 'premium_dnc_numbers');
  content = content.replace(/refine_vendors/g, 'premium_vendors');
  content = content.replace(/refine_campaigns/g, 'premium_campaigns');

  content = content.replace(/'sessions'/g, "'premium_sessions'");
  content = content.replace(/'jobs'/g, "'premium_jobs'");
  content = content.replace(/'leads'/g, "'premium_data'");
  content = content.replace(/'vendors'/g, "'premium_vendors'");
  content = content.replace(/'campaigns'/g, "'premium_campaigns'");

  // Note: if the source was Standard data (not refine), we replace standard tables.
  // The sources are standard files (e.g. sessions.js, sessionController.js).
  // Standard tables: sessions, jobs, leads, vendors, campaigns, download_requests, download_logs, dnc_numbers
  content = content.replace(/([^a-zA-Z_])sessions([^a-zA-Z_])/g, '$1premium_sessions$2');
  content = content.replace(/([^a-zA-Z_])jobs([^a-zA-Z_])/g, '$1premium_jobs$2');
  content = content.replace(/([^a-zA-Z_])leads([^a-zA-Z_])/g, '$1premium_data$2');
  content = content.replace(/([^a-zA-Z_])vendors([^a-zA-Z_])/g, '$1premium_vendors$2');
  content = content.replace(/([^a-zA-Z_])campaigns([^a-zA-Z_])/g, '$1premium_campaigns$2');
  content = content.replace(/([^a-zA-Z_])download_requests([^a-zA-Z_])/g, '$1premium_download_requests$2');
  content = content.replace(/([^a-zA-Z_])download_logs([^a-zA-Z_])/g, '$1premium_download_logs$2');
  content = content.replace(/([^a-zA-Z_])dnc_numbers([^a-zA-Z_])/g, '$1premium_dnc_numbers$2');

  // Also replace require paths for controllers in routes
  if (type === 'route') {
    content = content.replace(/sessionController/g, 'premiumSessionController');
    content = content.replace(/jobController/g, 'premiumJobController');
    content = content.replace(/leadController/g, 'premiumDataController');
    content = content.replace(/downloadController/g, 'premiumDownloadController');
    content = content.replace(/dncController/g, 'premiumDncController');
    content = content.replace(/vendorController/g, 'premiumVendorController');
    content = content.replace(/campaignController/g, 'premiumCampaignController');
  }

  fs.writeFileSync(path.join(dir, dest), content);
}

console.log("Backend duplication complete.");
