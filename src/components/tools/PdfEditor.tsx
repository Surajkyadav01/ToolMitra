import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

// Dynamic script loader for pdf.js, ensuring browser-only high-performance imports
const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      // Configure worker from CDNJS to optimize background rendering
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF engine. Please verify connection.'));
    document.head.appendChild(script);
  });
};

interface PdfTextItem {
  id: string; // p[pageIdx]-t[itemIdx]
  str: string;
  originalStr: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
}

interface CustomTextItem {
  id: string; // custom-[timestamp]
  str: string;
  left: number;
  top: number;
  fontSize: number;
  fontFamily: string;
  color: string;
}

interface TextOverride {
  value: string;
  color: string;
}

const PDF_SCALE = 1.25;

const getFontFamily = (fontName: string): string => {
  const norm = (fontName || '').toLowerCase();
  if (norm.includes('times') || norm.includes('serif') || norm.includes('roman') || norm.includes('georgia')) {
    return 'Georgia, "Times New Roman", serif';
  }
  if (norm.includes('courier') || norm.includes('mono') || norm.includes('console') || norm.includes('code')) {
    return '"Courier New", Courier, monospace';
  }
  if (norm.includes('helvetica') || norm.includes('arial') || norm.includes('sans')) {
    return 'Arial, Helvetica, sans-serif';
  }
  if (norm.includes('calibri')) {
    return 'Calibri, Candara, sans-serif';
  }
  return 'Arial, Helvetica, sans-serif';
};

