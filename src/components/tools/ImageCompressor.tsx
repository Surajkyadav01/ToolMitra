import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

export default function ImageCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0); // in bytes
  const [compressedSize, setCompressedSize] = useState<number>(0); // in bytes
  const [quality, setQuality] = useState<number>(0.75);
  const [targetSizeKB, setTargetSizeKB] = useState<string>(''); // Indian form portal specs
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger compression whenever quality or file changes
  useEffect(() => {
    if (imageSrc && file) {
      compressImage();
    }
  }, [imageSrc, quality]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      loadFileData(selectedFile);
    }
  };

  const loadFileData = (selectedFile: File) => {
    setFile(selectedFile);
    setOriginalSize(selectedFile.size);
    const url = URL.createObjectURL(selectedFile);
    setImageSrc(url);

    // Get original image dimensions
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setDimensions({ width: img.width, height: img.height });
      compressImage(img);
    };
  };

  const compressImage = (externalImg?: HTMLImageElement) => {
    if (!imageSrc) return;
    setIsProcessing(true);

    const img = externalImg || new Image();
    if (!externalImg) {
      img.src = imageSrc;
    }

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image onto canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Compress via JPEG encoding
      let compressionQuality = quality;

      // Auto quality calculation if user sets a hard target threshold (e.g. 50KB limit)
      if (targetSizeKB && !isNaN(Number(targetSizeKB))) {
        const targetBytes = Number(targetSizeKB) * 1024;
        if (originalSize > targetBytes) {
          const ratio = targetBytes / originalSize;
          compressionQuality = Math.max(0.1, Math.min(0.9, ratio));
          // Sync quality slider
          setQuality(parseFloat(compressionQuality.toFixed(2)));
        }
      }

      const compressedDataUrl = canvas.toDataURL('image/jpeg', compressionQuality);
      
      // Calculate output size from base64 string
      const stringLength = compressedDataUrl.length - 'data:image/jpeg;base64,'.length;
      const sizeInBytes = Math.ceil(stringLength * 3 / 4);
      setCompressedSize(sizeInBytes);

      // Revoke previous url
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      setDownloadUrl(compressedDataUrl);
      setIsProcessing(false);
    };
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 KB';
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    if (e.target) {}
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      loadFileData(droppedFile);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImageSrc(null);
    setOriginalSize(0);
    setCompressedSize(0);
    setQuality(0.75);
    setTargetSizeKB('');
    setDimensions({ width: 0, height: 0 });
    setDownloadUrl(null);
  };

  return (
    <div id="image-compressor-container" className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <LucideIcon name="TrendingDown" className="text-blue-500" size={24} />
        <div>
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
            Image Compress Studio
          </h3>
          <p className="text-xs text-slate-400">
            Optimize and shrink image file sizes while preserving original aspect ratios.
          </p>
        </div>
      </div>

      {!imageSrc ? (
        /* Upload box */
        <div
          id="compress-uploader-box"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-all cursor-pointer select-none"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-500 dark:text-cyan-400 flex items-center justify-center shadow-sm">
            <LucideIcon name="Upload" size={26} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              Drag and drop your image, or <span className="text-blue-600 dark:text-cyan-400 font-bold">browse</span>
            </p>
            <p className="text-xs text-slate-400">
              Supports JPEG, PNG, WEBP, and BMP up to 25MB
            </p>
          </div>
        </div>
      ) : (
        /* Active Compression Editor */
        <div id="compress-editor-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Sidebar (Left) */}
          <div className="lg:col-span-5 space-y-6 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Compression Settings
            </h4>

            {/* Quality Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Image Quality</span>
                <span className="bg-blue-105 text-blue-600 dark:bg-slate-800 dark:text-cyan-400 px-2 py-0.5 rounded font-mono font-medium">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <input
                id="quality-slider-input"
                type="range"
                min="0.05"
                max="1.00"
                step="0.05"
                value={quality}
                onChange={(e) => {
                  setTargetSizeKB(''); // override manual threshold
                  setQuality(parseFloat(e.target.value));
                }}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Max Compression</span>
                <span>Balanced</span>
                <span>Best Quality</span>
              </div>
            </div>

            {/* Indian Form Portal Specific Target File Limit */}
            <div className="space-y-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target File Size Threshold (Optional)
                </label>
                <span className="text-[10px] text-blue-500 font-mono">Form Limit</span>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <input
                  id="target-size-kb-input"
                  type="number"
                  placeholder="e.g. 50 (to compress under 50KB)"
                  value={targetSizeKB}
                  onChange={(e) => {
                    setTargetSizeKB(e.target.value);
                    if (e.target.value && !isNaN(Number(e.target.value))) {
                      // Trigger calculated update
                      compressImage();
                    }
                  }}
                  className="w-full text-xs pl-4 pr-12 py-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <span className="text-slate-400 text-xs font-semibold">KB</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Enter maximum kilobyte constraints requested by school / recruitment / passport portals (e.g. UPSC, NTA, state exams).
              </p>
            </div>

            {/* File Info Block */}
            <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850/40 text-xs space-y-2.5">
              <div className="font-semibold text-slate-700 dark:text-slate-300">Image Details</div>
              <div className="flex justify-between">
                <span className="text-slate-450">Format Mode:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200 uppercase font-semibold">
                  {file?.type.split('/')[1] || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">Resolution:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
                  {dimensions.width}px &times; {dimensions.height}px
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-410">Original Size:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 line-through">
                  {formatSize(originalSize)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-blue-50/50 dark:bg-slate-900 px-2 py-1 rounded">
                <span className="text-slate-500 dark:text-slate-400 font-medium">New Compressed Size:</span>
                <span className="font-mono font-bold text-emerald-500 text-sm">
                  {formatSize(compressedSize)}
                </span>
              </div>
              {originalSize > 0 && (
                <div className="text-[10px] text-center text-emerald-500 bg-emerald-500/10 py-1 rounded font-semibold font-mono">
                  Saved {Math.round(((originalSize - compressedSize) / originalSize) * 100)}% of disk footprint!
                </div>
              )}
            </div>

            {/* Sidebar actions */}
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 font-medium text-xs rounded-xl transition-all"
              >
                Clear File
              </button>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={`toolmitra_compressed_${file?.name || 'image.jpg'}`}
                  className="flex-1 text-center py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-medium text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <LucideIcon name="Download" size={14} />
                  <span>Download Output</span>
                </a>
              )}
            </div>
          </div>

          {/* Before & After Visual Preview (Right) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <h4 className="font-display font-medium text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">
              Before / After Comparison Pane
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              {/* Original Preview */}
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                  Original Canvas ({formatSize(originalSize)})
                </span>
                <div className="flex-1 min-h-[220px] max-h-[350px] overflow-hidden rounded-xl bg-slate-200/30 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 flex items-center justify-center">
                  {imageSrc && (
                    <img
                      src={imageSrc}
                      alt="Original source"
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Compressed Preview */}
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/40 p-3 flex flex-col gap-2 relative">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center">
                  Compressed Result ({formatSize(compressedSize)})
                </span>
                
                <div className="flex-1 min-h-[220px] max-h-[350px] overflow-hidden rounded-xl bg-slate-200/30 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 flex items-center justify-center">
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-slate-450 font-mono">Processing...</span>
                    </div>
                  ) : downloadUrl ? (
                    <img
                      src={downloadUrl}
                      alt="Compressed footprint"
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 text-xs">No compression output loaded</span>
                  )}
                </div>

                {downloadUrl && (
                  <div className="absolute top-5 right-5 bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold font-mono">
                    READY
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-[10px] text-slate-450 italic text-center leading-normal">
              Note: Compression occurs inside local memory. None of these graphics are dispatched to remote servers. Feel free to compress heavy private blueprints.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
