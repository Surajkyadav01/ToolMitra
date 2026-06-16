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

  const executeConversion = async () => {
    if (!file) return;

    setStep('reading');
    setProgress(15);
    setError(null);

    // If it's old legacy .doc format, show instruction
    if (file.name.toLowerCase().endsWith('.doc')) {
      setError("Legacy .doc files are pre-2007 binary formats. For perfect client-side translation of tables and nested graphics, please convert your file to standard Word .docx format and upload again.");
      setStep('idle');
      setProgress(0);
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

          // 4. Wrap HTML into styled document format suitable for html2pdf
          const styledHtml = `
            <div style="font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; padding: 0.8in; line-height: 1.6; color: #111827; background-color: #ffffff;">
              <style>
                p { margin-bottom: 12px; font-size: 11pt; text-align: justify; }
                h1 { font-size: 22pt; font-weight: bold; color: #1e3a8a; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 6px; margin-bottom: 16px; margin-top: 0; }
                h2 { font-size: 15pt; font-weight: bold; color: #2e75b6; margin-top: 20px; margin-bottom: 10px; }
                h3 { font-size: 12.5pt; font-weight: bold; color: #41719c; margin-top: 14px; margin-bottom: 8px; }
                ul, ol { margin-bottom: 12px; padding-left: 20px; }
                li { font-size: 11pt; margin-bottom: 4px; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
                th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 10pt; }
                th { background-color: #f3f4f6; font-weight: bold; }
                blockquote { border-left: 4px solid #3b82f6; padding-left: 12px; font-style: italic; color: #4b5563; margin-bottom: 12px; }
              </style>
              ${docHtml || '<p>No readable text content found in Word document.</p>'}
            </div>
          `;

          // Write HTML into container element to generate PDF locally
          const container = document.createElement('div');
          container.id = 'docx-pdf-render-container';
          container.style.position = 'fixed';
          container.style.left = '0';
          container.style.top = '0';
          container.style.width = '816px'; 
          container.style.background = '#ffffff';
          container.style.color = '#000000';
          container.style.opacity = '1';
          container.style.pointerEvents = 'none';
          container.style.zIndex = '-99999';
          container.style.overflow = 'visible';
          container.innerHTML = styledHtml;
          document.body.appendChild(container);

          const opt = {
            margin:       0,
            filename:     `${file.name.replace(/\.[^/.]+$/, "")}.pdf`,
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

          // Generate PDF
          html2pdf().from(container).set(opt).toPdf().get('pdf').then((pdfObj: any) => {
            const pdfBlob = pdfObj.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            setDownloadUrl(pdfUrl);
            setStep('ready');
            setProgress(100);
            
            // Clean up
            try {
              document.body.removeChild(container);
            } catch (e) {}
          }).catch((err: any) => {
            console.error("html2pdf rendering failure:", err);
            setError("PDF generation failed. Please try a different document layout.");
            setStep('idle');
            setProgress(0);
          });

        } catch (error: any) {
          console.error("Error processing Word content:", error);
          setError("Failed to convert Word document contents. It might be corrupt or an older unsupported format (.doc). Try using a standard .docx file.");
          setStep('idle');
          setProgress(0);
          try {
            const el = document.getElementById('docx-pdf-render-container');
            if (el) el.remove();
          } catch (e) {}
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
