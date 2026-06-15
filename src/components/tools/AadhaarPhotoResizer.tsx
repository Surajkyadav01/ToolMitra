import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

export default function AadhaarPhotoResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);

  // Core adjustments requested by the user
  const [widthCm, setWidthCm] = useState<string>('3.5');
  const [heightCm, setHeightCm] = useState<string>('4.5');
  const [dpi, setDpi] = useState<number>(300);
  const [customDpi, setCustomDpi] = useState<string>('300');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png'>('jpg');
  const [compressionQuality, setCompressionQuality] = useState<number>(0.85);

  // Position crop/zoom controls
  const [zoom, setZoom] = useState<number>(100);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [calculatedSize, setCalculatedSize] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recalculate dimensions & render when anything changes
  useEffect(() => {
    if (imageSrc) {
      renderProcessedAadhaarPhoto();
    }
  }, [imageSrc, widthCm, heightCm, dpi, maintainAspectRatio, zoom, offsetX, offsetY, outputFormat, compressionQuality]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      loadPhoto(selectedFile);
    }
  };

  const loadPhoto = (selectedFile: File) => {
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setImageSrc(url);

    // Read natural proportions to pre-align ratio
    const tempImg = new Image();
    tempImg.onload = () => {
      setNaturalWidth(tempImg.width);
      setNaturalHeight(tempImg.height);
      setZoom(100);
      setOffsetX(0);
      setOffsetY(0);

      if (maintainAspectRatio) {
        const ratio = tempImg.height / tempImg.width;
        // recalculate height from standard width 3.5
        const computedHeight = (3.5 * ratio).toFixed(1);
        setHeightCm(computedHeight);
      }
    };
    tempImg.onerror = () => {
      console.error("Failed to load original photo dimension check.");
    };
    tempImg.src = url;
  };

  const handleWidthChange = (val: string) => {
    setWidthCm(val);
    const parsedWidth = parseFloat(val);
    if (maintainAspectRatio && parsedWidth > 0 && naturalWidth > 0 && naturalHeight > 0) {
      const ratio = naturalHeight / naturalWidth;
      setHeightCm((parsedWidth * ratio).toFixed(1));
    }
  };

  const handleHeightChange = (val: string) => {
    setHeightCm(val);
    const parsedHeight = parseFloat(val);
    if (maintainAspectRatio && parsedHeight > 0 && naturalWidth > 0 && naturalHeight > 0) {
      const ratio = naturalWidth / naturalHeight;
      setWidthCm((parsedHeight * ratio).toFixed(1));
    }
  };

  const handleDpiSelect = (dpiVal: number) => {
    setDpi(dpiVal);
    setCustomDpi(dpiVal.toString());
  };

  const handleDpiCustomChange = (val: string) => {
    setCustomDpi(val);
    const num = parseInt(val, 10);
    if (num > 0) {
      setDpi(num);
    }
  };

  const renderProcessedAadhaarPhoto = () => {
    if (!imageSrc) return;
    setIsProcessing(true);

    const img = new Image();
    
    // Set onload and onerror first before setting src to avoid cache races
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        let wCm = parseFloat(widthCm);
        if (isNaN(wCm)) wCm = 3.5;
        let hCm = parseFloat(heightCm);
        if (isNaN(hCm)) hCm = 4.5;
        const currentDpi = dpi || 300;

        // Convert CM to Pixels: Pixels = (CM / 2.54) * DPI
        let targetWidthPx = Math.round((wCm / 2.54) * currentDpi);
        let targetHeightPx = Math.round((hCm / 2.54) * currentDpi);

        if (isNaN(targetWidthPx) || targetWidthPx <= 0) targetWidthPx = 10;
        if (isNaN(targetHeightPx) || targetHeightPx <= 0) targetHeightPx = 10;
        if (targetWidthPx > 5000) targetWidthPx = 5000;
        if (targetHeightPx > 5000) targetHeightPx = 5000;

        canvas.width = targetWidthPx;
        canvas.height = targetHeightPx;

        // Clear with clean canvas backdrop (white is default for legal UIDAI portals)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidthPx, targetHeightPx);

        ctx.save();
        
        ctx.beginPath();
        ctx.rect(0, 0, targetWidthPx, targetHeightPx);
        ctx.clip();

        // Perform scaling and transformation math
        const scale = (Number(zoom) || 100) / 100;
        const imgRatio = img.width > 0 ? img.height / img.width : 1;
        
        let drawW = targetWidthPx * scale;
        let drawH = drawW * imgRatio;

        // Ensure full coverage of the crop target
        if (drawH < targetHeightPx) {
          drawH = targetHeightPx * scale;
          drawW = drawH / imgRatio;
        }

        // Calculate center alignment offsets
        const drawX = (targetWidthPx - drawW) / 2 + (Number(offsetX) || 0);
        const drawY = (targetHeightPx - drawH) / 2 + (Number(offsetY) || 0);

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : 'image/png';
        const actualUrl = canvas.toDataURL(mimeType, outputFormat === 'jpg' ? compressionQuality : undefined);

        if (downloadUrl) {
          // No need to revoke if not starts with blob, but we keep the assignment clean
        }
        setDownloadUrl(actualUrl);

        // Calculate byte footprint size
        const base64Str = actualUrl.split(',')[1];
        const binaryLength = atob(base64Str).length;
        setCalculatedSize(binaryLength);

        setIsProcessing(false);
      } catch (err) {
        console.error("Aadhaar photo processing crash:", err);
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      console.error("Aadhaar photo failed to load onto diagnostic image object.");
      setIsProcessing(false);
    };

    img.src = imageSrc;
  };

  const handleReset = () => {
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
    }
    setFile(null);
    setImageSrc(null);
    setDownloadUrl(null);
    setCalculatedSize(0);
  };

  const formatByteSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const autoFillStandardUidai = () => {
    setWidthCm('3.5');
    setHeightCm('4.5');
    setDpi(300);
    setCustomDpi('300');
    setMaintainAspectRatio(false);
    setZoom(100);
    setOffsetX(0);
    setOffsetY(0);
  };

  return (
    <div id="aadhaar-photo-resizer-container" className="space-y-6">
      
      {/* Title block */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
          <LucideIcon name="CreditCard" size={20} />
        </div>
        <div>
          <h3 className="font-display font-extrabold text-lg text-slate-805 dark:text-slate-105">
            Aadhaar Photo Resizer
          </h3>
          <p className="text-xs text-slate-400">
            Fit your photographs to standard UIDAI portal constraints (3.5 cm × 4.5 cm at 300 DPI) securely in browser sandbox memory.
          </p>
        </div>
      </div>

      {!imageSrc ? (
        <div
          id="aadhaar-photo-uploader"
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-indigo-600 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 cursor-pointer transition-all dynamic-fadeIn"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 flex items-center justify-center shadow-inner animate-pulse">
            <LucideIcon name="Upload" size={26} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Upload your photo, or <span className="text-indigo-600 dark:text-cyan-400">browse file</span>
            </p>
            <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto">
              Any passport photo, cell snapshot or crop is processed locally inside your high-integrity sandbox instance.
            </p>
          </div>
        </div>
      ) : (
        <div id="aadhaar-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
          
          {/* Settings columns */}
          <div className="lg:col-span-5 space-y-5 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
            
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Aadhaar Format Rules
              </h4>
              <button
                type="button"
                onClick={autoFillStandardUidai}
                className="text-[10px] font-bold text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <LucideIcon name="Sparkles" size={10} />
                <span>Reset to Standard (3.5x4.5)</span>
              </button>
            </div>

            {/* Checkbox crop lock for maintaining aspect ratio of input */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Maintain Aspect Ratio</span>
                <p className="text-[10px] text-slate-400">Lock dimensions relative to the photo's original shape</p>
              </div>
              <input
                id="aspect-ratio-toggle"
                type="checkbox"
                checked={maintainAspectRatio}
                onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                className="w-4.5 h-4.5 text-indigo-600 dark:text-cyan-400 accent-indigo-600 dark:accent-cyan-400 rounded cursor-pointer"
              />
            </div>

            {/* Dimension inputs CM */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Width (CM)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="30"
                  value={widthCm}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 font-mono focus:border-indigo-600 dark:focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Height (CM)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="30"
                  value={heightCm}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 font-mono focus:border-indigo-600 dark:focus:border-cyan-400 outline-none"
                />
              </div>
            </div>

            {/* DPI calculation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">DPI (Dots Per Inch)</label>
                <span className="text-[10px] text-slate-400 font-mono">DPI is crucial for print sharpness</span>
              </div>
              
              {/* Preset selection circles */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '96 DPI', val: 96 },
                  { label: '150 DPI', val: 150 },
                  { label: '200 DPI', val: 200 },
                  { label: '300 DPI', val: 300 },
                ].map((presetItem) => (
                  <button
                    key={presetItem.val}
                    type="button"
                    onClick={() => handleDpiSelect(presetItem.val)}
                    className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      dpi === presetItem.val
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-750 dark:bg-slate-800 dark:text-cyan-400'
                        : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-805'
                    }`}
                  >
                    {presetItem.label}
                  </button>
                ))}
              </div>

              {/* Custom DPI number input field */}
              <div className="relative pt-1">
                <input
                  type="number"
                  placeholder="Custom DPI e.g. 300"
                  value={customDpi}
                  onChange={(e) => handleDpiCustomChange(e.target.value)}
                  className="w-full text-xs pl-3 pr-16 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-mono text-slate-800 dark:text-slate-100"
                />
                <span className="absolute right-3 top-[11px] text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none font-mono pointer-events-none">
                  Custom DPI
                </span>
              </div>
            </div>

            {/* Display calculated pixels conversion metadata to aid the applicant */}
            <div className="p-3.5 bg-slate-100/50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-855 text-center text-[10px] font-mono leading-relaxed space-y-1">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Resolved Digital Print Proportions
              </div>
              <div className="flex justify-around text-slate-550 dark:text-slate-350">
                <div>
                  <span className="text-slate-400 block text-[9px]">Width in Pixels</span>
                  <span className="text-indigo-650 dark:text-cyan-400 font-extrabold text-xs">
                    {Math.round((parseFloat(widthCm || '0') / 2.54) * dpi)} px
                  </span>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-800 h-6 my-auto" />
                <div>
                  <span className="text-slate-400 block text-[9px]">Height in Pixels</span>
                  <span className="text-indigo-650 dark:text-cyan-400 font-extrabold text-xs">
                    {Math.round((parseFloat(heightCm || '0') / 2.54) * dpi)} px
                  </span>
                </div>
              </div>
            </div>

            {/* Live Cropping adjustments for alignment */}
            <div className="space-y-4 pt-3 border-t border-slate-200/40 dark:border-slate-850/50">
              <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Crop Framing Adjustments
              </h5>

              {/* Zoom bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Aadhaar Photo Zoom:</span>
                  <span className="font-mono text-indigo-600 dark:text-cyan-400 font-bold">{zoom}%</span>
                </div>
                <input
                  type="range"
                  min="55"
                  max="250"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-605 dark:accent-cyan-400"
                />
              </div>

              {/* Offset directions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Pan Horizontal</div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    value={offsetX}
                    onChange={(e) => setOffsetX(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-cyan-400"
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
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Extra file footprint fine adjustments */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Format</label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                >
                  <option value="jpg">JPG (Best for Portal)</option>
                  <option value="png">PNG Vector Format</option>
                </select>
              </div>
              {outputFormat === 'jpg' && (
                <div className="space-y-0.5 animate-fadeIn">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Byte Compression</label>
                  <input
                    type="range"
                    min="0.30"
                    max="0.95"
                    step="0.05"
                    value={compressionQuality}
                    onChange={(e) => setCompressionQuality(parseFloat(e.target.value))}
                    className="w-full h-1.5 mt-2 accent-emerald-500 bg-slate-200 dark:bg-slate-800 rounded-lg"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2.5 bg-slate-250 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-705 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-300/30 text-slate-700"
            >
              Choose Different Photograph
            </button>
          </div>

          {/* Sizing frame column preview (Right) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <h4 className="font-display font-medium text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">
              Aadhaar Live Resized Frame
            </h4>

            <div className="flex-1 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-850 p-6 flex flex-col items-center justify-center min-h-[350px]">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-indigo-600 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Resizing to Aadhaar DPI matrix...</span>
                </div>
              ) : downloadUrl ? (
                <div className="space-y-5 text-center max-w-full">
                  
                  {/* Photo layout frame */}
                  <div className="border border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-900 px-6 py-5 rounded-2xl inline-block shadow-md select-none">
                    <img
                      src={downloadUrl}
                      alt="Form Headshot"
                      referrerPolicy="no-referrer"
                      className="max-h-[220px] max-w-full object-contain border border-slate-300 shadow p-1 bg-white"
                    />
                  </div>

                  {/* Informational badges for India portals */}
                  <div className="bg-white dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1.5 max-w-sm mx-auto text-center shadow-inner">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider font-mono">
                      Aadhaar Portal Footprint Verification
                    </span>
                    <div className="flex items-center justify-center gap-4 pt-1">
                      <div className="text-center">
                        <span className="text-[9px] text-slate-400 block leading-none">Resulting Weight</span>
                        <span className="text-xs font-mono font-black text-indigo-600 dark:text-cyan-400">
                          {formatByteSize(calculatedSize)}
                        </span>
                      </div>
                      <div className="border-l border-slate-200 dark:border-slate-800 h-6" />
                      <div className="text-center">
                        <span className="text-[9px] text-slate-400 block leading-none">UIDAI Limit Compliance</span>
                        <span className={`text-[10px] font-bold ${calculatedSize < 50 * 1024 && calculatedSize > 15 * 1024 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {calculatedSize < 50 * 1024 ? 'Target Under 50KB ✓' : 'Above 50KB Weight'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 max-w-sm mx-auto">
                    <a
                      href={downloadUrl}
                      download={`toolmitra_aadhaar_${widthCm}x${heightCm}cm_${dpi}dpi.${outputFormat}`}
                      className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-3.5 px-6 rounded-xl shadow-md cursor-pointer hover:scale-102 transition-all outline-none"
                    >
                      <LucideIcon name="Download" size={14} />
                      <span>Download Clean Aadhaar Photo</span>
                    </a>
                  </div>

                </div>
              ) : (
                <div className="text-center space-y-2">
                  <LucideIcon name="CreditCard" className="text-slate-350 mx-auto animate-bounce" size={40} />
                  <p className="text-slate-450 text-xs">Awaiting photograph file upload...</p>
                </div>
              )}
            </div>
            
          </div>

        </div>
      )}

    </div>
  );
}
