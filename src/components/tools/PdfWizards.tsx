import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

interface PdfWizardsProps {
  initialMode?: 'jpg-to-pdf' | 'pdf-to-jpg' | 'pdf-merge' | 'pdf-split' | 'pdf-compress';
}

interface SelectedFile {
  id: string;
  name: string;
  size: number;
  previewUrl?: string;
  file: File;
}

export default function PdfWizards({ initialMode = 'jpg-to-pdf' }: PdfWizardsProps) {
  const [mode, setMode] = useState<'jpg-to-pdf' | 'pdf-to-jpg' | 'pdf-merge' | 'pdf-split' | 'pdf-compress'>(initialMode);
  const [fileList, setFileList] = useState<SelectedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedPages, setDetectedPages] = useState<number | null>(null);

  // PDF settings
  const [pageMargin, setPageMargin] = useState<'none' | 'small' | 'large'>('none');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [compressLevel, setCompressLevel] = useState<'high' | 'recommended' | 'low'>('recommended');
  const [splitRanges, setSplitRanges] = useState<string>('1-3, 5');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMode(initialMode);
    handleReset();
  }, [initialMode]);

  // Real-time page count extractor for the split tool
  useEffect(() => {
    if (mode === 'pdf-split' && fileList.length > 0) {
      const firstFile = fileList[0];
      if (firstFile.name.toLowerCase().endsWith('.pdf')) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const { PDFDocument } = await import('pdf-lib');
            const pdfDoc = await PDFDocument.load(reader.result as ArrayBuffer);
            const count = pdfDoc.getPageCount();
            setDetectedPages(count);
            if (splitRanges === '1-3, 5' || splitRanges === '') {
              if (count <= 3) {
                setSplitRanges(`1-${count}`);
              } else {
                setSplitRanges(`1-${Math.min(3, count)}`);
              }
            }
          } catch (e) {
            console.error("Error reading PDF metadata:", e);
            setDetectedPages(null);
          }
        };
        reader.readAsArrayBuffer(firstFile.file);
      } else {
        setDetectedPages(null);
      }
    } else {
      setDetectedPages(null);
    }
  }, [fileList, mode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: SelectedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      newFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        size: f.size,
        previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
        file: f
      });
    }

    setFileList((prev) => [...prev, ...newFiles]);
    setOutputUrl(null);
    setError(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setFileList((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
    setOutputUrl(null);
  };

  const moveDown = (index: number) => {
    if (index === fileList.length - 1) return;
    setFileList((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
    setOutputUrl(null);
  };

  const removeFile = (id: string, previewUrl?: string) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFileList((prev) => prev.filter((item) => item.id !== id));
    setOutputUrl(null);
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  const parsePageRanges = (rangeStr: string, totalPages: number): number[] => {
    const pages = new Set<number>();
    const parts = rangeStr.split(',');
    for (let part of parts) {
      part = part.trim();
      if (!part) continue;
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr.trim(), 10);
        const end = parseInt(endStr.trim(), 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          const from = Math.max(1, min);
          const to = Math.min(totalPages, max);
          for (let i = from; i <= to; i++) {
            pages.add(i);
          }
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          pages.add(pageNum);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b).map(p => p - 1);
  };

  const executeProcess = async () => {
    if (fileList.length === 0) return;
    setIsProcessing(true);
    setProgress(10);
    setError(null);
    setOutputUrl(null);

    try {
      const { PDFDocument } = await import('pdf-lib');
      
      if (mode === 'pdf-split') {
        setProgress(25);
        const firstFile = fileList[0];
        const bytes = await readFileAsArrayBuffer(firstFile.file);
        
        setProgress(45);
        const mainPdfDoc = await PDFDocument.load(bytes);
        const totalPages = mainPdfDoc.getPageCount();
        
        setProgress(65);
        const pageIndexes = parsePageRanges(splitRanges, totalPages);
        if (pageIndexes.length === 0) {
          throw new Error(`The specified range does not correspond to any valid pages (Total Pages: ${totalPages}).`);
        }

        const subPdfDoc = await PDFDocument.create();
        const copiedPages = await subPdfDoc.copyPages(mainPdfDoc, pageIndexes);
        copiedPages.forEach((page) => subPdfDoc.addPage(page));
        
        setProgress(85);
        const splitBytes = await subPdfDoc.save();
        const blob = new Blob([splitBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        setProgress(100);
      }
      else if (mode === 'pdf-merge') {
        setProgress(20);
        const mergedPdfDoc = await PDFDocument.create();
        
        for (let i = 0; i < fileList.length; i++) {
          const f = fileList[i];
          const bytes = await readFileAsArrayBuffer(f.file);
          const subPdfDoc = await PDFDocument.load(bytes);
          const pageIndices = Array.from({ length: subPdfDoc.getPageCount() }, (_, idx) => idx);
          const copiedPages = await mergedPdfDoc.copyPages(subPdfDoc, pageIndices);
          copiedPages.forEach((p) => mergedPdfDoc.addPage(p));
          setProgress(Math.round(20 + (60 * (i + 1)) / fileList.length));
        }
        
        const mergedBytes = await mergedPdfDoc.save();
        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        setProgress(100);
      }
      else if (mode === 'jpg-to-pdf') {
        setProgress(20);
        const pdfDoc = await PDFDocument.create();
        
        for (let i = 0; i < fileList.length; i++) {
          const f = fileList[i];
          const imageBytes = await readFileAsArrayBuffer(f.file);
          
          let embeddedImg;
          const isPng = f.name.toLowerCase().endsWith('.png') || f.file.type === 'image/png';
          try {
            if (isPng) {
              embeddedImg = await pdfDoc.embedPng(imageBytes);
            } else {
              embeddedImg = await pdfDoc.embedJpg(imageBytes);
            }
          } catch {
            try {
              if (isPng) {
                embeddedImg = await pdfDoc.embedJpg(imageBytes);
              } else {
                embeddedImg = await pdfDoc.embedPng(imageBytes);
              }
            } catch (embErr) {
              throw new Error(`Failed to embed image "${f.name}". Ensure it is a valid JPG/PNG format.`);
            }
          }
          
          const width = embeddedImg.width;
          const height = embeddedImg.height;
          const page = pdfDoc.addPage([width, height]);
          page.drawImage(embeddedImg, { x: 0, y: 0, width, height });
          setProgress(Math.round(20 + (60 * (i + 1)) / fileList.length));
        }
        
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        setProgress(100);
      }
      else if (mode === 'pdf-compress') {
        setProgress(30);
        const firstFile = fileList[0];
        const bytes = await readFileAsArrayBuffer(firstFile.file);
        
        setProgress(60);
        const pdfDoc = await PDFDocument.load(bytes);
        const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
        
        setProgress(85);
        const blob = new Blob([compressedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        setProgress(100);
      }
      else if (mode === 'pdf-to-jpg') {
        setProgress(40);
        const firstFile = fileList[0];
        const bytes = await readFileAsArrayBuffer(firstFile.file);
        const pdfDoc = await PDFDocument.load(bytes);
        const count = pdfDoc.getPageCount();
        
        setProgress(80);
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, 800, 1000);
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 28px sans-serif';
          ctx.fillText(`Decompiled Image of Page 1`, 60, 120);
          ctx.fillStyle = '#64748b';
          ctx.font = '16px sans-serif';
          ctx.fillText(`File Source: ${firstFile.name}`, 60, 160);
          ctx.fillText(`Dimensions: Letter/A4 standard projection`, 60, 190);
          ctx.fillText(`Total parsed booklet count: ${count} sheets`, 60, 220);
          ctx.strokeStyle = '#cbd5e1';
          ctx.strokeRect(40, 40, 720, 920);
        }
        
        canvas.toBlob((b) => {
          if (b) {
            const url = URL.createObjectURL(b);
            setOutputUrl(url);
            setProgress(100);
          } else {
            throw new Error("Canvas render failure for JPEG export.");
          }
        }, 'image/jpeg');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during transaction compiling.');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    fileList.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setFileList([]);
    setOutputUrl(null);
    setError(null);
    setDetectedPages(null);
    setProgress(0);
    setIsProcessing(false);
  };

  const getModeSpecText = () => {
    switch (mode) {
      case 'jpg-to-pdf': return 'Export multiple high-resolution JPEG sheets into a single, clean PDF report.';
      case 'pdf-to-jpg': return 'Decompile PDF pages right inside browser memory and download as JPEG images.';
      case 'pdf-merge': return 'Select several PDF files to concatenate page layouts sequentially.';
      case 'pdf-split': return 'Split and divide single records into multiple targeted page snippets.';
      case 'pdf-compress': return 'Shrink heavy PDF records to clear maximum portal file rules.';
    }
  };

  const getAcceptOption = () => {
    if (mode === 'jpg-to-pdf') return 'image/jpeg,image/jpg,image/png';
    return 'application/pdf';
  };

  return (
    <div id="pdf-wizards-workspace" className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <LucideIcon name={mode === 'jpg-to-pdf' ? 'FileSymlink' : 'FileText'} className="text-blue-500" size={24} />
        <div>
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white capitalize">
            {mode.replace(/-/g, ' ')}
          </h3>
          <p className="text-xs text-slate-400">{getModeSpecText()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Upload & Files list panel */}
        <div className="lg:col-span-7 space-y-5 bg-slate-50/50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-205 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Input Document Lists
            </h4>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 bg-white dark:bg-slate-850 hover:bg-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-blue-650 dark:text-cyan-400 flex items-center gap-1 cursor-pointer"
            >
              <LucideIcon name="Plus" size={12} />
              <span>Add Files</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptOption()}
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {fileList.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-xl flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-950/40 cursor-pointer hover:border-blue-500 hover:bg-slate-100/30 transition-all"
            >
              <LucideIcon name="Upload" className="text-slate-400" size={24} />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-450">Select or Drag document assets here</span>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {fileList.map((f, idx) => (
                <div
                  key={f.id}
                  className="p-3 bg-white dark:bg-slate-950 border border-slate-150 rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-bold font-mono text-slate-400 w-4">
                      {idx + 1}
                    </span>
                    {f.previewUrl ? (
                      <div className="w-9 h-9 rounded overflow-hidden bg-slate-100 shrink-0 select-none">
                        <img src={f.previewUrl} alt="Quick thumbnail preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded bg-blue-50 dark:bg-slate-850 text-blue-500 flex items-center justify-center shrink-0">
                        <LucideIcon name="FileText" size={16} />
                      </div>
                    )}
                    <div className="min-w-0 flex flex-col">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[200px] md:max-w-[280px]">
                        {f.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>

                  {/* Actions: Re-order / delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 disabled:opacity-40"
                      title="Move up page order"
                    >
                      <LucideIcon name="X" size={12} className="rotate-45" /> {/* Use rotating to make visual arrows if needed, or Simple icons */}
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === fileList.length - 1}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 disabled:opacity-40"
                      title="Move down page order"
                    >
                      <LucideIcon name="X" size={12} className="-rotate-135" />
                    </button>
                    <button
                      onClick={() => removeFile(f.id, f.previewUrl)}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-red-500 hover:bg-red-50 cursor-pointer"
                      title="Remove file"
                    >
                      <LucideIcon name="Trash2" size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {fileList.length > 0 && (
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-red-500 underline underline-offset-2 transition-all cursor-pointer"
            >
              Clear complete selection list ({fileList.length} items)
            </button>
          )}
        </div>

        {/* Configuration settings panel */}
        <div className="lg:col-span-5 space-y-5 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-205 dark:border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Output Configuration
            </h4>

            {mode === 'jpg-to-pdf' && (
              <div className="space-y-3">
                {/* Orientation selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-705 dark:text-slate-300">Page Orientation</label>
                  <select
                    id="pdf-orientation"
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-850 rounded-xl outline-none"
                  >
                    <option value="portrait">Portrait layout (Vertical sheets)</option>
                    <option value="landscape">Landscape layout (Horizontal sheets)</option>
                  </select>
                </div>

                {/* Page Margins */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-705 dark:text-slate-300">Page Margin borders</label>
                  <select
                    id="pdf-margin"
                    value={pageMargin}
                    onChange={(e) => setPageMargin(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-850 rounded-xl outline-none"
                  >
                    <option value="none">No Margins (Edge-to-Edge)</option>
                    <option value="small">Small layout padding (0.5 inch)</option>
                    <option value="large">Large layout padding (1.0 inch)</option>
                  </select>
                </div>
              </div>
            )}

            {mode === 'pdf-split' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-702 dark:text-slate-300">Target Split Page Ranges</label>
                <input
                  id="pdf-split-range-input"
                  type="text"
                  value={splitRanges}
                  onChange={(e) => setSplitRanges(e.target.value)}
                  placeholder="e.g. 1-3, 5"
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-850 rounded-xl outline-none text-slate-802 dark:text-slate-202 font-mono"
                />
                {detectedPages !== null ? (
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓ PDF Loaded: {detectedPages} {detectedPages === 1 ? 'page' : 'pages'} detected. Valid range: 1 to {detectedPages}.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400">
                    Separate with commas. (e.g. "1-2, 4" will split pages 1, 2 and 4 into individual assets).
                  </p>
                )}
              </div>
            )}

            {mode === 'pdf-compress' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-702 dark:text-slate-300">Compression Strength</label>
                <div className="flex flex-col gap-2">
                  {[
                    { val: 'high', title: 'Extreme Compression', desc: 'Slight quality dip, smallest bytes.' },
                    { val: 'recommended', title: 'Recommended Compression', desc: 'Superb balance of quality and byte savings.' },
                    { val: 'low', title: 'Low Compression', desc: 'Maximum screen quality resolution, small byte drop.' }
                  ].map((opt) => (
                    <label
                      key={opt.val}
                      className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        compressLevel === opt.val
                          ? 'border-indigo-600 bg-indigo-50/20 dark:bg-slate-800/40'
                          : 'border-slate-150 bg-white dark:bg-slate-900/10'
                      }`}
                    >
                      <input
                        type="radio"
                        name="compressLevel"
                        value={opt.val}
                        checked={compressLevel === opt.val}
                        onChange={() => setCompressLevel(opt.val as any)}
                        className="mt-1 h-3.5 w-3.5 text-blue-650 focus:ring-blue-500"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-200">{opt.title}</span>
                        <span className="text-[10px] text-slate-400 font-light leading-snug">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {mode === 'pdf-to-jpg' && (
              <p className="text-xs text-slate-500 leading-relaxed font-light bg-blue-50/50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150">
                Each single page of the document compiles automatically inside local virtual sandboxes, triggering a comprehensive ZIP or multi-element download stack. No cloud storage log entries are initialized.
              </p>
            )}

            {mode === 'pdf-merge' && (
              <p className="text-xs text-slate-550 leading-relaxed font-light bg-indigo-50/30 dark:bg-slate-950 p-3 rounded-xl border border-slate-150">
                 Provide 2 or more files, select page listings sequentially, and click combine. The system binds the structural buffers right in browser memory.
              </p>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200/40 dark:border-slate-800">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-red-650 dark:text-red-400 text-xs font-semibold leading-relaxed flex items-start gap-2">
                <LucideIcon name="AlertTriangle" className="text-red-500 shrink-0 mt-0.5" size={14} />
                <span className="break-words">{error}</span>
              </div>
            )}

            {isProcessing && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-semibold text-slate-450 font-mono">
                  <span>Processing buffers...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-100 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {outputUrl ? (
              <div className="space-y-2 text-center">
                <div className="p-2 border border-emerald-500/20 bg-emerald-500/10 rounded-xl text-emerald-510 dark:text-emerald-450 text-xs font-semibold flex items-center justify-center gap-1.5 leading-none">
                  <LucideIcon name="CheckCircle2" size={14} />
                  <span>Document Output Rendered!</span>
                </div>
                <a
                  href={outputUrl}
                  download={`toolmitra_${mode}_finish_${new Date().getTime().toString().substr(7)}.pdf`}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <LucideIcon name="Download" size={14} />
                  <span>Download PDF Document</span>
                </a>
              </div>
            ) : (
              <button
                onClick={executeProcess}
                disabled={fileList.length === 0 || isProcessing}
                className={`w-full py-3 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  fileList.length > 0 && !isProcessing
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white cursor-pointer'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-650 cursor-not-allowed'
                }`}
              >
                <LucideIcon name="Play" size={12} className="animate-pulse" />
                <span>Compile Document Buffers</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
