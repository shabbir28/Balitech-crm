const fs = require('fs');
let code = fs.readFileSync('src/pages/SingleLookups.jsx', 'utf8');

code = code.replace(/DncUploadedFiles/g, 'SingleLookups');
code = code.replace(/fetchUploadedFiles/g, 'fetchSingleLookups');
code = code.replace(/DNC Checker Uploaded Files/g, 'DNC Single Lookups');
code = code.replace(/All DNC check results from checkdncnumber\.com/g, 'All single DNC lookups from checkdncnumber.com');
code = code.replace(/Search by file name or original name\.\.\./g, 'Search by phone number...');

// Fix table headers
code = code.replace(/<th className="px-4 py-3 text-left">FILE NAME<\/th>/g, '<th className="px-4 py-3 text-left">PHONE NUMBER</th>');
code = code.replace(/<th className="px-4 py-3 text-left">CAMPAIGN<\/th>/g, '');
code = code.replace(/<th className="px-4 py-3 text-left">TOTAL ROWS<\/th>/g, '<th className="px-4 py-3 text-left">SOURCE</th>');
code = code.replace(/<th className="px-4 py-3 text-left">DNC MATCHED<\/th>/g, '');
code = code.replace(/<th className="px-4 py-3 text-left">CLEAN<\/th>/g, '');
code = code.replace(/<th className="px-4 py-3 text-left">INVALID<\/th>/g, '');
code = code.replace(/<th className="px-4 py-3 text-left">DUPLICATES<\/th>/g, '');

// Fix table rows
const rowContent = `
<td className="px-4 py-3 font-semibold text-white">{row.phone_number}</td>
<td className="px-4 py-3 text-white"><StatusBadge status={row.dnc_status} /></td>
<td className="px-4 py-3 text-slate-400">{row.source}</td>
`;

code = code.replace(/<td className="px-4 py-3 font-medium text-white max-w-\[180px\] truncate" title=\{row\.original_file_name \|\| row\.file_name\}>[\s\S]*?(?=<td className="px-4 py-3">)/g, rowContent);

// the previous regex didn't wipe out the remaining td's for matched, clean, invalid, duplicates
// Let's just do a manual replace for the whole <tr> body later.

fs.writeFileSync('src/pages/SingleLookups.jsx', code);
console.log('Done');
