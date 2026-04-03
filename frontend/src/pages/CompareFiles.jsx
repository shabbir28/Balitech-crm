import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
    Scale, UploadCloud, FileSpreadsheet, CheckCircle2,
    XCircle, RefreshCw, GitCompareArrows, ChevronDown,
    ArrowLeftRight, Loader2, Info, Layers, Zap,
    FileDown, Download, AlertCircle
} from 'lucide-react';

// ─── Normalize a cell to digit string ────────────────────────────────────────
const cellToDigits = (cell) => {
    if (cell == null) return '';
    if (typeof cell === 'number') {
        // toFixed(0) prevents scientific notation (e.g. 1.23e+10)
        return Math.round(cell).toString();
    }
    // For strings: strip everything except digits
    return String(cell).trim().replace(/\D/g, '');
};

// ─── Parse file → unique digit-strings ───────────────────────────────────────
const parseFile = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                // raw: true → JS numbers, avoids scientific notation
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
                if (!rows.length) return resolve([]);

                // Auto-detect and skip header row (contains letters)
                let startIdx = 0;
                const firstRowFlat = rows[0].map(c => String(c ?? '')).join(' ');
                if (/[a-zA-Z]{2,}/.test(firstRowFlat)) startIdx = 1;

                const numbers = [];
                for (let i = startIdx; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || !row.length) continue;
                    // Take only the FIRST valid number per row (avoids multi-column double-count)
                    for (let c = 0; c < row.length; c++) {
                        const digits = cellToDigits(row[c]);
                        // Min 6 digits — NO upper limit (some numbers can be longer)
                        if (digits.length >= 6) {
                            numbers.push(digits);
                            break;
                        }
                    }
                }
                resolve(numbers);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsArrayBuffer(file);
    });

// ─── CSV export ─────────────────────────────────────────────────────────────
const exportCSV = (arr, filename) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['Number'], ...arr.map(v => [v])]);
    XLSX.utils.book_append_sheet(wb, ws, 'Numbers');
    XLSX.writeFile(wb, filename);
};

const fmt = n => (n ?? 0).toLocaleString('en-US');

