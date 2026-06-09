const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, 'src', 'components', 'Layout.jsx');
let content = fs.readFileSync(layoutPath, 'utf8');

const refineSection = `
                            <div>
                                <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-2 mt-4 text-brand-400">Refine Data</p>
                                <NavLink to="/refine-vendors" className={getClassName}>
                                    <Building2 className="h-[15px] w-[15px] shrink-0" /><span>Refine Vendors</span>
                                </NavLink>
                                <NavLink to="/refine-campaigns" className={getClassName}>
                                    <Target className="h-[15px] w-[15px] shrink-0" /><span>Refine Campaigns</span>
                                </NavLink>
                                <NavLink to="/refine-upload" className={getClassName}>
                                    <FolderUp className="h-[15px] w-[15px] shrink-0" /><span>Upload Refine Data</span>
                                </NavLink>
                                <NavLink to="/refine-sessions" className={getClassName}>
                                    <Layers className="h-[15px] w-[15px] shrink-0" /><span>Refine Sessions</span>
                                </NavLink>
                                <NavLink to="/refine-data" className={getClassName}>
                                    <FileStack className="h-[15px] w-[15px] shrink-0" /><span>All Refine Data</span>
                                </NavLink>
                                <NavLink to="/refine-dnc" className={getClassName}>
                                    <ShieldBan className="h-[15px] w-[15px] shrink-0" /><span>Refine DNC</span>
                                </NavLink>
                                <NavLink to="/refine-download" className={getClassName}>
                                    <FolderDown className="h-[15px] w-[15px] shrink-0" /><span>Download Refined</span>
                                </NavLink>
                                <NavLink to="/refine-already-downloaded" className={getClassName}>
                                    <History className="h-[15px] w-[15px] shrink-0" /><span>Already Downloaded</span>
                                </NavLink>
                            </div>
`;

// Insert after the existing <nav> block for full access
content = content.replace(/(<NavLink to="\/logs" className=\{getClassName\}>\s*<TerminalSquare className="h-\[15px\] w-\[15px\] shrink-0" \/><span>Logs<\/span>\s*<\/NavLink>\s*<\/div>)/, "$1\n" + refineSection);

fs.writeFileSync(layoutPath, content);
console.log("Layout.jsx updated.");
