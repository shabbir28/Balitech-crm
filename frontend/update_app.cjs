const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(appPath, 'utf8');

const imports = `
import RefineVendors from './pages/RefineVendors';
import RefineUploadLeads from './pages/RefineUploadLeads';
import RefineSessionsList from './pages/RefineSessionsList';
import RefineSessionDetails from './pages/RefineSessionDetails';
import RefineLeadsTable from './pages/RefineLeadsTable';
import RefineDownloadLeads from './pages/RefineDownloadLeads';
import RefineAlreadyDownloaded from './pages/RefineAlreadyDownloaded';
import RefineDnc from './pages/RefineDnc';
import RefineCampaigns from './pages/RefineCampaigns';
`;

// Insert imports after last import
content = content.replace(/import AlreadyDownloaded from '\.\/pages\/AlreadyDownloaded';/, "import AlreadyDownloaded from './pages/AlreadyDownloaded';\n" + imports);

const routes = `
            {/* REFINE DATA MODULE */}
            <Route path="/refine-vendors" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']}><RefineVendors /></ProtectedRoute>} />
            <Route path="/refine-upload" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']}><RefineUploadLeads /></ProtectedRoute>} />
            <Route path="/refine-sessions" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineSessionsList /></ProtectedRoute>} />
            <Route path="/refine-sessions/:id" element={<ProtectedRoute roles={['super_admin', 'admin', 'data_entry']}><RefineSessionDetails /></ProtectedRoute>} />
            <Route path="/refine-data" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineLeadsTable /></ProtectedRoute>} />
            <Route path="/refine-download" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineDownloadLeads /></ProtectedRoute>} />
            <Route path="/refine-already-downloaded" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineAlreadyDownloaded /></ProtectedRoute>} />
            <Route path="/refine-dnc" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineDnc /></ProtectedRoute>} />
            <Route path="/refine-campaigns" element={<ProtectedRoute roles={['super_admin', 'admin']}><RefineCampaigns /></ProtectedRoute>} />
`;

// Insert routes before Catch all
content = content.replace(/\{\/\* Catch all \*\/\}/, routes + '\n            {/* Catch all */}');

fs.writeFileSync(appPath, content);
console.log("App.jsx updated.");
