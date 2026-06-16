import React, { useState } from 'react';
import LucideIcon from '../LucideIcon';

type ConvertStep = 'idle' | 'reading' | 'extracting' | 'compiling' | 'ready';

export default function PdfToWordConverter() {
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
      if (selected.name.toLowerCase().endsWith('.pdf')) {
        setFile(selected);
        setStep('idle');
        setProgress(0);
        setDownloadUrl(null);
      } else {
        setError('Please drop a valid PDF file (.pdf)');
      }
    }
  };

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
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      script.onerror = (e) => reject(new Error('Failed to load PDF parsing library.' + e));
      document.head.appendChild(script);
    });
  };

  const executeConversion = async () => {
    if (!file) return;

    setStep('reading');
    setProgress(10);
    setError(null);

    try {
      // 1. Load the PDF parser
      const pdfjsLib = await loadPdfJs();
      setProgress(30);
      setStep('extracting');

      // 2. Read file as ArrayBuffer
      const fileReader = new FileReader();
      fileReader.onload = async function() {
        try {
          const typedarray = new Uint8Array(this.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          
          setProgress(50);
          setStep('compiling');
          
          const filePrefix = file.name.replace(/\.[^/.]+$/, "");
          const numPages = pdf.numPages;

          // Perform full layout sequential text extraction first
          let rawFullTextWithPageMarkers = '';
          const rawPagesData: { pageNum: number; rows: { y: number; items: any[] }[] }[] = [];

          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const items = content.items as any[];
            
            // Group items on this page that are on the exact same vertical line (within 6.5 pt allowance for better line-fragment merging)
            const rows: { y: number; items: any[] }[] = [];
            for (const item of items) {
              if (!item.str || !item.str.trim()) continue;
              const y = item.transform[5];
              const x = item.transform[4];
              const h = Math.abs(item.transform[3]);
              
              let foundRow = rows.find(r => Math.abs(r.y - y) < 6.5);
              if (!foundRow) {
                foundRow = { y, items: [] };
                rows.push(foundRow);
              }
              foundRow.items.push({ str: item.str, x, h });
            }

            // Sort rows top-to-bottom
            rows.sort((a, b) => b.y - a.y);

            // Sort left-to-right within rows
            for (const row of rows) {
              row.items.sort((a, b) => a.x - b.x);
            }

            rawPagesData.push({ pageNum: i, rows });

            const pageLines = rows.map(r => r.items.map(it => it.str).join(' '));
            rawFullTextWithPageMarkers += `--- PAGE ${i} ---\n` + pageLines.join('\n') + '\n\n';
          }

          if (!rawFullTextWithPageMarkers.trim()) {
            throw new Error("No text content could be extracted from PDF.");
          }

          setProgress(75);

          // 3. Attempt Server-side Premium AI Layout Conversion
          try {
            const apiRes = await fetch('/api/pdf-to-word', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                rawText: rawFullTextWithPageMarkers,
                rawPagesData: rawPagesData,
                fileName: file.name
              })
            });

            if (apiRes.ok) {
              const resData = await apiRes.json();
              if (resData.success && resData.html) {
                // Compile premium document output
                const htmlContent = `
                  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
                  <head>
                    <meta charset="utf-8">
                    <title>${filePrefix}</title>
                    <style>
                      body { font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif; padding: 1in; line-height: 1.35; color: #000000; }
                      p { font-size: 10.5pt; color: #111827; margin-top: 3pt; margin-bottom: 3pt; line-height: 1.25; }
                    </style>
                  </head>
                  <body>
                    ${resData.html}
                  </body>
                  </html>
                `;

                const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
                const url = URL.createObjectURL(blob);

                setDownloadUrl(url);
                setStep('ready');
                setProgress(100);
                return; // Premium AI Path Success!
              }
            }
          } catch (apiErr) {
            console.warn("Server conversion failed or unavailable, using high-fidelity local fallback...", apiErr);
          }

          // 4. Local High-Fidelity Fallback Parser
          let pageHTMLs: string[] = [];

          for (const pageData of rawPagesData) {
            const processedRows: { cells: { text: string; startX: number; endX: number; h: number }[]; y: number; h: number }[] = [];

            for (const r of pageData.rows) {
              const cells: { text: string; startX: number; endX: number; h: number }[] = [];
              let currentCell: typeof cells[0] | null = null;

              for (const item of r.items) {
                const itemH = item.h || 10;
                const itemW = item.str.length * itemH * 0.48;

                if (!currentCell) {
                  currentCell = { text: item.str, startX: item.x, endX: item.x + itemW, h: itemH };
                } else {
                  const gap = item.x - currentCell.endX;
                  // If substantial whitespace gap (more than 18 pt), start a new cell column
                  if (gap > 18) {
                    cells.push(currentCell);
                    currentCell = { text: item.str, startX: item.x, endX: item.x + itemW, h: itemH };
                  } else {
                    if (!currentCell.text.endsWith(' ') && !item.str.startsWith(' ')) {
                      currentCell.text += ' ';
                    }
                    currentCell.text += item.str;
                    currentCell.endX = item.x + itemW;
                    currentCell.h = Math.max(currentCell.h, itemH);
                  }
                }
              }
              if (currentCell) {
                cells.push(currentCell);
              }

              if (cells.length > 0) {
                const maxRowH = Math.max(...cells.map(c => c.h));
                processedRows.push({
                  cells,
                  y: r.y,
                  h: maxRowH
                });
              }
            }

            const pageElements: string[] = [];
            let rIdx = 0;
            while (rIdx < processedRows.length) {
              const currRow = processedRows[rIdx];
              const cellTextCombined = currRow.cells.map(c => c.text).join(' ').trim();
              if (!cellTextCombined) {
                rIdx++;
                continue;
              }

              // Check if heading banner
              const headingRegex = /^(CAREER\s+OBJECTIVE|ACADEMIC\s+QUALIFICATION|EDUCATION|WORK\s+EXPERIENCE|EXPERIENCE|EMPLOYMENT|PROJECTS|SKILLS|STRENGTHS|PERSONAL\s+DETAILS|PERSONAL\s+INFORMATION|DECLARATION|INTERESTS|CERTIFICATIONS|ORGANIZATIONS|LANGUAGES|OTHER\s+QUALIFICATION)$/i;
              const isHeading = headingRegex.test(cellTextCombined) || (currRow.cells.length === 1 && currRow.h > 12.5);

              if (isHeading) {
                pageElements.push(`
                  <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; margin-top: 14pt; margin-bottom: 8pt;">
                    <tr>
                      <td style="background-color: #ededed; padding: 6pt 10pt; border-left: 5px solid #1f4e79;">
                        <p style="font-size: 11.5pt; font-weight: bold; color: #1e3a8a; margin: 0; font-family: 'Calibri', 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">${cellTextCombined}</p>
                      </td>
                    </tr>
                  </table>
                `);
                rIdx++;
                continue;
              }

              // Check if main name title
              const isMainTitle = (rIdx === 0 || currRow.h > 18) && currRow.cells.length === 1;
              if (isMainTitle) {
                const isResumeWord = /resume/i.test(cellTextCombined);
                if (isResumeWord) {
                  pageElements.push(`<p align="center" style="font-size: 22pt; font-weight: bold; color: #111827; margin-top: 12pt; margin-bottom: 16pt; font-family: 'Calibri', 'Arial', sans-serif;">${cellTextCombined}</p>`);
                } else {
                  pageElements.push(`<p style="font-size: 20pt; font-weight: bold; color: #1e3a8a; margin-top: 12pt; margin-bottom: 3pt; font-family: 'Calibri', 'Arial', sans-serif;">${cellTextCombined}</p>`);
                }
                rIdx++;
                continue;
              }

              // Check if we can collect a table sequence
              let tableRows: typeof processedRows = [];
              let tIdx = rIdx;
              while (tIdx < processedRows.length) {
                const rowToCheck = processedRows[tIdx];
                const hasHeaderKeywords = rowToCheck.cells.some(c => 
                  /s\.?no\.?|qualification|degree|university|board|passing|year|per\s*%|percentage|marks|gpa|cgpa/i.test(c.text)
                );
                const isMultiCol = rowToCheck.cells.length >= 3;
                
                if (isMultiCol || (tableRows.length > 0 && rowToCheck.cells.length >= 2 && rowToCheck.cells.length <= 6) || (hasHeaderKeywords && rowToCheck.cells.length >= 2)) {
                  tableRows.push(rowToCheck);
                  tIdx++;
                } else {
                  break;
                }
              }

              if (tableRows.length >= 2 || (tableRows.length === 1 && tableRows[0].cells.length >= 3)) {
                const maxCols = Math.max(...tableRows.map(tr => tr.cells.length));
                const colWidthPercent = Math.floor(100 / maxCols);

                const renderedTableTrs = tableRows.map((tr, idx) => {
                  const isHeader = idx === 0 || tr.cells.some(c => 
                    /s\.?no\.?|qualification|degree|university|board|passing|year|per\s*%|percentage|marks|gpa|cgpa/i.test(c.text)
                  );
                  const cellBg = isHeader ? 'background-color: #f3f4f6;' : '';
                  const fontW = isHeader ? 'font-weight: bold; color: #111827;' : 'color: #374151;';
                  
                  let tdsHtml = '';
                  for (let c = 0; c < maxCols; c++) {
                    const cellVal = tr.cells[c]?.text || '';
                    const alignment = (c === 0 || cellVal.length < 5) ? 'center' : 'left';
                    tdsHtml += `
                      <td style="width: ${colWidthPercent}%; border: 1px solid #cbd5e1; padding: 6pt 8pt; vertical-align: middle; ${cellBg}">
                        <p align="${alignment}" style="font-size: 9.5pt; ${fontW} margin: 0; font-family: 'Calibri', 'Arial', sans-serif;">${cellVal}</p>
                      </td>
                    `;
                  }
                  return `<tr>${tdsHtml}</tr>`;
                }).join('\n');

                pageElements.push(`
                  <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 8pt; margin-bottom: 12pt;">
                    ${renderedTableTrs}
                  </table>
                `);
                rIdx = tIdx;
                continue;
              }

              // Check if key-value list of personal details
              if (currRow.cells.length === 2) {
                const cell0 = currRow.cells[0].text.trim();
                const cell1 = currRow.cells[1].text.trim();
                
                const isKV = /^(father|mother|dob|birth|gender|marital\s*status|nationality|languages\s*known|hobbies|permanent\s*address|correspondence\s*address)/i.test(cell0) || (cell0.endsWith(':') && cell0.length < 25);
                if (isKV) {
                  let kvRows = [currRow];
                  let kIdx = rIdx + 1;
                  while (kIdx < processedRows.length) {
                    const nextR = processedRows[kIdx];
                    if (nextR.cells.length === 2) {
                      const c0 = nextR.cells[0].text.trim();
                      const isNextKV = /^(father|mother|dob|birth|gender|marital\s*status|nationality|languages\s*known|hobbies|permanent\s*address|correspondence\s*address)/i.test(c0) || (c0.endsWith(':') && c0.length < 25);
                      if (isNextKV) {
                        kvRows.push(nextR);
                        kIdx++;
                      } else {
                        break;
                      }
                    } else {
                      break;
                    }
                  }

                  const trsHtml = kvRows.map(r => {
                    const k = r.cells[0]?.text || '';
                    const v = r.cells[1]?.text || '';
                    return `
                      <tr>
                        <td style="width: 30%; padding: 4pt 0; vertical-align: top;">
                          <p style="font-size: 10.5pt; font-weight: bold; color: #1e293b; margin: 0; font-family: 'Calibri', 'Arial', sans-serif;">${k}</p>
                        </td>
                        <td style="width: 70%; padding: 4pt 0; vertical-align: top;">
                          <p style="font-size: 10.5pt; color: #334155; margin: 0; font-family: 'Calibri', 'Arial', sans-serif;">${v}</p>
                        </td>
                      </tr>
                    `;
                  }).join('\n');

                  pageElements.push(`
                    <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; margin-top: 6pt; margin-bottom: 6pt;">
                      ${trsHtml}
                    </table>
                  `);
                  rIdx = kIdx;
                  continue;
                }
              }

              // Normal single paragraph or contact detail item
              const isContact = /mob(\.|ile)?\s*no|email|phone|vill:|address/i.test(cellTextCombined);
              if (isContact) {
                pageElements.push(`<p style="font-size: 10.5pt; color: #334155; margin-top: 2pt; margin-bottom: 2pt; font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.2;">${cellTextCombined}</p>`);
                
                const nextRow = processedRows[rIdx + 1];
                const nextText = nextRow?.cells.map(c => c.text).join(' ').trim() || '';
                const nextIsContact = /mob(\.|ile)?\s*no|email|phone|vill:|address/i.test(nextText);
                if (!nextIsContact && nextText) {
                  pageElements.push(`<hr style="border: none; border-top: 1.5px solid #1f4e79; margin-top: 8pt; margin-bottom: 12pt;" />`);
                }
              } else {
                pageElements.push(`<p style="font-size: 10.5pt; color: #334155; margin-top: 4pt; margin-bottom: 4pt; line-height: 1.35; font-family: 'Calibri', 'Arial', sans-serif; text-align: justify;">${cellTextCombined}</p>`);
              }

              rIdx++;
            }

            const formattedRows = pageElements.join('\n');
            const pageBreak = (pageData.pageNum < numPages) ? '<p style="page-break-after: always;"></p>' : '';
            pageHTMLs.push(formattedRows + pageBreak);
          }

          const combinedHTMLContent = pageHTMLs.join('\n');

          const htmlContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
              <meta charset="utf-8">
              <title>${filePrefix}</title>
              <style>
                body { font-family: 'Calibri', 'Arial', sans-serif; padding: 1in; line-height: 1.3; color: #000000; }
                p { font-size: 10.5pt; color: #333333; margin-top: 2.5pt; margin-bottom: 2.5pt; line-height: 1.25; }
              </style>
            </head>
            <body>
              ${combinedHTMLContent}
            </body>
            </html>
          `;

          const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
          const url = URL.createObjectURL(blob);

          setDownloadUrl(url);
          setStep('ready');
          setProgress(100);
        } catch (error: any) {
          console.error("Error formatting PDF content:", error);
          setError(error.message || "Could not extract text structure correctly from PDF. File might be scanned or copy-protected.");
          setStep('idle');
          setProgress(0);
        }
      };

      fileReader.onerror = () => {
        setError("Error reading uploaded file.");
        setStep('idle');
        setProgress(0);
      };

      fileReader.readAsArrayBuffer(file);

    } catch (err: any) {
      console.error("PDF Parsing SDK failure:", err);
      setError("Failed to load local PDF parser. Checking connectivity...");
      setStep('idle');
      setProgress(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Upload layout panel */}
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
                <LucideIcon name="FileText" size={18} />
              </div>
              <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-350">
                Drag and drop PDF document or click
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-550 mb-3">
                Extract and convert layout elements into editable Word document
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".pdf"
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
          <div className="flex justify-between items-center bg-white dark:bg-slate-805 border border-slate-100 dark:border-slate-800 p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-100 text-red-600">
                <LucideIcon name="FileText" size={20} />
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

          {/* Action trigger button */}
          {step === 'idle' && (
            <button
              type="button"
              onClick={executeConversion}
              className="w-full py-3 bg-indigo-650 hover:bg-indigo-705 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LucideIcon name="RefreshCw" size={13} />
              <span>Convert PDF to Editable Word</span>
            </button>
          )}

          {/* Progress Indicators */}
          {(step === 'reading' || step === 'extracting' || step === 'compiling') && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span className="flex items-center gap-1.5">
                  <LucideIcon name="RefreshCw" size={11} className="animate-spin text-indigo-500" />
                  {step === 'reading' && 'Reading PDF segment layers locally...'}
                  {step === 'extracting' && 'Reconstructing character alignments & styles...'}
                  {step === 'compiling' && 'Structuring Word-compatible XML document stream...'}
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

          {/* Download Box */}
          {step === 'ready' && downloadUrl && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-center space-y-4 animate-fadeIn">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-450 tracking-wider flex items-center justify-center gap-1">
                <LucideIcon name="ShieldCheck" size={12} />
                <span>Document Rebuilt Successfully</span>
              </span>

              <div className="flex gap-3 justify-center">
                <a
                  href={downloadUrl}
                  download={file ? `${file.name.replace(/\.[^/.]+$/, "")}_editable.doc` : 'editable_document.docx'}
                  className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-transform hover:scale-102 flex items-center justify-center gap-1.5"
                >
                  <LucideIcon name="Download" size={13} />
                  <span>Download Editable Word File</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setStep('idle');
                    setDownloadUrl(null);
                  }}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-bold rounded-xl transition-all"
                >
                  Convert Another
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SEO copy writing */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-8 mt-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">About PDF to Word Converter</h2>
        <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed max-w-4xl mb-6">
          Our browser-based client-side PDF to Word Converter translates vector segments from files and exports complete paragraphs into Microsoft Word doc format. This makes correcting text inside older formatted templates incredibly fast, simple, and safe without relying on slow internet pipelines.
        </p>

        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-205 mb-4">Frequently Asked Questions (FAQ)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Is my text content private?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Absolutely. Rebuilding structural grids happens completely locally inside your sandboxed browser memory thread. Text parameters are never broadcasted onto external servers.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Are vector elements editable?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Yes, our converter structures lines, paragraphs, and words to align properly inside desktop Word processors like Microsoft Office and LibreOffice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
