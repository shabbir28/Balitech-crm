const fs = require('fs');
const files = [
  'd:/Bpo crm/frontend/src/pages/RefineDownloadLeads.jsx',
  'd:/Bpo crm/frontend/src/pages/PremiumDownloadLeads.jsx',
  'd:/Bpo crm/frontend/src/pages/VanDownloadLeads.jsx'
];

for (const f of files) {
  let content = fs.readFileSync(f, 'utf-8');

  // Add MultipleSelectInput
  if (!content.includes('MultipleSelectInput')) {
    content = content.replace(
      'const SelectInput = ({ value, onChange, disabled, required, children }) => (',
      const MultipleSelectInput = ({ value, onChange, disabled, required, children }) => (
    <div className=" relative group\>
 <select
 multiple
 value={value}
 onChange={onChange}
 disabled={disabled}
 required={required}
 className=\w-full bg-[#0a0c14]/50 backdrop-blur-md border border-white/10 text-white rounded-xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/60 transition-all cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-brand-500/30 shadow-inner group-hover:bg-[#0a0c14]/80 min-h-[120px]\
 >
 {children}
 </select>
 </div>
);

const SelectInput = ({ value, onChange, disabled, required, children }) => (
 );
 }

 // Change state
 content = content.replace(/const \[selectedFileId, setSelectedFileId\] = useState\(''\);/g, 'const [selectedFileIds, setSelectedFileIds] = useState([]);');
 content = content.replace(/setSelectedFileId\(''\)/g, 'setSelectedFileIds([])');
 content = content.replace(/selectedFileId \|\| undefined/g, 'selectedFileIds.length > 0 ? selectedFileIds : undefined');
 
 // Fix arrays in dependency arrays
 content = content.replace(/, selectedFileId,/g, ', selectedFileIds,');
 
 // Update file stats fetch logic
 content = content.replace(
 /if \(selectedFileId\) \{\s*const fetchStats = \(\) => \{\s*setFileStats\(null\);\s*api\.get\(\\/download\/job\/\$\{selectedFileId\}\/stats\\)/,
 if (selectedFileIds.length === 1) {
 const fetchStats = () => {
 setFileStats(null);
 api.get(\/download/job/\/stats\)
 );
 content = content.replace(/\[selectedFileId\]\);/g, '[selectedFileIds]);');

 // Replace JSX Dropdown
 const selectJsxOld = /<SelectInput[^>]*value=\{selectedFileId\}[\s\S]*?<\/SelectInput>/;
 const selectJsxNew = <MultipleSelectInput
 value={selectedFileIds}
 onChange={e => {
 const opts = Array.from(e.target.selectedOptions).map(o => o.value).filter(Boolean);
 setSelectedFileIds(opts);
 }}
 disabled={loadingFiles || vendorFiles.length === 0}
 >
 <option value=\\ disabled className=\text-slate-500 italic\>
 {loadingFiles 
 ? 'Fetching files...' 
 : vendorFiles.length === 0 
 ? 'No uploaded files found' 
 : 'Hold Ctrl/Cmd to select multiple files'}
 </option>
 {vendorFiles.map(file => (
 <option key={file.id} value={file.id} className=\p-2 mb-1 rounded-md cursor-pointer hover:bg-brand-500/20\>
 {file.file_name} ({new Date(file.created_at).toLocaleDateString()} — {file.total_rows?.toLocaleString() || 0} rows)
 </option>
 ))}
 </MultipleSelectInput>;
 
 if (content.match(/<SelectInput[^>]*value=\{selectedFileId\}/)) {
 content = content.replace(selectJsxOld, selectJsxNew);
 } else {
 // If we missed something
 content = content.replace(/value=\{selectedFileId\}/g, 'value={selectedFileIds}');
 }

 // Update text
 content = content.replace(/!selectedFileId &&/g, 'selectedFileIds.length === 0 &&');
 content = content.replace(/Select one of the/g, 'Select one or more of the');
 content = content.replace(/download leads from that file specifically/g, 'download leads from those files specifically');

 fs.writeFileSync(f, content);
 console.log('Patched', f);
}