// ─── DropZone ─────────────────────────────────────────────────────────────────
const DropZone = ({ label, badge, side, file, onFile, onClear }) => {
    const ref = useRef();
    const [drag, setDrag] = useState(false);
    const color  = side === 'left' ? '#3b82f6' : '#7c3aed';
    const color2 = side === 'left' ? '#60a5fa' : '#a78bfa';

    const onDrop = useCallback(e => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files?.[0]; if (f) onFile(f);
    }, [onFile]);

    return (
        <div
            className="flex flex-col h-full rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${drag ? color : color + '30'}`, background: '#1a1a28', transition: 'border-color .2s' }}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
        >
            {/* Strip header */}
            <div className="flex items-center justify-between px-4 py-3 border-b"
                style={{ background: `linear-gradient(90deg,${color}18,transparent)`, borderColor: color + '25' }}>
                <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                        style={{ background: `linear-gradient(135deg,${color},${color2})` }}>
                        {badge}
                    </div>
                    <span className="text-[13px] font-bold text-white">{label}</span>
                </div>
                {file && <button onClick={onClear} className="p-1 rounded-md text-slate-500 hover:text-red-400 transition-colors"><XCircle className="h-4 w-4" /></button>}
            </div>

            {/* Drop area */}
            <div
                className="flex-1 flex flex-col items-center justify-center gap-3 p-6 cursor-pointer"
                style={{ background: drag ? `${color}10` : 'transparent', minHeight: '180px' }}
                onClick={() => !file && ref.current?.click()}
            >
                <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
                {file ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center"
                            style={{ background: `${color}20`, border: `1.5px solid ${color}50` }}>
                            <FileSpreadsheet className="h-6 w-6" style={{ color }} />
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-white leading-snug">{file.name}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                            style={{ background: `${color}18`, color }}>
                            <CheckCircle2 className="h-3 w-3" /> Ready
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center"
                            style={{ border: `1.5px dashed ${color}40`, background: `${color}08` }}>
                            <UploadCloud className="h-6 w-6" style={{ color: color + '80' }} />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-white">Drop file here</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">or <span style={{ color }} className="font-bold">click to browse</span></p>
                        </div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest">.xlsx · .xls · .csv</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Big Stat Card ────────────────────────────────────────────────────────────
const BigCard = ({ label, value, sub, color, glow }) => (
    <div className="relative rounded-2xl overflow-hidden flex flex-col justify-between p-5 gap-2"
        style={{ background: '#0d0d1a', border: `1px solid ${color}28` }}>
        {glow && (
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${color}18 0%, transparent 70%)` }} />
        )}
        {/* Colored top bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: color }} />
        <p className="text-[10px] font-black uppercase tracking-[0.18em] mt-1" style={{ color }}>{label}</p>
        <p className="text-[38px] font-black text-white leading-none">{fmt(value)}</p>
        {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
);

// ─── Accordion detail panel ───────────────────────────────────────────────────
const DetailPanel = ({ title, count, data, color, filename, defaultOpen }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${color}20`, background: '#0d0d1a' }}>
            {/* Header */}
            <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer select-none transition-colors hover:bg-white/[0.02]"
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpen(p => !p)}
                onClick={() => setOpen(p => !p)}
                role="button" tabIndex={0}
            >
                <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    <span className="text-[14px] font-bold text-white">{title}</span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: `${color}18`, color }}>{fmt(count)}</span>
                </div>
                <div className="flex items-center gap-2">
                    {count > 0 && (
                        <button
                            onClick={e => { e.stopPropagation(); exportCSV(data, filename); }}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:scale-105 active:scale-95"
                            style={{ borderColor: `${color}40`, color, background: `${color}14` }}
                        >
                            <FileDown className="h-3.5 w-3.5" /> Download
                        </button>
                    )}
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-300"
                            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    </div>
                </div>
            </div>

            {/* Body */}
            {open && (
                <div className="border-t px-5 py-4" style={{ borderColor: `${color}15` }}>
                    {count === 0 ? (
                        <div className="flex items-center gap-2 py-2">
                            <AlertCircle className="h-4 w-4 text-slate-600" />
                            <p className="text-[13px] text-slate-600 italic">No records in this category.</p>
                        </div>
                    ) : (
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                                {data.slice(0, 300).map((v, i) => (
                                    <div key={i}
                                        className="px-2.5 py-1.5 rounded-lg text-center text-[11px] font-mono font-medium text-slate-300 border truncate"
                                        style={{ borderColor: `${color}18`, background: `${color}07` }}>
                                        {v}
                                    </div>
                                ))}
                                {data.length > 300 && (
                                    <div className="col-span-2 px-3 py-2 rounded-lg text-center text-[11px] text-slate-500 border border-white/5">
                                        + {fmt(data.length - 300)} more → Download to see all
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CompareFiles = () => {
    const [file1, setFile1] = useState(null);
    const [file2, setFile2] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState(null);

    const handleCompare = async () => {
        if (!file1 || !file2) return;
        setLoading(true); setError(null); setResult(null);
        try {
            const [nums1, nums2] = await Promise.all([parseFile(file1), parseFile(file2)]);

            // Reference: all unique numbers in File 1
            const set1 = new Set(nums1);
            // All unique numbers in File 2
            const set2 = new Set(nums2);

            // Split File 2 numbers against File 1
            const duplicates = [...set2].filter(n => set1.has(n));   // in File 1
            const uniqueNums  = [...set2].filter(n => !set1.has(n)); // NOT in File 1

            setResult({
                file1Rows: nums1.length,
                file2Rows: nums2.length,
                file1Unique: set1.size,
                file2Unique: set2.size,
                duplicatesCount: duplicates.length,
                uniqueCount: uniqueNums.length,
                duplicates,
                uniqueNums,
            });
        } catch {
            setError('Failed to parse one or both files. Ensure they are valid Excel or CSV files.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => { setFile1(null); setFile2(null); setResult(null); setError(null); };
    const canCompare = file1 && file2 && !loading;

    return (
        <div className="space-y-7">

            {/* ── Header ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(124,58,237,0.2))', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <GitCompareArrows className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-[22px] font-black text-white tracking-tight">Compare File</h1>
                        <p className="text-[13px] text-slate-500 mt-0.5">
                            Detect duplicates &amp; unique numbers between two files
                        </p>
                    </div>
                </div>
                {result && (
                    <button onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-300 border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-all">
                        <RefreshCw className="h-3.5 w-3.5" /> New Comparison
                    </button>
                )}
            </div>

            {/* ── Info ────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <Info className="h-4 w-4 text-blue-400 shrink-0" />
                <p className="text-[12px] text-slate-400">
                    <span className="text-blue-400 font-semibold">File 1</span> is the reference.{' '}
                    <span className="text-violet-400 font-semibold">File 2</span> numbers are split into{' '}
                    <span className="text-red-400 font-semibold">Duplicates</span> (already in File 1) and{' '}
                    <span className="text-green-400 font-semibold">Unique</span> (new, not in File 1). No DB involved.
                </p>
            </div>

            {/* ── Upload ──────────────────────────────────────────── */}
            {!result && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_56px_1fr] gap-3 items-stretch">
                    <DropZone label="File 1 — Reference" badge="1" side="left"
                        file={file1} onFile={setFile1} onClear={() => setFile1(null)} />
                    <div className="flex flex-col items-center justify-center gap-2 py-4 lg:py-0">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center"
                            style={{ background: '#1e1e2d', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <ArrowLeftRight className="h-4 w-4 text-slate-500" />
                        </div>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">VS</span>
                    </div>
                    <DropZone label="File 2 — Compare" badge="2" side="right"
                        file={file2} onFile={setFile2} onClear={() => setFile2(null)} />
                </div>
            )}

            {/* ── Error ───────────────────────────────────────────── */}
            {error && (
                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl"
                    style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    <p className="text-[13px] text-red-300">{error}</p>
                </div>
            )}

            {/* ── Compare Button ──────────────────────────────────── */}
            {!result && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={handleCompare}
                        disabled={!canCompare}
                        className="relative flex items-center gap-3 px-12 py-4 rounded-2xl text-[14px] font-black text-white transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] overflow-hidden"
                        style={{
                            background: canCompare ? 'linear-gradient(135deg,#3b82f6,#7c3aed)' : '#1e1e2d',
                            boxShadow: canCompare ? '0 0 40px rgba(59,130,246,0.3), 0 0 80px rgba(124,58,237,0.15)' : 'none',
                        }}
                    >
                        {canCompare && (
                            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                        )}
                        {loading
                            ? <><Loader2 className="h-5 w-5 animate-spin" /> Analysing files...</>
                            : <><Scale className="h-5 w-5" /> Run Comparison</>
                        }
                    </button>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                ──────── RESULTS DASHBOARD ────────────────
                ══════════════════════════════════════════ */}
            {result && (
                <div className="space-y-5 animate-fade-in">

                    {/* Section heading + file names */}
                    <div className="flex items-end justify-between flex-wrap gap-3">
                        <div>
                            <h2 className="text-[20px] font-black text-white">Comparison Results</h2>
                            <p className="text-[12px] text-slate-500 mt-0.5">
                                <span className="text-blue-400 font-semibold">{file1?.name}</span>
                                <span className="mx-1.5 text-slate-600">vs</span>
                                <span className="text-violet-400 font-semibold">{file2?.name}</span>
                            </p>
                        </div>
                        {result.uniqueCount > 0 && (
                            <button
                                onClick={() => exportCSV(result.uniqueNums, 'unique_numbers.csv')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold border transition-all hover:scale-105 active:scale-95"
                                style={{ borderColor: '#22c55e40', color: '#22c55e', background: '#22c55e0e' }}
                            >
                                <Download className="h-3.5 w-3.5" /> Export All Unique
                            </button>
                        )}
                    </div>

                    {/* ── 4 stat cards ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <BigCard
                            label="Total in File 1"
                            value={result.file1Rows}
                            sub={result.file1Rows !== result.file1Unique ? `${fmt(result.file1Unique)} unique` : 'All unique'}
                            color="#6b7280"
                        />
                        <BigCard
                            label="Total in File 2"
                            value={result.file2Rows}
                            sub={result.file2Rows !== result.file2Unique ? `${fmt(result.file2Unique)} unique` : 'All unique'}
                            color="#a855f7"
                        />
                        <BigCard
                            label="Duplicates"
                            value={result.duplicatesCount}
                            sub="File 2 numbers found in File 1"
                            color="#ef4444"
                            glow
                        />
                        <BigCard
                            label="Unique"
                            value={result.uniqueCount}
                            sub="File 2 numbers NOT in File 1"
                            color="#22c55e"
                            glow
                        />
                    </div>

                    {/* ── Visual breakdown ── */}
                    <div className="px-6 py-5 rounded-2xl space-y-4"
                        style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">File 2 Breakdown</p>
                            <p className="text-[11px] text-slate-600">{fmt(result.file2Unique)} unique numbers analysed</p>
                        </div>
                        {[
                            { label: 'Duplicates (in File 1)', value: result.duplicatesCount, total: result.file2Unique, color: '#ef4444' },
                            { label: 'Unique (not in File 1)', value: result.uniqueCount,    total: result.file2Unique, color: '#22c55e' },
                        ].map(({ label, value, total, color }) => {
                            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                            return (
                                <div key={label} className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[12px] font-medium text-slate-400">{label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-slate-500">{fmt(value)}</span>
                                            <span className="text-[12px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
                                        </div>
                                    </div>
                                    <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                        <div
                                            className="h-full rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Detail sections ── */}
                    <div className="space-y-3">
                        <DetailPanel
                            title="Duplicate Numbers"
                            count={result.duplicatesCount}
                            data={result.duplicates}
                            color="#ef4444"
                            filename="duplicate_numbers.csv"
                            defaultOpen={false}
                        />
                        <DetailPanel
                            title="Unique Numbers"
                            count={result.uniqueCount}
                            data={result.uniqueNums}
                            color="#22c55e"
                            filename="unique_numbers.csv"
                            defaultOpen={result.uniqueCount > 0}
                        />
                    </div>

                </div>
            )}
        </div>
    );
};

export default CompareFiles;
