const fs = require('fs');
const path = require('path');

const bDir = path.join(__dirname, 'src');

// 1. Duplicate vendorController.js -> refineVendorController.js
let vController = fs.readFileSync(path.join(bDir, 'controllers', 'vendorController.js'), 'utf8');
vController = vController.replace(/vendors/g, 'refine_vendors');
fs.writeFileSync(path.join(bDir, 'controllers', 'refineVendorController.js'), vController);

// 2. Duplicate campaignController.js -> refineCampaignController.js
let cController = fs.readFileSync(path.join(bDir, 'controllers', 'campaignController.js'), 'utf8');
cController = cController.replace(/campaigns/g, 'refine_campaigns');
fs.writeFileSync(path.join(bDir, 'controllers', 'refineCampaignController.js'), cController);

// 3. Duplicate routes/vendors.js -> routes/refine_vendors.js
let vRoute = fs.readFileSync(path.join(bDir, 'routes', 'vendors.js'), 'utf8');
vRoute = vRoute.replace(/vendorController/g, 'refineVendorController');
fs.writeFileSync(path.join(bDir, 'routes', 'refine_vendors.js'), vRoute);

// 4. Duplicate routes/campaigns.js -> routes/refine_campaigns.js
let cRoute = fs.readFileSync(path.join(bDir, 'routes', 'campaigns.js'), 'utf8');
cRoute = cRoute.replace(/campaignController/g, 'refineCampaignController');
fs.writeFileSync(path.join(bDir, 'routes', 'refine_campaigns.js'), cRoute);

console.log("Backend duplicates created.");
