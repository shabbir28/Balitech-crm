const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'controllers');
const utilsDir = path.join(__dirname, 'src', 'utils');

// 1. Create duplicate controllers
const controllersToDuplicate = [
  { src: 'sessionController.js', dest: 'refineSessionController.js' },
  { src: 'jobController.js', dest: 'refineJobController.js' },
  { src: 'leadController.js', dest: 'refineLeadController.js' },
  { src: 'downloadController.js', dest: 'refineDownloadController.js' },
  { src: 'dncController.js', dest: 'refineDncController.js' },
];

for (const { src, dest } of controllersToDuplicate) {
  let content = fs.readFileSync(path.join(srcDir, src), 'utf8');
  
  // Replace table names
  content = content.replace(/\bupload_sessions\b/g, 'refine_sessions');
  content = content.replace(/\bupload_jobs\b/g, 'refine_jobs');
  content = content.replace(/\bleads\b/g, 'refine_data');
  content = content.replace(/\bdnc_numbers\b/g, 'refine_dnc_numbers');
  content = content.replace(/\bdownload_requests\b/g, 'refine_download_requests');
  content = content.replace(/\bdownload_logs\b/g, 'refine_download_logs');
  
  // Update imports for helpers (if we duplicate helpers too)
  content = content.replace(/leadBulkInsert/g, 'refineLeadBulkInsert');
  content = content.replace(/dbHelpers/g, 'refineDbHelpers');

  fs.writeFileSync(path.join(srcDir, dest), content);
}

// 2. Create duplicate utils
const utilsToDuplicate = [
  { src: 'dbHelpers.js', dest: 'refineDbHelpers.js' },
  { src: 'leadBulkInsert.js', dest: 'refineLeadBulkInsert.js' },
];

for (const { src, dest } of utilsToDuplicate) {
  let content = fs.readFileSync(path.join(utilsDir, src), 'utf8');
  
  content = content.replace(/\bupload_sessions\b/g, 'refine_sessions');
  content = content.replace(/\bupload_jobs\b/g, 'refine_jobs');
  content = content.replace(/\bleads\b/g, 'refine_data');
  content = content.replace(/\bdnc_numbers\b/g, 'refine_dnc_numbers');
  
  fs.writeFileSync(path.join(utilsDir, dest), content);
}

console.log("Duplication complete.");
