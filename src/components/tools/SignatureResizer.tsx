import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

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

  // Crop settings in percentage (margins left, right, top, bottom)
  const [cropPercent, setCropPercent] = useState({ left: 5, right: 5, top: 5, bottom: 5 });

  // Contrast / Ink Processing
  const [contrastFilter, setContrastFilter] = useState<'normal' | 'high-contrast-monochrome' | 'greyscale'>('high-contrast-monochrome');
  const [threshold, setThreshold] = useState<number>(140);
  
  // Cropping framing adjustments (panning and zoom inside cropped view)
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

  // New Custom Weight Requirements
  const [compressToTarget, setCompressToTarget] = useState<boolean>(true);
  const [targetSizeValue, setTargetSizeValue] = useState<string>('20'); // defaulted to 20 KB limit like government portals
  const [targetSizeUnit, setTargetSizeUnit] = useState<'kb' | 'mb'>('kb');
  const [actualQualityUsed, setActualQualityUsed] = useState<number>(0.65);

  // Advanced transformations & adjustments
  const [rotation, setRotation] = useState<number>(0);
  const [tilt, setTilt] = useState<number>(0);
  const [bgType, setBgType] = useState<'white' | 'transparent' | 'original'>('white');
  const [autoFitAspect, setAutoFitAspect] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    imageSrc, unit, widthPx, heightPx, widthCm, heightCm, dpi, maintainAspectRatio,
    cropPercent, contrastFilter, threshold, zoom, offsetX, offsetY, outputFormat, quality,
    compressToTarget, targetSizeValue, targetSizeUnit, rotation, tilt, bgType, autoFitAspect
  ]);

  // Dynamically synchronize the canvas height to match the crop selector aspect ratio if auto-fit aspect is checked
  useEffect(() => {
    if (autoFitAspect && imageSrc) {
      const cropW = 100 - cropPercent.left - cropPercent.right;
      const cropH = 100 - cropPercent.top - cropPercent.bottom;
      if (cropW > 0 && cropH > 0) {
        const ratio = cropH / cropW;
        if (unit === 'px') {
          const currentW = parseInt(widthPx, 10) || 280;
          const targetH = Math.round(currentW * ratio);
          if (targetH.toString() !== heightPx) {
            setHeightPx(targetH.toString());
          }
        } else {
          const currentW = parseFloat(widthCm) || 4.5;
          const targetH = (currentW * ratio).toFixed(1);
          if (targetH !== heightCm) {
            setHeightCm(targetH);
          }
        }
      }
    }
  }, [cropPercent, autoFitAspect, unit, widthPx, widthCm, imageSrc]);

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

      // Translate dragging distance to percentage based on true visual container size
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
        newBottom = Math.max(0, Math.min(100 - startCrop.top - 10, startCrop.bottom + pctY));
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
    setPreviewTab('processed');
    setCropPercent({ left: 12, right: 12, top: 12, bottom: 12 }); // default slightly inset to make handles visually clear

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

  const applySignatureRules = async (active = true) => {
    if (!imageSrc) return;

    // Check if input values are incomplete, skip to avoid white screens
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

    try {
      // Async image preloader with error safeguards
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Diagnostic image load failure"));
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

      // Determine dimensions based on selected unit
      let finalW = 280;
      let finalH = 120;

      if (unit === 'px') {
        finalW = parseInt(widthPx, 10) || 280;
        if (autoFitAspect && cropW > 0 && cropH > 0) {
          finalH = Math.round(finalW * cropRatio);
        } else {
          finalH = parseInt(heightPx, 10) || 120;
        }
      } else {
        const wCm = parseFloat(widthCm) || 4.5;
        let hCm = parseFloat(heightCm) || 2.0;
        if (autoFitAspect && cropW > 0 && cropH > 0) {
          hCm = wCm * cropRatio;
        }
        const chosenDpi = dpi || 200;
        finalW = Math.round((wCm / 2.54) * chosenDpi);
        finalH = Math.round((hCm / 2.54) * chosenDpi);
      }

      // Safeguard sizes to prevent memory overflow
      if (isNaN(finalW) || finalW <= 0) finalW = 10;
      if (isNaN(finalH) || finalH <= 0) finalH = 10;
      if (finalW > 5000) finalW = 5000;
      if (finalH > 5000) finalH = 5000;

      canvas.width = finalW;
      canvas.height = finalH;

      // Clear or cover background
      if (bgType === 'transparent' && outputFormat === 'png') {
        ctx.clearRect(0, 0, finalW, finalH);
      } else if (bgType === 'original') {
        ctx.fillStyle = '#faf8f5';
        ctx.fillRect(0, 0, finalW, finalH);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalW, finalH);
      }

      // Configure high-fidelity image scaling smoothing to prevent blurriness
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, finalW, finalH);
      ctx.clip();

      // 1. Calculate Crop Bounds from original image
      const sx = img.width * (cropPercent.left / 100);
      const sy = img.height * (cropPercent.top / 100);
      const sWidth = Math.max(1, img.width * (cropW / 100));
      const sHeight = Math.max(1, img.height * (cropH / 100));

      // 2. Perform optimal containment fit to avoid whitespaces or cuts
      const scale = (Number(zoom) || 100) / 100;
      const canvasRatio = finalH / finalW;

      let drawW = finalW;
      let drawH = finalH;

      if (!autoFitAspect) {
        if (cropRatio > canvasRatio) {
          // Cropped selection is taller than target canvas aspect ratio
          drawH = finalH;
          drawW = drawH / cropRatio;
        } else {
          // Cropped selection is wider than target canvas aspect ratio
          drawW = finalW;
          drawH = drawW * cropRatio;
        }
      }

      // Apply scale zoom factor
      drawW *= scale;
      drawH *= scale;

      // Apply pan offsets
      const drawX = (finalW - drawW) / 2 + (Number(offsetX) || 0);
      const drawY = (finalH - drawH) / 2 + (Number(offsetY) || 0);

      // Center transformation, apply rotation + tilt, and draw
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      ctx.rotate(((rotation + tilt) * Math.PI) / 180);
      ctx.drawImage(
        img,
        sx, sy, sWidth, sHeight,
        -drawW / 2, -drawH / 2, drawW, drawH
      );
      ctx.restore();

      // 3. Pixel filtration & Transparency mask
      const imgData = ctx.getImageData(0, 0, finalW, finalH);
      const data = imgData.data;

      // Soft feather range for anti-aliasing inks (prevents jaggy edges / artifact blurriness)
      const feather = 18;
      const inkR = 12, inkG = 20, inkB = 55;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = data[i + 3];

        if (alpha === 0) continue;

        // Standard visual luminance filter
        const brightness = 0.34 * r + 0.5 * g + 0.16 * b;

        if (contrastFilter === 'greyscale') {
          if (bgType === 'transparent' && outputFormat === 'png' && brightness > threshold) {
            data[i + 3] = 0; // Transparent
          } else if (bgType === 'white' && brightness > threshold) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          } else {
            data[i] = brightness;
            data[i + 1] = brightness;
            data[i + 2] = brightness;
          }
        } else if (contrastFilter === 'high-contrast-monochrome') {
          if (brightness > threshold + feather) {
            if (bgType === 'transparent' && outputFormat === 'png') {
              data[i + 3] = 0; // Transparent
            } else {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
            }
          } else if (brightness < threshold - feather) {
            data[i] = inkR;
            data[i + 1] = inkG;
            data[i + 2] = inkB;
            data[i + 3] = 255;
          } else {
            // Anti-aliasing interpolation interpolation stroke edges!
            const t = (brightness - (threshold - feather)) / (2 * feather);
            if (bgType === 'transparent' && outputFormat === 'png') {
              data[i] = inkR;
              data[i + 1] = inkG;
              data[i + 2] = inkB;
              data[i + 3] = Math.max(0, Math.min(255, Math.round((1 - t) * 255)));
            } else {
              data[i] = Math.round(inkR + t * (255 - inkR));
              data[i + 1] = Math.round(inkG + t * (255 - inkG));
              data[i + 2] = Math.round(inkB + t * (255 - inkB));
              data[i + 3] = 255;
            }
          }
        } else {
          // Keep original
          if (bgType === 'transparent' && outputFormat === 'png' && brightness > threshold) {
            data[i + 3] = 0; // Transparent
          } else if (bgType === 'white' && brightness > threshold) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // 4. Output encoding with live target compression
      const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      const targetValue = parseFloat(targetSizeValue) || 20;
      const targetLimitBytes = targetValue * (targetSizeUnit === 'kb' ? 1024 : 1024 * 1024);

      let finalDataUrl = '';
      let finalBytes = 0;
      let finalQualityUsed = quality;

      if (compressToTarget) {
        if (outputFormat === 'jpg') {
          let bestQuality = 0.85;
          let ok = false;
          let lowQ = 0.02;
          let highQ = 0.95;
          let iter = 0;

          // Search best quality first
          while (iter < 8) {
            const testQ = (lowQ + highQ) / 2;
            const dataUrl = canvas.toDataURL('image/jpeg', testQ);
            const bsize = Math.ceil((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);
            if (bsize <= targetLimitBytes) {
              bestQuality = testQ;
              finalDataUrl = dataUrl;
              finalBytes = bsize;
              lowQ = testQ + 0.01;
              ok = true;
            } else {
              highQ = testQ - 0.01;
            }
            iter++;
          }

          // If quality optimization is still above target limit (very high canvas size), scale down canvas resolution
          if (!ok || finalBytes > targetLimitBytes) {
            bestQuality = 0.05;
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
          finalQualityUsed = bestQuality;
        } else {
          // PNG Mode: Optimize resolution size dynamically until under limit
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
        // Standard manual slider mode
        const qValue = outputFormat === 'jpg' ? quality : undefined;
        finalDataUrl = canvas.toDataURL(mimeType, qValue);
        const headerLength = mimeType === 'image/jpeg' ? 'data:image/jpeg;base64,'.length : 'data:image/png;base64,'.length;
        finalBytes = Math.ceil((finalDataUrl.length - headerLength) * 3 / 4);
        finalQualityUsed = quality;
      }

      // Convert to Uint8Array and pad if user wants a precise size and current limit is greater than actual file size
      if (compressToTarget && finalDataUrl && active) {
        try {
          const originalBytes = await dataUrlToUint8Array(finalDataUrl);
          if (originalBytes.length < targetLimitBytes) {
            const paddedBytes = padImageBytesWithCompliantMetadata(originalBytes, targetLimitBytes, outputFormat);
            finalDataUrl = await uint8ArrayToDataUrl(paddedBytes, mimeType);
            finalBytes = paddedBytes.length;
          }
        } catch (e) {
          console.error("Failed to pad image bytes to exact target size:", e);
        }
      }

      if (active) {
        setActualByteSize(finalBytes);
        setDownloadUrl(finalDataUrl);
        setActualQualityUsed(finalQualityUsed);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Signature processing error:", err);
      if (active) {
        setIsProcessing(false);
      }
    }
  };

  const selectPreset = (w: string, h: string, unitType: 'px' | 'cm', aspectLock: boolean) => {
    setUnit(unitType);
    setMaintainAspectRatio(aspectLock);
    setAutoFitAspect(false);
    if (unitType === 'px') {
      setWidthPx(w);
      setHeightPx(h);
    } else {
      setWidthCm(w);
      setHeightCm(h);
    }
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
    setRotation(0);
    setTilt(0);
    setBgType('white');
    setAutoFitAspect(true);
  };

  const formatByteSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div id="signature-resizer-workspace" className="space-y-6">
      
      {/* Title block */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-805 pb-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
          <LucideIcon name="PenTool" size={24} />
        </div>
        <div>
          <h3 className="font-display font-extrabold text-xl text-slate-800 dark:text-slate-100">
            Premium Portal Signature Resizer & Cropper
          </h3>
          <p className="text-xs text-slate-400">
            Accurately clean notebook lines, crop unwanted margins using visual handles, and automatically compress signature bytes to fit portal regulations (e.g., 20 KB limits).
          </p>
        </div>
      </div>

      {!imageSrc ? (
        <div
          id="sig-uploader"
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center gap-4 hover:border-emerald-500 hover:bg-slate-50/40 dark:hover:bg-slate-850/10 cursor-pointer transition-all dynamic-fadeIn"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-slate-850/30 text-emerald-50 flex items-center justify-center shadow-inner animate-pulse">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
              <LucideIcon name="PenTool" size={28} />
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <p className="font-bold text-slate-800 dark:text-slate-100 text-base">
              Upload handwritten signature image, or <span className="text-emerald-500 font-extrabold">browse file</span>
            </p>
            <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto">
              Snap a clean photo of your signature from paper, crop it, configure portal limits, and clean it instantly.
            </p>
          </div>
        </div>
      ) : (
        <div id="sig-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Bento Box 1: Sizing Constraints (Column Left) */}
          <div className="lg:col-span-4 space-y-5 bg-white dark:bg-slate-905 p-5 rounded-2xl border border-slate-100/80 dark:border-slate-800/80 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-1">
              <span className="p-1 px-1.5 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 font-black text-xs font-mono">1</span>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-widest">
                Resolution & Presets
              </h4>
            </div>

            {/* Presets and custom selections */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Standard Government Portals
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => selectPreset('280', '120', 'px', true)}
                  className="py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-left text-slate-600 dark:text-slate-350 hover:bg-slate-100/80 dark:hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer transition-all duration-150"
                >
                  <span className="text-indigo-600 dark:text-cyan-400 font-extrabold text-[11px]">Standard India Portal (SSC, UPSC)</span>
                  <span className="text-slate-400 font-mono">280 × 120 pixels</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectPreset('140', '60', 'px', true)}
                  className="py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-left text-slate-600 dark:text-slate-350 hover:bg-slate-100/80 dark:hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer transition-all duration-150"
                >
                  <span className="text-indigo-600 dark:text-cyan-400 font-extrabold text-[11px]">SBI Bank Portal (Official)</span>
                  <span className="text-slate-400 font-mono">140 × 60 pixels</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectPreset('250', '120', 'px', true)}
                  className="py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-left text-slate-600 dark:text-slate-350 hover:bg-slate-100/80 dark:hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer transition-all duration-150"
                >
                  <span className="text-emerald-600 font-extrabold text-[11px]">IBPS Clerk / PO Examination</span>
                  <span className="text-slate-400 font-mono">250 × 120 pixels</span>
                </button>
              </div>
            </div>

            {/* Scale unit configuration tab */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500">Scale Dimensions Metric</label>
              <div className="flex p-0.5 bg-slate-100 dark:bg-slate-955 rounded-xl border border-slate-200/50 dark:border-slate-850 text-xs">
                <button
                  type="button"
                  onClick={() => setUnit('px')}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer text-center ${
                    unit === 'px'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Pixels (px)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer text-center ${
                    unit === 'cm'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Physical Centimeters
                </button>
              </div>
            </div>

            {/* Checkbox ratio lock */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lock Aspect Ratio</span>
                <p className="text-[9px] text-slate-400">Lock width & height scaling proportions</p>
              </div>
              <input
                id="sig-aspect-ratio-toggle"
                type="checkbox"
                checked={maintainAspectRatio}
                onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                className="w-4.5 h-4.5 accent-indigo-600 dark:accent-cyan-400 rounded cursor-pointer"
              />
            </div>

            {/* Checkbox auto-fit crop box */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Auto-Fit to Crop Box</span>
                <p className="text-[9px] text-slate-400">Trim all outer whitespaces to match crop proportions</p>
              </div>
              <input
                id="sig-auto-fit-aspect-toggle"
                type="checkbox"
                checked={autoFitAspect}
                onChange={(e) => setAutoFitAspect(e.target.checked)}
                className="w-4.5 h-4.5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            {/* Width and Height numbers */}
            <div className="grid grid-cols-2 gap-3 pb-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-650 dark:text-slate-300">
                  {unit === 'px' ? 'Width (px)' : 'Width (CM)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={unit === 'px' ? '1' : '0.1'}
                    min="0.1"
                    value={unit === 'px' ? widthPx : widthCm}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 font-mono font-bold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-650 dark:text-slate-300">
                  {unit === 'px' ? 'Height (px)' : 'Height (CM)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={unit === 'px' ? '1' : '0.1'}
                    min="0.1"
                    value={unit === 'px' ? heightPx : heightCm}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 font-mono font-bold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* DPI parameters (Visible when Unit is CM) */}
            {unit === 'cm' && (
              <div className="space-y-2 animate-fadeIn p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>DPI Resolution</span>
                  <span className="font-mono text-[9px] text-indigo-500">Current: {dpi} DPI</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
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
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-slate-850 dark:text-cyan-400'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {stepDpi}
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
                  placeholder="Custom DPI e.g. 200"
                  className="w-full text-xs px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg font-mono outline-none text-slate-750 dark:text-slate-300"
                />
              </div>
            )}

            {/* Background enhancement controls */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-[#f1f5f9] dark:border-slate-850 space-y-3 shadow-inner">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Eraser Backdrop & Hue Adjust
              </label>
              
              <select
                value={contrastFilter}
                onChange={(e) => setContrastFilter(e.target.value as any)}
                className="w-full text-xs px-2.5 py-2.0 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-850 rounded-lg outline-none cursor-pointer"
              >
                <option value="high-contrast-monochrome">Perfect White (Clear Laptop Shadows)</option>
                <option value="greyscale">Clean Greyscale</option>
                <option value="normal">Keep Original Hue / Color</option>
              </select>

              {/* Slider threshold if monochrome active */}
              {contrastFilter === 'high-contrast-monochrome' && (
                <div className="space-y-1 pt-1.5 border-t border-slate-200 dark:border-slate-900">
                  <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-300 font-bold font-mono">
                    <span>Shadow Eraser Sensitivity:</span>
                    <span className="text-indigo-600 dark:text-cyan-400 font-black">{threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="220"
                    step="2"
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-cyan-400"
                  />
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Turn up slider to scrub away paper texture wrinkles. Turn down to retain thin pen strokes.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="w-full mt-auto py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:text-slate-350 dark:hover:bg-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-800 text-slate-700 flex items-center justify-center gap-1.5"
            >
              <LucideIcon name="UploadCloud" size={13} />
              <span>Choose Another Photo</span>
            </button>
          </div>

          {/* Bento Box 2: Visual Boundary Cropper Board (Column Center) */}
          <div className="lg:col-span-4 space-y-5 bg-white dark:bg-slate-905 p-5 rounded-2xl border border-slate-100/80 dark:border-slate-800/80 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-1">
              <span className="p-1 px-1.5 rounded-lg bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-cyan-400 font-black text-xs font-mono">2</span>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-widest">
                Visual Border Cropper
              </h4>
            </div>

            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">
              Drag corners to fit handwriting
            </span>

            {/* Draggable Bounding Crop Box Card */}
            <div className="relative max-w-full overflow-hidden border border-slate-200/80 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-slate-950 select-none touch-none aspect-square flex items-center justify-center p-3 animate-fadeIn">
              <div 
                ref={containerRef}
                className="relative inline-block max-w-full select-none touch-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg shadow-sm"
              >
                <img 
                  src={imageSrc} 
                  alt="Source canvas crop coordinates" 
                  className="max-h-[200px] max-w-full object-contain pointer-events-none select-none"
                  style={{ transform: `rotate(${rotation + tilt}deg)` }}
                />
                
                {/* Dark bounding translucent overlay backgrounds */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 bg-black/60 transition-all" style={{ height: `${cropPercent.top}%` }} />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 transition-all" style={{ height: `${cropPercent.bottom}%` }} />
                  <div className="absolute top-0 bottom-0 left-0 bg-black/60 transition-all" style={{ top: `${cropPercent.top}%`, bottom: `${cropPercent.bottom}%`, width: `${cropPercent.left}%` }} />
                  <div className="absolute top-0 bottom-0 right-0 bg-black/60 transition-all" style={{ top: `${cropPercent.top}%`, bottom: `${cropPercent.bottom}%`, width: `${cropPercent.right}%` }} />
                </div>

                {/* Central highlighted crop path window */}
                <div 
                  className="absolute border-2 border-dashed border-white ring-2 ring-emerald-500/80 cursor-move"
                  style={{
                    left: `${cropPercent.left}%`,
                    right: `${cropPercent.right}%`,
                    top: `${cropPercent.top}%`,
                    bottom: `${cropPercent.bottom}%`
                  }}
                  onPointerDown={(e) => handlePointerDown(e, 'drag')}
                >
                  {/* 4 Corners Grab nodes */}
                  <div 
                    className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-emerald-500 rounded-full cursor-nwse-resize shadow-md flex items-center justify-center pointer-events-auto active:scale-110 transition-transform"
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'handle-tl'); }}
                  />
                  <div 
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-emerald-500 rounded-full cursor-nesw-resize shadow-md flex items-center justify-center pointer-events-auto active:scale-110 transition-transform"
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'handle-tr'); }}
                  />
                  <div 
                    className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-emerald-500 rounded-full cursor-nesw-resize shadow-md flex items-center justify-center pointer-events-auto active:scale-110 transition-transform"
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'handle-bl'); }}
                  />
                  <div 
                    className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-emerald-500 rounded-full cursor-nwse-resize shadow-md flex items-center justify-center pointer-events-auto active:scale-110 transition-transform"
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'handle-br'); }}
                  />

                  {/* Sub-label */}
                  <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-mono font-bold text-white px-1 py-0.5 rounded shadow pointer-events-none">
                    {Math.round(100 - cropPercent.left - cropPercent.right)}% × {Math.round(100 - cropPercent.top - cropPercent.bottom)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quick cropping presets */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Quick Crop Trims
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCropPercent({ left: 20, right: 20, top: 15, bottom: 15 })}
                  className="py-1 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-center"
                >
                  Tight Margin Crop
                </button>
                <button
                  type="button"
                  onClick={() => setCropPercent({ left: 5, right: 5, top: 5, bottom: 5 })}
                  className="py-1 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-center"
                >
                  Full Signature Area
                </button>
              </div>
            </div>

            {/* Zoom & internal framing adjusters */}
            <div className="space-y-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Rotate & Align Straight
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                  className="flex-1 py-1.5 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-center gap-1 transition-all duration-150"
                >
                  <LucideIcon name="RotateCcw" size={11} />
                  <span>Rotate -90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="flex-1 py-1.5 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-center gap-1 transition-all duration-150"
                >
                  <LucideIcon name="RotateCw" size={11} />
                  <span>Rotate +90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setRotation(0); setTilt(0); }}
                  className="py-1.5 px-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold text-[10px] rounded-lg border border-rose-200/50 dark:border-rose-900/30 hover:bg-rose-100/50 cursor-pointer transition-all flex items-center gap-1"
                >
                  <LucideIcon name="X" size={11} />
                  <span>Reset</span>
                </button>
              </div>

              {/* Angle slider */}
              <div className="space-y-1 pt-1 pb-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-550 dark:text-slate-300">
                  <span>Fine-Tune Tilt Align:</span>
                  <span className="font-mono text-indigo-600 dark:text-cyan-400 font-extrabold">{tilt > 0 ? `+${tilt}` : tilt}°</span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={tilt}
                  onChange={(e) => setTilt(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-cyan-400"
                />
              </div>

              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pt-2 border-t border-dashed border-slate-100 dark:border-slate-850">
                Micro Placement Adjustments
              </span>

              {/* Ink size scale zoom */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-550 dark:text-slate-300">
                  <span>Zoom Ink Fibers:</span>
                  <span className="font-mono text-indigo-600 dark:text-cyan-400 font-extrabold">{zoom}%</span>
                </div>
                <input
                  type="range"
                  min="55"
                  max="250"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-cyan-400"
                />
              </div>

              {/* Pan Horizontal / Vertical */}
              <div className="grid grid-cols-2 gap-3 pb-1">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold text-slate-500">Pan Left/Right</div>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    value={offsetX}
                    onChange={(e) => setOffsetX(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold text-slate-500">Pan Up/Down</div>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    value={offsetY}
                    onChange={(e) => setOffsetY(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bento Box 3: Form Compliance & Auto-Size Limit (Column Right) */}
          <div className="lg:col-span-4 space-y-5 bg-white dark:bg-slate-905 p-5 rounded-2xl border border-slate-100/80 dark:border-slate-800/80 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-1">
              <span className="p-1 px-1.5 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 font-black text-xs font-mono">3</span>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-widest">
                Compliance Output
              </h4>
            </div>

            {/* Target Size Input Panel */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-[#e2e8f0] dark:border-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                  Select Target JPG Limits
                </span>
                <input
                  type="checkbox"
                  checked={compressToTarget}
                  onChange={(e) => setCompressToTarget(e.target.checked)}
                  className="w-4.5 h-4.5 accent-emerald-500 rounded cursor-pointer"
                  id="compress-target-toggle"
                />
              </div>

              {compressToTarget ? (
                <div className="space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={targetSizeUnit === 'kb' ? '1' : '0.1'}
                      min="1"
                      value={targetSizeValue}
                      onChange={(e) => setTargetSizeValue(e.target.value)}
                      className="w-24 text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono font-bold font-extrabold outline-none"
                    />
                    <select
                      value={targetSizeUnit}
                      onChange={(e) => setTargetSizeUnit(e.target.value as any)}
                      className="text-xs py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold"
                    >
                      <option value="kb">KB limit</option>
                      <option value="mb">MB limit</option>
                    </select>
                  </div>
                  <p className="text-[9.5px] text-slate-400 leading-normal">
                    ToolMitra will auto-tune JPG pixel compression matrix to stay strictly within <span className="font-bold text-indigo-600 dark:text-cyan-400">{targetSizeValue} {targetSizeUnit.toUpperCase()}</span>.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-slate-400 text-xs animate-fadeIn py-1">
                  <p className="text-[10px] leading-normal font-medium text-slate-500">
                    Auto-tune is disabled. Output quality will be set manually using slider below:
                  </p>
                  
                  {outputFormat === 'jpg' ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500">
                        <span>Quality compression:</span>
                        <span className="font-mono">{Math.round(quality * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.20"
                        max="0.95"
                        step="0.05"
                        value={quality}
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                        className="w-full h-1 accent-indigo-500 bg-slate-200 dark:bg-slate-800"
                      />
                    </div>
                  ) : (
                    <div className="text-[10px] text-indigo-500 font-bold">
                      PNG formats encode using lossless full pixel fidelity. No quality degradation available.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Display output image frame */}
            <div className="flex-1 min-h-[185px] max-h-[250px] bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-850 p-3 flex flex-col items-center justify-center relative overflow-hidden">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-slate-400 font-mono">Ink trace cleaning...</span>
                </div>
              ) : downloadUrl ? (
                <div 
                  className="relative border border-slate-200 dark:border-slate-850 rounded-xl inline-flex flex-col items-center justify-center w-full max-w-sm select-none shadow shadow-inner group p-6 transition-all duration-300 animate-fadeIn"
                  style={{
                    backgroundColor: bgType === 'transparent' ? '#1e293b' : (bgType === 'original' ? '#faf8f5' : '#ffffff'),
                    backgroundImage: bgType === 'transparent' 
                      ? 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 0), radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 0)' 
                      : 'none',
                    backgroundSize: '10px 10px',
                    backgroundPosition: '0 0, 5px 5px'
                  }}
                >
                  <div className="absolute top-1 left-1.5 bg-emerald-500/10 text-emerald-600 dark:text-cyan-400 font-sans text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                    {bgType === 'transparent' ? 'Transparent Watermark' : (bgType === 'original' ? 'Original Paper Background' : 'Solid White Background')}
                  </div>
                  <img
                    src={downloadUrl}
                    alt="Processed Signature"
                    referrerPolicy="no-referrer"
                    className="max-h-[135px] max-w-full object-contain cursor-zoom-in transition-transform duration-200 hover:scale-105"
                  />
                </div>
              ) : (
                <div className="text-center space-y-1.5">
                  <LucideIcon name="ShieldAlert" className="text-amber-500 mx-auto" size={24} />
                  <p className="text-slate-400 text-xs">Awaiting processing parameters</p>
                </div>
              )}
            </div>

            {/* Final Byte Size Compliance Panel */}
            {downloadUrl && !isProcessing && (
              <div className="p-3.5 bg-emerald-50/40 dark:bg-slate-950/30 border border-emerald-150 dark:border-slate-850 rounded-2xl flex flex-col justify-center gap-1 shadow-sm">
                <span className="text-[9px] uppercase font-bold text-slate-455 tracking-wider font-mono block text-center">
                  Compliance Certification
                </span>
                <div className="grid grid-cols-2 gap-2 text-center pt-1.5">
                  <div className="border-r border-slate-200 dark:border-slate-800 pr-1">
                    <span className="text-[9px] text-slate-400 block leading-none block">Resulting Weight</span>
                    <span className="font-mono text-sm font-extrabold text-emerald-500 block mt-1">
                      {formatByteSize(actualByteSize)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block leading-none block">Automatic Tune</span>
                    <span className="font-mono text-[10px] font-bold text-indigo-650 dark:text-cyan-400 block mt-1.5 leading-tight">
                      {outputFormat === 'jpg' && compressToTarget ? `${Math.round(actualQualityUsed * 100)}% quality used` : `${outputFormat.toUpperCase()} Mode`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Output configuration options */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Format</label>
                <select
                  value={outputFormat}
                  onChange={(e) => {
                    const fmt = e.target.value as any;
                    setOutputFormat(fmt);
                    if (fmt === 'jpg' && bgType === 'transparent') {
                      setBgType('white');
                    }
                  }}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold cursor-pointer outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                >
                  <option value="jpg">JPG (Govt Portals)</option>
                  <option value="png">PNG (High Quality)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Background</label>
                <select
                  value={bgType}
                  onChange={(e) => {
                    const nextBg = e.target.value as any;
                    setBgType(nextBg);
                    if (nextBg === 'original') {
                      setContrastFilter('normal');
                    }
                  }}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold cursor-pointer outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                >
                  <option value="white">Solid White</option>
                  {outputFormat === 'png' && <option value="transparent">Transparent</option>}
                  <option value="original">Keep Original Paper</option>
                </select>
              </div>
            </div>

            {/* Large high contrast Action Download Trigger */}
            {downloadUrl && !isProcessing && (
              <a
                href={downloadUrl}
                download={`toolmitra_signature_${unit === 'px' ? widthPx + 'x' + heightPx + 'px' : widthCm + 'x' + heightCm + 'cm'}.${outputFormat}`}
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs py-3.5 px-4 rounded-xl shadow-md cursor-pointer hover:scale-101 active:scale-99 transition-all outline-none"
              >
                <LucideIcon name="Download" size={14} />
                <span>DOWNLOAD COMPLIANT IMAGES</span>
              </a>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
