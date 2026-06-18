import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { RGB } from 'pdf-lib';

// Use standard nested or CDN worker fallback to guarantee a compatible worker thread
const pdfjsVersion = pdfjsLib.version || '6.0.227';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

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
  fontFamilyKey: string;
  
  // Font metrics & details extracted:
  fontWeight: string;
  fontStyle: string;
  lineHeight: number;
  charSpacing: number;
  ascent: number;
  descent: number;

  // Native absolute unscaled PDF coordinates:
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  pdfFontSize: number;
  fontName: string;
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
  fontFamily?: string;
}

const PDF_SCALE = 1.25;

export interface StandardFont {
  key: string;
  name: string;
  css: string;
  weight: string;
  pdfLibFontName: string;
}

const STANDARD_FONTS: StandardFont[] = [
  { key: 'Helvetica', name: 'Arial/Helvetica', css: 'Arial, Helvetica, sans-serif', weight: 'normal', pdfLibFontName: 'Helvetica' },
  { key: 'Helvetica-Bold', name: 'Helvetica Bold', css: 'Arial, Helvetica, sans-serif-bold', weight: 'bold', pdfLibFontName: 'Helvetica-Bold' },
  { key: 'Times-Roman', name: 'Times New Roman', css: '"Times New Roman", Times, Georgia, serif', weight: 'normal', pdfLibFontName: 'Times-Roman' },
  { key: 'Courier', name: 'Courier', css: 'Courier, "Courier New", monospace', weight: 'normal', pdfLibFontName: 'Courier' },
];

const detectFontKey = (fontName: string): string => {
  const norm = (fontName || '').toLowerCase();
  if (norm.includes('times') || norm.includes('serif') || norm.includes('roman') || norm.includes('georgia')) {
    return 'Times-Roman';
  }
  if (norm.includes('courier') || norm.includes('mono') || norm.includes('console') || norm.includes('code')) {
    return 'Courier';
  }
  if (norm.includes('bold')) {
    return 'Helvetica-Bold';
  }
  return 'Helvetica';
};

const parseColorToPdfLib = (colorStr: string): RGB => {
  if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
  }
  if (colorStr.startsWith('rgb')) {
    const match = colorStr.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0], 10) / 255;
      const g = parseInt(match[1], 10) / 255;
      const b = parseInt(match[2], 10) / 255;
      return rgb(r, g, b);
    }
  }
  return rgb(0, 0, 0); // default black
};

const mapToStandardFontName = (selectedFont: string): any => {
  const font = STANDARD_FONTS.find(f => f.key === selectedFont);
  return font ? font.pdfLibFontName : 'Helvetica';
};