export default function PdfEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  // Text overrides state (page text items mapped to edits)
  const [textOverrides, setTextOverrides] = useState<{ [itemId: string]: TextOverride }>({});
  
  // Custom added text state
  const [customTexts, setCustomTexts] = useState<{ [pageIndex: number]: CustomTextItem[] }>({});

  // Sampled page background colors (to cover the old text seamlessly)
  const [bgColors, setBgColors] = useState<{ [itemId: string]: string }>({});

  // Config defaults
  const [activeFontColor, setActiveFontColor] = useState<string>('#000000'); // black ink
  const [activeFontSizeBase, setActiveFontSizeBase] = useState<number>(14);
  const [isAddTextMode, setIsAddTextMode] = useState<boolean>(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Global maps of rendered pages text lines coordinates
  const [pageTextMap, setPageTextMap] = useState<{ [pageIdx: number]: PdfTextItem[] }>({});
  
  // Canvas references for compiling exports
  const baseCanvasesRef = useRef<{ [pageIdx: number]: HTMLCanvasElement | null }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Clean workspace state
  const handleResetWorkspace = () => {
    setFile(null);
    setPdfDoc(null);
    setNumPages(0);
    setCurrentPage(1);
    setError(null);
    setTextOverrides({});
    setCustomTexts({});
    setBgColors({});
    setPageTextMap({});
    baseCanvasesRef.current = {};
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      loadPDFFile(selectedFile);
    }
  };

  const loadPDFFile = async (f: File) => {
    setFile(f);
    setError(null);
    setIsProcessing(true);
    setLoadingProgress(10);
    try {
      const pdfjs = await loadPdfJs();
      setLoadingProgress(30);
      const fileReader = new FileReader();

      fileReader.onload = async () => {
        try {
          const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
          const doc = await pdfjs.getDocument({ data: typedArray }).promise;
          
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setLoadingProgress(60);

          // Build absolute text elements layout coordinate map across all sheets
          const textMap: { [pageIdx: number]: PdfTextItem[] } = {};
          
          for (let i = 0; i < doc.numPages; i++) {
            const pageNum = i + 1;
            const page = await doc.getPage(pageNum);
            
            // Standard HD vector viewport scale
            const viewport = page.getViewport({ scale: PDF_SCALE });
            const textContent = await page.getTextContent();
            
            const parsedItems: PdfTextItem[] = textContent.items
              .map((item: any, idx: number) => {
                // Coordinates map (baseline reference)
                const [viewX, viewY] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
                const fontHeight = Math.abs(item.transform[3] || item.height || 11);
                const fontSize = fontHeight * PDF_SCALE; // Scale offset matching HD layout
                const width = item.width * PDF_SCALE;
                const height = (item.height || fontHeight) * PDF_SCALE;

                return {
                  id: `p${i}-t${idx}`,
                  str: item.str,
                  originalStr: item.str,
                  left: viewX,
                  top: viewY - height,
                  width: Math.max(width, 14),
                  height: Math.max(height, fontSize, 10),
                  fontSize: fontSize,
                  fontFamily: getFontFamily(item.fontName),
                };
              })
              // Filter out completely whitespace elements to speed load times
              .filter((item) => item.str.trim().length > 0);

            textMap[i] = parsedItems;
          }

          setPageTextMap(textMap);
          setLoadingProgress(100);
          setIsProcessing(false);
        } catch (err: any) {
          console.error(err);
          setError('Failed to load PDF. Check that file is not secured or corrupt.');
          setIsProcessing(false);
        }
      };

      fileReader.readAsArrayBuffer(f);
    } catch (err: any) {
      console.error(err);
      setError('Could not initialize client-side rendering subsystem.');
      setIsProcessing(false);
    }
  };

  // Scroll watcher to update active currentPage banner indicator
  const handleScrollWatcher = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const containerCenter = container.getBoundingClientRect().top + container.offsetHeight / 2;
    
    let visiblePage = 1;
    let minDiff = Infinity;

    for (let i = 0; i < numPages; i++) {
      const pageEl = baseCanvasesRef.current[i];
      if (pageEl) {
        const topDiff = Math.abs(pageEl.getBoundingClientRect().top - containerCenter);
        if (topDiff < minDiff) {
          minDiff = topDiff;
          visiblePage = i + 1;
        }
      }
    }
    setCurrentPage(visiblePage);
  };

  const scrollToPageSheet = (pageNum: number) => {
    setCurrentPage(pageNum);
    const canvas = baseCanvasesRef.current[pageNum - 1];
    if (canvas) {
      canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Compile high quality current page as standard clean JPG
  const handleDownloadSingleJpg = (pageIdx: number) => {
    const baseCanvas = baseCanvasesRef.current[pageIdx];
    if (!baseCanvas) return;

    setIsProcessing(true);
    try {
      const mergedCanvas = document.createElement('canvas');
      mergedCanvas.width = baseCanvas.width;
      mergedCanvas.height = baseCanvas.height;

      const ctx = mergedCanvas.getContext('2d');
      if (ctx) {
        // Render 1.5x viewport image
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);
        ctx.drawImage(baseCanvas, 0, 0);

        // Merge text overrides masks & edit text values
        const textItems = pageTextMap[pageIdx] || [];
        textItems.forEach((item) => {
          const edit = textOverrides[item.id];
          if (edit !== undefined) {
            const bg = bgColors[item.id] || '#ffffff';
            ctx.fillStyle = bg;
            // Draw precise overlap background margin to conceal original letters
            ctx.fillRect(item.left - 4, item.top - 2, item.width + 16, item.height + 4);

            ctx.fillStyle = edit.color;
            ctx.font = `${item.fontSize}px ${item.fontFamily}`;
            ctx.textBaseline = 'top';
            ctx.fillText(edit.value, item.left, item.top);
          }
        });

        // Add custom text boxes on top
        const customItems = customTexts[pageIdx] || [];
        customItems.forEach((cust) => {
          ctx.fillStyle = cust.color;
          ctx.font = `bold ${cust.fontSize}px ${cust.fontFamily}`;
          ctx.textBaseline = 'top';
          ctx.fillText(cust.str, cust.left, cust.top);
        });

        const dataUrl = mergedCanvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${file?.name.replace(/\.[^/.]+$/, "") || 'page'}_edited_sheet_${pageIdx + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred exporting photo file.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Compile full document with native pdf-lib layers alignment
  const handleDownloadMergedPDF = async () => {
    if (!pdfDoc || numPages === 0) return;
    setIsProcessing(true);
    setLoadingProgress(10);
    setError(null);

    try {
      const { PDFDocument } = await import('pdf-lib');
      const compiledPdfDoc = await PDFDocument.create();

      for (let i = 0; i < numPages; i++) {
        setLoadingProgress(Math.round(10 + (80 * (i + 1)) / numPages));

        const baseCanvas = baseCanvasesRef.current[i];
        if (!baseCanvas) continue;

        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = baseCanvas.width;
        mergedCanvas.height = baseCanvas.height;

        const ctx = mergedCanvas.getContext('2d');
        if (!ctx) continue;

        // Base document
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);
        ctx.drawImage(baseCanvas, 0, 0);

        // Text override layers
        const textItems = pageTextMap[i] || [];
        textItems.forEach((item) => {
          const edit = textOverrides[item.id];
          if (edit !== undefined) {
            const bg = bgColors[item.id] || '#ffffff';
            ctx.fillStyle = bg;
            // Draw precise overlap background margin to conceal original letters
            ctx.fillRect(item.left - 4, item.top - 2, item.width + 16, item.height + 4);

            ctx.fillStyle = edit.color;
            ctx.font = `${item.fontSize}px ${item.fontFamily}`;
            ctx.textBaseline = 'top';
            ctx.fillText(edit.value, item.left, item.top);
          }
        });

        // Custom placed labels
        const customItems = customTexts[i] || [];
        customItems.forEach((cust) => {
          ctx.fillStyle = cust.color;
          ctx.font = `bold ${cust.fontSize}px ${cust.fontFamily}`;
          ctx.textBaseline = 'top';
          ctx.fillText(cust.str, cust.left, cust.top);
        });

        // Convert page scale image payload
        const imgDataUrl = mergedCanvas.toDataURL('image/jpeg', 0.92);
        const imgBytes = await fetch(imgDataUrl).then((res) => res.arrayBuffer());

        const embeddedJpg = await compiledPdfDoc.embedJpg(imgBytes);
        const page = compiledPdfDoc.addPage([embeddedJpg.width, embeddedJpg.height]);
        page.drawImage(embeddedJpg, {
          x: 0,
          y: 0,
          width: embeddedJpg.width,
          height: embeddedJpg.height,
        });
      }

      setLoadingProgress(95);
      const pdfBytes = await compiledPdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(pdfBlob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      const cleanName = file?.name.replace(/\.[^/.]+$/, "") || 'document';
      link.download = `${cleanName}_edited_toolmitra.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setLoadingProgress(100);
      setTimeout(() => {
        setLoadingProgress(0);
        setIsProcessing(false);
      }, 800);
    } catch (err: any) {
      console.error(err);
      setError('Failed building compiled PDF layers. Document could be corrupted.');
      setIsProcessing(false);
    }
  };

  return (
    <div id="pdf-editor-root" className="space-y-6">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-slate-800 rounded-2xl text-blue-600 dark:text-blue-400">
            <LucideIcon name="Edit3" size={26} />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Instant PDF Text Editor
            </h3>
            <p className="text-xs text-slate-500">
              Click on any text or word to edit it instantly. Perfect for filling forms or modifying document details.
            </p>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetWorkspace}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-red-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-850 rounded-xl border border-slate-200/60 dark:border-slate-800 cursor-pointer transition-all"
            >
              <LucideIcon name="RefreshCw" size={13} />
              <span>Change Document</span>
            </button>
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full select-none dark:bg-slate-900 dark:text-cyan-400">
              {numPages} {numPages === 1 ? 'Page' : 'Pages'} Loaded
            </span>
          </div>
        )}
      </div>

      {!file ? (
        /* File Uploader Landing Page */
        <div
          id="pdf-upload-sandbox"
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center gap-5 hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 cursor-pointer transition-all group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-slate-900 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
            <LucideIcon name="FileText" size={32} />
          </div>
          <div className="text-center space-y-1.5 max-w-md">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-base">
              Upload PDF document to begin editing
            </p>
            <p className="text-xs text-slate-400">
              Drag and drop your file here, or click to browse. Files are processed entirely inside your local sandbox.
            </p>
          </div>
        </div>
      ) : (
        /* Workspace Setup Grid */
        <div id="pdf-editor-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
           {/* Left Panel: Sizing & Controls */}
          <div className="lg:col-span-4 space-y-5 bg-slate-50/70 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-150 dark:border-slate-800/80">
            
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pb-2 border-b border-slate-200/40 dark:border-slate-800/60">
              Text Style Tooling
            </span>

            {/* Quick preset paint selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ink Pen color</label>
              <div className="flex gap-1.5">
                {[
                  { hex: '#000000', name: 'Original Black' },
                  { hex: '#4b5563', name: 'Original Grey' },
                  { hex: '#1d4ed8', name: 'Biometric Blue' },
                  { hex: '#dc2626', name: 'Correction Red' },
                ].map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => {
                      setActiveFontColor(color.hex);
                      if (focusedItemId) {
                        if (focusedItemId.startsWith('custom-')) {
                          setCustomTexts((prev) => {
                            const updated = { ...prev };
                            for (const pageIdx in updated) {
                              updated[pageIdx] = updated[pageIdx].map((c) =>
                                c.id === focusedItemId ? { ...c, color: color.hex } : c
                              );
                            }
                            return updated;
                          });
                        } else {
                          setTextOverrides((prev) => {
                            const existing = prev[focusedItemId];
                            const originalItem = (Object.values(pageTextMap) as PdfTextItem[][])
                              .flat()
                              .find((item) => item.id === focusedItemId);
                            return {
                              ...prev,
                              [focusedItemId]: {
                                value: existing ? existing.value : (originalItem?.str || ''),
                                color: color.hex,
                              },
                            };
                          });
                        }
                      }
                    }}
                    className={`flex-1 py-1 px-0.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      activeFontColor === color.hex
                        ? 'border-blue-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-2 ring-blue-500/10'
                        : 'border-slate-200 hover:bg-white text-slate-500 hover:text-slate-800 dark:border-slate-350 dark:hover:bg-slate-850'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-200/50" style={{ backgroundColor: color.hex }} />
                    <span>{color.name.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Edit Font Sizing Controller */}
            <div className="space-y-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/60">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Selected Text Sizing
              </label>
              <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-150 dark:border-slate-800/80">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  {focusedItemId ? 'Adjust word size:' : 'Click word to resize'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!focusedItemId}
                    onClick={() => {
                      if (focusedItemId) {
                        if (focusedItemId.startsWith('custom-')) {
                          setCustomTexts((prev) => {
                            const updated = { ...prev };
                            for (const pageIdx in updated) {
                              updated[pageIdx] = updated[pageIdx].map((c) =>
                                c.id === focusedItemId ? { ...c, fontSize: Math.max(8, c.fontSize - 1) } : c
                              );
                            }
                            return updated;
                          });
                        } else {
                          setPageTextMap((prev) => {
                            const updated = { ...prev };
                            for (const idx in updated) {
                              updated[idx] = updated[idx].map((item) => {
                                if (item.id === focusedItemId) {
                                  return { ...item, fontSize: Math.max(8, item.fontSize - 1) };
                                }
                                return item;
                              });
                            }
                            return updated;
                          });
                        }
                      }
                    }}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer text-xs font-bold text-slate-650 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Shrink selected text size"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    disabled={!focusedItemId}
                    onClick={() => {
                      if (focusedItemId) {
                        if (focusedItemId.startsWith('custom-')) {
                          setCustomTexts((prev) => {
                            const updated = { ...prev };
                            for (const pageIdx in updated) {
                              updated[pageIdx] = updated[pageIdx].map((c) =>
                                c.id === focusedItemId ? { ...c, fontSize: Math.min(60, c.fontSize + 1) } : c
                              );
                            }
                            return updated;
                          });
                        } else {
                          setPageTextMap((prev) => {
                            const updated = { ...prev };
                            for (const idx in updated) {
                              updated[idx] = updated[idx].map((item) => {
                                if (item.id === focusedItemId) {
                                  return { ...item, fontSize: Math.min(60, item.fontSize + 1) };
                                }
                                return item;
                              });
                            }
                            return updated;
                          });
                        }
                      }
                    }}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer text-xs font-bold text-slate-650 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Grow selected text size"
                  >
                    A+
                  </button>
                </div>
              </div>
            </div>

            {/* Placer toggle button */}
            <div className="space-y-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/60">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Insert Options</label>
              <button
                type="button"
                onClick={() => setIsAddTextMode(!isAddTextMode)}
                className={`w-full inline-flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all cursor-pointer border ${
                  isAddTextMode
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 dark:text-slate-200'
                }`}
              >
                <LucideIcon name="Type" size={14} />
                <span>{isAddTextMode ? 'Click on sheet to add text...' : '📝 Click to place new text'}</span>
              </button>
              {isAddTextMode && (
                <div className="flex gap-2 items-center justify-between p-2.5 bg-blue-50/50 dark:bg-slate-900/80 rounded-xl text-[11px] text-blue-600 font-semibold border border-blue-100/60 dark:border-slate-800">
                  <span>Custom Font size:</span>
                  <div className="flex gap-1 items-center">
                    <button
                      type="button"
                      onClick={() => setActiveFontSizeBase((s) => Math.max(10, s - 1))}
                      className="w-5 h-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center rounded-md font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs w-6 text-center">{activeFontSizeBase}px</span>
                    <button
                      type="button"
                      onClick={() => setActiveFontSizeBase((s) => Math.min(36, s + 1))}
                      className="w-5 h-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center rounded-md font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Document metadata info panel */}
            <div className="p-3 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl space-y-1 select-none">
              <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">File Details</span>
              <div className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">{file.name}</div>
              <div className="text-[9.5px] text-slate-450 font-mono">
                {(file.size / 1024).toFixed(1)} KB • {numPages} Sheets
              </div>
            </div>

            {/* Quick sheets jump numbers block */}
            <div className="space-y-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document Sheets Jump</span>
              <div className="grid grid-cols-5 gap-1.5 max-h-[110px] overflow-y-auto p-0.5">
                {Array.from({ length: numPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToPageSheet(i + 1)}
                    className={`p-1.5 text-center rounded-lg font-semibold font-mono text-xs cursor-pointer transition-all ${
                      currentPage === i + 1
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                        : 'bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 border border-slate-200/40 dark:border-slate-800/60'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Export options nested cleanly on Left for single-scroll tracking */}
            <div className="space-y-3 pt-3.5 border-t border-slate-200/40 dark:border-slate-800/60">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                Export Outputs
              </span>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-450 text-xs font-semibold flex items-start gap-2 animate-fadeIn leading-tight">
                  <LucideIcon name="AlertTriangle" className="text-red-500 shrink-0 mt-0.5" size={14} />
                  <span>{error}</span>
                </div>
              )}

              {isProcessing && (
                <div className="space-y-2 py-1 animate-fadeIn">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 font-mono">
                    <span>Reconstructing document...</span>
                    <span>{loadingProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-150"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {/* Option A: Combine full doc PDF */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Option A: Main document PDF</span>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleDownloadMergedPDF}
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all scale-100 hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <LucideIcon name="FileDown" size={14} />
                    <span>Download Edited PDF</span>
                  </button>
                </div>

                {/* Option B: Save current page JPG */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/20 dark:border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Option B: Image JPG layout</span>
                  <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-850 space-y-2 shadow-sm select-none">
                    <div className="flex gap-2 items-center">
                      <select
                        id="export-page-jpg-select"
                        value={currentPage}
                        onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
                        className="flex-1 text-xs px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-lg outline-none text-slate-700 dark:text-slate-200"
                      >
                        {Array.from({ length: numPages }).map((_, i) => (
                          <option key={i} value={i + 1}>Page {i + 1}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleDownloadSingleJpg(currentPage - 1)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md transition-all hover:scale-103 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save JPG
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Safety badge */}
              <div className="pt-2.5 border-t border-slate-200/40 dark:border-slate-800/60 flex gap-2 items-start text-[9.5px] leading-relaxed text-slate-400 select-none">
                <LucideIcon name="ShieldCheck" className="text-emerald-500 shrink-0 mt-0.5" size={13} />
                <p>
                  100% Client-Side. No text data is uploaded to cloud servers. Entirely compliant and secure.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Live Layout Stack Sheet (expanded to fill col-span-8) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* Viewport page index banner */}
            <div className="flex items-center justify-between px-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium select-none">
                <LucideIcon name="Compass" size={13} className="text-slate-400" />
                <span>Showing sheet <span className="font-bold text-slate-800 dark:text-white">{currentPage}</span> of {numPages}</span>
              </div>
              <span className="text-[10px] font-bold text-green-700 bg-green-50 dark:bg-slate-900 dark:text-cyan-400 px-2.5 py-0.5 rounded-full select-none border border-green-100/20">
                Pristine Vector Rendering
              </span>
            </div>

            {/* Instructions help message */}
            <div className="p-3 bg-blue-50/50 dark:bg-slate-900/60 border border-blue-100/50 dark:border-slate-800/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-750 dark:text-slate-350 select-none">
              <LucideIcon name="Info" className="text-blue-500 shrink-0 mt-0.5" size={14} />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">✨ Live Click-to-Edit Mode Active</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                  Hover your cursor over any word or text line. A light border will appear. Simply **click and type** to modify it. Edits blend on export perfectly. Use the font scaling tools on the left to perfectly match heights!
                </p>
              </div>
            </div>

            {/* Main sheets scrolling workspace wrapper */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScrollWatcher}
              className="bg-slate-100/90 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-850 p-4 space-y-12 max-h-[700px] overflow-auto relative shadow-inner select-none"
            >
              {Array.from({ length: numPages }).map((_, pageIdx) => {
                const textItems = pageTextMap[pageIdx] || [];
                const pageNum = pageIdx + 1;
                
                return (
                  <EditablePdfPage
                    key={pageIdx}
                    pageIdx={pageIdx}
                    pageNum={pageNum}
                    pdfDoc={pdfDoc}
                    textItems={textItems}
                    textOverrides={textOverrides}
                    customTextItems={customTexts[pageIdx] || []}
                    onTextOverrideChange={(itemId, val) => {
                      setTextOverrides((prev) => ({
                        ...prev,
                        [itemId]: { value: val, color: activeFontColor },
                      }));
                    }}
                    onTextOverrideReset={(itemId) => {
                      setTextOverrides((prev) => {
                        const next = { ...prev };
                        delete next[itemId];
                        return next;
                      });
                    }}
                    onAddCustomText={(x, y) => {
                      const id = `custom-${Date.now()}`;
                      const item: CustomTextItem = {
                        id,
                        str: 'Double click to edit',
                        left: x,
                        top: y - 5,
                        fontSize: activeFontSizeBase,
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        color: activeFontColor,
                      };
                      setCustomTexts((prev) => ({
                        ...prev,
                        [pageIdx]: [...(prev[pageIdx] || []), item],
                      }));
                      setIsAddTextMode(false); // standard reset mode
                    }}
                    onCustomTextChange={(itemId, val) => {
                      setCustomTexts((prev) => {
                        const items = prev[pageIdx] || [];
                        return {
                          ...prev,
                          [pageIdx]: items.map((c) => (c.id === itemId ? { ...c, str: val } : c)),
                        };
                      });
                    }}
                    onCustomTextDelete={(itemId) => {
                      setCustomTexts((prev) => {
                        const items = prev[pageIdx] || [];
                        return {
                          ...prev,
                          [pageIdx]: items.filter((c) => c.id !== itemId),
                        };
                      });
                    }}
                    bgColors={bgColors}
                    onBgColorSampled={(itemId, color) => {
                      setBgColors((prev) => {
                        if (prev[itemId] === color) return prev;
                        return { ...prev, [itemId]: color };
                      });
                    }}
                    baseCanvasesRef={baseCanvasesRef}
                    isAddTextMode={isAddTextMode}
                    activeFontColor={activeFontColor}
                    focusedItemId={focusedItemId}
                    setFocusedItemId={setFocusedItemId}
                  />
                );
              })}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

/* Page Render Sub-Component */
interface EditablePdfPageProps {
  pageIdx: number;
  pageNum: number;
  pdfDoc: any;
  textItems: PdfTextItem[];
  textOverrides: { [itemId: string]: TextOverride };
  customTextItems: CustomTextItem[];
  onTextOverrideChange: (itemId: string, newValue: string) => void;
  onTextOverrideReset: (itemId: string) => void;
  onAddCustomText: (x: number, y: number) => void;
  onCustomTextChange: (itemId: string, newValue: string) => void;
  onCustomTextDelete: (itemId: string) => void;
  bgColors: { [itemId: string]: string };
  onBgColorSampled: (itemId: string, color: string) => void;
  baseCanvasesRef: React.MutableRefObject<{ [pageIdx: number]: HTMLCanvasElement | null }>;
  isAddTextMode: boolean;
  activeFontColor: string;
  focusedItemId: string | null;
  setFocusedItemId: (id: string | null) => void;
}

const EditablePdfPage: React.FC<EditablePdfPageProps> = ({
  pageIdx,
  pageNum,
  pdfDoc,
  textItems,
  textOverrides,
  customTextItems,
  onTextOverrideChange,
  onTextOverrideReset,
  onAddCustomText,
  onCustomTextChange,
  onCustomTextDelete,
  bgColors,
  onBgColorSampled,
  baseCanvasesRef,
  isAddTextMode,
  activeFontColor,
  focusedItemId,
  setFocusedItemId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isRendered, setIsRendered] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    let active = true;

    const renderPage = async () => {
      if (!pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: PDF_SCALE });
        
        if (!active) return;
        
        setDimensions({ width: viewport.width, height: viewport.height });
        
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            if (active) {
              setIsRendered(true);
              baseCanvasesRef.current[pageIdx] = canvas;
            }
          }
        }
      } catch (e) {
        console.error('Error rendering individual sheet:', e);
      }
    };

    renderPage();

    return () => {
      active = false;
    };
  }, [pdfDoc, pageNum]);

  // Sample colors from background when document completes fully rendering
  useEffect(() => {
    if (isRendered && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        textItems.forEach((item) => {
          try {
            // sample background slightly left-top offset
            const sx = Math.max(0, Math.floor(item.left - 4));
            const sy = Math.max(0, Math.floor(item.top - 4));
            const pixel = ctx.getImageData(sx, sy, 1, 1).data;
            if (pixel[3] > 10) {
              const sampledColor = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
              onBgColorSampled(item.id, sampledColor);
            } else {
              onBgColorSampled(item.id, '#ffffff'); // fallback translucent white
            }
          } catch (e) {
            onBgColorSampled(item.id, '#ffffff'); // cross-origin/err fallback
          }
        });
      }
    }
  }, [isRendered, textItems]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddTextMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onAddCustomText(x, y);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={`relative mx-auto bg-white border border-slate-200 dark:border-slate-850 shadow-lg rounded-xl overflow-hidden transition-all text-left ${
        isAddTextMode ? 'cursor-cell ring-2 ring-blue-500/40 hover:bg-blue-50/10' : ''
      }`}
      style={{
        width: dimensions.width ? `${dimensions.width}px` : '100%',
        height: dimensions.height ? `${dimensions.height}px` : 'auto',
      }}
    >
      
      {/* Background page static image render */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full pointer-events-none select-none"
      />

      {/* Foreground Interactive input overlay */}
      {isRendered && dimensions.width > 0 && (
        <div className="absolute inset-0 z-20 pointer-events-auto">
          
          {/* Loop text lines overlay layer */}
          {textItems.map((item) => {
            const edit = textOverrides[item.id];
            const hasEdit = edit !== undefined;
            const isFocused = focusedItemId === item.id;
            const currentVal = hasEdit ? edit.value : item.str;
            const bg = bgColors[item.id] || '#ffffff';

            if (!hasEdit && !isFocused) {
              // Pristine unedited word: completely transparent seamless trigger box
              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocusedItemId(item.id);
                  }}
                  className="absolute cursor-text border border-transparent hover:bg-blue-500/5 hover:border-blue-400/30 hover:rounded-sm transition-all z-10"
                  style={{
                    left: `${item.left}px`,
                    top: `${item.top}px`,
                    width: `${item.width}px`,
                    height: `${item.height}px`,
                  }}
                  title="Click to edit word"
                />
              );
            }

            // Word is being actively edited or is focused
            return (
              <div
                key={item.id}
                className={`absolute transition-all rounded group ${
                  isFocused
                    ? 'ring-1.5 ring-blue-500 z-30 shadow bg-white'
                    : 'z-20 border border-transparent'
                }`}
                style={{
                  left: `${item.left - 2}px`,
                  top: `${item.top}px`,
                  width: `${item.width + 12}px`,
                  height: `${item.height}px`,
                  backgroundColor: bg, // Cover the underlying original vector canvas text
                }}
              >
                <input
                  type="text"
                  value={currentVal}
                  autoFocus={isFocused}
                  onFocus={() => setFocusedItemId(item.id)}
                  onBlur={() => setFocusedItemId(null)}
                  onChange={(e) => onTextOverrideChange(item.id, e.target.value)}
                  className="w-full h-full bg-transparent border-none outline-none leading-none select-text cursor-text p-0 m-0 text-left"
                  style={{
                    fontSize: `${item.fontSize}px`,
                    fontFamily: item.fontFamily,
                    color: hasEdit ? edit.color : activeFontColor,
                  }}
                  title={hasEdit ? `Edited. Original: "${item.originalStr}"` : 'Edit word'}
                />

                {/* Floating click restore icon button */}
                {hasEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTextOverrideReset(item.id);
                      setFocusedItemId(null);
                    }}
                    className="absolute -top-3.5 -right-3.5 hidden group-hover:flex items-center justify-center w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 cursor-pointer shadow transition-transform scale-90 hover:scale-110 z-30 font-bold"
                    title="Undo word edit"
                  >
                    <LucideIcon name="X" size={10} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Custom text items labels overlays */}
          {customTextItems.map((cust) => (
            <div
              key={cust.id}
              className="absolute group"
              style={{
                left: `${cust.left}px`,
                top: `${cust.top}px`,
                width: 'fit-content',
                minWidth: '100px',
              }}
            >
              <input
                type="text"
                value={cust.str}
                onChange={(e) => onCustomTextChange(cust.id, e.target.value)}
                className="bg-transparent border-none outline-none focus:bg-white dark:focus:bg-slate-900 border-b border-dashed border-blue-500/20 text-xs text-left focus:ring-1 focus:ring-blue-500 px-1 py-0.5 rounded font-bold"
                style={{
                  fontSize: `${cust.fontSize}px`,
                  fontFamily: cust.fontFamily,
                  color: cust.color,
                  width: `${Math.max(120, cust.str.length * 8)}px`,
                }}
              />
              <button
                onClick={() => onCustomTextDelete(cust.id)}
                className="absolute -top-3.5 -right-3.5 hidden group-hover:flex items-center justify-center w-5.5 h-5.5 bg-slate-500 hover:bg-slate-750 text-white rounded-full p-1 cursor-pointer shadow-md transition-transform scale-90 hover:scale-110 z-30"
                title="Remove label"
              >
                <LucideIcon name="X" size={10} />
              </button>
            </div>
          ))}

        </div>
      )}

      {/* Inline page index badge indicator */}
      <span className="absolute bottom-2.5 right-2.5 bg-slate-900/60 backdrop-blur-md text-white font-mono font-bold text-[9px] px-2 py-1 rounded select-none z-30">
        PAGE {pageNum}
      </span>

    </div>
  );
};
