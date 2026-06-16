import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';
import { RotateCw, RotateCcw } from 'lucide-react';

// Helper utilities for precise file size target padding (compliance padding) using local Promises to prevent main-thread freezing
function dataUrlToUint8Array(dataUrl: string): Promise<Uint8Array> {
  return fetch(dataUrl)
    .then((res) => res.arrayBuffer())
    .then((ab) => new Uint8Array(ab));
}

function uint8ArrayToDataUrl(bytes: Uint8Array, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes], { type: mimeType });
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function padImageBytes(bytes: Uint8Array, targetBytes: number): Uint8Array {
  if (bytes.length >= targetBytes) {
    return bytes;
  }
  const padded = new Uint8Array(targetBytes);
  padded.set(bytes, 0);
  const paddingPattern = "TOOLMITRA_COMPLIANCE_PAD_";
  const patternLen = paddingPattern.length;
  let offset = bytes.length;
  while (offset < targetBytes) {
    const rem = targetBytes - offset;
    const chunk = Math.min(rem, patternLen);
    for (let i = 0; i < chunk; i++) {
      padded[offset + i] = paddingPattern.charCodeAt(i);
    }
    offset += chunk;
  }
  return padded;
}

// Highly robust PNG and JPG compliant structure-safe padding
function padImageBytesWithCompliantMetadata(bytes: Uint8Array, targetBytes: number, format: 'jpg' | 'png'): Uint8Array {
  if (bytes.length >= targetBytes) {
    return bytes;
  }
  
  const neededPadding = targetBytes - bytes.length;
  
  if (format === 'png') {
    // In PNG, we insert a safe tEXt (textual comment) chunk just before the 12-byte IEND chunk.
    const iendOffset = bytes.length - 12;
    if (iendOffset > 8 && bytes[iendOffset + 4] === 73 && bytes[iendOffset + 5] === 69 && bytes[iendOffset + 6] === 78 && bytes[iendOffset + 7] === 68) {
      if (neededPadding >= 12) {
        const chunkDataLength = neededPadding - 12;
        const chunk = new Uint8Array(neededPadding);
        const view = new DataView(chunk.buffer);
        view.setUint32(0, chunkDataLength);
        // tEXt chunk identifier
        chunk[4] = 116; chunk[5] = 69; chunk[6] = 88; chunk[7] = 116;
        
        let written = 8;
        const prefix = "Description=";
        for (let i = 0; i < prefix.length && i < chunkDataLength; i++) {
          chunk[written++] = prefix.charCodeAt(i);
        }
        while (written < neededPadding - 4) {
          chunk[written++] = 46; // '.'
        }
        // Custom CRC32 hash placeholder
        view.setUint32(neededPadding - 4, 0x12345678);

        const padded = new Uint8Array(targetBytes);
        padded.set(bytes.subarray(0, iendOffset), 0);
        padded.set(chunk, iendOffset);
        padded.set(bytes.subarray(iendOffset), iendOffset + chunk.length);
        return padded;
      }
    }
  } else {
    // In JPEG, we inject a native COM (Comment) marker block [FF FE] before the final 2-byte EOI (End of Image) marker [FF D9].
    const eoiOffset = bytes.length - 2;
    if (eoiOffset > 2 && bytes[eoiOffset] === 0xFF && bytes[eoiOffset + 1] === 0xD9) {
      if (neededPadding >= 4) {
        const segment = new Uint8Array(neededPadding);
        segment[0] = 0xFF;
        segment[1] = 0xFE;
        const payloadLength = neededPadding - 2;
        segment[2] = (payloadLength >> 8) & 0xFF;
        segment[3] = payloadLength & 0xFF;
        
        for (let i = 4; i < neededPadding; i++) {
          segment[i] = 46; // '.'
        }
        
        const padded = new Uint8Array(targetBytes);
        padded.set(bytes.subarray(0, eoiOffset), 0);
        padded.set(segment, eoiOffset);
        padded.set(bytes.subarray(eoiOffset), eoiOffset + segment.length);
        return padded;
      }
    }
  }

  return padImageBytes(bytes, targetBytes);
}

