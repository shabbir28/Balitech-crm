const fs = require('fs');

const raw = fs.readFileSync('./src/pages/DownloadLeads.jsx', 'utf8');

// Replace standard variables and endpoints with WcDb counterparts
let wc = raw
  .replace(/DownloadLeads/g, 'WcDbDownloadLeads')
  .replace(/api\.get\('\/vendors\?counts=true'\)/g, "api.get('/wc-db-vendors?counts=true')")
  .replace(/api\.get\('\/campaigns'\)/g, "api.get('/wc-db-campaigns')")
  .replace(/\/download\//g, '/wc-db-download/')
  .replace(/api\.post\('\/download'/g, "api.post('/wc-db-download'")
  .replace(/api\.get\(\`\/vendors\/\$\{form\.vendor_id\}\/files\`\)/g, "api.get(`/wc-db-vendors/${form.vendor_id}/files`)")
  // UI texts
  .replace(/'Export Data'/g, "'WC DB Export'")
  .replace(/'Directly export targeted leads as CSV using advanced demographic filters\.'/g, "'Export WC DB leads with BLA compliance scrubbing.'")
  .replace(/bg-brand-500/g, "bg-cyan-600")
  .replace(/bg-brand-400/g, "bg-cyan-500")
  .replace(/text-brand-500/g, "text-cyan-500")
  .replace(/text-brand-400/g, "text-cyan-400")
  .replace(/border-brand-500/g, "border-cyan-500/50")
  .replace(/from-brand-500/g, "from-cyan-600")
  .replace(/to-brand-500/g, "to-cyan-600")
  .replace(/ring-brand-500/g, "ring-cyan-500")
  .replace(/from-[#120a2e]/g, "from-[#0a121a]")
  .replace(/via-[#0d0a1c]/g, "via-[#0d151c]")
  .replace(/to-[#0a0714]/g, "to-[#0a121a]")
  .replace(/from-brand-400/g, "from-cyan-400")
  .replace(/to-violet-600/g, "to-teal-600")
  .replace(/bg-violet-600/g, "bg-teal-600")
;

fs.writeFileSync('./src/pages/WcDbDownloadLeads.jsx', wc);
console.log('Successfully transformed DownloadLeads.jsx to WcDbDownloadLeads.jsx');