const getPdfLibFontName = (baseFontKey: string, weight: string, style: string): string => {
  const isBold = weight === 'bold' || weight === '700' || weight === '800' || weight === '900' || weight === '600';
  const isItalic = style === 'italic';

  const base = baseFontKey.toLowerCase();
  if (base.includes('times') || base.includes('roman') || base.includes('serif')) {
    if (isBold && isItalic) return 'Times-BoldItalic';
    if (isBold) return 'Times-Bold';
    if (isItalic) return 'Times-Italic';
    return 'Times-Roman';
  }
  if (base.includes('courier') || base.includes('mono')) {
    if (isBold && isItalic) return 'Courier-BoldOblique';
    if (isBold) return 'Courier-Bold';
    if (isItalic) return 'Courier-Oblique';
    return 'Courier';
  }
  // Default to Helvetica/Arial family
  if (isBold && isItalic) return 'Helvetica-BoldOblique';
  if (isBold) return 'Helvetica-Bold';
  if (isItalic) return 'Helvetica-Oblique';
  return 'Helvetica';
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

  // Sampled page text/font colors (to preserve original colors)
  const [fontColors, setFontColors] = useState<{ [itemId: string]: string }>({});

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
    setFontColors({});
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
      setLoadingProgress(30);
      const fileReader = new FileReader();

      fileReader.onload = async () => {
        try {
          const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
          const doc = await pdfjsLib.getDocument({ data: typedArray }).promise;
          
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
            const styles = textContent.styles || {};
            
            // Temporary canvas context for calculating browser-rendered character tracking spacing
            const tempCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
            const tempCtx = tempCanvas ? tempCanvas.getContext('2d') : null;

            const parsedItems: PdfTextItem[] = textContent.items
              .map((item: any, idx: number) => {
                const normFontKey = detectFontKey(item.fontName);
                const fontMeta = STANDARD_FONTS.find(f => f.key === normFontKey) || STANDARD_FONTS[0];

                const [viewX, viewY] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
                const fontHeight = Math.abs(item.transform[3] || item.height || 11);
                const fontSize = fontHeight * PDF_SCALE; // Scale offset matching HD layout
                const width = item.width * PDF_SCALE;
                const height = (item.height || fontHeight) * PDF_SCALE;

                // Extract exact font weight, style, and metric ratios
                const styleObj = styles[item.fontName];
                const rawFontFamily = styleObj ? styleObj.fontFamily : '';

                let fontWeight = 'normal';
                const lowerFont = (item.fontName + ' ' + rawFontFamily).toLowerCase();
                if (lowerFont.includes('bold') || lowerFont.includes('black') || lowerFont.includes('heavy') || lowerFont.includes('w7') || lowerFont.includes('w8') || lowerFont.includes('w9')) {
                  fontWeight = 'bold';
                } else if (lowerFont.includes('medium') || lowerFont.includes('semibold') || lowerFont.includes('w5') || lowerFont.includes('w6')) {
                  fontWeight = '600';
                }

                let fontStyle = 'normal';
                if (lowerFont.includes('italic') || lowerFont.includes('oblique')) {
                  fontStyle = 'italic';
                } else {
                  const skewX = item.transform[1] || 0;
                  const skewY = item.transform[2] || 0;
                  if (Math.abs(skewX) > 0.1 || Math.abs(skewY) > 0.1) {
                    fontStyle = 'italic';
                  }
                }

                const ascent = styleObj ? (styleObj.ascent || 0.8) : 0.8;
                const descent = styleObj ? (styleObj.descent || -0.2) : -0.2;
                const lineHeight = height > 0 && fontSize > 0 ? (height / fontSize) : 1.2;

                // Calculate exact tracking / character spacing using canvas text metrics
                let charSpacing = 0;
                if (tempCtx && item.str.length > 1) {
                  tempCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontMeta.css}`;
                  const measured = tempCtx.measureText(item.str);
                  if (width > measured.width) {
                    charSpacing = (width - measured.width) / (item.str.length - 1);
                  }
                }

                return {
                  id: `p${i}-t${idx}`,
                  str: item.str,
                  originalStr: item.str,
                  left: viewX,
                  top: viewY - height,
                  width: Math.max(width, 14),
                  height: Math.max(height, fontHeight, 10),
                  fontSize: fontSize,
                  fontFamily: fontMeta.css,
                  fontFamilyKey: normFontKey,
                  
                  // Extracted details
                  fontWeight,
                  fontStyle,
                  lineHeight,
                  charSpacing,
                  ascent,
                  descent,

                  pdfX: item.transform[4],
                  pdfY: item.transform[5],
                  pdfWidth: item.width,
                  pdfHeight: item.height || fontHeight,
                  pdfFontSize: fontHeight,
                  fontName: item.fontName,
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
            const bg = '#ffffff'; // Always match the pure white background of the PDF page canvas
            ctx.fillStyle = bg;

            // Calculate precise baseline and cover-up bounding box properties
            const baselineY = item.top + item.height;
            const paddingX = 1.5;
            const paddingY = 0.5;
            const coverX = item.left - paddingX;
            const coverY = baselineY - (item.ascent * item.fontSize) - paddingY;
            const coverWidth = item.width + 2 * paddingX;
            const coverHeight = (item.ascent - item.descent) * item.fontSize + 2 * paddingY;

            // Draw precise overlap background margin to conceal original letters
            ctx.fillRect(coverX, coverY, coverWidth, coverHeight);

            const fontKey = edit.fontFamily || item.fontFamilyKey || 'Helvetica';
            const fontMeta = STANDARD_FONTS.find(f => f.key === fontKey) || STANDARD_FONTS[0];
            const activeWeight = edit.fontFamily ? (fontMeta.weight === 'bold' ? 'bold' : 'normal') : item.fontWeight;
            const activeStyle = edit.fontFamily ? 'normal' : item.fontStyle;

            // Match exact original text color dynamically
            const textColorStr = edit.color || fontColors[item.id] || '#000000';
            ctx.fillStyle = textColorStr;
            ctx.font = `${activeStyle} ${activeWeight} ${item.fontSize}px ${fontMeta.css}`;
            try {
              (ctx as any).letterSpacing = `${item.charSpacing}px`;
            } catch (e) {
              // ignore browsers without canvas letterSpacing support
            }
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(edit.value, item.left, baselineY);
          }
        });

        // Add custom text boxes on top
        const customItems = customTexts[pageIdx] || [];
        customItems.forEach((cust) => {
          ctx.fillStyle = cust.color;
          const fontKey = cust.fontFamily || 'Helvetica';
          const fontMeta = STANDARD_FONTS.find(f => f.key === fontKey) || STANDARD_FONTS[0];
          ctx.font = `${fontMeta.weight === 'bold' ? 'bold ' : ''}${cust.fontSize}px ${fontMeta.css}`;
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
    if (!file || numPages === 0) return;
    setIsProcessing(true);
    setLoadingProgress(10);
    setError(null);

    try {
      // Load original document natively to preserve its vectors and forms
      const fileBytes = await file.arrayBuffer();
      const compiledPdfDoc = await PDFDocument.load(fileBytes);
      const pages = compiledPdfDoc.getPages();

      // Embed standard fonts once so PDF building is lightning-fast and offline-ready
      const embeddedFontsMap: Record<string, any> = {};
      const allFontsToEmbed = [
        'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
        'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
        'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique'
      ];
      for (const fName of allFontsToEmbed) {
        try {
          embeddedFontsMap[fName] = await compiledPdfDoc.embedFont(fName as any);
        } catch (e) {
          console.error(`Could not embed standard font ${fName}:`, e);
        }
      }

      for (let i = 0; i < numPages; i++) {
        setLoadingProgress(Math.round(10 + (80 * (i + 1)) / numPages));

        const page = pages[i];
        if (!page) continue;

        const originalPage = await pdfDoc.getPage(i + 1);
        const viewport = originalPage.getViewport({ scale: PDF_SCALE });
        const pageHeight = page.getHeight();

        // 1. Draw background cover rectangle first, then rewrite user-overridden inline strings
        const textItems = pageTextMap[i] || [];
        for (const item of textItems) {
          const edit = textOverrides[item.id];
          if (edit !== undefined) {
            const bg = '#ffffff'; // Match the pure white background of the PDF page canvas
            
            const paddingX = 1.5;
            const paddingY = 0.5;
            const coverX = item.pdfX - paddingX;
            const coverY = item.pdfY + (item.descent * item.pdfFontSize) - paddingY;
            const coverWidth = item.pdfWidth + 2 * paddingX;
            const coverHeight = (item.ascent - item.descent) * item.pdfFontSize + 2 * paddingY;

            // Cover original vector letters with a seamless background-colored block
            page.drawRectangle({
              x: coverX,
              y: coverY,
              width: coverWidth,
              height: coverHeight,
              color: parseColorToPdfLib(bg),
            });

            // Synchronize font family, weights and styles perfectly
            const fontKey = edit.fontFamily || item.fontFamilyKey || 'Helvetica';
            const activeWeight = edit.fontFamily 
              ? (fontKey.includes('Bold') ? 'bold' : 'normal') 
              : item.fontWeight;
            const activeStyle = edit.fontFamily ? 'normal' : item.fontStyle;

            const pdfLibFontName = getPdfLibFontName(fontKey, activeWeight, activeStyle);
            const fontObj = embeddedFontsMap[pdfLibFontName] || embeddedFontsMap['Helvetica'];

            // Match exact original text color dynamically
            const textColorStr = edit.color || fontColors[item.id] || '#000000';

            // Paint new characters on the exact same baseline and size coordinates
            page.drawText(edit.value, {
              x: item.pdfX,
              y: item.pdfY,
              size: item.pdfFontSize,
              font: fontObj,
              color: parseColorToPdfLib(textColorStr),
              characterSpacing: item.charSpacing / PDF_SCALE,
            } as any);
          }
        }

        // 2. Draw user-added dynamic text overlay boxes
        const customItems = customTexts[i] || [];
        for (const cust of customItems) {
          const [pdfX, pdfY] = typeof viewport.convertToPdfPoint === 'function'
            ? viewport.convertToPdfPoint(cust.left, cust.top)
            : [cust.left / PDF_SCALE, pageHeight - (cust.top / PDF_SCALE)];

          const fontKey = cust.fontFamily || 'Helvetica';
          const fontObj = embeddedFontsMap[fontKey] || embeddedFontsMap['Helvetica'];

          // In PDF, drawText drawing starts from bottom baseline, so shift by fontSize
          page.drawText(cust.str, {
            x: pdfX,
            y: pdfY - (cust.fontSize / PDF_SCALE),
            size: cust.fontSize / PDF_SCALE,
            font: fontObj,
            color: parseColorToPdfLib(cust.color),
          });
        }
      }

      setLoadingProgress(95);
      const pdfBytes = await compiledPdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(pdfBlob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
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

  // Helper variables for focused item properties to avoid complex TS untyped Object.values queries
  let currentTextVal = '';
  let currentTextFont = 'Helvetica';
  let currentTextColor = activeFontColor;

  if (focusedItemId) {
    if (focusedItemId.startsWith('custom-')) {
      let found: CustomTextItem | undefined;
      for (const key in customTexts) {
        const items = customTexts[key];
        if (items) {
          found = items.find(c => c.id === focusedItemId);
          if (found) break;
        }
      }
      if (found) {
        currentTextVal = found.str;
        currentTextFont = found.fontFamily;
        currentTextColor = found.color;
      }
    } else {
      const existingOverride = textOverrides[focusedItemId];
      if (existingOverride !== undefined) {
        currentTextVal = existingOverride.value;
        currentTextColor = existingOverride.color;
        currentTextFont = existingOverride.fontFamily || 'Helvetica';
      } else {
        let foundItem: PdfTextItem | undefined;
        for (const key in pageTextMap) {
          const items = pageTextMap[key];
          if (items) {
            foundItem = items.find(item => item.id === focusedItemId);
            if (foundItem) break;
          }
        }
        if (foundItem) {
          currentTextVal = foundItem.str;
          currentTextColor = fontColors[focusedItemId] || activeFontColor;
          currentTextFont = foundItem.fontFamilyKey;
        }
      }
    }
  }

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
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Text Property Inspector
              </span>
              {focusedItemId && (
                <button
                  type="button"
                  onClick={() => setFocusedItemId(null)}
                  className="text-[10px] text-blue-600 dark:text-cyan-400 font-bold hover:underline cursor-pointer"
                >
                  Deselect [X]
                </button>
              )}
            </div>

            {focusedItemId ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Real-time doublebound value editor */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-540 uppercase tracking-wider block">
                    Text Characters
                  </label>
                  <input
                    type="text"
                    value={currentTextVal}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      if (focusedItemId.startsWith('custom-')) {
                        setCustomTexts((prev) => {
                          const updated = { ...prev };
                          for (const pageIdx in updated) {
                            const items = updated[pageIdx];
                            if (items) {
                              updated[pageIdx] = items.map((c) =>
                                c.id === focusedItemId ? { ...c, str: newVal } : c
                              );
                            }
                          }
                          return updated;
                        });
                      } else {
                        setTextOverrides((prev) => ({
                          ...prev,
                          [focusedItemId]: {
                            value: newVal,
                            color: prev[focusedItemId]?.color || activeFontColor,
                            fontFamily: prev[focusedItemId]?.fontFamily,
                          },
                        }));
                      }
                    }}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1.5 focus:ring-blue-500 text-slate-800 dark:text-white font-semibold shadow-sm"
                    placeholder="Type replacement characters..."
                  />
                </div>

                {/* Dropdown to adjust font-family dynamically */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-540 uppercase tracking-wider block">
                    Original/Manual Font
                  </label>
                  <select
                    value={currentTextFont}
                    onChange={(e) => {
                      const fontKey = e.target.value;
                      if (focusedItemId.startsWith('custom-')) {
                        setCustomTexts((prev) => {
                          const updated = { ...prev };
                          for (const pageIdx in updated) {
                            const items = updated[pageIdx];
                            if (items) {
                              updated[pageIdx] = items.map((c) =>
                                c.id === focusedItemId ? { ...c, fontFamily: fontKey } : c
                              );
                            }
                          }
                          return updated;
                        });
                      } else {
                        setTextOverrides((prev) => {
                          const existing = prev[focusedItemId];
                          return {
                            ...prev,
                            [focusedItemId]: {
                              value: existing !== undefined ? existing.value : currentTextVal,
                              color: existing ? existing.color : activeFontColor,
                              fontFamily: fontKey,
                            },
                          };
                        });
                      }
                    }}
                    className="w-full text-xs px-2.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1.5 focus:ring-blue-500 text-slate-800 dark:text-white"
                  >
                    {STANDARD_FONTS.map((font) => (
                      <option key={font.key} value={font.key}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Color */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-540 uppercase tracking-wider block">
                    Pen Color
                  </label>
                  <div className="flex gap-1">
                    {[
                      { hex: '#000000', name: 'Black' },
                      { hex: '#4b5563', name: 'Grey' },
                      { hex: '#1d4ed8', name: 'Blue' },
                      { hex: '#dc2626', name: 'Red' },
                    ].map((color) => {
                      const isCurrent = currentTextColor === color.hex;
                      
                      return (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => {
                            if (focusedItemId.startsWith('custom-')) {
                              setCustomTexts((prev) => {
                                const updated = { ...prev };
                                for (const pageIdx in updated) {
                                  const items = updated[pageIdx];
                                  if (items) {
                                    updated[pageIdx] = items.map((c) =>
                                      c.id === focusedItemId ? { ...c, color: color.hex } : c
                                    );
                                  }
                                }
                                return updated;
                              });
                            } else {
                              setTextOverrides((prev) => {
                                const existing = prev[focusedItemId];
                                return {
                                  ...prev,
                                  [focusedItemId]: {
                                    value: existing !== undefined ? existing.value : currentTextVal,
                                    color: color.hex,
                                    fontFamily: existing?.fontFamily,
                                  },
                                };
                              });
                            }
                          }}
                          className={`flex-1 py-1 px-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                            isCurrent
                              ? 'border-blue-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-2 ring-blue-500/10'
                              : 'border-slate-200 hover:bg-white text-slate-500 hover:text-slate-800 dark:border-slate-850 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full border border-slate-200/50" style={{ backgroundColor: color.hex }} />
                          <span>{color.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sizing precision controls */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-540 uppercase tracking-wider block">
                    Font Size Tuning
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (focusedItemId.startsWith('custom-')) {
                          setCustomTexts((prev) => {
                            const updated = { ...prev };
                            for (const pageIdx in updated) {
                              updated[pageIdx] = updated[pageIdx].map((c) =>
                                c.id === focusedItemId ? { ...c, fontSize: Math.max(6, c.fontSize - 1) } : c
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
                                  return { ...item, fontSize: Math.max(6, item.fontSize - 1) };
                                }
                                return item;
                              });
                            }
                            return updated;
                          });
                        }
                      }}
                      className="flex-1 py-1.5 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 text-center"
                    >
                      A - (Shrink)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (focusedItemId.startsWith('custom-')) {
                          setCustomTexts((prev) => {
                            const updated = { ...prev };
                            for (const pageIdx in updated) {
                              updated[pageIdx] = updated[pageIdx].map((c) =>
                                c.id === focusedItemId ? { ...c, fontSize: Math.min(72, c.fontSize + 1) } : c
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
                                  return { ...item, fontSize: Math.min(72, item.fontSize + 1) };
                                }
                                return item;
                              });
                            }
                            return updated;
                          });
                        }
                      }}
                      className="flex-1 py-1.5 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 text-center"
                    >
                      A + (Grow)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Helpful fallback panel before selecting word */
              <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800 rounded-xl text-center space-y-2 select-none">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <LucideIcon name="CursorClick" size={14} className="animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">
                    Interactive Workspace
                  </h4>
                  <p className="text-[10.5px] text-slate-400 leading-normal">
                    Click any word directly in the document page to modify characters, change font-framer weights, and dynamically tune sizes with precision.
                  </p>
                </div>
              </div>
            )}

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
                        [itemId]: {
                          value: val,
                          color: prev[itemId]?.color || fontColors[itemId] || '#000000',
                          fontFamily: prev[itemId]?.fontFamily || (pageTextMap[pageIdx]?.find(i => i.id === itemId)?.fontFamilyKey),
                        },
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
                    fontColors={fontColors}
                    onColorsSampled={(itemId, bgColor, textColor) => {
                      setBgColors((prev) => {
                        if (prev[itemId] === bgColor) return prev;
                        return { ...prev, [itemId]: bgColor };
                      });
                      setFontColors((prev) => {
                        if (prev[itemId] === textColor) return prev;
                        return { ...prev, [itemId]: textColor };
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
  fontColors: { [itemId: string]: string };
  onColorsSampled: (itemId: string, bgColor: string, textColor: string) => void;
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
  fontColors,
  onColorsSampled,
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
            // Guarantee a solid white background backing so transparency is handled elegantly and pixels match perfectly
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
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

  // Sample colors from background and text strokes when document completes fully rendering
  useEffect(() => {
    if (isRendered && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          const getPixel = (x: number, y: number) => {
            const nx = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)));
            const ny = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)));
            const idx = (ny * canvas.width + nx) * 4;
            return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
          };

          textItems.forEach((item) => {
            try {
              // sample background slightly left-top offset
              const bgPixel = getPixel(item.left - 4, item.top - 4);
              let bgColor = 'rgb(255, 255, 255)';
              if (bgPixel[3] > 10) {
                bgColor = `rgb(${bgPixel[0]}, ${bgPixel[1]}, ${bgPixel[2]})`;
              }

              // Scan horizontal and vertical coordinates to find the text stroke color (highest distance from background)
              let maxDist = -1;
              let bestColor = 'rgb(0, 0, 0)';

              // Scan horizontal lines across the word
              const yOffsets = [0.3, 0.4, 0.5, 0.6, 0.7];
              const xFactors = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

              for (const yOffset of yOffsets) {
                const cy = item.top + item.height * yOffset;
                for (const xFactor of xFactors) {
                  const cx = item.left + item.width * xFactor;
                  const p = getPixel(cx, cy);
                  if (p[3] > 10) {
                    const dist = Math.abs(p[0] - bgPixel[0]) + Math.abs(p[1] - bgPixel[1]) + Math.abs(p[2] - bgPixel[2]);
                    if (dist > maxDist) {
                      maxDist = dist;
                      bestColor = `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
                    }
                  }
                }
              }

              const isDarkBg = (bgPixel[0] * 0.299 + bgPixel[1] * 0.587 + bgPixel[2] * 0.114) < 128;
              const fallbackTextColor = isDarkBg ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
              const textColor = maxDist > 40 ? bestColor : fallbackTextColor;

              onColorsSampled(item.id, bgColor, textColor);
            } catch (e) {
              onColorsSampled(item.id, '#ffffff', '#000000');
            }
          });
        } catch (e) {
          console.error("Canvas pixel sampling error:", e);
        }
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
            const bg = '#ffffff'; // Force clean white background masking to perfectly blend with white canvas

            const baselineY = item.top + item.height;
            const paddingX = 1.5;
            const paddingY = 0.5;
            const coverX = item.left - paddingX;
            const coverY = baselineY - (item.ascent * item.fontSize) - paddingY;
            const coverHeight = (item.ascent - item.descent) * item.fontSize + 2 * paddingY;

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
                    left: `${coverX}px`,
                    top: `${coverY}px`,
                    width: `${item.width + 2 * paddingX}px`,
                    height: `${coverHeight}px`,
                  }}
                  title="Click to edit word"
                />
              );
            }

            // Word is being actively edited or is focused
            const originalColor = fontColors[item.id] || '#000000';
            const estimatedWidth = currentVal.length === 0 ? 10 : Math.max(item.width, (currentVal.length / item.originalStr.length) * item.width);

            const activeFontMeta = STANDARD_FONTS.find(f => f.key === (edit?.fontFamily || item.fontFamilyKey)) || STANDARD_FONTS[0];
            const activeWeight = edit?.fontFamily ? activeFontMeta.weight : item.fontWeight;
            const activeStyle = edit?.fontFamily ? 'normal' : item.fontStyle;

            return (
              <div
                key={item.id}
                className={`absolute transition-all rounded group ${
                  isFocused
                    ? 'ring-1.5 ring-blue-500 z-30 shadow-sm'
                    : 'z-20 border border-transparent'
                }`}
                style={{
                  left: `${coverX}px`,
                  top: `${coverY}px`,
                  width: `${estimatedWidth + 2 * paddingX}px`,
                  height: `${coverHeight}px`,
                  backgroundColor: bg, // Cover the underlying original vector canvas text with pure matching white
                }}
              >
                <input
                  type="text"
                  value={currentVal}
                  autoFocus={isFocused}
                  onFocus={() => setFocusedItemId(item.id)}
                  onChange={(e) => onTextOverrideChange(item.id, e.target.value)}
                  className="w-full h-full bg-transparent border-none outline-none leading-none select-text cursor-text p-0 m-0 text-left caret-blue-500"
                  style={{
                    fontSize: `${item.fontSize}px`,
                    fontFamily: activeFontMeta.css,
                    fontWeight: activeWeight,
                    fontStyle: activeStyle,
                    letterSpacing: `${item.charSpacing}px`,
                    color: edit?.color || originalColor,
                    lineHeight: '1',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
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
          {customTextItems.map((cust) => {
            const fontMeta = STANDARD_FONTS.find(f => f.key === cust.fontFamily) || STANDARD_FONTS[0];
            return (
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
                  onFocus={() => setFocusedItemId(cust.id)}
                  onChange={(e) => onCustomTextChange(cust.id, e.target.value)}
                  className="bg-transparent border-none outline-none focus:bg-white dark:focus:bg-slate-900 border-b border-dashed border-blue-500/20 text-xs text-left focus:ring-1 focus:ring-blue-500 px-1 py-0.5 rounded"
                  style={{
                    fontSize: `${cust.fontSize}px`,
                    fontFamily: fontMeta.css,
                    fontWeight: fontMeta.weight as any,
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
            );
          })}

        </div>
      )}

      {/* Inline page index badge indicator */}
      <span className="absolute bottom-2.5 right-2.5 bg-slate-900/60 backdrop-blur-md text-white font-mono font-bold text-[9px] px-2 py-1 rounded select-none z-30">
        PAGE {pageNum}
      </span>

    </div>
  );
};
