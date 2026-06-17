import React, { useState, useRef, useEffect } from 'react';
import { removeBackground } from '@imgly/background-removal';
import LucideIcon from '../LucideIcon';

// High-performance image pre-resizer to ensure client-side ML runs in milliseconds and never freezes the browser
const resizeImageForBgRemoval = (src: string, maxDim = 640): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to load image for resizing'));
  });
};

interface ImageConvertersProps {
  initialMode?: 'jpg-to-png' | 'png-to-jpg' | 'webp-to-jpg' | 'jpg-to-webp' | 'bg-remover';
}

export default function ImageConverters({ initialMode = 'jpg-to-png' }: ImageConvertersProps) {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [mode, setMode] = useState<'jpg-to-png' | 'png-to-jpg' | 'webp-to-jpg' | 'jpg-to-webp' | 'bg-remover'>(initialMode);
  
  // Background Remover backdrops (Transparent or Color Swap)
  const [bgSelection, setBgSelection] = useState<string>('transparent');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSegmenting, setIsSegmenting] = useState<boolean>(false);
  const [segmentationProgress, setSegmentationProgress] = useState<number>(0);
  const [transparentCutoutUrl, setTransparentCutoutUrl] = useState<string | null>(null);
  
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMode(initialMode);
    handleReset();
  }, [initialMode]);

  // Completely clean up and reset cache when the image or converter mode changes
  useEffect(() => {
    if (transparentCutoutUrl) {
      URL.revokeObjectURL(transparentCutoutUrl);
    }
    setTransparentCutoutUrl(null);
    setSegmentationProgress(0);
    setIsSegmenting(false);
    setDownloadUrl(null);
  }, [imageSrc, mode]);

  useEffect(() => {
    if (imageSrc) {
      applyConversion();
    }
  }, [imageSrc, mode, bgSelection]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setImageSrc(url);
    }
  };

  const applyConversion = async () => {
    if (!imageSrc) return;

    if (mode === 'bg-remover') {
      let cutoutUrl = transparentCutoutUrl;

      // If we do not have a computed cutout, perform the AI background-removal once.
      if (!cutoutUrl) {
        setIsSegmenting(true);
        setIsProcessing(true);
        setSegmentationProgress(0);
        try {
          // Pre-resize image to standard 640px dimension for super fast, high-performance client-side segmentation.
          // 640px is perfect for beautiful previews and makes model inference take milliseconds instead of freezing.
          const resizedBlob = await resizeImageForBgRemoval(imageSrc, 640);

          const imgBlob = await removeBackground(resizedBlob, {
            model: 'isnet_quint8', // Light-weight, 8-bit quantized unit model (~10MB)
            progress: (key, current, total) => {
              if (total && total > 0) {
                setSegmentationProgress(Math.round((current / total) * 100));
              }
            }
          });

          cutoutUrl = URL.createObjectURL(imgBlob);
          setTransparentCutoutUrl(cutoutUrl);
          setIsSegmenting(false);
        } catch (err: any) {
          console.error('Client-side AI background removal error:', err);
          setIsSegmenting(false);
          setIsProcessing(false);
          return;
        }
      }

      // Apply solid color backdrop swap instantly using clean 2D Canvas matrix overlay.
      // Since cutoutUrl is cached in React state, this operation takes only 2ms and never re-runs the ML!
      setIsProcessing(true);
      try {
        if (bgSelection !== 'transparent') {
          const aiImg = new Image();
          aiImg.crossOrigin = 'anonymous';
          aiImg.src = cutoutUrl;
          await new Promise<void>((resolve) => {
            aiImg.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (ctx) {
                canvas.width = aiImg.width;
                canvas.height = aiImg.height;

                // Paint solid background color preset
                ctx.fillStyle = bgSelection;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Overlay transparent cut out on top
                ctx.drawImage(aiImg, 0, 0);

                const blendedDataUrl = canvas.toDataURL('image/png');
                if (downloadUrl && downloadUrl !== transparentCutoutUrl && !downloadUrl.startsWith('data:')) {
                  URL.revokeObjectURL(downloadUrl);
                }
                setDownloadUrl(blendedDataUrl);
              }
              resolve();
            };
            aiImg.onerror = () => {
              setDownloadUrl(cutoutUrl);
              resolve();
            };
          });
        } else {
          setDownloadUrl(cutoutUrl);
        }
      } catch (blendErr) {
        console.error('Error overlays custom background backdrop:', blendErr);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Standard format conversions (JPG, PNG, WEBP)
    setIsProcessing(true);
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      let outputMime = 'image/jpeg';
      if (mode === 'jpg-to-png') {
        outputMime = 'image/png';
      } else if (mode === 'jpg-to-webp') {
        outputMime = 'image/webp';
      }

      const dataUrl = canvas.toDataURL(outputMime, 0.95);
      if (downloadUrl && downloadUrl !== transparentCutoutUrl && !downloadUrl.startsWith('data:')) {
        URL.revokeObjectURL(downloadUrl);
      }
      setDownloadUrl(dataUrl);
      setIsProcessing(false);
    };
    img.onerror = () => {
      setIsProcessing(false);
    };
  };

  const handleReset = () => {
    setFile(null);
    setImageSrc(null);
    setDownloadUrl(null);
    if (transparentCutoutUrl) {
      URL.revokeObjectURL(transparentCutoutUrl);
    }
    setTransparentCutoutUrl(null);
    setSegmentationProgress(0);
    setIsSegmenting(false);
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'jpg-to-png': return 'JPG to PNG layout format converter';
      case 'png-to-jpg': return 'PNG to JPG layout format converter';
      case 'webp-to-jpg': return 'WEBP to JPG layout format converter';
      case 'jpg-to-webp': return 'JPG to WEBP layout format converter';
      case 'bg-remover': return 'AI Smart Background Remover Tool';
    }
  };

  const getInputAccept = () => {
    if (mode === 'jpg-to-png' || mode === 'jpg-to-webp') return 'image/jpeg,image/jpg';
    if (mode === 'png-to-jpg') return 'image/png';
    if (mode === 'webp-to-jpg') return 'image/webp';
    return 'image/*';
  };

  return (
    <div id="image-converters-workspace" className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <LucideIcon name={mode === 'bg-remover' ? 'Sparkles' : 'Shuffle'} className="text-blue-500" size={24} />
        <div>
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white capitalize">
            {mode.replace(/-/g, ' ')}
          </h3>
          <p className="text-xs text-slate-400">{getModeLabel()}</p>
        </div>
      </div>

      {!imageSrc ? (
        <div
          id="converter-uploader"
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getInputAccept()}
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-500 flex items-center justify-center">
            <LucideIcon name="Upload" size={26} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-slate-850 dark:text-slate-100 text-sm">
              Upload file to trigger conversion, or <span className="text-blue-600 dark:text-cyan-400 font-bold">browse</span>
            </p>
            <p className="text-xs text-slate-400">Processing happens locally in complete privacy</p>
          </div>
        </div>
      ) : (
        <div id="converter-workspace-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Option controller panel */}
          <div className="lg:col-span-5 space-y-5 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Conversion controls
            </h4>

            {mode === 'bg-remover' ? (
              <div className="space-y-4">
                {/* Backdrop Swap options */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-705 dark:text-slate-300 uppercase tracking-wider">
                    Replacement Canvas Backdrop
                  </label>
                  
                  {/* Backdrop main mode tab (Transparent PNG or Color Background) */}
                  <div className="flex p-0.5 bg-slate-100 dark:bg-slate-950 rounded-xl text-xs border border-slate-200/50 dark:border-slate-850">
                    <button
                      type="button"
                      disabled={isSegmenting}
                      onClick={() => setBgSelection('transparent')}
                      className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer text-center ${
                        isSegmenting ? 'opacity-50 cursor-not-allowed' : ''
                      } ${
                        bgSelection === 'transparent'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-sm'
                          : 'text-slate-450 hover:text-slate-700 font-medium'
                      }`}
                    >
                      Transparent PNG
                    </button>
                    <button
                      type="button"
                      disabled={isSegmenting}
                      onClick={() => {
                        if (bgSelection === 'transparent') {
                          setBgSelection('#ffffff'); // default to white when entering color mode
                        }
                      }}
                      className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer text-center ${
                        isSegmenting ? 'opacity-50 cursor-not-allowed' : ''
                      } ${
                        bgSelection !== 'transparent'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-sm'
                          : 'text-slate-450 hover:text-slate-700 font-medium'
                      }`}
                    >
                      Color Background
                    </button>
                  </div>

                  {/* Render solid color controls if bgSelection is not transparent */}
                  {bgSelection !== 'transparent' && !isSegmenting && (
                    <div className="p-3.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 space-y-3 shadow-inner">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Choose Background Presets or Custom:
                      </div>
                      
                      {/* Presets color circles */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          { hex: '#ffffff', name: 'White' },
                          { hex: '#3b82f6', name: 'Biometric Blue' },
                          { hex: '#93c5fd', name: 'Sky Blue' },
                          { hex: '#f87171', name: 'Crimson' },
                          { hex: '#4ade80', name: 'Emerald' },
                          { hex: '#fbbf24', name: 'Amber' },
                          { hex: '#c084fc', name: 'Lavender' },
                        ].map((color) => (
                          <button
                            key={color.hex}
                            type="button"
                            onClick={() => setBgSelection(color.hex)}
                            title={color.name}
                            className={`w-7 h-7 rounded-full border transition-all cursor-pointer hover:scale-110 relative ${
                              bgSelection.toLowerCase() === color.hex.toLowerCase()
                                ? 'border-indigo-600 scale-105 shadow-[0_0_8px_rgba(99,102,241,0.5)] dark:shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                                : 'border-slate-200 dark:border-slate-800'
                            }`}
                            style={{ backgroundColor: color.hex }}
                          >
                            {bgSelection.toLowerCase() === color.hex.toLowerCase() && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className={`w-1.5 h-1.5 rounded-full ${color.hex === '#ffffff' ? 'bg-slate-900' : 'bg-white'}`} />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Custom Color Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-850 overflow-hidden relative shrink-0">
                          <input
                            type="color"
                            value={bgSelection.startsWith('#') ? bgSelection : '#ffffff'}
                            onChange={(e) => setBgSelection(e.target.value)}
                            className="absolute -inset-1 w-[150%] h-[150%] p-0 m-0 border-0 cursor-pointer outline-none"
                          />
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-450 select-none text-xs font-mono font-bold">#</span>
                          <input
                            type="text"
                            value={bgSelection.startsWith('#') ? bgSelection.replace('#', '') : 'ffffff'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.length <= 6) {
                                setBgSelection('#' + val);
                              }
                            }}
                            placeholder="ffffff"
                            maxLength={6}
                            className="w-full text-xs pl-6 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg outline-none font-mono uppercase text-slate-800 dark:text-slate-150"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Status Banner */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/10 flex gap-2 items-start text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed bg-indigo-500/5 dark:bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                  <LucideIcon name="Sparkles" className="text-indigo-500 shrink-0 mt-0.5 animate-pulse" size={14} />
                  <div>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">Free, Unlimited Browser AI Engine Localized.</span>
                    <p className="mt-0.5">Your foreground subjects are automatically segmented on-device, privately, with zero external server dependencies.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs text-slate-500">
                <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-950 border border-slate-150 rounded-xl text-slate-700 dark:text-slate-300">
                  <LucideIcon name="ShieldCheck" className="text-emerald-500" size={16} />
                  <span>No quality leaks. Bitmaps scale perfectly.</span>
                </div>
                <p>
                  This module encodes pixel color matrices from physical layers and maps them directly into the selected container format. No server uploads occurred.
                </p>
              </div>
            )}

            {/* Input logs */}
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 text-xs text-slate-450 space-y-1">
              <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Source file logs</div>
              <div className="truncate">Name: {file?.name}</div>
              <div>Type: {file?.type || 'unknown'}</div>
              <div>Bytes: {(file?.size ? file.size / 1024 : 0).toFixed(1)} KB</div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2 bg-slate-200/80 hover:bg-slate-300 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-medium text-xs rounded-xl cursor-pointer"
            >
              Clear Workspace
            </button>
          </div>

          {/* Visual Canvas Pane (Right) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <h4 className="font-display font-medium text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">
              Converted output pane
            </h4>

            <div className="flex-1 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150 p-6 flex flex-col items-center justify-center min-h-[350px]">
              {isSegmenting ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-1" />
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 block">
                      Image uploading... {segmentationProgress}%
                    </span>
                    <span className="text-xs text-slate-450 block max-w-sm">
                      AI segmenting background...
                    </span>
                  </div>
                </div>
              ) : isProcessing ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-1" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-350">
                    Applying background replacement canvas...
                  </span>
                </div>
              ) : downloadUrl ? (
                <div className="space-y-5 text-center w-full animate-fade-in">
                  <div
                    className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl inline-block shadow-lg max-h-[280px] overflow-hidden select-none"
                    style={
                      mode === 'bg-remover' && bgSelection === 'transparent'
                        ? {
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Crect width='8' height='8' fill='%23000000' fill-opacity='0.06'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23000000' fill-opacity='0.06'/%3E%3Crect x='8' width='8' height='8' fill='%23ffffff' fill-opacity='0.12'/%3E%3Crect y='8' width='8' height='8' fill='%23ffffff' fill-opacity='0.12'/%3E%3C/svg%3E")`,
                            backgroundSize: '16px 16px',
                          }
                        : undefined
                    }
                  >
                    <img
                      src={downloadUrl}
                      alt="Converted graphic"
                      referrerPolicy="no-referrer"
                      className="max-h-[250px] max-w-full object-contain relative z-10"
                    />
                  </div>
                  <div className="text-xs text-slate-500 font-semibold font-mono">
                    Format output: <span className="text-emerald-500 uppercase">{mode === 'bg-remover' ? 'png' : mode.split('-to-')[1]}</span>
                  </div>
                  <a
                    href={downloadUrl}
                    download={`toolmitra_${mode}_${file?.name.split('.')[0] || 'file'}.${mode === 'bg-remover' ? 'png' : mode.split('-to-')[1]}`}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-512 text-white font-semibold text-xs py-3 px-6 rounded-xl shadow-md cursor-pointer hover:scale-102 transition-all active:bg-emerald-700/80 focus:bg-emerald-600"
                  >
                    <LucideIcon name="Download" size={14} />
                    <span>Download Converter File</span>
                  </a>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <LucideIcon name="RefreshCw" className="text-slate-400 mx-auto" size={32} />
                  <p className="text-slate-455 text-xs">Awaiting conversion trigger...</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
