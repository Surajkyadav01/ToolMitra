import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

export default function AadhaarMerger() {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontSrc, setFrontSrc] = useState<string | null>(null);
  const [backSrc, setBackSrc] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [showBorder, setShowBorder] = useState<boolean>(true);
  const [padding, setPadding] = useState<number>(15);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Crop modal states
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSide, setCropSide] = useState<'front' | 'back'>('front');
  const [cropActiveSrc, setCropActiveSrc] = useState<string | null>(null);
  const [cropX, setCropX] = useState(15);
  const [cropY, setCropY] = useState(15);
  const [cropW, setCropW] = useState(70);
  const [cropH, setCropH] = useState(70);
  const [cropRotation, setCropRotation] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; cropX: number; cropY: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; cropX: number; cropY: number; cropW: number; cropH: number } | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);

  // Auto-stitch side-effect to update the fused layout preview in real-time
  useEffect(() => {
    if (frontSrc || backSrc) {
      executeMerge();
    } else {
      setDownloadUrl(null);
    }
  }, [orientation, showBorder, padding, frontSrc, backSrc]);

  // Crop Mouse/Touch Handlers
  const handleBoxMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cropImageRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      cropX,
      cropY
    });
  };

  const handleBoxTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!cropImageRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX,
      y: touch.clientY,
      cropX,
      cropY
    });
  };

  const handleHandleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    if (!cropImageRef.current) return;
    setIsResizing(true);
    setActiveHandle(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      cropX,
      cropY,
      cropW,
      cropH
    });
  };

  const handleHandleTouchStart = (e: React.TouchEvent, handle: string) => {
    e.stopPropagation();
    if (!cropImageRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    setIsResizing(true);
    setActiveHandle(handle);
    setResizeStart({
      x: touch.clientX,
      y: touch.clientY,
      cropX,
      cropY,
      cropW,
      cropH
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!cropImageRef.current) return;
    const rect = cropImageRef.current.getBoundingClientRect();

    if (isDragging && dragStart) {
      const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

      let newX = dragStart.cropX + deltaX;
      let newY = dragStart.cropY + deltaY;

      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX + cropW > 100) newX = 100 - cropW;
      if (newY + cropH > 100) newY = 100 - cropH;

      setCropX(newX);
      setCropY(newY);
    }

    if (isResizing && resizeStart && activeHandle) {
      const deltaX = ((e.clientX - resizeStart.x) / rect.width) * 100;
      const deltaY = ((e.clientY - resizeStart.y) / rect.height) * 100;

      let newX = resizeStart.cropX;
      let newY = resizeStart.cropY;
      let newW = resizeStart.cropW;
      let newH = resizeStart.cropH;

      if (activeHandle === 'nw') {
        newW = resizeStart.cropW - deltaX;
        newX = resizeStart.cropX + deltaX;
        newH = resizeStart.cropH - deltaY;
        newY = resizeStart.cropY + deltaY;
      } else if (activeHandle === 'n') {
        newH = resizeStart.cropH - deltaY;
        newY = resizeStart.cropY + deltaY;
      } else if (activeHandle === 'ne') {
        newW = resizeStart.cropW + deltaX;
        newH = resizeStart.cropH - deltaY;
        newY = resizeStart.cropY + deltaY;
      } else if (activeHandle === 'e') {
        newW = resizeStart.cropW + deltaX;
      } else if (activeHandle === 'se') {
        newW = resizeStart.cropW + deltaX;
        newH = resizeStart.cropH + deltaY;
      } else if (activeHandle === 's') {
        newH = resizeStart.cropH + deltaY;
      } else if (activeHandle === 'sw') {
        newW = resizeStart.cropW - deltaX;
        newX = resizeStart.cropX + deltaX;
        newH = resizeStart.cropH + deltaY;
      } else if (activeHandle === 'w') {
        newW = resizeStart.cropW - deltaX;
        newX = resizeStart.cropX + deltaX;
      }

      if (newW < 8) newW = 8;
      if (newH < 8) newH = 8;

      if (newX < 0) {
        newW += newX;
        newX = 0;
      }
      if (newY < 0) {
        newH += newY;
        newY = 0;
      }
      if (newX + newW > 100) newW = 100 - newX;
      if (newY + newH > 100) newH = 100 - newY;

      setCropX(newX);
      setCropY(newY);
      setCropW(newW);
      setCropH(newH);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      const touch = e.touches[0];
      const fakeMouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as MouseEvent;
      handleMouseMove(fakeMouseEvent);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setActiveHandle(null);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, activeHandle, cropX, cropY, cropW, cropH]);

  const handleStartCrop = (side: 'front' | 'back') => {
    setCropSide(side);
    const src = side === 'front' ? frontSrc : backSrc;
    if (src) {
      setCropActiveSrc(src);
      setCropX(15);
      setCropY(15);
      setCropW(70);
      setCropH(70);
      setCropRotation(0);
      setCropModalOpen(true);
    }
  };

  const handleRotateCrop = (dir: 'left' | 'right') => {
    if (dir === 'left') {
      setCropRotation((prev) => (prev - 90 + 360) % 360);
    } else {
      setCropRotation((prev) => (prev + 90) % 360);
    }
  };

  const handleApplyCrop = () => {
    if (!cropActiveSrc) return;

    const img = new Image();
    img.src = cropActiveSrc;
    img.onload = () => {
      const is90or270 = cropRotation === 90 || cropRotation === 270;
      
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      if (is90or270) {
        tempCanvas.width = img.naturalHeight;
        tempCanvas.height = img.naturalWidth;
      } else {
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
      }

      tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
      tempCtx.rotate((cropRotation * Math.PI) / 180);
      tempCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scaleX = tempCanvas.width / 100;
      const scaleY = tempCanvas.height / 100;

      const cropPixelX = cropX * scaleX;
      const cropPixelY = cropY * scaleY;
      const cropPixelW = cropW * scaleX;
      const cropPixelH = cropH * scaleY;

      canvas.width = cropPixelW;
      canvas.height = cropPixelH;

      ctx.drawImage(
        tempCanvas,
        cropPixelX,
        cropPixelY,
        cropPixelW,
        cropPixelH,
        0,
        0,
        cropPixelW,
        cropPixelH
      );

      const croppedUrl = canvas.toDataURL('image/jpeg', 0.95);
      if (cropSide === 'front') {
        setFrontSrc(croppedUrl);
      } else {
        setBackSrc(croppedUrl);
      }
      setCropModalOpen(false);
    };
  };

  const handleFrontFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFrontFile(file);
      setFrontSrc(URL.createObjectURL(file));
    }
  };

  const handleBackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackFile(file);
      setBackSrc(URL.createObjectURL(file));
    }
  };

  const executeMerge = () => {
    if (!frontSrc && !backSrc) return;
    setIsProcessing(true);

    const loadImg = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => {
          // If load fails, create an empty block
          const empty = new Image();
          resolve(empty);
        };
      });
    };

    const run = async () => {
      const frontImg = frontSrc ? await loadImg(frontSrc) : null;
      const backImg = backSrc ? await loadImg(backSrc) : null;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Define standard card layout dimension (e.g. 500 x 316 px for card proportions)
      const targetCardW = 500;
      const targetCardH = 315;

      let canvasW = 0;
      let canvasH = 0;

      // Calculate total scale dimensions depending on active items and layouts
      const hasFront = !!frontImg && frontImg.width > 0;
      const hasBack = !!backImg && backImg.width > 0;

      if (!hasFront && !hasBack) return;

      if (orientation === 'horizontal') {
        // Front & Back side-by-side
        const count = (hasFront ? 1 : 0) + (hasBack ? 1 : 0);
        canvasW = (targetCardW * count) + (padding * (count + 1));
        canvasH = targetCardH + (padding * 2);
      } else {
        // Vertical stacked
        const count = (hasFront ? 1 : 0) + (hasBack ? 1 : 0);
        canvasW = targetCardW + (padding * 2);
        canvasH = (targetCardH * count) + (padding * (count + 1));
      }

      canvas.width = canvasW;
      canvas.height = canvasH;

      // Draw backdrop
      ctx.fillStyle = '#f8fafc'; // light gray slate-50
      ctx.fillRect(0, 0, canvasW, canvasH);

      let currentX = padding;
      let currentY = padding;

      const drawCard = (img: HTMLImageElement, label: string) => {
        // Draw card background first (shadow/glow card)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(currentX, currentY, targetCardW, targetCardH);

        // Draw actual card image scaled
        ctx.drawImage(img, currentX, currentY, targetCardW, targetCardH);

        // Draw dotted/solid card frame border if requested
        if (showBorder) {
          ctx.strokeStyle = '#94a3b8'; // slate-400 border lines
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]); // dotted lines
          ctx.strokeRect(currentX, currentY, targetCardW, targetCardH);
          ctx.setLineDash([]); // restore
        }

        // Draw minimal label on bottom margin
        ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
        ctx.font = 'bold 11px sans-serif';
        // Draw "Front Side" label on bottom corner
        ctx.fillText(label, currentX + 10, currentY + targetCardH - 12);
      };

      if (orientation === 'horizontal') {
        if (hasFront && frontImg) {
          drawCard(frontImg, 'AADHAAR - FRONT SIDE');
          currentX += targetCardW + padding;
        }
        if (hasBack && backImg) {
          drawCard(backImg, 'AADHAAR - BACK SIDE');
        }
      } else {
        if (hasFront && frontImg) {
          drawCard(frontImg, 'AADHAAR - FRONT SIDE');
          currentY += targetCardH + padding;
        }
        if (hasBack && backImg) {
          drawCard(backImg, 'AADHAAR - BACK SIDE');
        }
      }

      const mergedUrl = canvas.toDataURL('image/jpeg', 0.95);
      setDownloadUrl(mergedUrl);
      setIsProcessing(false);
    };

    run();
  };

  const handleReset = () => {
    setFrontFile(null);
    setBackFile(null);
    setFrontSrc(null);
    setBackSrc(null);
    setDownloadUrl(null);
  };

  return (
    <div id="aadhaar-merger-workspace" className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <LucideIcon name="Layers" className="text-blue-500" size={24} />
        <div>
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
            Aadhaar Merger Panel
          </h3>
          <p className="text-xs text-slate-400">
            Securely stitch Front and Back side images of your Aadhaar Card into a single client layout.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Upload & controls console */}
        <div className="lg:col-span-5 space-y-5 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Document Upload Inputs
          </h4>

          {/* Front Side Upload */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-blue-100 text-blue-600 text-[10px] font-bold">F</span>
              <span>Front Side Image</span>
            </span>
            {!frontSrc ? (
              <div
                onClick={() => frontInputRef.current?.click()}
                className="py-6 px-4 bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl hover:border-blue-500 hover:bg-blue-50/10 cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all"
              >
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFrontFile}
                />
                <LucideIcon name="Upload" className="text-blue-500" size={18} />
                <span className="text-xs font-semibold text-slate-702 dark:text-slate-200">Upload Front Side</span>
                <span className="text-[10px] text-slate-450">JPG, PNG format</span>
              </div>
            ) : (
              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-10 h-10 rounded overflow-hidden bg-slate-100 shrink-0">
                    <img src={frontSrc} alt="Front preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 truncate font-mono font-medium max-w-[120px]">
                    {frontFile?.name || 'Front side image'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleStartCrop('front')}
                    className="p-1 px-2 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-650 hover:bg-indigo-100 dark:text-cyan-400 dark:hover:bg-slate-700 text-xs flex items-center gap-1 cursor-pointer font-semibold transition-all shadow-sm"
                    title="Crop Front Image"
                  >
                    <LucideIcon name="Crop" size={12} />
                    <span>Crop</span>
                  </button>
                  <button
                    onClick={() => {
                      setFrontFile(null);
                      setFrontSrc(null);
                    }}
                    className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-red-500 hover:bg-red-50 hover:text-red-650 cursor-pointer"
                  >
                    <LucideIcon name="X" size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Back Side Upload */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/40 dark:border-slate-850/50">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-blue-105 text-blue-600 text-[10px] font-bold">B</span>
              <span>Back Side Image</span>
            </span>
            {!backSrc ? (
              <div
                onClick={() => backInputRef.current?.click()}
                className="py-6 px-4 bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl hover:border-blue-500 hover:bg-blue-50/10 cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all"
              >
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBackFile}
                />
                <LucideIcon name="Upload" className="text-blue-500" size={18} />
                <span className="text-xs font-semibold text-slate-702 dark:text-slate-200">Upload Back Side</span>
                <span className="text-[10px] text-slate-450">JPG, PNG format</span>
              </div>
            ) : (
              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-10 h-10 rounded overflow-hidden bg-slate-100 shrink-0">
                    <img src={backSrc} alt="Back preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 truncate font-mono font-medium max-w-[120px]">
                    {backFile?.name || 'Back side image'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleStartCrop('back')}
                    className="p-1 px-2 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-650 hover:bg-indigo-100 dark:text-cyan-400 dark:hover:bg-slate-700 text-xs flex items-center gap-1 cursor-pointer font-semibold transition-all shadow-sm"
                    title="Crop Back Image"
                  >
                    <LucideIcon name="Crop" size={12} />
                    <span>Crop</span>
                  </button>
                  <button
                    onClick={() => {
                      setBackFile(null);
                      setBackSrc(null);
                    }}
                    className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-red-500 hover:bg-red-50 hover:text-red-650 cursor-pointer"
                  >
                    <LucideIcon name="X" size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Merge Layout Customizers */}
          <div className="space-y-3 pt-3 border-t border-slate-200/40 dark:border-slate-850/50">
            <h5 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Layout Alignment
            </h5>
            
            {/* Orientation Options */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrientation('horizontal')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  orientation === 'horizontal'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-slate-800 dark:text-cyan-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-500'
                }`}
              >
                <LucideIcon name="ArrowLeftRight" size={14} />
                <span>Side-by-Side</span>
              </button>
              <button
                type="button"
                onClick={() => setOrientation('vertical')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  orientation === 'vertical'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-slate-800 dark:text-cyan-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-500'
                }`}
              >
                <LucideIcon name="Layers" size={14} />
                <span>Stacked (Top/Bottom)</span>
              </button>
            </div>

            {/* Frame border option */}
            <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
              <input
                id="merge-borders-checkbox"
                type="checkbox"
                checked={showBorder}
                onChange={(e) => setShowBorder(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-850"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Draw dotted border frames around cards</span>
            </label>
          </div>

          {/* Core action */}
          <button
            onClick={executeMerge}
            disabled={!frontSrc && !backSrc}
            className={`w-full py-3 text-white font-medium text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              frontSrc || backSrc
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700'
                : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-650 cursor-not-allowed'
            }`}
          >
            <LucideIcon name="Combine" size={14} />
            <span>Stitch Document Canvas</span>
          </button>

          <button
            onClick={handleReset}
            className="w-full py-2 bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:text-slate-300 font-medium text-xs rounded-xl"
          >
            Reset Fields
          </button>
        </div>

        {/* Display monitor panel (Right) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <h4 className="font-display font-medium text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">
            Stitched Layout Preview
          </h4>

          <div className="flex-1 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-6 flex flex-col items-center justify-center min-h-[380px] relative shadow-inner">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400 font-mono">Stitching layout...</span>
              </div>
            ) : downloadUrl ? (
              <div className="space-y-4 text-center max-w-full flex flex-col items-center">
                
                {/* Embedded Cropped & Rotated Control Deck */}
                <div className="flex flex-wrap items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-xl shadow-xs w-full max-w-md mb-2">
                  {frontSrc && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Front:</span>
                      <button
                        type="button"
                        onClick={() => handleStartCrop('front')}
                        className="py-1 px-2 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-705 text-indigo-755 dark:text-cyan-400 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs border border-indigo-200/40 dark:border-slate-700"
                        title="Crop Front Side"
                      >
                        <LucideIcon name="Crop" size={11} />
                        <span>Crop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const img = new Image();
                          img.src = frontSrc;
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            canvas.width = img.naturalHeight;
                            canvas.height = img.naturalWidth;
                            ctx.translate(canvas.width / 2, canvas.height / 2);
                            ctx.rotate((90 * Math.PI) / 180);
                            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
                            setFrontSrc(canvas.toDataURL('image/jpeg', 0.95));
                          };
                        }}
                        className="p-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-semibold border border-slate-200/50 dark:border-slate-700 cursor-pointer transition-all flex items-center gap-1"
                        title="Rotate Front 90°"
                      >
                        <LucideIcon name="RotateCw" size={11} />
                        <span>Rotate</span>
                      </button>
                    </div>
                  )}
                  {frontSrc && backSrc && (
                    <div className="h-5 w-px bg-slate-250 dark:bg-slate-700 shrink-4" />
                  )}
                  {backSrc && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Back:</span>
                      <button
                        type="button"
                        onClick={() => handleStartCrop('back')}
                        className="py-1 px-2 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-705 text-indigo-755 dark:text-cyan-400 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs border border-indigo-200/40 dark:border-slate-700"
                        title="Crop Back Side"
                      >
                        <LucideIcon name="Crop" size={11} />
                        <span>Crop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const img = new Image();
                          img.src = backSrc;
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            canvas.width = img.naturalHeight;
                            canvas.height = img.naturalWidth;
                            ctx.translate(canvas.width / 2, canvas.height / 2);
                            ctx.rotate((90 * Math.PI) / 180);
                            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
                            setBackSrc(canvas.toDataURL('image/jpeg', 0.95));
                          };
                        }}
                        className="p-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-semibold border border-slate-200/50 dark:border-slate-700 cursor-pointer transition-all flex items-center gap-1"
                        title="Rotate Back 90°"
                      >
                        <LucideIcon name="RotateCw" size={11} />
                        <span>Rotate</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 rounded-2xl inline-block max-h-[350px] overflow-hidden shadow-md">
                  <img
                    src={downloadUrl}
                    alt="Merged Aadhaar layout"
                    referrerPolicy="no-referrer"
                    className="max-h-[260px] max-w-full object-contain"
                  />
                </div>
                
                <div className="text-xs text-slate-450 italic mt-1 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full text-slate-550 dark:text-slate-400 font-medium">
                  📝 Proportions calibrated to matching UIDAI print sizes.
                </div>

                <a
                  href={downloadUrl}
                  download="toolmitra_aadhaar_stitched_sheet.jpg"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 px-6 rounded-xl shadow-md cursor-pointer hover:scale-102 transition-all"
                >
                  <LucideIcon name="Download" size={14} />
                  <span>Download Stitched Document</span>
                </a>
              </div>
            ) : (
              <div className="text-center space-y-3 p-4">
                <div className="flex items-center justify-center gap-3 text-slate-300 dark:text-slate-700">
                  <LucideIcon name="CreditCard" size={36} className="animate-pulse" />
                  <LucideIcon name="Plus" size={16} />
                  <LucideIcon name="CreditCard" size={36} className="animate-pulse" />
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
                  Select and upload your front-side and back-side card photos. <b>The Stitched Layout Preview will generate and update automatically here!</b>
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 8-Way Aadhaar Crop Overlay Modal */}
      {cropModalOpen && cropActiveSrc && (
        <div id="aadhaar-crop-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <LucideIcon name="Crop" className="text-indigo-500" size={18} />
                <h3 className="font-display font-bold text-slate-800 dark:text-white text-base">
                  Crop Aadhaar - {cropSide === 'front' ? 'Front Side' : 'Back Side'}
                </h3>
              </div>
              <button
                onClick={() => setCropModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <LucideIcon name="X" size={16} />
              </button>
            </div>

            {/* Crop Workspace */}
            <div className="p-6 flex flex-col items-center justify-center bg-slate-100/50 dark:bg-slate-950/20 min-h-[300px] max-h-[500px] overflow-auto">
              <div className="relative max-w-full max-h-[380px] select-none flex items-center justify-center border border-slate-200 dark:border-slate-800/80 rounded-lg overflow-hidden bg-slate-200 p-2">
                
                {/* Image rotated center container */}
                <div className="relative overflow-hidden" style={{ transform: `rotate(${cropRotation}deg)`, transition: 'transform 0.2s ease-in-out' }}>
                  <img
                    ref={cropImageRef}
                    src={cropActiveSrc}
                    alt="Active cropping card preview"
                    referrerPolicy="no-referrer"
                    className="max-h-[300px] w-auto object-contain pointer-events-none"
                  />

                  {/* Dark shading borders around selected box */}
                  <div className="absolute inset-x-0 top-0 bg-black/60 pointer-events-none" style={{ height: `${cropY}%` }} />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 pointer-events-none" style={{ height: `${100 - cropY - cropH}%` }} />
                  <div className="absolute left-0 bg-black/60 pointer-events-none" style={{ top: `${cropY}%`, height: `${cropH}%`, width: `${cropX}%` }} />
                  <div className="absolute right-0 bg-black/60 pointer-events-none" style={{ top: `${cropY}%`, height: `${cropH}%`, width: `${100 - cropX - cropW}%` }} />

                  {/* Customizable Cropping rectangle */}
                  <div
                    onMouseDown={handleBoxMouseDown}
                    onTouchStart={handleBoxTouchStart}
                    className="absolute border-2 border-indigo-500 dark:border-cyan-400 bg-transparent ring-2 ring-indigo-505/10 shadow-2xl cursor-move flex items-center justify-center"
                    style={{
                      left: `${cropX}%`,
                      top: `${cropY}%`,
                      width: `${cropW}%`,
                      height: `${cropH}%`,
                    }}
                  >
                    {/* Grid helpers */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      <div className="border border-white/20" />
                      <div className="border border-white/20" />
                      <div className="border border-white/20" />
                      <div className="border border-white/20" />
                      <div className="border border-white/20" />
                      <div className="border border-white/20" />
                      <div className="border border-white/20" />
                      <div className="border border-white/20" />
                      <div className="border border-white/20" />
                    </div>

                    {/* Corner handle buttons */}
                    <div
                      onMouseDown={(e) => handleHandleMouseDown(e, 'nw')}
                      onTouchStart={(e) => handleHandleTouchStart(e, 'nw')}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 dark:border-cyan-400 rounded-full cursor-nwse-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    />
                    <div
                      onMouseDown={(e) => handleHandleMouseDown(e, 'ne')}
                      onTouchStart={(e) => handleHandleTouchStart(e, 'ne')}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 dark:border-cyan-400 rounded-full cursor-nesw-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    />
                    <div
                      onMouseDown={(e) => handleHandleMouseDown(e, 'se')}
                      onTouchStart={(e) => handleHandleTouchStart(e, 'se')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 dark:border-cyan-400 rounded-full cursor-nwse-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    />
                    <div
                      onMouseDown={(e) => handleHandleMouseDown(e, 'sw')}
                      onTouchStart={(e) => handleHandleTouchStart(e, 'sw')}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 dark:border-cyan-400 rounded-full cursor-nesw-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    />

                    {/* Edge handle buttons */}
                    <div
                      onMouseDown={(e) => handleHandleMouseDown(e, 'n')}
                      onTouchStart={(e) => handleHandleTouchStart(e, 'n')}
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 dark:border-cyan-400 rounded-full cursor-ns-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    />
                    <div
                      onMouseDown={(e) => handleHandleMouseDown(e, 's')}
                      onTouchStart={(e) => handleHandleTouchStart(e, 's')}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 dark:border-cyan-400 rounded-full cursor-ns-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    />
                    <div
                      onMouseDown={(e) => handleHandleMouseDown(e, 'e')}
                      onTouchStart={(e) => handleHandleTouchStart(e, 'e')}
                      className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 dark:border-cyan-400 rounded-full cursor-ew-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    />
                    <div
                      onMouseDown={(e) => handleHandleMouseDown(e, 'w')}
                      onTouchStart={(e) => handleHandleTouchStart(e, 'w')}
                      className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 dark:border-cyan-400 rounded-full cursor-ew-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Action Bar */}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRotateCrop('left')}
                  className="py-1.5 px-3 bg-white dark:bg-slate-800 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer transition-all text-slate-700 dark:text-slate-300"
                >
                  <LucideIcon name="RotateCcw" size={12} />
                  <span>Rotate 90° L</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateCrop('right')}
                  className="py-1.5 px-3 bg-white dark:bg-slate-800 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer transition-all text-slate-700 dark:text-slate-300"
                >
                  <LucideIcon name="RotateCw" size={12} />
                  <span>Rotate 90° R</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCropModalOpen(false)}
                  className="py-1.5 px-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCrop}
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <LucideIcon name="Check" size={13} />
                  <span>Apply Crop</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
