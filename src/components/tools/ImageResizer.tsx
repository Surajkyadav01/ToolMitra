import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

export default function ImageResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);

  // Sizing inputs
  const [unit, setUnit] = useState<'px' | 'cm' | 'in' | '%'>('px');
  const [widthPx, setWidthPx] = useState<string>('');
  const [heightPx, setHeightPx] = useState<string>('');
  const [widthCm, setWidthCm] = useState<string>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [widthIn, setWidthIn] = useState<string>('');
  const [heightIn, setHeightIn] = useState<string>('');
  const [percentScale, setPercentScale] = useState<number>(100);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [dpi, setDpi] = useState<number>(300);
  const [customDpi, setCustomDpi] = useState<string>('300');

  // Compression & Format options
  const [compressAlso, setCompressAlso] = useState<boolean>(false);
  const [quality, setQuality] = useState<number>(0.8);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [actualByteSize, setActualByteSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-run resizer on parameter updates
  useEffect(() => {
    if (imageSrc && originalWidth > 0) {
      executeResize();
    }
  }, [
    imageSrc, originalWidth, originalHeight, unit,
    widthPx, heightPx, widthCm, heightCm, widthIn, heightIn,
    percentScale, maintainAspect, dpi, compressAlso, quality, format
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      loadFileData(selectedFile);
    }
  };

  const loadFileData = (selectedFile: File) => {
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setImageSrc(url);
    setIsProcessing(true);

    const img = new Image();
    img.onload = () => {
      setOriginalWidth(img.width);
      setOriginalHeight(img.height);
      
      // Preset dimensions across units
      setWidthPx(img.width.toString());
      setHeightPx(img.height.toString());

      const wCm = ((img.width * 2.54) / dpi).toFixed(2);
      const hCm = ((img.height * 2.54) / dpi).toFixed(2);
      setWidthCm(wCm);
      setHeightCm(hCm);

      const wIn = (img.width / dpi).toFixed(2);
      const hIn = (img.height / dpi).toFixed(2);
      setWidthIn(wIn);
      setHeightIn(hIn);

      setPercentScale(100);
      setIsProcessing(false);
    };
    img.onerror = () => {
      console.error("Failed to load image attributes.");
      setIsProcessing(false);
    };
    img.src = url;
  };

  const handleWidthChange = (val: string) => {
    if (unit === 'px') {
      setWidthPx(val);
      const wNum = parseFloat(val);
      if (maintainAspect && originalWidth > 0 && originalHeight > 0 && wNum > 0) {
        const ratio = originalHeight / originalWidth;
        setHeightPx(Math.round(wNum * ratio).toString());
      }
    } else if (unit === 'cm') {
      setWidthCm(val);
      const wNum = parseFloat(val);
      if (maintainAspect && originalWidth > 0 && originalHeight > 0 && wNum > 0) {
        const ratio = originalHeight / originalWidth;
        setHeightCm((wNum * ratio).toFixed(2));
      }
    } else if (unit === 'in') {
      setWidthIn(val);
      const wNum = parseFloat(val);
      if (maintainAspect && originalWidth > 0 && originalHeight > 0 && wNum > 0) {
        const ratio = originalHeight / originalWidth;
        setHeightIn((wNum * ratio).toFixed(2));
      }
    }
  };

  const handleHeightChange = (val: string) => {
    if (unit === 'px') {
      setHeightPx(val);
      const hNum = parseFloat(val);
      if (maintainAspect && originalWidth > 0 && originalHeight > 0 && hNum > 0) {
        const ratio = originalWidth / originalHeight;
        setWidthPx(Math.round(hNum * ratio).toString());
      }
    } else if (unit === 'cm') {
      setHeightCm(val);
      const hNum = parseFloat(val);
      if (maintainAspect && originalWidth > 0 && originalHeight > 0 && hNum > 0) {
        const ratio = originalWidth / originalHeight;
        setWidthCm((hNum * ratio).toFixed(2));
      }
    } else if (unit === 'in') {
      setHeightIn(val);
      const hNum = parseFloat(val);
      if (maintainAspect && originalWidth > 0 && originalHeight > 0 && hNum > 0) {
        const ratio = originalWidth / originalHeight;
        setWidthIn((hNum * ratio).toFixed(2));
      }
    }
  };

  const handleUnitChange = (newUnit: 'px' | 'cm' | 'in' | '%') => {
    // Synchronize values based on previous target pixels
    let currentW_px = originalWidth;
    let currentH_px = originalHeight;

    if (unit === 'px') {
      currentW_px = parseInt(widthPx, 10) || originalWidth;
      currentH_px = parseInt(heightPx, 10) || originalHeight;
    } else if (unit === 'cm') {
      const wCm = parseFloat(widthCm) || ((originalWidth * 2.54) / dpi);
      const hCm = parseFloat(heightCm) || ((originalHeight * 2.54) / dpi);
      currentW_px = Math.round((wCm / 2.54) * dpi);
      currentH_px = Math.round((hCm / 2.54) * dpi);
    } else if (unit === 'in') {
      const wIn = parseFloat(widthIn) || (originalWidth / dpi);
      const hIn = parseFloat(heightIn) || (originalHeight / dpi);
      currentW_px = Math.round(wIn * dpi);
      currentH_px = Math.round(hIn * dpi);
    } else if (unit === '%') {
      currentW_px = Math.round((originalWidth * percentScale) / 100);
      currentH_px = Math.round((originalHeight * percentScale) / 100);
    }

    setUnit(newUnit);

    // Seed new unit inputs instantly
    if (newUnit === 'px') {
      setWidthPx(currentW_px.toString());
      setHeightPx(currentH_px.toString());
    } else if (newUnit === 'cm') {
      setWidthCm(((currentW_px * 2.54) / dpi).toFixed(2));
      setHeightCm(((currentH_px * 2.54) / dpi).toFixed(2));
    } else if (newUnit === 'in') {
      setWidthIn((currentW_px / dpi).toFixed(2));
      setHeightIn((currentH_px / dpi).toFixed(2));
    } else if (newUnit === '%') {
      const scaleVal = Math.round((currentW_px / originalWidth) * 100);
      setPercentScale(Math.min(Math.max(scaleVal, 10), 200));
    }
  };

  const executeResize = () => {
    if (!imageSrc) return;
    setIsProcessing(true);

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        let w = originalWidth;
        let h = originalHeight;

        if (unit === 'px') {
          const parsedW = parseInt(widthPx, 10);
          const parsedH = parseInt(heightPx, 10);
          if (isNaN(parsedW) || isNaN(parsedH) || parsedW <= 0 || parsedH <= 0) {
            // Wait for user to finish typing valid values, don't collapse preview
            setIsProcessing(false);
            return;
          }
          w = parsedW;
          h = parsedH;
        } else if (unit === 'cm') {
          const wCm = parseFloat(widthCm);
          const hCm = parseFloat(heightCm);
          if (isNaN(wCm) || isNaN(hCm) || wCm <= 0 || hCm <= 0) {
            setIsProcessing(false);
            return;
          }
          w = Math.round((wCm / 2.54) * dpi);
          h = Math.round((hCm / 2.54) * dpi);
        } else if (unit === 'in') {
          const wIn = parseFloat(widthIn);
          const hIn = parseFloat(heightIn);
          if (isNaN(wIn) || isNaN(hIn) || wIn <= 0 || hIn <= 0) {
            setIsProcessing(false);
            return;
          }
          w = Math.round(wIn * dpi);
          h = Math.round(hIn * dpi);
        } else if (unit === '%') {
          w = Math.round((originalWidth * percentScale) / 100);
          h = Math.round((originalHeight * percentScale) / 100);
        }

        // Safeguards to prevent memory overflow and DOM exceptions
        if (w > 15000) w = 15000;
        if (h > 15000) h = 15000;

        canvas.width = w;
        canvas.height = h;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, w, h);

        const currentQuality = compressAlso ? quality : 0.95;
        const dataUrl = canvas.toDataURL(format, format === 'image/png' ? undefined : currentQuality);

        setDownloadUrl(dataUrl);

        // Estimate byte size
        const headerLength = format === 'image/jpeg' ? 'data:image/jpeg;base64,'.length : 
                            format === 'image/png' ? 'data:image/png;base64,'.length : 
                            'data:image/webp;base64,'.length;
        const base64Length = dataUrl.length - headerLength;
        const computedBytes = Math.ceil(base64Length * 3 / 4);
        setActualByteSize(computedBytes);

        setIsProcessing(false);
      } catch (err) {
        console.error("Scale transformation error:", err);
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      console.error("Failed to load resizer workspace canvas object.");
      setIsProcessing(false);
    };

    img.src = imageSrc;
  };

  const handleReset = () => {
    setFile(null);
    setImageSrc(null);
    setOriginalWidth(0);
    setOriginalHeight(0);
    setWidthPx('');
    setHeightPx('');
    setWidthCm('');
    setHeightCm('');
    setWidthIn('');
    setHeightIn('');
    setPercentScale(100);
    setDownloadUrl(null);
    setActualByteSize(0);
  };

  const formatByteSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div id="image-resizer-container" className="space-y-6">
      
      {/* Title section */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
          <LucideIcon name="Maximize2" size={20} />
        </div>
        <div>
          <h3 className="font-display font-extrabold text-lg text-slate-800 dark:text-slate-100">
            Image Resizer Online
          </h3>
          <p className="text-xs text-slate-400">
            Scale width & height dimensions in pixel, centimeters or inches with active memory compression.
          </p>
        </div>
      </div>

      {!imageSrc ? (
        <div
          id="resize-upload-zone"
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-all cursor-pointer dynamic-fadeIn"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-slate-855/35 text-blue-500 flex items-center justify-center shadow-inner animate-pulse">
            <LucideIcon name="Upload" size={26} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Drag and drop an image, or <span className="text-blue-500 font-bold">browse</span>
            </p>
            <p className="text-xs text-slate-400">Secure client sandboxed memory resizing. Fast loading!</p>
          </div>
        </div>
      ) : (
        <div id="resize-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
          
          {/* Sizing controls panel */}
          <div className="lg:col-span-5 space-y-5 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-201 dark:border-slate-800/85">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Resize Dimensions
            </h4>

            {/* Segmented control for Scale Unit Choices */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-150 dark:bg-slate-950 rounded-xl text-[11px] font-bold border border-slate-200/50">
              <button
                type="button"
                onClick={() => handleUnitChange('px')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                  unit === 'px'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Pixel
              </button>
              <button
                type="button"
                onClick={() => handleUnitChange('cm')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                  unit === 'cm'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-400 shadow-sm'
                    : 'text-slate-450 hover:text-slate-700'
                }`}
              >
                Centimeter
              </button>
              <button
                type="button"
                onClick={() => handleUnitChange('in')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                  unit === 'in'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-400 shadow-sm'
                    : 'text-slate-450 hover:text-slate-700'
                }`}
              >
                Inch
              </button>
              <button
                type="button"
                onClick={() => handleUnitChange('%')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                  unit === '%'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-400 shadow-sm'
                    : 'text-slate-450 hover:text-slate-700'
                }`}
              >
                Percentage
              </button>
            </div>

            {/* Sizing Numerical Inputs */}
            {unit !== '%' ? (
              <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {unit === 'px' ? 'Width (px)' : unit === 'cm' ? 'Width (cm)' : 'Width (in)'}
                  </label>
                  <input
                    type="number"
                    step={unit === 'px' ? '1' : '0.01'}
                    value={unit === 'px' ? widthPx : unit === 'cm' ? widthCm : widthIn}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-mono focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {unit === 'px' ? 'Height (px)' : unit === 'cm' ? 'Height (cm)' : 'Height (in)'}
                  </label>
                  <input
                    type="number"
                    step={unit === 'px' ? '1' : '0.01'}
                    value={unit === 'px' ? heightPx : unit === 'cm' ? heightCm : heightIn}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-mono focus:border-blue-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 animate-fadeIn">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <span>Scale Factor Percentage:</span>
                  <span className="font-mono text-blue-500 font-extrabold">{percentScale}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={percentScale}
                  onChange={(e) => setPercentScale(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono font-medium">
                  <span>10% (Tiny)</span>
                  <span>100% (Original)</span>
                  <span>200% (Double Size)</span>
                </div>
              </div>
            )}

            {/* DPI Configuration (Visible for cm/in layout calculations) */}
            {(unit === 'cm' || unit === 'in') && (
              <div className="space-y-2 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 animate-fadeIn">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>DPI Resolution</span>
                  <span className="font-mono text-[9px] text-blue-500">Current: {dpi} DPI</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[150, 200, 300].map((stepDpi) => (
                    <button
                      key={stepDpi}
                      type="button"
                      onClick={() => {
                        setDpi(stepDpi);
                        setCustomDpi(stepDpi.toString());
                      }}
                      className={`py-1 text-[9px] font-bold rounded-md border transition-all cursor-pointer ${
                        dpi === stepDpi
                          ? 'border-blue-500 bg-blue-50/50 text-blue-700 dark:bg-slate-800 dark:text-cyan-400'
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
                  placeholder="Custom e.g. 100"
                  className="w-full text-xs px-3 py-1.5 mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg font-mono outline-none text-slate-705 dark:text-slate-350"
                />
              </div>
            )}

            {/* Aspect lock ratio */}
            {unit !== '%' && (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Maintain Aspect Ratio</span>
                  <p className="text-[10px] text-slate-400">Lock proportions to prevent distortion</p>
                </div>
                <input
                  type="checkbox"
                  checked={maintainAspect}
                  onChange={(e) => {
                    setMaintainAspect(e.target.checked);
                    if (e.target.checked) {
                      // Instantly force ratio mapping starting from width change
                      if (unit === 'px') handleWidthChange(widthPx);
                      else if (unit === 'cm') handleWidthChange(widthCm);
                      else if (unit === 'in') handleWidthChange(widthIn);
                    }
                  }}
                  className="w-4.5 h-4.5 text-blue-600 accent-blue-500 rounded cursor-pointer"
                />
              </div>
            )}

            {/* "Compress Image Also" custom section */}
            <div className="p-3.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Compress Image Also</span>
                  <p className="text-[10px] text-slate-400">Scale dimensions and reduce file footprint weight</p>
                </div>
                <input
                  type="checkbox"
                  checked={compressAlso}
                  onChange={(e) => setCompressAlso(e.target.checked)}
                  className="w-4.5 h-4.5 text-blue-600 accent-blue-500 rounded cursor-pointer"
                />
              </div>

              {compressAlso && format !== 'image/png' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-900 animate-fadeIn">
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 font-bold font-mono">
                    <span>Quality Multiplier:</span>
                    <span className="text-blue-600 dark:text-cyan-400 font-extrabold">{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.95"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-805 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <p className="text-[9px] text-slate-400 font-medium">
                    Adjust leftwards to decrease resulting kilobytes size instantly.
                  </p>
                </div>
              )}
            </div>

            {/* Output format dropdown selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Export Output Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full text-xs px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-slate-100 rounded-xl outline-none"
              >
                <option value="image/jpeg">JPG (Standard lightweight)</option>
                <option value="image/png">PNG Format (Uncompressed lossless)</option>
                <option value="image/webp">WEBP Next-gen high speed</option>
              </select>
            </div>

            {/* Original image specifications banner */}
            <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850 text-[11px] text-slate-450 space-y-1.5">
              <div className="font-bold text-slate-700 dark:text-slate-200">Original Dimension specs:</div>
              <div className="flex items-center gap-4">
                <div>Width: <span className="font-mono text-slate-800 dark:text-slate-100 font-bold">{originalWidth} px</span></div>
                <div className="border-l border-slate-100 dark:border-slate-900 h-3" />
                <div>Height: <span className="font-mono text-slate-800 dark:text-slate-100 font-bold">{originalHeight} px</span></div>
              </div>
            </div>

            {/* Choice to select reset */}
            <button
              onClick={handleReset}
              className="w-full py-2.5 bg-slate-200 hover:bg-slate-250 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-705 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-300/20 text-slate-700"
            >
              Choose Different Image
            </button>
          </div>

          {/* Output display panel */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <h4 className="font-display font-medium text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">
              Output Transformation Preview
            </h4>

            <div className="flex-1 bg-slate-50 dark:bg-slate-950/40 rounded-3xl border border-slate-150 dark:border-slate-850 p-6 flex flex-col items-center justify-center min-h-[350px] relative">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Rescaling canvas...</span>
                </div>
              ) : downloadUrl ? (
                <div className="space-y-5 text-center max-w-full">
                  <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 rounded-2xl inline-block max-h-[300px] overflow-hidden shadow-md">
                    <img
                      src={downloadUrl}
                      alt="Resized output"
                      referrerPolicy="no-referrer"
                      className="max-h-[250px] max-w-full object-contain rounded"
                    />
                  </div>

                  {/* Realtime Size analysis cards */}
                  <div className="bg-white dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1.5 max-w-sm mx-auto text-center shadow-inner">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider font-mono block">
                      Compliance footprints readout
                    </span>
                    <div className="flex items-center justify-center gap-4 pt-1">
                      <div className="text-center">
                        <span className="text-[9px] text-slate-400 block leading-none mb-1">Final File Weight</span>
                        <span className="text-xs font-mono font-black text-emerald-500">
                          {formatByteSize(actualByteSize)}
                        </span>
                      </div>
                      <div className="border-l border-slate-200 dark:border-slate-800 h-6" />
                      <div className="text-center">
                        <span className="text-[9px] text-slate-400 block leading-none mb-1">Sized Resolution</span>
                        <span className="text-xs font-mono font-bold text-blue-500">
                          {unit === 'px' ? `${widthPx}x${heightPx} px` : 
                           unit === 'cm' ? `${widthCm}x${heightCm} cm` : 
                           unit === 'in' ? `${widthIn}x${heightIn} in` : 
                           `${percentScale}% (${Math.round((originalWidth * percentScale)/100)}x${Math.round((originalHeight * percentScale)/100)} px)`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 max-w-sm mx-auto">
                    <a
                      href={downloadUrl}
                      download={`resized_image_${unit === 'px' ? widthPx + 'x' + heightPx + 'px' : 
                               unit === 'cm' ? widthCm + 'x' + heightCm + 'cm' : 
                               unit === 'in' ? widthIn + 'x' + heightIn + 'in' : 
                               percentScale + 'p'}.${format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg'}`}
                      className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-750 text-white font-bold text-xs py-3.5 px-6 rounded-xl shadow-md cursor-pointer hover:scale-102 transition-all outline-none"
                    >
                      <LucideIcon name="Download" size={14} />
                      <span>Download Resized Image</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <LucideIcon name="Eye" className="text-slate-350 mx-auto animate-bounce" size={40} />
                  <p className="text-slate-450 text-xs">
                    Please upload an image to begin resizing dynamically.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