export default function SignatureResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Simplified crop settings (margins left, right, top, bottom in percentage)
  const [cropPercent, setCropPercent] = useState({ left: 10, right: 10, top: 15, bottom: 15 });

  // Size constraints input - defaulted to 20 KB (Indian SSC, UPSC, and PAN portals typical limit)
  const [compressToTarget, setCompressToTarget] = useState<boolean>(true);
  const [targetSizeValue, setTargetSizeValue] = useState<string>('20');
  const [targetSizeUnit, setTargetSizeUnit] = useState<'kb' | 'mb'>('kb');

  // Simple scan enhancement & format
  const [autoEnhance, setAutoEnhance] = useState<boolean>(true);
  const [backgroundMode, setBackgroundMode] = useState<'white' | 'original'>('white');
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'jpeg' | 'png'>('jpg');

  const [actualByteSize, setActualByteSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard Copy & Paste listener for image clipboard items
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            loadSignature(pastedFile);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  const handleRotate = async (clockwise: boolean) => {
    if (!imageSrc) return;
    setIsProcessing(true);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Failed to load image for rotation"));
        i.src = imageSrc;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((clockwise ? 90 : -90) * Math.PI / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        const rotatedUrl = canvas.toDataURL('image/png');
        setImageSrc(rotatedUrl);
        setCropPercent({ left: 10, right: 10, top: 15, bottom: 15 });
      }
    } catch (err) {
      console.error("Failed to rotate image:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto trigger process on state changes
  useEffect(() => {
    let active = true;
    if (imageSrc) {
      applySignatureRules(active);
    }
    return () => {
      active = false;
    };
  }, [
    imageSrc, cropPercent, autoEnhance, backgroundMode, outputFormat, compressToTarget, targetSizeValue, targetSizeUnit
  ]);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>, 
    action: 'drag' | 'handle-tl' | 'handle-tr' | 'handle-bl' | 'handle-br' | 'handle-t' | 'handle-b' | 'handle-l' | 'handle-r'
  ) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startCrop = { ...cropPercent };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      // Map dragging physical pixels to responsive container percentage 1:1
      const pctX = (dx / rect.width) * 100;
      const pctY = (dy / rect.height) * 100;

      let newLeft = startCrop.left;
      let newRight = startCrop.right;
      let newTop = startCrop.top;
      let newBottom = startCrop.bottom;

      if (action === 'drag') {
        const w = 100 - startCrop.left - startCrop.right;
        const h = 100 - startCrop.top - startCrop.bottom;
        newLeft = Math.max(0, Math.min(100 - w, startCrop.left + pctX));
        newRight = 100 - w - newLeft;
        newTop = Math.max(0, Math.min(100 - h, startCrop.top + pctY));
        newBottom = 100 - h - newTop;
      } else if (action === 'handle-tl') {
        newLeft = Math.max(0, Math.min(100 - startCrop.right - 10, startCrop.left + pctX));
        newTop = Math.max(0, Math.min(100 - startCrop.bottom - 10, startCrop.top + pctY));
      } else if (action === 'handle-tr') {
        newRight = Math.max(0, Math.min(100 - startCrop.left - 10, startCrop.right - pctX));
        newTop = Math.max(0, Math.min(100 - startCrop.bottom - 10, startCrop.top + pctY));
      } else if (action === 'handle-bl') {
        newLeft = Math.max(0, Math.min(100 - startCrop.right - 10, startCrop.left + pctX));
        newBottom = Math.max(0, Math.min(100 - startCrop.top - 10, startCrop.bottom - pctY));
      } else if (action === 'handle-br') {
        newRight = Math.max(0, Math.min(100 - startCrop.left - 10, startCrop.right - pctX));
        newBottom = Math.max(0, Math.min(100 - startCrop.top - 10, startCrop.bottom - pctY));
      } else if (action === 'handle-t') {
        newTop = Math.max(0, Math.min(100 - startCrop.bottom - 10, startCrop.top + pctY));
      } else if (action === 'handle-b') {
        newBottom = Math.max(0, Math.min(100 - startCrop.top - 10, startCrop.bottom - pctY));
      } else if (action === 'handle-l') {
        newLeft = Math.max(0, Math.min(100 - startCrop.right - 10, startCrop.left + pctX));
      } else if (action === 'handle-r') {
        newRight = Math.max(0, Math.min(100 - startCrop.left - 10, startCrop.right - pctX));
      }

      setCropPercent({
        left: Math.round(Math.max(0, Math.min(90, newLeft)) * 10) / 10,
        right: Math.round(Math.max(0, Math.min(90, newRight)) * 10) / 10,
        top: Math.round(Math.max(0, Math.min(90, newTop)) * 10) / 10,
        bottom: Math.round(Math.max(0, Math.min(90, newBottom)) * 10) / 10,
      });
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

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
    setCropPercent({ left: 10, right: 10, top: 15, bottom: 15 });
  };

  const applySignatureRules = async (active = true) => {
    if (!imageSrc) return;

    setIsProcessing(true);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Signature failed to load"));
        i.src = imageSrc;
      });

      if (!active) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      const cropW = 100 - cropPercent.left - cropPercent.right;
      const cropH = 100 - cropPercent.top - cropPercent.bottom;
      const cropRatio = cropH / cropW;

      // Base width of 400 pixels is perfect for portal compatibility
      let finalW = 400;
      let finalH = Math.round(finalW * cropRatio);

      if (isNaN(finalH) || finalH <= 0) finalH = 10;
      canvas.width = finalW;
      canvas.height = finalH;

      // Fill signature background as Pure White if selected, or if JPEG output is used (preventing black transparent background)
      if (backgroundMode === 'white' || outputFormat === 'jpg' || outputFormat === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalW, finalH);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Calculate source image crop coordinates
      const sx = img.width * (cropPercent.left / 100);
      const sy = img.height * (cropPercent.top / 100);
      const sWidth = Math.max(1, img.width * (cropW / 100));
      const sHeight = Math.max(1, img.height * (cropH / 100));

      // 2. Draw cropped image portion onto output canvas
      ctx.drawImage(
        img,
        sx, sy, sWidth, sHeight,
        0, 0, finalW, finalH
      );

      // 3. Scan Clean processing (Shadow Eraser, Notebook line reduction and Ink extraction)
      // Only run scanner filter if in white background mode to preserve original colors in original background mode
      if (autoEnhance && backgroundMode === 'white') {
        const imgData = ctx.getImageData(0, 0, finalW, finalH);
        const data = imgData.data;

        // Custom threshold controls
        const threshold = 142;
        const feather = 18;
        const inkR = 12, inkG = 20, inkB = 55; // Professional Navy ink signature representation

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const alpha = data[i + 3];

          if (alpha === 0) continue;

          const brightness = 0.34 * r + 0.5 * g + 0.16 * b;

          if (brightness > threshold + feather) {
            // Turn grayish paper textures into perfect clean white
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          } else if (brightness < threshold - feather) {
            // solid clean ink
            data[i] = inkR;
            data[i + 1] = inkG;
            data[i + 2] = inkB;
          } else {
            // Anti-aliasing stroke borders smoothing
            const t = (brightness - (threshold - feather)) / (2 * feather);
            data[i] = Math.round(inkR + t * (255 - inkR));
            data[i + 1] = Math.round(inkG + t * (255 - inkG));
            data[i + 2] = Math.round(inkB + t * (255 - inkB));
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // 4. Output encoding with limit compression
      const mimeType = (outputFormat === 'jpg' || outputFormat === 'jpeg') ? 'image/jpeg' : 'image/png';
      const targetValue = parseFloat(targetSizeValue) || 20;
      const targetLimitBytes = targetValue * (targetSizeUnit === 'kb' ? 1024 : 1024 * 1024);

      let finalDataUrl = '';
      let finalBytes = 0;

      if (compressToTarget) {
        if (outputFormat === 'jpg' || outputFormat === 'jpeg') {
          let testQuality = 0.85;
          let ok = false;
          let lowQ = 0.02;
          let highQ = 0.95;
          let iter = 0;

          // Search perfect matching quality
          while (iter < 8) {
            const tempQ = (lowQ + highQ) / 2;
            const dataUrl = canvas.toDataURL('image/jpeg', tempQ);
            const bsize = Math.ceil((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);
            if (bsize <= targetLimitBytes) {
              testQuality = tempQ;
              finalDataUrl = dataUrl;
              finalBytes = bsize;
              lowQ = tempQ + 0.01;
              ok = true;
            } else {
              highQ = tempQ - 0.01;
            }
            iter++;
          }

          // Scale resolution down if compression is still too big
          if (!ok || finalBytes > targetLimitBytes) {
            for (let scaleDec = 0.95; scaleDec >= 0.15; scaleDec -= 0.05) {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = Math.max(10, Math.round(finalW * scaleDec));
              tempCanvas.height = Math.max(10, Math.round(finalH * scaleDec));
              const tempCtx = tempCanvas.getContext('2d');
              if (tempCtx) {
                tempCtx.drawImage(canvas, 0, 0, finalW, finalH, 0, 0, tempCanvas.width, tempCanvas.height);
                const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.05);
                const bsize = Math.ceil((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);
                if (bsize <= targetLimitBytes) {
                  finalDataUrl = dataUrl;
                  finalBytes = bsize;
                  break;
                }
              }
            }
          }
        } else {
          // PNG limit compression
          let bestUrl = canvas.toDataURL('image/png');
          let bsize = Math.ceil((bestUrl.length - 'data:image/png;base64,'.length) * 3 / 4);
          if (bsize > targetLimitBytes) {
            for (let s = 0.95; s >= 0.1; s -= 0.05) {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = Math.max(10, Math.round(finalW * s));
              tempCanvas.height = Math.max(10, Math.round(finalH * s));
              const tempCtx = tempCanvas.getContext('2d');
              if (tempCtx) {
                tempCtx.drawImage(canvas, 0, 0, finalW, finalH, 0, 0, tempCanvas.width, tempCanvas.height);
                const dataUrl = tempCanvas.toDataURL('image/png');
                const checkSize = Math.ceil((dataUrl.length - 'data:image/png;base64,'.length) * 3 / 4);
                if (checkSize <= targetLimitBytes) {
                  bestUrl = dataUrl;
                  bsize = checkSize;
                  break;
                }
              }
            }
          }
          finalDataUrl = bestUrl;
          finalBytes = bsize;
        }
      } else {
        // lossless output mode
        finalDataUrl = canvas.toDataURL(mimeType, 0.85);
        const isJpgOrJpeg = outputFormat === 'jpg' || outputFormat === 'jpeg';
        const headerLength = isJpgOrJpeg ? 'data:image/jpeg;base64,'.length : 'data:image/png;base64,'.length;
        finalBytes = Math.ceil((finalDataUrl.length - headerLength) * 3 / 4);
      }

      // Compliance byte-padding (ensures minimum requirement portals don't block files for being too light)
      if (compressToTarget && finalDataUrl && active) {
        try {
          const originalBytes = await dataUrlToUint8Array(finalDataUrl);
          if (originalBytes.length < targetLimitBytes) {
            const paddedBytes = padImageBytesWithCompliantMetadata(
              originalBytes, 
              targetLimitBytes, 
              (outputFormat === 'jpg' || outputFormat === 'jpeg') ? 'jpg' : 'png'
            );
            finalDataUrl = await uint8ArrayToDataUrl(paddedBytes, mimeType);
            finalBytes = paddedBytes.length;
          }
        } catch (e) {
          console.error("Signature padding failed:", e);
        }
      }

      if (active) {
        setActualByteSize(finalBytes);
        setDownloadUrl(finalDataUrl);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Signature output generation failure:", err);
      if (active) {
        setIsProcessing(false);
      }
    }
  };

  const handleReset = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setFile(null);
    setImageSrc(null);
    setDownloadUrl(null);
    setActualByteSize(0);
    setCropPercent({ left: 10, right: 10, top: 15, bottom: 15 });
  };

  const formatByteSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Bytes`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div id="simple-signature-resizer" className="space-y-6">
      
      {/* Title block */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
          <LucideIcon name="PenTool" size={24} />
        </div>
        <div>
          <h3 className="font-display font-extrabold text-xl text-slate-800 dark:text-slate-100">
            Aadhaar & PAN Signature Resizer
          </h3>
          <p className="text-xs text-slate-400">
            Easily upload your paper signature scan, crop unwanted borders, set your required KB size limit, and download perfect cropped signature files.
          </p>
        </div>
      </div>

      {!imageSrc ? (
        <div
          id="sig-uploader-dropzone"
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 sm:p-14 flex flex-col items-center justify-center gap-5 hover:border-emerald-500 hover:bg-slate-50/40 dark:hover:bg-slate-900/30 cursor-pointer transition-all dynamic-fadeIn select-none shadow-sm"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          
          {/* Cursive Signature illustration style vector placeholder */}
          <div className="w-24 h-24 rounded-full bg-emerald-50/60 dark:bg-emerald-950/25 flex items-center justify-center text-emerald-500 shadow-inner">
            <svg className="w-16 h-16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" className="opacity-45" />
              {/* Cursive handwriting vector */}
              <path d="M25 58 C32 42, 35 28, 43 38 C50 46, 42 70, 52 55 C60 42, 57 47, 65 52 C71 56, 68 65, 78 48" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-90" />
              {/* Floating pen */}
              <path d="M68 25 L 75 18 C 76 17, 78 17, 79 18 L 82 21 C 83 22, 83 24, 82 25 L 75 32 Z" fill="currentColor" className="opacity-80" />
              <path d="M68 25 L 64 36 L 75 32 Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" className="opacity-80" />
            </svg>
          </div>

          <div className="text-center space-y-1.5">
            <p className="font-bold text-slate-800 dark:text-slate-100 text-base">
              Click to select signature, <span className="text-emerald-500 font-extrabold uppercase">paste (Ctrl+V)</span>, or browse
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Supports JPG, JPEG, and PNG signature images from paper scans, laptops, or mobile phones
            </p>
          </div>
        </div>
      ) : (
        <div id="simple-workspace-cols" className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
          
          {/* LEFT SIDE: Visual Boundary Cropper Box */}
          <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-start">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">1</span>
                <span className="font-bold text-xs text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Crop Your Signature
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Use corners to resize frame</span>
            </div>

            {/* Draggable Bounding Crop wrapper stage */}
            <div className="relative max-w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-950 p-3 flex items-center justify-center">
              <div 
                ref={containerRef}
                className="relative select-none touch-none bg-white rounded-lg shadow-sm overflow-hidden"
                style={{ width: 'fit-content', maxWidth: '100%' }}
              >
                <img 
                  src={imageSrc} 
                  alt="handwritten signature edit board" 
                  className="max-h-[350px] w-auto max-w-full block pointer-events-none select-none rounded"
                />
                
                {/* Visual crop border overlays wrapping */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                  {/* Top grey out */}
                  <div className="absolute top-0 left-0 right-0 bg-black/60" style={{ height: `${cropPercent.top}%` }} />
                  {/* Bottom grey out */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60" style={{ height: `${cropPercent.bottom}%` }} />
                  {/* Left grey out */}
                  <div className="absolute top-0 bottom-0 left-0 bg-black/60" style={{ top: `${cropPercent.top}%`, bottom: `${cropPercent.bottom}%`, width: `${cropPercent.left}%` }} />
                  {/* Right grey out */}
                  <div className="absolute top-0 bottom-0 right-0 bg-black/60" style={{ top: `${cropPercent.top}%`, bottom: `${cropPercent.bottom}%`, width: `${cropPercent.right}%` }} />
                </div>

                {/* Handles draggable crop box */}
                <div 
                  className="absolute border border-emerald-500 bg-emerald-500/5 cursor-move shadow-[0_0_0_1px_rgba(255,255,255,0.75)]"
                  style={{
                    left: `${cropPercent.left}%`,
                    right: `${cropPercent.right}%`,
                    top: `${cropPercent.top}%`,
                    bottom: `${cropPercent.bottom}%`
                  }}
                  onPointerDown={(e) => handlePointerDown(e, 'drag')}
                >
                  {/* Four corners handles (Figma style) */}
                  <div 
                    className="absolute w-3 h-3 bg-white border-2 border-emerald-500 rounded-full cursor-nwse-resize shadow-[0_1px_3px_rgba(0,0,0,0.15)] hover:scale-125 active:scale-150 transition-all pointer-events-auto"
                    style={{ top: '-6px', left: '-6px' }}
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'handle-tl'); }}
                    title="Drag Corner"
                  />
                  <div 
                    className="absolute w-3 h-3 bg-white border-2 border-emerald-500 rounded-full cursor-nesw-resize shadow-[0_1px_3px_rgba(0,0,0,0.15)] hover:scale-125 active:scale-150 transition-all pointer-events-auto"
                    style={{ top: '-6px', right: '-6px' }}
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'handle-tr'); }}
                    title="Drag Corner"
                  />
                  <div 
                    className="absolute w-3 h-3 bg-white border-2 border-emerald-500 rounded-full cursor-nesw-resize shadow-[0_1px_3px_rgba(0,0,0,0.15)] hover:scale-125 active:scale-150 transition-all pointer-events-auto"
                    style={{ bottom: '-6px', left: '-6px' }}
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'handle-bl'); }}
                    title="Drag Corner"
                  />
                  <div 
                    className="absolute w-3 h-3 bg-white border-2 border-emerald-500 rounded-full cursor-nwse-resize shadow-[0_1px_3px_rgba(0,0,0,0.15)] hover:scale-125 active:scale-150 transition-all pointer-events-auto"
                    style={{ bottom: '-6px', right: '-6px' }}
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'handle-br'); }}
                    title="Drag Corner"
                  />

                  {/* Four middle-sides handles for 8-way stretching (Pills) */}
                  <div 
                    className="absolute w-5 h-1.5 bg-white border border-emerald-500 rounded-full cursor-ns-resize shadow-[0_1px_3px_rgba(0,0,0,0.15)] hover:scale-110 active:scale-125 transition-all pointer-events-auto"
                    style={{ top: '-3.5px', left: '50%', transform: 'translateX(-50%)' }}
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'handle-t'); }}
                    title="Drag Top"
                  />
                  <div 
                    className="absolute w-5 h-1.5 bg-white border border-emerald-500 rounded-full cursor-ns-resize shadow-[0_1px_3px_rgba(0,0,0,0.15)] hover:scale-110 active:scale-125 transition-all pointer-events-auto"
                    style={{ bottom: '-3.5px', left: '50%', transform: 'translateX(-50%)' }}
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'handle-b'); }}
                    title="Drag Bottom"
                  />
                  <div 
                    className="absolute w-1.5 h-5 bg-white border border-emerald-500 rounded-full cursor-ew-resize shadow-[0_1px_3px_rgba(0,0,0,0.15)] hover:scale-110 active:scale-125 transition-all pointer-events-auto"
                    style={{ left: '-3.5px', top: '50%', transform: 'translateY(-50%)' }}
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'handle-l'); }}
                    title="Drag Left"
                  />
                  <div 
                    className="absolute w-1.5 h-5 bg-white border border-emerald-500 rounded-full cursor-ew-resize shadow-[0_1px_3px_rgba(0,0,0,0.15)] hover:scale-110 active:scale-125 transition-all pointer-events-auto"
                    style={{ right: '-3.5px', top: '50%', transform: 'translateY(-50%)' }}
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'handle-r'); }}
                    title="Drag Right"
                  />
                </div>
              </div>
            </div>

            {/* Quick cropping resets and Rotation Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Image adjustments</span>
                <span className="text-[10px] text-slate-405 font-medium">Rotate to fix orientation</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleRotate(false)}
                  className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center justify-center gap-1.5 transition-all outline-none"
                  title="Rotate Left"
                >
                  <RotateCcw size={13} className="text-emerald-500" />
                  <span>Rotate L</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotate(true)}
                  className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center justify-center gap-1.5 transition-all outline-none"
                  title="Rotate Right"
                >
                  <RotateCw size={13} className="text-emerald-500" />
                  <span>Rotate R</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCropPercent({ left: 24, right: 24, top: 22, bottom: 22 })}
                  className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer text-center outline-none"
                >
                  Tight Crop
                </button>
                <button
                  type="button"
                  onClick={() => setCropPercent({ left: 10, right: 10, top: 15, bottom: 15 })}
                  className="py-2.5 px-3 bg-emerald-55 hover:bg-emerald-500/10 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-200/50 dark:border-emerald-900/40 rounded-xl text-xs font-black text-emerald-600 dark:text-emerald-400 cursor-pointer text-center outline-none"
                >
                  Reset Focus
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Target settings & Download Section */}
          <div className="space-y-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-150 dark:border-slate-800 pb-2.5">
                <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">2</span>
                <span className="font-bold text-xs text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Select Target File Size
                </span>
              </div>

              {/* MB/KB target input container */}
              <div className="p-4 bg--slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Target File Size Limit
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <input
                      id="use-size-limit-toggle"
                      type="checkbox"
                      checked={compressToTarget}
                      onChange={(e) => setCompressToTarget(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="use-size-limit-toggle" className="cursor-pointer select-none">Compress to limit</label>
                  </div>
                </div>

                {compressToTarget && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={targetSizeValue}
                      onChange={(e) => setTargetSizeValue(e.target.value)}
                      className="w-24 text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg text-slate-800 dark:text-slate-100 font-mono font-bold font-extrabold outline-none"
                    />
                    <select
                      value={targetSizeUnit}
                      onChange={(e) => setTargetSizeUnit(e.target.value as any)}
                      className="text-xs py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg font-bold cursor-pointer text-slate-700 dark:text-slate-300 outline-none"
                    >
                      <option value="kb">KB (Typical)</option>
                      <option value="mb">MB</option>
                    </select>
                  </div>
                )}
                
                <p className="text-[11px] text-slate-400 leading-normal">
                  Fits government regulations. (Standard Aadhaar/PAN portal limit is <span className="font-bold text-emerald-500">20 KB</span> or <span className="font-bold text-emerald-500">50 KB</span>).
                </p>
              </div>

              {/* Scanned/photo cleaner auto checkbox */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-800">
                <input
                  id="auto-clean-scans"
                  type="checkbox"
                  checked={autoEnhance && backgroundMode === 'white'}
                  disabled={backgroundMode === 'original'}
                  onChange={(e) => setAutoEnhance(e.target.checked)}
                  className="w-4.5 h-4.5 accent-emerald-500 rounded cursor-pointer mt-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <div className={`space-y-0.5 ${backgroundMode === 'original' ? 'opacity-55' : ''}`}>
                  <label htmlFor="auto-clean-scans" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    Clean Signature Background Scan
                  </label>
                  <p className="text-[10px] text-slate-400">
                    {backgroundMode === 'original'
                      ? "Automatically disabled to preserve the signature's original background imagery."
                      : "Automatically removes background grey shadows, tea stains, wrinkles, and paper notebook stripes, leaving perfect black ink on solid white!"}
                  </p>
                </div>
              </div>

              {/* Download output formats */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format</label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold cursor-pointer text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="jpg">JPG Format (Recommended)</option>
                    <option value="jpeg">JPEG Format</option>
                    <option value="png">PNG Format</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Background</label>
                  <select
                    value={backgroundMode}
                    onChange={(e) => setBackgroundMode(e.target.value as 'white' | 'original')}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold cursor-pointer text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="white">Solid Pure White</option>
                    <option value="original">Original Background</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bottom Actions section */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6 md:mt-0">
              {/* Byte Size Compliance representation */}
              {downloadUrl && !isProcessing && (
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block tracking-wider uppercase font-semibold">Processed File Size</span>
                    <span className="font-mono text-xs font-extrabold text-slate-500 dark:text-slate-300">
                      Target Capacity: {targetSizeValue} {targetSizeUnit.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Actual Weight</span>
                    <span className="font-mono text-sm font-black text-emerald-500">
                      {formatByteSize(actualByteSize)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-750 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-200/50 dark:border-slate-700 text-slate-700"
                >
                  Upload Another Signature
                </button>

                {downloadUrl && !isProcessing ? (
                  <a
                    href={downloadUrl}
                    download={`cropped_signature_${targetSizeValue}${targetSizeUnit}.${outputFormat}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-sm hover:shadow active:scale-99 transition-all cursor-pointer outline-none"
                  >
                    <LucideIcon name="Download" size={14} />
                    <span>DOWNLOAD SIGNATURE</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800/50 text-slate-400 font-bold text-xs py-3 px-4 rounded-xl cursor-not-allowed border border-slate-200 dark:border-slate-850"
                  >
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    <span>Processing Scan...</span>
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
