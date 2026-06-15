import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

type CropRatio = 'free' | '1:1' | '4:3' | '16:9' | 'passport';

export default function ImageCropTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [ratio, setRatio] = useState<CropRatio>('free');
  const [rotation, setRotation] = useState<number>(0); // degrees: 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Crop dimensions in percentage (0 to 100) of displayed image
  const [cropX, setCropX] = useState<number>(10);
  const [cropY, setCropY] = useState<number>(10);
  const [cropW, setCropW] = useState<number>(80);
  const [cropH, setCropH] = useState<number>(80);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; cropX: number; cropY: number } | null>(null);

  // Resize handle interactions
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null); // 'nw', 'ne', 'se', 'sw'
  const [resizeStart, setResizeStart] = useState<{
    x: number;
    y: number;
    cropX: number;
    cropY: number;
    cropW: number;
    cropH: number;
  } | null>(null);

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Adjust crop aspect ratio when selection template changes
  useEffect(() => {
    if (ratio === 'free') return;
    
    let targetRatio = 1;
    if (ratio === '1:1') targetRatio = 1;
    else if (ratio === '4:3') targetRatio = 4 / 3;
    else if (ratio === '16:9') targetRatio = 16 / 9;
    else if (ratio === 'passport') targetRatio = 3.5 / 4.5;

    // Adjust cropH based on cropW and targetRatio to preserve aspect locks
    let newH = cropW / targetRatio;
    if (newH > 100 - cropY) {
      newH = 100 - cropY;
      const newW = newH * targetRatio;
      setCropW(Math.min(100, Math.max(10, newW)));
    }
    setCropH(Math.min(100 - cropY, Math.max(10, newH)));
  }, [ratio]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setImageSrc(url);
      setDownloadUrl(null);
      // Reset crop box
      setCropX(15);
      setCropY(15);
      setCropW(70);
      setCropH(70);
    }
  };

  const rotate = (dir: 'left' | 'right') => {
    if (dir === 'left') {
      setRotation((prev) => (prev - 90 + 360) % 360);
    } else {
      setRotation((prev) => (prev + 90) % 360);
    }
    setDownloadUrl(null);
  };

  // Mouse/Touch Drag Handlers for whole Crop Box movement
  const handleBoxMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imageRef.current) return;
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
    if (!imageRef.current || e.touches.length === 0) return;
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
    if (!imageRef.current) return;
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
    if (!imageRef.current || e.touches.length === 0) return;
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
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    
    if (isDragging && dragStart) {
      const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

      let newX = dragStart.cropX + deltaX;
      let newY = dragStart.cropY + deltaY;

      // Bound assertions
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

      let targetRatioValue = 1;
      if (ratio === '1:1') targetRatioValue = 1;
      else if (ratio === '4:3') targetRatioValue = 4 / 3;
      else if (ratio === '16:9') targetRatioValue = 16 / 9;
      else if (ratio === 'passport') targetRatioValue = 3.5 / 4.5;

      // NW Corner
      if (activeHandle === 'nw') {
        newW = resizeStart.cropW - deltaX;
        newX = resizeStart.cropX + deltaX;
        newH = ratio === 'free' ? resizeStart.cropH - deltaY : newW / targetRatioValue;
        newY = ratio === 'free' ? resizeStart.cropY + deltaY : resizeStart.cropY + (resizeStart.cropH - newH);
      }
      // N Edge
      else if (activeHandle === 'n') {
        newH = resizeStart.cropH - deltaY;
        newY = resizeStart.cropY + deltaY;
        if (ratio !== 'free') {
          newW = newH * targetRatioValue;
          newX = resizeStart.cropX + (resizeStart.cropW - newW) / 2;
        }
      }
      // NE Corner
      else if (activeHandle === 'ne') {
        newW = resizeStart.cropW + deltaX;
        newH = ratio === 'free' ? resizeStart.cropH - deltaY : newW / targetRatioValue;
        newY = ratio === 'free' ? resizeStart.cropY + deltaY : resizeStart.cropY + (resizeStart.cropH - newH);
      }
      // E Edge
      else if (activeHandle === 'e') {
        newW = resizeStart.cropW + deltaX;
        if (ratio !== 'free') {
          newH = newW / targetRatioValue;
          newY = resizeStart.cropY + (resizeStart.cropH - newH) / 2;
        }
      }
      // SE Corner
      else if (activeHandle === 'se') {
        newW = resizeStart.cropW + deltaX;
        newH = ratio === 'free' ? resizeStart.cropH + deltaY : newW / targetRatioValue;
      }
      // S Edge
      else if (activeHandle === 's') {
        newH = resizeStart.cropH + deltaY;
        if (ratio !== 'free') {
          newW = newH * targetRatioValue;
          newX = resizeStart.cropX + (resizeStart.cropW - newW) / 2;
        }
      }
      // SW Corner
      else if (activeHandle === 'sw') {
        newW = resizeStart.cropW - deltaX;
        newX = resizeStart.cropX + deltaX;
        newH = ratio === 'free' ? resizeStart.cropH + deltaY : newW / targetRatioValue;
      }
      // W Edge
      else if (activeHandle === 'w') {
        newW = resizeStart.cropW - deltaX;
        newX = resizeStart.cropX + deltaX;
        if (ratio !== 'free') {
          newH = newW / targetRatioValue;
          newY = resizeStart.cropY + (resizeStart.cropH - newH) / 2;
        }
      }

      // Safeguards checks
      if (ratio !== 'free') {
        // Clamp to check that we don't exceed the image borders [0, 100]
        if (newX < 0) {
          newX = 0;
          newW = resizeStart.cropW + resizeStart.cropX;
          newH = newW / targetRatioValue;
          if (activeHandle === 'n' || activeHandle === 's') {
            newY = resizeStart.cropY + (resizeStart.cropH - newH) / 2;
          }
        }
        if (newX + newW > 100) {
          newW = 100 - newX;
          newH = newW / targetRatioValue;
          if (activeHandle === 'n' || activeHandle === 's') {
            newY = resizeStart.cropY + (resizeStart.cropH - newH) / 2;
          }
        }
        if (newY < 0) {
          newY = 0;
          newH = resizeStart.cropH + resizeStart.cropY;
          newW = newH * targetRatioValue;
          if (activeHandle === 'e' || activeHandle === 'w') {
            newX = resizeStart.cropX + (resizeStart.cropW - newW) / 2;
          }
        }
        if (newY + newH > 100) {
          newH = 100 - newY;
          newW = newH * targetRatioValue;
          if (activeHandle === 'e' || activeHandle === 'w') {
            newX = resizeStart.cropX + (resizeStart.cropW - newW) / 2;
          }
        }

        // Final minimum limit safeguarding
        if (newW < 8 || newH < 8) {
          newW = Math.max(8, newW);
          newH = newW / targetRatioValue;
          if (newH < 8) {
            newH = 8;
            newW = newH * targetRatioValue;
          }
        }
      } else {
        // Under free ratio, simple bounds clamping
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
        if (newX + newW > 100) {
          newW = 100 - newX;
        }
        if (newY + newH > 100) {
          newH = 100 - newY;
        }
      }

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
  }, [isDragging, isResizing, dragStart, resizeStart, activeHandle, cropX, cropY, cropW, cropH, ratio]);

  const applyCrop = () => {
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Account for orientation rotated values
      const isRotated90 = rotation === 90 || rotation === 270;
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;

      // Target canvas measures
      const cropPxX = (cropX / 100) * origW;
      const cropPxY = (cropY / 100) * origH;
      const cropPxW = (cropW / 100) * origW;
      const cropPxH = (cropH / 100) * origH;

      canvas.width = cropPxW;
      canvas.height = cropPxH;

      // Clear layout
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Setup matrix transforms
      ctx.translate(canvas.width / 2, canvas.height / 2);

      if (flipH) ctx.scale(-1, 1);
      if (flipV) ctx.scale(1, -1);
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }

      // Draw sub image segment
      ctx.drawImage(
        img,
        cropPxX,
        cropPxY,
        cropPxW,
        cropPxH,
        -canvas.width / 2,
        -canvas.height / 2,
        canvas.width,
        canvas.height
      );

      // Save binary
      canvas.toBlob((blob) => {
        if (blob) {
          if (downloadUrl) URL.revokeObjectURL(downloadUrl);
          const finalUrl = URL.createObjectURL(blob);
          setDownloadUrl(finalUrl);
        }
      }, 'image/png');
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Configure Area */}
      <div className="lg:col-span-8 flex flex-col items-center justify-center space-y-6">
        
        {/* Upload Slot */}
        {!imageSrc ? (
          <div className="w-full max-w-xl mx-auto">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:border-indigo-400 dark:hover:border-cyan-500/50 transition-all group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 text-blue-500 dark:text-cyan-400 flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <LucideIcon name="Upload" size={18} />
                </div>
                <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-350">
                  Drag and drop image here or click
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-550 mb-3">
                  Supported formats: JPG, PNG, WEBP (Maximum size: 25MB)
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
            <div className="flex justify-between items-center text-xs text-slate-550">
              <span className="font-semibold">Drag crop boundaries manually</span>
              <button
                type="button"
                onClick={() => {
                  setImageSrc(null);
                  setDownloadUrl(null);
                }}
                className="text-red-500 hover:text-red-650 cursor-pointer font-bold flex items-center gap-1"
              >
                <LucideIcon name="Trash2" size={12} />
                <span>Reset Image</span>
              </button>
            </div>

            {/* Editing Canvas Sandbox Container */}
            <div
              ref={containerRef}
              className="relative border border-slate-200 dark:border-slate-805 bg-slate-950 p-2 rounded-2xl overflow-hidden select-none flex items-center justify-center mx-auto"
              style={{ maxHeight: '420px', maxWidth: '100%' }}
            >
              <div className="relative inline-block">
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Source file to crop"
                  referrerPolicy="no-referrer"
                  className="max-h-[380px] w-auto max-w-full block"
                  style={{
                    transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                    transition: 'transform 0.1s ease',
                  }}
                  onLoad={applyCrop}
                />

                {/* Dark Mask overlays around Crop Area */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top Mask */}
                  <div className="absolute top-0 left-0 right-0 bg-black/60" style={{ height: `${cropY}%` }} />
                  {/* Bottom Mask */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60" style={{ height: `${100 - cropY - cropH}%` }} />
                  {/* Left Mask */}
                  <div className="absolute left-0 bg-black/60" style={{ top: `${cropY}%`, height: `${cropH}%`, width: `${cropX}%` }} />
                  {/* Right Mask */}
                  <div className="absolute right-0 bg-black/60" style={{ top: `${cropY}%`, height: `${cropH}%`, width: `${100 - cropX - cropW}%` }} />
                </div>

                {/* Draggable Crop Rectangle Overlay Box */}
                <div
                  onMouseDown={handleBoxMouseDown}
                  onTouchStart={handleBoxTouchStart}
                  className="absolute border-2 border-indigo-500 dark:border-cyan-400 bg-transparent ring-2 ring-indigo-500/10 shadow-2xl cursor-move flex items-center justify-center"
                  style={{
                    left: `${cropX}%`,
                    top: `${cropY}%`,
                    width: `${cropW}%`,
                    height: `${cropH}%`,
                  }}
                >
                  {/* Fine Guideline Grids */}
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

                  {/* Corner resizing Handles */}
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, 'nw')}
                    onTouchStart={(e) => handleHandleTouchStart(e, 'nw')}
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 dark:border-cyan-450 rounded-full cursor-nwse-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    title="Resize North-West"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, 'ne')}
                    onTouchStart={(e) => handleHandleTouchStart(e, 'ne')}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 dark:border-cyan-450 rounded-full cursor-nesw-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    title="Resize North-East"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, 'se')}
                    onTouchStart={(e) => handleHandleTouchStart(e, 'se')}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 dark:border-cyan-450 rounded-full cursor-nwse-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    title="Resize South-East"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, 'sw')}
                    onTouchStart={(e) => handleHandleTouchStart(e, 'sw')}
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 dark:border-cyan-450 rounded-full cursor-nesw-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    title="Resize South-West"
                  />

                  {/* Edge resizing Handles (Eight direction support) */}
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, 'n')}
                    onTouchStart={(e) => handleHandleTouchStart(e, 'n')}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-650 dark:border-cyan-400 rounded-full cursor-ns-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    title="Resize North"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, 's')}
                    onTouchStart={(e) => handleHandleTouchStart(e, 's')}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-650 dark:border-cyan-400 rounded-full cursor-ns-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    title="Resize South"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, 'e')}
                    onTouchStart={(e) => handleHandleTouchStart(e, 'e')}
                    className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-650 dark:border-cyan-400 rounded-full cursor-ew-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    title="Resize East"
                  />
                  <div
                    onMouseDown={(e) => handleHandleMouseDown(e, 'w')}
                    onTouchStart={(e) => handleHandleTouchStart(e, 'w')}
                    className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-650 dark:border-cyan-400 rounded-full cursor-ew-resize z-30 shadow-sm hover:scale-125 transition-transform"
                    title="Resize West"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Options column */}
      <div className="lg:col-span-4 space-y-5">
        <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest block">
          Crop & Rotate Control
        </h3>

        {/* Ratio preset blocks */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-705 dark:text-slate-350">Lock Ratio Template</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'free', label: 'Free Ratio', icon: 'Maximize2' },
              { id: '1:1', label: '1:1 Square', icon: 'Crop' },
              { id: '4:3', label: '4:3 Standard', icon: 'Crop' },
              { id: '16:9', label: '16:9 Widescreen', icon: 'Crop' },
              { id: 'passport', label: '3.5x4.5 Passport', icon: 'UserCircle2' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRatio(item.id as CropRatio)}
                className={`py-2 px-2.5 border rounded-xl text-left flex items-center gap-2 transition-all cursor-pointer ${
                  ratio === item.id
                    ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 dark:border-cyan-550 dark:bg-cyan-500/10 dark:text-cyan-400 font-bold'
                    : 'border-slate-200 dark:border-slate-805 text-slate-550 bg-white dark:bg-slate-900 hover:bg-slate-5 hover:text-slate-800'
                }`}
              >
                <LucideIcon name={item.icon} size={14} />
                <span className="text-[11px] truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rotations and flips */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-705 dark:text-slate-350">Transform & Align</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => rotate('left')}
              className="py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 text-[11px] font-semibold text-slate-650 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LucideIcon name="RotateCw" size={13} className="scale-x-[-1]" />
              <span>Rotate Left</span>
            </button>
            <button
              type="button"
              onClick={() => rotate('right')}
              className="py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 text-[11px] font-semibold text-slate-650 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LucideIcon name="RotateCw" size={13} />
              <span>Rotate Right</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFlipH(!flipH)}
              className={`py-2 px-3 border rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                flipH
                  ? 'border-indigo-500 bg-indigo-50/10 text-indigo-600'
                  : 'border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900'
              }`}
            >
              <LucideIcon name="ArrowLeftRight" size={13} />
              <span>Flip Horizontal</span>
            </button>
            <button
              type="button"
              onClick={() => setFlipV(!flipV)}
              className={`py-2 px-3 border rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                flipV
                  ? 'border-indigo-500 bg-indigo-50/10 text-indigo-600'
                  : 'border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900'
              }`}
            >
              <LucideIcon name="ArrowLeftRight" size={13} className="rotate-90" />
              <span>Flip Vertical</span>
            </button>
          </div>
        </div>

        {/* Generate and export blocks */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
          <button
            type="button"
            disabled={!imageSrc}
            onClick={applyCrop}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <LucideIcon name="Check" size={14} />
            <span>Apply Crop Preview</span>
          </button>

          {downloadUrl && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl text-center space-y-3 animate-fadeIn">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-450 tracking-wider flex items-center justify-center gap-1">
                <LucideIcon name="ShieldCheck" size={12} />
                <span>Image Cropped Successfully</span>
              </span>

              <a
                href={downloadUrl}
                download="cropped_image.png"
                className="w-full inline-flex py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-transform hover:scale-102 items-center justify-center gap-1.5"
              >
                <LucideIcon name="Download" size={13} />
                <span>Download Cropped Image</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* SEO guidelines area */}
      <div className="lg:col-span-12 border-t border-slate-100 dark:border-slate-800 pt-8 mt-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">About Image Crop Tool</h2>
        <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed max-w-4xl mb-6">
          The ToolMitra secure, client-side Image Cropping workspace supports uploading photos and cropping them cleanly to standard dimensions, free constraints, and popular grid guidelines. Perfect for creating Instagram square tiles, widescreen templates, or aligning biometric headshot limits (such as standard passports) completely offline.
        </p>

        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-205 mb-4">Frequently Asked Questions (FAQ)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">What ratios are supported?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              We support Free ratios (drag anywhere), 1:1 (Square avatars), 4:3 (Legacy photos), 16:9 (modern digital screens), and 3.5x4.5 cm (standard biometrics for official forms).
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Are my photographs safe?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Yes, all crop and rotation transformations are triggered locally on your native graphics processor thread. Your original pixels are fully client-side secured.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
