import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

export default function SignatureResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);

  // Unit and customizable dimensions
  const [unit, setUnit] = useState<'px' | 'cm'>('px');
  const [widthPx, setWidthPx] = useState<string>('280');
  const [heightPx, setHeightPx] = useState<string>('120');
  const [widthCm, setWidthCm] = useState<string>('4.5');
  const [heightCm, setHeightCm] = useState<string>('2.0');
  const [dpi, setDpi] = useState<number>(200);
  const [customDpi, setCustomDpi] = useState<string>('200');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);

  // Contrast / Ink Processing
  const [contrastFilter, setContrastFilter] = useState<'normal' | 'high-contrast-monochrome' | 'greyscale'>('high-contrast-monochrome');
  const [threshold, setThreshold] = useState<number>(140);
  
  // Cropping framing adjustments (panning and zoom)
  const [zoom, setZoom] = useState<number>(100);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);

  // Output encoding
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png'>('jpg');
  const [quality, setQuality] = useState<number>(0.65);
  const [actualByteSize, setActualByteSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'processed' | 'original'>('processed');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto trigger process on state changes
  useEffect(() => {
    if (imageSrc) {
      applySignatureRules();
    }
  }, [
    imageSrc, unit, widthPx, heightPx, widthCm, heightCm, dpi, maintainAspectRatio,
    contrastFilter, threshold, zoom, offsetX, offsetY, outputFormat, quality
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      loadSignature(selectedFile);
    }
  };

  const loadSignature = (selectedFile: File) => {
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setImageSrc(url);
    setPreviewTab('processed');

    // Fetch initial parameters to preset ratio
    const tempImg = new Image();
    tempImg.onload = () => {
      setNaturalWidth(tempImg.width);
      setNaturalHeight(tempImg.height);
      setZoom(100);
      setOffsetX(0);
      setOffsetY(0);

      if (maintainAspectRatio) {
        const ratio = tempImg.height / tempImg.width;
        if (unit === 'px') {
          const computedHeight = Math.round(280 * ratio).toString();
          setHeightPx(computedHeight);
          setWidthPx('280');
        } else {
          const computedHeight = (4.5 * ratio).toFixed(1);
          setHeightCm(computedHeight);
          setWidthCm('4.5');
        }
      }
    };
    tempImg.onerror = () => {
      console.error("Failed to load original signature dimension check.");
    };
    tempImg.src = url;
  };

  const handleWidthChange = (val: string) => {
    if (unit === 'px') {
      setWidthPx(val);
      const w = parseInt(val, 10);
      if (maintainAspectRatio && w > 0 && naturalWidth > 0 && naturalHeight > 0) {
        const ratio = naturalHeight / naturalWidth;
        setHeightPx(Math.round(w * ratio).toString());
      }
    } else {
      setWidthCm(val);
      const w = parseFloat(val);
      if (maintainAspectRatio && w > 0 && naturalWidth > 0 && naturalHeight > 0) {
        const ratio = naturalHeight / naturalWidth;
        setHeightCm((w * ratio).toFixed(1));
      }
    }
  };

  const handleHeightChange = (val: string) => {
    if (unit === 'px') {
      setHeightPx(val);
      const h = parseInt(val, 10);
      if (maintainAspectRatio && h > 0 && naturalWidth > 0 && naturalHeight > 0) {
        const ratio = naturalWidth / naturalHeight;
        setWidthPx(Math.round(h * ratio).toString());
      }
    } else {
      setHeightCm(val);
      const h = parseFloat(val);
      if (maintainAspectRatio && h > 0 && naturalWidth > 0 && naturalHeight > 0) {
        const ratio = naturalWidth / naturalHeight;
        setWidthCm((h * ratio).toFixed(1));
      }
    }
  };

  const applySignatureRules = () => {
    if (!imageSrc) return;

    // Check if input values are incomplete during active typing, skip to avoid flashing loaders
    if (unit === 'px') {
      const w = parseInt(widthPx, 10);
      const h = parseInt(heightPx, 10);
      if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return;
    } else {
      const w = parseFloat(widthCm);
      const h = parseFloat(heightCm);
      if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return;
    }

    setIsProcessing(true);

    const img = new Image();
    
    // Register onload first to prevent instantaneous-cached load race conditions
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        // Determine dimensions based on selected unit
        let finalW = 280;
        let finalH = 120;

        if (unit === 'px') {
          finalW = parseInt(widthPx, 10);
          if (isNaN(finalW)) finalW = 280;
          finalH = parseInt(heightPx, 10);
          if (isNaN(finalH)) finalH = 120;
        } else {
          let wCm = parseFloat(widthCm);
          if (isNaN(wCm)) wCm = 4.5;
          let hCm = parseFloat(heightCm);
          if (isNaN(hCm)) hCm = 2.0;
          const chosenDpi = dpi || 200;
          finalW = Math.round((wCm / 2.54) * chosenDpi);
          finalH = Math.round((hCm / 2.54) * chosenDpi);
        }

        // Safeguard sizes to prevent memory overflow and DOM exceptions
        if (isNaN(finalW) || finalW <= 0) finalW = 10;
        if (isNaN(finalH) || finalH <= 0) finalH = 10;
        if (finalW > 5000) finalW = 5000;
        if (finalH > 5000) finalH = 5000;

        canvas.width = finalW;
        canvas.height = finalH;

        // Fill basic paper background (white backdrop for digital forms)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalW, finalH);

        ctx.save();
        
        ctx.beginPath();
        ctx.rect(0, 0, finalW, finalH);
        ctx.clip();

        const scale = (Number(zoom) || 100) / 100;
        const imgRatio = img.width > 0 ? img.height / img.width : 1;

        let drawW = finalW * scale;
        let drawH = drawW * imgRatio;

        // Adjust to fully cover or fit appropriately
        if (drawH < finalH) {
          drawH = finalH * scale;
          drawW = drawH / imgRatio;
        }

        const drawX = (finalW - drawW) / 2 + (Number(offsetX) || 0);
        const drawY = (finalH - drawH) / 2 + (Number(offsetY) || 0);

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Read pixel arrays to perform high-fidelity filters
        const imgData = ctx.getImageData(0, 0, finalW, finalH);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const alpha = data[i + 3];

          if (alpha === 0) continue;

          // Visual luminance greyscale coefficient
          const brightness = 0.34 * r + 0.5 * g + 0.16 * b;

          if (contrastFilter === 'greyscale') {
            data[i] = brightness;
            data[i + 1] = brightness;
            data[i + 2] = brightness;
          } else if (contrastFilter === 'high-contrast-monochrome') {
            // Filter notebook paper shadows based on slider threshold
            if (brightness > threshold) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
            } else {
              // Apply solid secure dark navy blue color block for official ink appearance
              data[i] = 12;
              data[i + 1] = 20;
              data[i + 2] = 55;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : 'image/png';
        const dataUrl = canvas.toDataURL(mimeType, outputFormat === 'jpg' ? quality : undefined);

        // Estimate final file footprint bytes
        const headerLength = mimeType === 'image/jpeg' ? 'data:image/jpeg;base64,'.length : 'data:image/png;base64,'.length;
        const base64Length = dataUrl.length - headerLength;
        const computedBytes = Math.ceil(base64Length * 3 / 4);
        setActualByteSize(computedBytes);

        if (downloadUrl) {
          // Check if it starts with blob before revoking, but since it is dataUrl from toDataURL, no need.
        }
        setDownloadUrl(dataUrl);
        setIsProcessing(false);
      } catch (err) {
        console.error("Signature processing error:", err);
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      console.error("Signature failed to load onto diagnostic image object.");
      setIsProcessing(false);
    };

    img.src = imageSrc;
  };

  const selectPreset = (w: string, h: string, unitType: 'px' | 'cm', aspectLock: boolean) => {
    setUnit(unitType);
    setMaintainAspectRatio(aspectLock);
    if (unitType === 'px') {
      setWidthPx(w);
      setHeightPx(h);
    } else {
      setWidthCm(w);
      setHeightCm(h);
    }
    // Auto center framing
    setOffsetX(0);
    setOffsetY(0);
    setZoom(100);
  };

  const handleReset = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setFile(null);
    setImageSrc(null);
    setDownloadUrl(null);
    setActualByteSize(0);
  };

  const formatByteSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div id="signature-resizer-workspace" className="space-y-6">
      
      {/* Title block */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
          <LucideIcon name="PenTool" size={20} />
        </div>
        <div>
          <h3 className="font-display font-extrabold text-lg text-slate-805 dark:text-slate-105">
            Portal Signature Resizer & Cropper
          </h3>
          <p className="text-xs text-slate-400">
            Normalize handwriting signature captures. Scale, frame, crop, and compress to any custom size or DPI in client sandbox memory.
          </p>
        </div>
      </div>

      {!imageSrc ? (
        <div
          id="sig-uploader"
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-emerald-500 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 cursor-pointer transition-all dynamic-fadeIn"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-slate-850/30 text-emerald-500 flex items-center justify-center shadow-inner animate-pulse">
            <LucideIcon name="PenTool" size={26} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Upload handwritten signature image, or <span className="text-emerald-555 dark:text-cyan-400 font-bold">browse</span>
            </p>
            <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto">
              Snap a clean photo of your signature from legal white paper and process it fully locally without cloud leaks.
            </p>
          </div>
        </div>
      ) : (
        <div id="sig-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
          
          {/* Settings form column (Left) */}
          <div className="lg:col-span-5 space-y-5 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
            
            {/* Presets and custom selections */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Standard Government Presets
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => selectPreset('280', '120', 'px', true)}
                  className="py-1.5 px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-left text-slate-600 dark:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer"
                >
                  <span className="text-indigo-600 dark:text-cyan-400 font-extrabold text-[11px]">Standard India Portal</span>
                  <span>280 × 120 Pixels</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectPreset('140', '60', 'px', true)}
                  className="py-1.5 px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-left text-slate-600 dark:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer"
                >
                  <span className="text-indigo-600 dark:text-cyan-400 font-extrabold text-[11px]">SBI Bank Portal</span>
                  <span>140 × 60 Pixels</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectPreset('250', '120', 'px', true)}
                  className="py-1.5 px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-left text-slate-600 dark:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer"
                >
                  <span className="text-emerald-500 font-extrabold text-[11px]">IBPS Clerk / PO</span>
                  <span>250 × 120 Pixels</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectPreset('350', '350', 'px', true)}
                  className="py-1.5 px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-left text-slate-600 dark:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer"
                >
                  <span className="text-emerald-500 font-extrabold text-[11px]">UPSC Portal</span>
                  <span>350 × 350 Pixels (1:1 Ratio)</span>
                </button>
              </div>
            </div>

            {/* Scale unit configuration tab */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Dimension Scaling Mode</label>
              <div className="flex p-0.5 bg-slate-150 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-850 text-xs">
                <button
                  type="button"
                  onClick={() => setUnit('px')}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer text-center ${
                    unit === 'px'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-450 hover:text-slate-700'
                  }`}
                >
                  Pixels Size (px)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer text-center ${
                    unit === 'cm'
                      ? 'bg-white dark:bg-slate-805 text-indigo-600 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-455 hover:text-slate-700'
                  }`}
                >
                  Physical CM & DPI
                </button>
              </div>
            </div>

            {/* Checkbox ratio lock */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Maintain Aspect Ratio</span>
                <p className="text-[10px] text-slate-400">Lock width and height to same proportion lock</p>
              </div>
              <input
                id="sig-aspect-ratio-toggle"
                type="checkbox"
                checked={maintainAspectRatio}
                onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                className="w-4.5 h-4.5 text-indigo-650 dark:text-cyan-400 accent-indigo-605 dark:accent-cyan-450 rounded cursor-pointer"
              />
            </div>

            {/* Width and Height numbers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {unit === 'px' ? 'Width (px)' : 'Width (CM)'}
                </label>
                <input
                  type="number"
                  step={unit === 'px' ? '1' : '0.1'}
                  min="0.1"
                  value={unit === 'px' ? widthPx : widthCm}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 font-mono outline-none focus:border-indigo-605"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {unit === 'px' ? 'Height (px)' : 'Height (CM)'}
                </label>
                <input
                  type="number"
                  step={unit === 'px' ? '1' : '0.1'}
                  min="0.1"
                  value={unit === 'px' ? heightPx : heightCm}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 font-mono outline-none focus:border-indigo-605"
                />
              </div>
            </div>

            {/* DPI parameters (Visible when Unit is CM) */}
            {unit === 'cm' && (
              <div className="space-y-2 animate-fadeIn p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>DPI Resolution</span>
                  <span className="font-mono text-[9px] text-indigo-500">Current: {dpi} DPI</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[100, 150, 200, 300].map((stepDpi) => (
                    <button
                      key={stepDpi}
                      type="button"
                      onClick={() => {
                        setDpi(stepDpi);
                        setCustomDpi(stepDpi.toString());
                      }}
                      className={`py-1 text-[9px] font-bold rounded-md border transition-all cursor-pointer ${
                        dpi === stepDpi
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-750 dark:bg-slate-800 dark:text-cyan-400'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {stepDpi} DPI
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={customDpi}
                  onChange={(e) => {
                    setCustomDpi(e.target.value);
                    const d = parseInt(e.target.value, 10);
                    if (d > 0) setDpi(d);
                  }}
                  placeholder="Custom e.g. 250"
                  className="w-full text-xs px-3 py-1.5 mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg font-mono outline-none text-slate-700 dark:text-slate-300"
                />
              </div>
            )}

            {/* Background enhancement controls */}
            <div className="p-3.5 bg-white dark:bg-slate-950 rounded-xl border border-[#f1f5f9] dark:border-slate-850 space-y-3 shadow-inner">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Background Eraser & Contrast
              </label>
              
              <select
                value={contrastFilter}
                onChange={(e) => setContrastFilter(e.target.value as any)}
                className="w-full text-xs px-2.5 py-2.0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg outline-none"
              >
                <option value="high-contrast-monochrome">Perfect White Backdrop (Clears Notebook Shadows)</option>
                <option value="greyscale">Simple Greyscale</option>
                <option value="normal">Keep Original Hue / Color</option>
              </select>

              {/* Slider threshold if monochrome active */}
              {contrastFilter === 'high-contrast-monochrome' && (
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-900">
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 font-bold font-mono">
                    <span>Eraser Sensitivity Threshold:</span>
                    <span className="text-indigo-650 dark:text-cyan-400 font-extrabold">{threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="220"
                    step="2"
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-805 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-cyan-400"
                  />
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Adjust to instantly filter paper textures and laptop/camera dark shadows.
                  </p>
                </div>
              )}
            </div>

            {/* Interactive Crops and zooms */}
            <div className="space-y-4 pt-3 border-t border-slate-200/40 dark:border-slate-850/50">
              <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Signature Framing & Crop
              </h5>

              {/* Zoom control bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Zoom Ink:</span>
                  <span className="font-mono text-indigo-600 dark:text-cyan-400 font-bold">{zoom}%</span>
                </div>
                <input
                  type="range"
                  min="55"
                  max="250"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-805 rounded-lg appearance-none cursor-pointer accent-indigo-605 dark:accent-cyan-400"
                />
              </div>

              {/* Pan Horizontal / Vertical */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Pan Horizontal</div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    value={offsetX}
                    onChange={(e) => setOffsetX(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-805 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Pan Vertical</div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    value={offsetY}
                    onChange={(e) => setOffsetY(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-805 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Quality footprint parameters */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Output Format</label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                >
                  <option value="jpg">JPG (Standard Portal)</option>
                  <option value="png">PNG Vector Format</option>
                </select>
              </div>

              {outputFormat === 'jpg' && (
                <div className="space-y-0.5 animate-fadeIn">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weight Compression</label>
                  <input
                    type="range"
                    min="0.25"
                    max="0.95"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full h-1.5 mt-2 accent-emerald-500 bg-slate-200 dark:bg-slate-800 rounded-lg"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2.5 bg-slate-250 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-705 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-300/30 text-slate-700"
            >
              Choose Different Signature
            </button>
          </div>

          {/* Sizing frame visual preview column (Right) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-2">
              <h4 className="font-display font-medium text-slate-405 dark:text-slate-500 text-xs uppercase tracking-wider">
                Filtered Signature Ink Preview
              </h4>
              
              <div className="flex p-0.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-[10px] border border-slate-200/40">
                <button
                  type="button"
                  onClick={() => setPreviewTab('processed')}
                  className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer ${
                    previewTab === 'processed'
                      ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-450 hover:text-slate-700'
                  }`}
                >
                  Processed Signature
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('original')}
                  className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer ${
                    previewTab === 'original'
                      ? 'bg-white dark:bg-slate-800 text-indigo-605 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-455 hover:text-slate-700'
                  }`}
                >
                  Original Snapshot
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-850 p-6 flex flex-col items-center justify-center min-h-[350px]">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-indigo-600 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Rebuilding resized ink fibers...</span>
                </div>
              ) : previewTab === 'processed' && downloadUrl ? (
                <div className="space-y-5 text-center max-w-full">
                  
                  {/* Image container frame */}
                  <div className="border border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-900 px-6 py-5 rounded-2xl inline-block shadow-md select-none">
                    <img
                      src={downloadUrl}
                      alt="Normalized ink signature"
                      referrerPolicy="no-referrer"
                      className="max-h-[160px] max-w-full object-contain border border-slate-300 shadow p-1 bg-white rounded"
                    />
                  </div>

                  {/* Weight verification details box */}
                  <div className="bg-white dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1.5 max-w-sm mx-auto text-center shadow-inner">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider font-mono">
                      File Portal Compliance Verification
                    </span>
                    <div className="flex items-center justify-center gap-4 pt-1">
                      <div className="text-center">
                        <span className="text-[9px] text-slate-400 block leading-none">Resulting Weight</span>
                        <span className={`text-xs font-mono font-black ${actualByteSize < 20 * 1024 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {formatByteSize(actualByteSize)}
                        </span>
                      </div>
                      <div className="border-l border-slate-200 dark:border-slate-800 h-6" />
                      <div className="text-center">
                        <span className="text-[9px] text-slate-400 block leading-none">Government Limits</span>
                        <span className={`text-[10px] font-bold ${actualByteSize < 20 * 1024 && actualByteSize > 2 * 1024 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {actualByteSize < 20 * 1024 ? 'Under 20KB Limit ✓' : 'Exceeds 20KB limit'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 max-w-sm mx-auto">
                    <a
                      href={downloadUrl}
                      download={`toolmitra_signature_${unit === 'px' ? widthPx + 'x' + heightPx + 'px' : widthCm + 'x' + heightCm + 'cm'}.${outputFormat}`}
                      className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-705 text-white font-bold text-xs py-3.5 px-6 rounded-xl shadow-md cursor-pointer hover:scale-102 transition-all outline-none"
                    >
                      <LucideIcon name="Download" size={14} />
                      <span>Download Clean Signature JPG</span>
                    </a>
                  </div>

                </div>
              ) : previewTab === 'original' && imageSrc ? (
                <div className="space-y-4 text-center max-w-full">
                  <div className="p-4 border border-slate-200 dark:border-slate-805 bg-slate-100/50 dark:bg-slate-900 rounded-xl inline-block shadow-md select-none">
                    <img
                      src={imageSrc}
                      alt="Original uploaded signature"
                      referrerPolicy="no-referrer"
                      className="max-h-[160px] max-w-full object-contain border border-slate-300 p-1 bg-white rounded"
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Original Snapshot Upload
                  </div>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Notebook shadow elements are still present. Toggle the "Processed Signature" tab to check shadow eraser.
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <LucideIcon name="PenTool" className="text-slate-350 mx-auto animate-bounce" size={40} />
                  <p className="text-slate-450 text-xs">Awaiting handwritten signature photo upload...</p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
