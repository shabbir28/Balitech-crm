const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const replacements = [
  ['wc_db_download_requests', 'safe_quote_download_requests'],
  ['wc_db_download_logs', 'safe_quote_download_logs'],
  ['wc_db_campaigns', 'safe_quote_campaigns'],
  ['wc_db_sessions', 'safe_quote_sessions'],
  ['wc_db_vendors', 'safe_quote_vendors'],
  ['wc_db_jobs', 'safe_quote_jobs'],
  ['wc_db_data', 'safe_quote_data'],
  ['wc-db-download', 'safe-quote-download'],
  ['wc-db-campaigns', 'safe-quote-campaigns'],
  ['wc-db-sessions', 'safe-quote-sessions'],
  ['wc-db-vendors', 'safe-quote-vendors'],
  ['wc-db-jobs', 'safe-quote-jobs'],
  ['wc-db-data', 'safe-quote-data'],
  ['wc-db-upload', 'safe-quote-upload'],
  ['wc-db-already-downloaded', 'safe-quote-already-downloaded'],
  ['wc-db-campaigns', 'safe-quote-campaigns'],
  ['wc-db-vendors', 'safe-quote-vendors'],
  ['wc-db-sessions', 'safe-quote-sessions'],
  ['wc-db-data', 'safe-quote-data'],
  ['wc-db-download', 'safe-quote-download'],
  ['wcDbDownloadController', 'safeQuoteDownloadController'],
  ['wcDbCampaignController', 'safeQuoteCampaignController'],
  ['wcDbSessionController', 'safeQuoteSessionController'],
  ['wcDbVendorController', 'safeQuoteVendorController'],
  ['wcDbDataController', 'safeQuoteDataController'],
  ['wcDbJobController', 'safeQuoteJobController'],
  ['insertWcDbDataBatches', 'insertSafeQuoteDataBatches'],
  ['wcDbVendorRoutes', 'safeQuoteVendorRoutes'],
  ['wcDbCampaignRoutes', 'safeQuoteCampaignRoutes'],
  ['wcDbSessionRoutes', 'safeQuoteSessionRoutes'],
  ['wcDbJobRoutes', 'safeQuoteJobRoutes'],
  ['wcDbDataRoutes', 'safeQuoteDataRoutes'],
  ['wcDbDownloadRoutes', 'safeQuoteDownloadRoutes'],
  ['WcDbAlreadyDownloaded', 'SafeQuoteAlreadyDownloaded'],
  ['WcDbDownloadLeads', 'SafeQuoteDownloadLeads'],
  ['WcDbAddCampaign', 'SafeQuoteAddCampaign'],
  ['WcDbUploadLeads', 'SafeQuoteUploadLeads'],
  ['WcDbSessionsList', 'SafeQuoteSessionsList'],
  ['WcDbSessionDetails', 'SafeQuoteSessionDetails'],
  ['WcDbLeadsTable', 'SafeQuoteLeadsTable'],
  ['WcDbCampaigns', 'SafeQuoteCampaigns'],
  ['WcDbAddJob', 'SafeQuoteAddJob'],
  ['WcDbVendors', 'SafeQuoteVendors'],
  ['WC DB Download BLA Scrub', 'Safe Quote Download BLA Scrub'],
  ['WC DB Export', 'Safe Quote Export'],
  ['Already Downloaded (WC DB)', 'Safe Quote Data Downloaded'],
  ['Download WC DB Data', 'Download Safe Quote Data'],
  ['All WC DB Data', 'All Safe Quote Data'],
  ['WC DB Sessions', 'Safe Quote Session'],
  ['Upload WC DB Data', 'Safe Quote Upload'],
  ['WC DB Campaigns', 'Safe Quote Campaigns'],
  ['WC DB Vendors', 'Safe Quote Vendor'],
  ['WC DB', 'Safe Quote'],
  ['wc_db', 'safe_quote'],
  ['wcDb', 'safeQuote'],
  ['WcDb', 'SafeQuote'],
  ['from-cyan-500', 'from-amber-500'],
  ['from-cyan-400', 'from-amber-400'],
  ['to-cyan-600', 'to-amber-600'],
  ['to-cyan-500', 'to-amber-500'],
  ['bg-cyan-600', 'bg-amber-600'],
  ['bg-cyan-500', 'bg-amber-500'],
  ['text-cyan-500', 'text-amber-500'],
  ['text-cyan-400', 'text-amber-400'],
  ['border-cyan-500', 'border-amber-500'],
  ['ring-cyan-500', 'ring-amber-500'],
  ['from-[#0a121a]', 'from-[#1a120a]'],
  ['via-[#0d151c]', 'via-[#15100d]'],
  ['to-[#0a121a]', 'to-[#1a120a]'],
  ['to-teal-600', 'to-orange-600'],
  ['bg-teal-600', 'bg-orange-600'],
  ['wc_db_', 'safe_quote_'],
];

function transform(content) {
  let out = content;
  for (const [from, to] of replacements) {
    out = out.split(from).join(to);
  }
  return out;
}

function copyTransform(src, dest) {
  const content = fs.readFileSync(src, 'utf8');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, transform(content));
  console.log('Created:', path.relative(root, dest));
}

const backendControllers = [
  'wcDbVendorController.js',
  'wcDbCampaignController.js',
  'wcDbSessionController.js',
  'wcDbJobController.js',
  'wcDbDataController.js',
  'wcDbDownloadController.js',
];

const backendRoutes = [
  'wc_db_vendors.js',
  'wc_db_campaigns.js',
  'wc_db_sessions.js',
  'wc_db_jobs.js',
  'wc_db_data.js',
  'wc_db_download.js',
];

const frontendPages = [
  'WcDbVendors.jsx',
  'WcDbCampaigns.jsx',
  'WcDbAddCampaign.jsx',
  'WcDbUploadLeads.jsx',
  'WcDbSessionsList.jsx',
  'WcDbSessionDetails.jsx',
  'WcDbAddJob.jsx',
  'WcDbLeadsTable.jsx',
  'WcDbDownloadLeads.jsx',
  'WcDbAlreadyDownloaded.jsx',
];

for (const file of backendControllers) {
  copyTransform(
    path.join(root, 'backend/src/controllers', file),
    path.join(root, 'backend/src/controllers', file.replace('wcDb', 'safeQuote'))
  );
}

for (const file of backendRoutes) {
  copyTransform(
    path.join(root, 'backend/src/routes', file),
    path.join(root, 'backend/src/routes', file.replace('wc_db', 'safe_quote'))
  );
}

for (const file of frontendPages) {
  copyTransform(
    path.join(root, 'frontend/src/pages', file),
    path.join(root, 'frontend/src/pages', file.replace('WcDb', 'SafeQuote'))
  );
}

console.log('Safe Quote module files generated.');
