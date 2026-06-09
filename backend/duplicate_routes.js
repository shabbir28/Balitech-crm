const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'routes');

const routesToDuplicate = [
  { src: 'sessions.js', dest: 'refine_sessions.js' },
  { src: 'jobs.js', dest: 'refine_jobs.js' },
  { src: 'leads.js', dest: 'refine_data.js' },
  { src: 'download.js', dest: 'refine_download.js' },
  { src: 'dnc.js', dest: 'refine_dnc.js' },
];

for (const { src, dest } of routesToDuplicate) {
  let content = fs.readFileSync(path.join(srcDir, src), 'utf8');
  
  content = content.replace(/sessionController/g, 'refineSessionController');
  content = content.replace(/jobController/g, 'refineJobController');
  content = content.replace(/leadController/g, 'refineLeadController');
  content = content.replace(/downloadController/g, 'refineDownloadController');
  content = content.replace(/dncController/g, 'refineDncController');
  
  fs.writeFileSync(path.join(srcDir, dest), content);
}

console.log("Routes duplication complete.");
