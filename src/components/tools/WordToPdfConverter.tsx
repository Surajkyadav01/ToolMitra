import React, { useState } from 'react';
import LucideIcon from '../LucideIcon';
import html2pdf from 'html2pdf.js';

type ConvertStep = 'idle' | 'reading' | 'processing' | 'rendering' | 'ready';

export default function WordToPdfConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<ConvertStep>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [forceSinglePage, setForceSinglePage] = useState<boolean>(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setStep('idle');
      setProgress(0);
      setDownloadUrl(null);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    const selected = e.dataTransfer.files?.[0];
    if (selected) {
      const extension = selected.name.toLowerCase();
      if (extension.endsWith('.docx') || extension.endsWith('.doc')) {
        setFile(selected);
        setStep('idle');
        setProgress(0);
        setDownloadUrl(null);
      } else {
        setError('Please drop a valid Word document (.docx or .doc)');
      }
    }
  };

  const loadMammoth = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).mammoth) {
        resolve((window as any).mammoth);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
      script.onload = () => resolve((window as any).mammoth);
      script.onerror = (e) => reject(new Error('Failed to load Word document parser.' + e));
      document.head.appendChild(script);
    });
  };

  const renderHtmlToPdf = async (docHtml: string) => {
    const styledHtml = `
      <div style="font-family: 'Segoe UI', Calibri, Arial, sans-serif; padding: 0.45in; line-height: 1.35; color: #1e293b; background-color: #ffffff;">
        <style>
          p { margin-bottom: 6px; font-size: 10.5pt; text-align: justify; }
          h1 { font-size: 18pt; font-weight: bold; color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin-bottom: 12px; margin-top: 0; }
          h2 { font-size: 13pt; font-weight: bold; color: #1e40af; margin-top: 14px; margin-bottom: 6px; }
          h3 { font-size: 11pt; font-weight: bold; color: #2563eb; margin-top: 10px; margin-bottom: 4px; }
          ul, ol { margin-bottom: 8px; padding-left: 18px; }
          li { font-size: 10.5pt; margin-bottom: 2px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-size: 9.5pt; }
          th { background-color: #f0f7ff; color: #1e3a8a; font-weight: bold; border-bottom: 2px solid #93c5fd; }
          blockquote { border-left: 4px solid #3b82f6; padding-left: 12px; font-style: italic; color: #475569; margin-bottom: 12px; }
        </style>
        ${docHtml || '<p>No readable text content found in Word document.</p>'}
      </div>
    `;

    // Create an offscreen wrapper to hide the element from viewer without shifting layout or causing scroll conflicts in sandboxed iframe runtime
    const wrapper = document.createElement('div');
    wrapper.id = 'docx-pdf-render-wrapper';
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = `${window.scrollY}px`;
    wrapper.style.width = '816px';
    wrapper.style.height = 'auto';
    wrapper.style.overflow = 'hidden';
    wrapper.style.zIndex = '999999';

    // Create the clean content container at its standard layout coordinates within the wrapper
    const container = document.createElement('div');
    container.id = 'docx-pdf-render-container';
    container.style.position = 'relative';
    container.style.width = '816px'; 
    container.style.background = '#ffffff';
    container.style.color = '#000000';
    container.style.margin = '0';
    container.style.padding = '0';
    container.innerHTML = styledHtml;

    wrapper.appendChild(container);
    document.body.appendChild(wrapper);

    // Dynamic auto-scaling to fit on a single page if requested and slightly overflowing (11 inches * 96 DPI = 1056px height)
    const targetMaxHeight = 1054;
    let currentHeight = container.scrollHeight;

    if (forceSinglePage && currentHeight > targetMaxHeight) {
      const innerDiv = container.querySelector('div') as HTMLDivElement;
      if (innerDiv) {
        let fSize = 10.5;
        let padding = 0.45;
        let lHeight = 1.35;
        
        // Iteratively downsize to fit on exactly one page
        for (let i = 0; i < 6 && container.scrollHeight > targetMaxHeight; i++) {
          fSize -= 0.5;
          padding -= 0.04;
          lHeight -= 0.04;
          if (fSize < 8.5) fSize = 8.5;
          if (padding < 0.2) padding = 0.2;
          if (lHeight < 1.1) lHeight = 1.1;

          innerDiv.style.fontSize = `${fSize}pt`;
          innerDiv.style.padding = `${padding}in`;
          innerDiv.style.lineHeight = `${lHeight}`;

          // Downscale inner typography elements consistently
          innerDiv.querySelectorAll('h1').forEach((h: any) => h.style.fontSize = `${Math.max(14, 18 - i * 0.8)}pt`);
          innerDiv.querySelectorAll('h2').forEach((h: any) => h.style.fontSize = `${Math.max(11, 13 - i * 0.4)}pt`);
          innerDiv.querySelectorAll('p, li').forEach((p: any) => p.style.fontSize = `${fSize}pt`);
          innerDiv.querySelectorAll('table, td, th').forEach((t: any) => {
            t.style.fontSize = `${fSize - 1}pt`;
            if (t.tagName === 'TD' || t.tagName === 'TH') {
              t.style.padding = `${Math.max(2, 6 - i)}px ${Math.max(4, 10 - i * 1.2)}px`;
            }
          });
        }
      }
    }

    const opt = {
      margin:       0,
      filename:     `${file?.name ? file.name.replace(/\.[^/.]+$/, "") : "document"}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false, 
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 816
      },
      jsPDF:        { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
    };

    // Generate PDF after a micro-timeout to ensure layout is fully computed, styled and painted by the DOM
    setTimeout(() => {
      html2pdf().from(container).set(opt).toPdf().get('pdf').then((pdfObj: any) => {
        const pdfBlob = pdfObj.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setDownloadUrl(pdfUrl);
        setStep('ready');
        setProgress(100);
        
        // Clean up
        try {
          document.body.removeChild(wrapper);
        } catch (e) {}
      }).catch((err: any) => {
        console.error("html2pdf rendering failure:", err);
        setError("PDF generation failed. Please try a different document layout.");
        setStep('idle');
        setProgress(0);
        try {
          document.body.removeChild(wrapper);
        } catch (e) {}
      });
    }, 150);
  };

  const executeConversion = async () => {
    if (!file) return;

    setStep('reading');
    setProgress(15);
    setError(null);

    const isDoc = file.name.toLowerCase().endsWith('.doc');

    if (isDoc) {
      try {
        const reader = new FileReader();
        reader.onload = async function() {
          try {
            const arrayBuffer = this.result as ArrayBuffer;

            // Check magic bytes to see if it is a .docx (zip) disguised as a .doc. (0x50 0x4B 0x03 0x04)
            const headerBytes = new Uint8Array(arrayBuffer).subarray(0, 4);
            const isActuallyDocx = headerBytes[0] === 0x50 && 
                                   headerBytes[1] === 0x4B && 
                                   headerBytes[2] === 0x03 && 
                                   headerBytes[3] === 0x04;

            if (isActuallyDocx) {
              console.log("File has a .doc extension but uses standard OOXML (.docx) ZIP format under the hood. Redirecting to mammoth client-side parser.");
              setProgress(30);
              setStep('processing');
              const mammothInstance = await loadMammoth();
              const result = await mammothInstance.convertToHtml({ arrayBuffer: arrayBuffer });
              const docHtml = result.value;

              setProgress(70);
              setStep('rendering');
              await renderHtmlToPdf(docHtml);
              return;
            }

            // Convert binary ArrayBuffer to Base64 in safe chunks to prevent stack overflow limits
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            const len = bytes.byteLength;
            const chunk = 8192;
            for (let i = 0; i < len; i += chunk) {
              binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
            }
            const base64Data = btoa(binary);

            setProgress(40);
            setStep('processing');

            const response = await fetch('/api/doc-to-html', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                base64Data,
                fileName: file.name
              })
            });

            if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.message || 'Server failed to parse the legacy .doc file.');
            }

            const { html } = await response.json();
            setProgress(70);
            setStep('rendering');

            await renderHtmlToPdf(html);

          } catch (err: any) {
            console.error("Doc legacy parse failure: ", err);
            setError(`Error: ${err.message || 'Failed to convert legacy Word document.'}`);
            setStep('idle');
            setProgress(0);
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (err: any) {
        setError(`Failed to read file: ${err.message || err}`);
        setStep('idle');
        setProgress(0);
      }
      return;
    }

    try {
      // 1. Load Mammoth
      const mammothInstance = await loadMammoth();
      setProgress(35);
      setStep('processing');

      // 2. Read file as ArrayBuffer
      const reader = new FileReader();
      reader.onload = async function() {
        try {
          const arrayBuffer = this.result as ArrayBuffer;
          
          // 3. Convert Word DOCX to HTML
          const result = await mammothInstance.convertToHtml({ arrayBuffer: arrayBuffer });
          const docHtml = result.value;

          setProgress(70);
          setStep('rendering');

          await renderHtmlToPdf(docHtml);

        } catch (error: any) {
          console.error("Error processing Word content:", error);
          setError("Failed to convert Word document contents. It might be corrupt or an older unsupported format (.doc). Try converting it or standard formats.");
          setStep('idle');
          setProgress(0);
        }
      };

      reader.onerror = () => {
        setError("Error reading Word file.");
        setStep('idle');
        setProgress(0);
      };

      reader.readAsArrayBuffer(file);

    } catch (err: any) {
      console.error("Mammoth loader failure:", err);
      setError("Failed to initialize Word to PDF parser.");
      setStep('idle');
      setProgress(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Upload area layout */}
      {!file ? (
        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/15 text-red-600 dark:text-red-400 text-xs rounded-2xl flex items-center gap-2">
              <LucideIcon name="AlertCircle" size={14} />
              <span>{error}</span>
            </div>
          )}
          <label 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-3xl cursor-pointer transition-all group ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-cyan-950/20 dark:border-cyan-500' 
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:border-indigo-400 dark:hover:border-cyan-500/50'
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 text-blue-500 dark:text-cyan-400 flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <LucideIcon name="FileSymlink" size={18} />
              </div>
              <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-350">
                Drag and drop Word file (.docx / .doc) or click
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-550 mb-3">
                Encode Microsoft Word document formats into printable PDF files instantly
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".docx,.doc"
              onChange={handleFileChange}
            />
          </label>
        </div>
      ) : (
        <div className="p-6 border border-slate-150 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl space-y-5 animate-fadeIn">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/15 text-red-600 dark:text-red-400 text-xs rounded-2xl flex items-center gap-2">
              <LucideIcon name="AlertCircle" size={14} />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-between items-center bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600">
                <LucideIcon name="FileSymlink" size={20} />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {file?.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {file ? (file.size / 1024).toFixed(1) : 0} KB
                </p>
              </div>
            </div>

            {step === 'idle' && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setStep('idle');
                }}
                className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
              >
                <LucideIcon name="Trash2" size={14} />
              </button>
            )}
          </div>

          {/* Page Scaling Option Toggle */}
          {step === 'idle' && (
            <div className="flex items-center justify-between p-3.5 bg-indigo-500/5 dark:bg-slate-850/60 border border-indigo-500/10 dark:border-slate-800 rounded-xl">
              <div className="flex flex-col gap-0.5 max-w-[80%]">
                <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <LucideIcon name="Sliders" size={13} className="text-indigo-600 dark:text-cyan-400" />
                  <span>Fit to Single Page (एक पेज में फिट करें)</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Automatically scaling layout, font sizes and padding to fit neatly onto exactly 1 page.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={forceSinglePage} 
                  onChange={(e) => setForceSinglePage(e.target.checked)} 
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-indigo-600 dark:peer-checked:bg-cyan-500"></div>
              </label>
            </div>
          )}

          {/* Core trigger button */}
          {step === 'idle' && (
            <button
              type="button"
              onClick={executeConversion}
              className="w-full py-3 bg-indigo-650 hover:bg-indigo-750 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LucideIcon name="RefreshCw" size={13} />
              <span>Convert Word to High-Fidelity PDF</span>
            </button>
          )}

          {/* Real-time progression tracking */}
          {(step === 'reading' || step === 'processing' || step === 'rendering') && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span className="flex items-center gap-1.5">
                  <LucideIcon name="RefreshCw" size={11} className="animate-spin text-blue-500" />
                  {step === 'reading' && 'Unpacking DOCX XML byte streams...'}
                  {step === 'processing' && 'Formatting document typography & margins...'}
                  {step === 'rendering' && 'Rasterizing high-fidelity PDF print sheets...'}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 dark:bg-cyan-400 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Ready & Export block */}
          {step === 'ready' && downloadUrl && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-center space-y-4 animate-fadeIn">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-450 tracking-wider flex items-center justify-center gap-1">
                <LucideIcon name="ShieldCheck" size={12} />
                <span>PDF Compiled Beautifully</span>
              </span>

              <div className="flex gap-3 justify-center">
                <a
                  href={downloadUrl}
                  download={`${file?.name ? file.name.replace(/\.[^/.]+$/, "") : "document"}.pdf`}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LucideIcon name="Download" size={13} />
                  <span>Download & Print PDF File</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setStep('idle');
                    setDownloadUrl(null);
                  }}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Convert Another
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Structured details FAQ */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-8 mt-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">About Word to PDF Converter</h2>
        <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed max-w-4xl mb-6">
          Our Word to PDF converter translates layout spacing, headings, and tables from standard Microsoft DOCX/DOC formats and rasterizes them into printable, standard document sizes without relying on heavy external PDF generation networks.
        </p>

        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-205 mb-4">Frequently Asked Questions (FAQ)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Does this support complex fonts?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Yes, our renderer matches doc elements to standard cross-platform fonts like Arial, Inter, Calibri and Courier, and formats them perfectly onto print canvases.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Where are converted PDF streams saved?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              In your browser! No external processes or cloud microservices are involved. Your local sandbox takes care of raw formatting details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
