import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

export default function AiImageEnhancer() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [enhancedSrc, setEnhancedSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Enhancement controls
  const [sharpness, setSharpness] = useState<number>(50); // 0 to 100
  const [contrast, setContrast] = useState<number>(30); // 0 to 100
  const [denoise, setDenoise] = useState<number>(20); // 0 to 100
  const [scaleFactor, setScaleFactor] = useState<number>(2); // 1.5x or 2x resolution doubling

  // Interactive slider splitter position in percentage (0 to 100)
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);
  const [isSliding, setIsSliding] = useState<boolean>(false);

  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const [imgLayout, setImgLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const updateImgLayout = () => {
    if (originalImgRef.current) {
      setImgLayout({
        width: originalImgRef.current.clientWidth,
        height: originalImgRef.current.clientHeight,
      });
    }
  };

  useEffect(() => {
    window.addEventListener('resize', updateImgLayout);
    return () => window.removeEventListener('resize', updateImgLayout);
  }, []);

  useEffect(() => {
    if (imageSrc) {
      const timer = setTimeout(updateImgLayout, 150);
      return () => clearTimeout(timer);
    }
  }, [imageSrc, enhancedSrc]);

  // Load and apply local browser-GPU filters
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setImageSrc(url);
      setEnhancedSrc(null);
      setSliderPosition(50);
      setIsProcessing(false);
      setSharpness(50);
      setContrast(30);
      setDenoise(20);
      setScaleFactor(2);
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
    const selectedFile = e.dataTransfer?.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setImageSrc(url);
      setEnhancedSrc(null);
      setSliderPosition(50);
      setIsProcessing(false);
      setSharpness(50);
      setContrast(30);
      setDenoise(20);
      setScaleFactor(2);
    }
  };

  useEffect(() => {
    if (imageSrc) {
      enhanceImage();
    }
  }, [imageSrc, sharpness, contrast, denoise, scaleFactor]);

  // High performance local pixel convolution modifier
  const enhanceImage = () => {
    if (!imageSrc) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Double resolution (Super Sampling Bilinear)
      const targetW = img.naturalWidth * scaleFactor;
      const targetH = img.naturalHeight * scaleFactor;
      canvas.width = targetW;
      canvas.height = targetH;

      // Draw normal scaled image first
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Extract pixel arrays
      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const data = imgData.data;
      const originalCopy = new Uint8ClampedArray(data);

      // 1. Apply Denoise (smart low-pass smoothing pass) if selected
      const denoiseWeight = denoise / 100;
      if (denoiseWeight > 0.05) {
        // Simple Box blur smoothing matrix for denoise
        const dOffset = Math.floor(denoiseWeight * 2) + 1;
        for (let y = dOffset; y < targetH - dOffset; y++) {
          for (let x = dOffset; x < targetW - dOffset; x++) {
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let dy = -dOffset; dy <= dOffset; dy++) {
              for (let dx = -dOffset; dx <= dOffset; dx++) {
                const idx = ((y + dy) * targetW + (x + dx)) * 4;
                rSum += originalCopy[idx];
                gSum += originalCopy[idx + 1];
                bSum += originalCopy[idx + 2];
                count++;
              }
            }
            const centerIdx = (y * targetW + x) * 4;
            // Interpolate original with blurred pass
            data[centerIdx] = Math.round(originalCopy[centerIdx] * (1 - denoiseWeight) + (rSum / count) * denoiseWeight);
            data[centerIdx + 1] = Math.round(originalCopy[centerIdx + 1] * (1 - denoiseWeight) + (gSum / count) * denoiseWeight);
            data[centerIdx + 2] = Math.round(originalCopy[centerIdx + 2] * (1 - denoiseWeight) + (bSum / count) * denoiseWeight);
          }
        }
      }

      // 2. Convolution Matrix: Sharpening (Laplacian edge enhancer)
      // Kernel:
      //  0  -w   0
      // -w 1+4w -w
      //  0  -w   0
      const w = (sharpness / 100) * 0.95; // higher sharpening factor for visible crispy edges!
      if (w > 0.05) {
        const sharpenCopy = new Uint8ClampedArray(data);
        for (let y = 1; y < targetH - 1; y++) {
          for (let x = 1; x < targetW - 1; x++) {
            const idx = (y * targetW + x) * 4;
            
            // Neighbor indexes
            const topIdx = ((y - 1) * targetW + x) * 4;
            const bottomIdx = ((y + 1) * targetW + x) * 4;
            const leftIdx = (y * targetW + (x - 1)) * 4;
            const rightIdx = (y * targetW + (x + 1)) * 4;

            for (let c = 0; c < 3; c++) {
              const centerV = sharpenCopy[idx + c];
              const topV = sharpenCopy[topIdx + c];
              const bottomV = sharpenCopy[bottomIdx + c];
              const leftV = sharpenCopy[leftIdx + c];
              const rightV = sharpenCopy[rightIdx + c];

              // Sharpen calculation
              const sharpenedValue = centerV * (1 + 4 * w) - w * (topV + bottomV + leftV + rightV);
              data[idx + c] = Math.min(255, Math.max(0, sharpenedValue));
            }
          }
        }
      }

      // 3. Shadow/Highlight correction & Contrast Expansion
      const cFactor = 1 + (contrast / 100) * 0.55;
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          const val = data[i + c];
          // Raise dark shadows slightly to reveal details, then apply contrast factor
          let shadowCorrected = val;
          if (val < 90) {
            shadowCorrected = val + (90 - val) * 0.20; // smooth shadow lift
          }
          const adjusted = 128 + (shadowCorrected - 128) * cFactor;
          data[i + c] = Math.min(255, Math.max(0, adjusted));
        }
      }

      // 4. Color Vibrancy & Saturation Boost
      const sFactor = 1.0 + (contrast / 100) * 0.25 + 0.10; // extra colorfulness
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = Math.min(255, Math.max(0, gray + (r - gray) * sFactor));
        data[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * sFactor));
        data[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * sFactor));
      }

      // Put back enhanced bytes
      ctx.putImageData(imgData, 0, 0);

      // Save to Blob URLs
      canvas.toBlob((blob) => {
        if (blob) {
          if (enhancedSrc) URL.revokeObjectURL(enhancedSrc);
          setEnhancedSrc(URL.createObjectURL(blob));
          setIsProcessing(false);
        }
      }, 'image/png');
    };
  };

  // Drag divider divider logic
  const handleDividerMove = (clientX: number) => {
    const measureTarget = sliderContainerRef.current || containerRef.current;
    if (!measureTarget) return;
    const rect = measureTarget.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPosition(pct);
  };

  const handleMouseDown = () => {
    setIsSliding(true);
  };

  const handleTouchStart = () => {
    setIsSliding(true);
  };

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent) => {
      if (isSliding) handleDividerMove(e.clientX);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isSliding && e.touches[0]) handleDividerMove(e.touches[0].clientX);
    };

    const handleGlobalUp = () => {
      setIsSliding(false);
    };

    if (isSliding) {
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('touchmove', handleGlobalTouchMove);
      window.addEventListener('mouseup', handleGlobalUp);
      window.addEventListener('touchend', handleGlobalUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [isSliding]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Visual Workspace block */}
      <div className="lg:col-span-8 flex flex-col items-center justify-center space-y-6">
        
        {!imageSrc ? (
          <div className="w-full max-w-xl mx-auto">
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-200 group ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/15 dark:border-cyan-400 dark:bg-cyan-500/10 scale-[1.02] shadow-lg shadow-indigo-500/10'
                  : 'border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:border-indigo-400 dark:hover:border-cyan-500/50'
              }`}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 text-blue-500 dark:text-cyan-400 flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <LucideIcon name="Sparkles" size={18} />
                </div>
                <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-350">
                  Drag and drop blurry/low-quality photo or click
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-550 mb-3">
                  Instantly sharpen, enhance, and double image resolution locally
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span className="font-semibold flex items-center gap-1">
                <LucideIcon name="Info" size={12} />
                <span>Drag the vertical divider to compare Original vs Enhanced</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setImageSrc(null);
                  setEnhancedSrc(null);
                }}
                className="text-red-500 hover:text-red-650 cursor-pointer font-bold flex items-center gap-1"
              >
                <LucideIcon name="Trash2" size={12} />
                <span>Clear Image</span>
              </button>
            </div>

            {/* Split Comparison frame sandbox */}
            <div
              ref={containerRef}
              className="relative border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden select-none bg-slate-900 p-2 max-h-[360px] min-h-[260px] w-full flex items-center justify-center mx-auto"
            >
              <div 
                ref={sliderContainerRef} 
                id="image-comparison-slider-inner" 
                className="relative inline-block overflow-hidden max-h-full max-w-full cursor-ew-resize select-none touch-none"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsSliding(true);
                  handleDividerMove(e.clientX);
                }}
                onTouchStart={(e) => {
                  setIsSliding(true);
                  if (e.touches[0]) handleDividerMove(e.touches[0].clientX);
                }}
              >
                {/* Original image as background */}
                <img
                  ref={originalImgRef}
                  src={imageSrc}
                  alt="Original background preview"
                  referrerPolicy="no-referrer"
                  className="max-h-[340px] max-w-full w-auto h-auto block select-none"
                  draggable={false}
                  onLoad={updateImgLayout}
                />

                {/* Enhanced Image Overlay clip */}
                {enhancedSrc && (
                  <div
                    className="absolute top-0 bottom-0 left-0 overflow-hidden pointer-events-none"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <img
                      src={enhancedSrc}
                      alt="Enhanced quality preview"
                      referrerPolicy="no-referrer"
                      className="max-h-[340px] block max-w-none text-transparent select-none"
                      draggable={false}
                      style={{
                        width: imgLayout.width || '100%',
                        height: imgLayout.height || '100%',
                      }}
                    />
                    {/* Label tag Enhanced */}
                    <span 
                      className="absolute top-3 left-3 bg-indigo-600 text-white font-bold font-mono text-[9px] px-2 py-0.5 rounded-full select-none shadow-md whitespace-nowrap pointer-events-none transition-opacity duration-200"
                      style={{ opacity: sliderPosition < 15 ? 0 : 1 }}
                    >
                      Enhanced Quality
                    </span>
                  </div>
                )}

                {/* Label tag Original */}
                <span 
                  className="absolute top-3 right-3 bg-black/70 text-white font-semibold font-mono text-[9px] px-2 py-0.5 rounded-full select-none shadow-md whitespace-nowrap pointer-events-none transition-opacity duration-200"
                  style={{ opacity: sliderPosition > 85 ? 0 : 1 }}
                >
                  Original (Low Res)
                </span>

                {/* Slider Drag divider bar Indicator */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize group shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 flex items-center justify-center pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="w-6 h-6 rounded-full bg-white border border-slate-250 shadow-md flex items-center justify-center -translate-x-0.5 pointer-events-none">
                    <LucideIcon name="ArrowLeftRight" size={10} className="text-slate-700" />
                  </div>
                </div>
              </div>
            </div>
            
            {isProcessing && (
              <div className="text-center text-xs text-indigo-505 dark:text-cyan-405 font-mono animate-pulse flex items-center justify-center gap-1.5 pt-2">
                <LucideIcon name="Sparkles" size={12} className="animate-spin" />
                <span>Processing AI sharpening nodes locally...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adjustments control column */}
      <div className="lg:col-span-4 space-y-6">
        <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest block">
          Enhance Parameters
        </h3>

        {/* Sliders adjustments */}
        <div className="space-y-4">
          
          {/* Resolution scaling */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex justify-between">
              <span>Super Resolution Factor</span>
              <span className="font-bold text-indigo-550 dark:text-cyan-455">{scaleFactor}x Resolution</span>
            </label>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <button
                type="button"
                onClick={() => setScaleFactor(1.5)}
                className={`py-2 border rounded-xl cursor-pointer font-bold ${
                  scaleFactor === 1.5
                    ? 'border-indigo-500 bg-indigo-50/10 text-indigo-650'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                1.5x Sharp (Fast)
              </button>
              <button
                type="button"
                onClick={() => setScaleFactor(2)}
                className={`py-2 border rounded-xl cursor-pointer font-bold ${
                  scaleFactor === 2
                    ? 'border-indigo-500 bg-indigo-50/10 text-indigo-650'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                2x Ultra (HD)
              </button>
            </div>
          </div>

          {/* Sharpness convolution level */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-350 font-semibold">
              <span>AI Sharpness multiplier</span>
              <span>{sharpness}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sharpness}
              onChange={(e) => setSharpness(Number(e.target.value))}
              className="w-full accent-indigo-650 dark:accent-cyan-400 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-805 rounded-lg"
            />
          </div>

          {/* Contrast boost */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-350 font-semibold">
              <span>Histogram Contrast Sizing</span>
              <span>{contrast}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full accent-indigo-650 dark:accent-cyan-400 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-805 rounded-lg"
            />
          </div>

          {/* Smooth Denoising radius */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-705 dark:text-slate-350 font-semibold">
              <span>Artifact Denoise filter</span>
              <span>{denoise}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={denoise}
              onChange={(e) => setDenoise(Number(e.target.value))}
              className="w-full accent-indigo-650 dark:accent-cyan-400 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-805 rounded-lg"
            />
          </div>

        </div>

        {/* Generate and export blocks */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
          <button
            type="button"
            disabled={!imageSrc || isProcessing}
            onClick={enhanceImage}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <LucideIcon name="Sparkles" size={14} />
            <span>Process Reconstruction</span>
          </button>

          {enhancedSrc && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl text-center space-y-3 animate-fadeIn">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-450 tracking-wider flex items-center justify-center gap-1">
                <LucideIcon name="ShieldCheck" size={12} />
                <span>Graphics Enhanced and Restructured</span>
              </span>

              <a
                href={enhancedSrc}
                download="enhanced_hd_image.png"
                className="w-full inline-flex py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-transform hover:scale-102 items-center justify-center gap-1.5"
              >
                <LucideIcon name="Download" size={13} />
                <span>Download HD Enhanced Image</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* SEO metadata and structured sections */}
      <div className="lg:col-span-12 border-t border-slate-100 dark:border-slate-800 pt-8 mt-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">About AI Image Enhancer</h2>
        <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed max-w-4xl mb-6">
          The ToolMitra secure client-side AI Image Enhancer increases visual clarity, sharpens details, and double resolutions of blurry or low-quality graphics. It applies super sampling interpolation, multi-pass Laplacian sharpening matrices, custom denoise smoothing filters, and pixel histogram scaling locally, ensuring 100% private processing. Use the interactive comparison slider handle to see real-time side-by-side results!
        </p>

        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-205 mb-4">Frequently Asked Questions (FAQ)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">How does the Super Resolution work?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              We upscale the image to double its size, then reconstruct missing visual frequencies using bilateral sharp filter passes. This increases density and avoids blur outlines.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Are my files transferred to servers?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Never! All filters and pixel matrix upscaling execute entirely on your own local device threads. Nothing is transferred to public servers or cloud systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
