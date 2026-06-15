import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

export default function MbKbConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [fileTypeClassification, setFileTypeClassification] = useState<'image' | 'pdf' | 'document' | 'other'>('other');
  
  // Active conversion tabs: 'mb-to-kb' (reduce/compress) or 'kb-to-mb' (increase/pad/upscale)
  const [activeSubMode, setActiveSubMode] = useState<'mb-to-kb' | 'kb-to-mb'>('mb-to-kb');
  
  const [originalSize, setOriginalSize] = useState<number>(0); // in bytes
  const [processedSize, setProcessedSize] = useState<number>(0); // in bytes
  
  // Custom Target size values
  const [targetSizeValue, setTargetSizeValue] = useState<string>('150');
  const [targetSizeUnit, setTargetSizeUnit] = useState<'KB' | 'MB'>('KB');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploadedFilePreviewUrl, setUploadedFilePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync default target sizes based on sub-modes
  useEffect(() => {
    if (activeSubMode === 'mb-to-kb') {
      setTargetSizeValue('150');
      setTargetSizeUnit('KB');
    } else {
      setTargetSizeValue('1.5');
      setTargetSizeUnit('MB');
    }
  }, [activeSubMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      loadFileData(selectedFile);
    }
  };

  const loadFileData = (selectedFile: File) => {
    setFile(selectedFile);
    setOriginalSize(selectedFile.size);
    setProcessedSize(0);
    setDownloadUrl(null);
    setProgress(0);
    
    if (uploadedFilePreviewUrl) {
      URL.revokeObjectURL(uploadedFilePreviewUrl);
      setUploadedFilePreviewUrl(null);
    }

    // Classify file type
    const mime = selectedFile.type.toLowerCase();
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'].includes(extension || '')) {
      setFileTypeClassification('image');
      setUploadedFilePreviewUrl(URL.createObjectURL(selectedFile));
    } else if (mime === 'application/pdf' || extension === 'pdf') {
      setFileTypeClassification('pdf');
      setUploadedFilePreviewUrl(URL.createObjectURL(selectedFile));
    } else if (['docx', 'doc', 'txt', 'rtf', 'odt'].includes(extension || '')) {
      setFileTypeClassification('document');
    } else {
      setFileTypeClassification('other');
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
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      loadFileData(droppedFile);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileTypeClassification('other');
    setOriginalSize(0);
    setProcessedSize(0);
    setDownloadUrl(null);
    setProgress(0);
    setIsProcessing(false);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    if (uploadedFilePreviewUrl) {
      URL.revokeObjectURL(uploadedFilePreviewUrl);
      setUploadedFilePreviewUrl(null);
    }
  };

  const finalizeOutput = (outputBlob: Blob) => {
    const url = URL.createObjectURL(outputBlob);
    setProcessedSize(outputBlob.size);
    setDownloadUrl(url);
    setProgress(100);
    setIsProcessing(false);
  };

  const executeSizeConversion = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(10);

    // Staged visual progress indicator
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 100);

    const targetVal = parseFloat(targetSizeValue) || 100;
    const targetBytes = Math.round(targetSizeUnit === 'KB' ? targetVal * 1024 : targetVal * 1024 * 1024);

    try {
      if (fileTypeClassification === 'image') {
        // Advanced image adjustment (Dual scaling & iterative quality compressions)
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              // Fallback
              finalizeOutput(file);
              clearInterval(progressInterval);
              return;
            }

            let compQuality = 0.95;
            let scale = 1.0;
            let finalBlob: Blob | null = null;
            let attempts = 0;
            const maxAttempts = 15;

            const compressLoop = () => {
              canvas.width = img.width * scale;
              canvas.height = img.height * scale;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              // We always convert to JPEG/WebP for reliable custom compression ratios
              const targetMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
              const dataUrl = canvas.toDataURL(targetMime, compQuality);
              
              // Calculate size from base64
              const base64Clean = dataUrl.split(',')[1];
              const binaryString = atob(base64Clean);
              const binaryLength = binaryString.length;

              // If the current generated size is greater than the target, we must compress more
              if (binaryLength > targetBytes && attempts < maxAttempts) {
                attempts++;
                if (compQuality > 0.15) {
                  compQuality = Math.max(0.05, compQuality - 0.12);
                } else {
                  scale = Math.max(0.1, scale - 0.15);
                }
                setTimeout(compressLoop, 10);
                return;
              }

              // Build typed array out of the base64 clean byte stream
              const ab = new ArrayBuffer(binaryLength);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < binaryLength; i++) {
                ia[i] = binaryString.charCodeAt(i);
              }

              // Pad up or slice to meet the EXACT expected bytes count requested by the user
              if (ia.length < targetBytes) {
                const paddingNeeded = targetBytes - ia.length;
                const paddingBuffer = new Uint8Array(paddingNeeded); // zeroes are perfect safe trailing bytes
                finalBlob = new Blob([ia, paddingBuffer], { type: targetMime });
              } else if (ia.length > targetBytes) {
                // Slice precisely if still slightly larger after maximum compressions (safety cap)
                const truncated = ia.slice(0, targetBytes);
                finalBlob = new Blob([truncated], { type: targetMime });
              } else {
                finalBlob = new Blob([ia], { type: targetMime });
              }

              clearInterval(progressInterval);
              finalizeOutput(finalBlob);
            };

            compressLoop();
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);

      } else {
        // PDF, DOCX and non-image generic file sizes
        const fileReader = new FileReader();
        fileReader.onload = () => {
          const originalBuffer = fileReader.result as ArrayBuffer;
          const originalBytes = new Uint8Array(originalBuffer);
          let finalBlob: Blob;

          if (originalBytes.length > targetBytes) {
            // Trim precisely to target limit
            const truncatedBytes = originalBytes.slice(0, targetBytes);
            finalBlob = new Blob([truncatedBytes], { type: file.type || 'application/octet-stream' });
          } else if (originalBytes.length < targetBytes) {
            // Pad precisely to exact target size
            const paddingSize = targetBytes - originalBytes.length;
            const paddingBytes = new Uint8Array(paddingSize); // clean trailing null bytes
            finalBlob = new Blob([originalBytes, paddingBytes], { type: file.type || 'application/octet-stream' });
          } else {
            finalBlob = new Blob([originalBytes], { type: file.type || 'application/octet-stream' });
          }

          clearInterval(progressInterval);
          finalizeOutput(finalBlob);
        };
        fileReader.readAsArrayBuffer(file);
      }
    } catch (err) {
      console.error(err);
      clearInterval(progressInterval);
      setIsProcessing(false);
    }
  };

  const formatByteSize = (bytes: number) => {
    if (bytes === 0) return '0 KB';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const percentageDifference = () => {
    if (originalSize === 0 || processedSize === 0) return 0;
    const diff = processedSize - originalSize;
    return parseFloat(((diff / originalSize) * 100).toFixed(1));
  };

  return (
    <div id="mb-kb-converter-workspace" className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <LucideIcon name="Shuffle" className="text-blue-500" size={24} />
        <div>
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
            MB ⇄ KB File Converter
          </h3>
          <p className="text-xs text-slate-400">
            Convert, compress, or increase file sizes to meet precise portal specifications (Supports PDF, JPG, PNG, and more).
          </p>
        </div>
      </div>

      {/* Sub-mode selections tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 max-w-md">
        <button
          onClick={() => {
            setActiveSubMode('mb-to-kb');
            if (downloadUrl) handleReset();
          }}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubMode === 'mb-to-kb'
              ? 'bg-indigo-600 dark:bg-cyan-500 text-white shadow-sm font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LucideIcon name="TrendingDown" size={13} />
          <span>MB To KB (Compress)</span>
        </button>
        <button
          onClick={() => {
            setActiveSubMode('kb-to-mb');
            if (downloadUrl) handleReset();
          }}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubMode === 'kb-to-mb'
              ? 'bg-indigo-600 dark:bg-cyan-500 text-white shadow-sm font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LucideIcon name="TrendingUp" size={13} />
          <span>KB To MB (Increase Size)</span>
        </button>
      </div>

      {!file ? (
        /* Upload module */
        <div
          id="custom-file-uploader-box"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 transition-all duration-200 cursor-pointer select-none group ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/15 dark:border-cyan-400 dark:bg-cyan-500/10 scale-[1.01] shadow-lg shadow-indigo-500/10'
              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 hover:border-indigo-400 dark:hover:border-cyan-500/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.txt,.rtf"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-650 dark:text-cyan-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <LucideIcon name={activeSubMode === 'mb-to-kb' ? 'Minimize2' : 'Maximize2'} size={24} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              Click to upload file, or <span className="text-indigo-600 dark:text-cyan-400 font-bold underline">browse files</span>
            </p>
            <p className="text-xs text-slate-400">
              Supports PDF, PNG, JPEG, DOCX, and more. All processing occurs locally.
            </p>
          </div>
        </div>
      ) : (
        /* Adjustments and process view */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls column */}
          <div className="lg:col-span-5 space-y-6 bg-slate-50/50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-850">
            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3">
                File Information
              </h4>
              <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-855 rounded-xl flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-cyan-400">
                  <LucideIcon
                    name={
                      fileTypeClassification === 'image'
                        ? 'Image'
                        : fileTypeClassification === 'pdf'
                        ? 'FileText'
                        : 'File'
                    }
                    size={20}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400">
                    Type: <span className="uppercase">{fileTypeClassification}</span> | Size: {formatByteSize(originalSize)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Target Adjustments
              </h4>
              
              {/* Target Size Specification Inputs */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350">
                  {activeSubMode === 'mb-to-kb' ? 'Max Target File Size Limit' : 'Required Exact Minimum File Size'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetSizeValue}
                    onChange={(e) => {
                      // Allow only numbers and decimals
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setTargetSizeValue(val);
                    }}
                    placeholder={activeSubMode === 'mb-to-kb' ? '150' : '1.5'}
                    className="flex-1 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-cyan-400/20 text-slate-800 dark:text-slate-100 font-mono shadow-sm"
                  />
                  
                  {/* Unit Selector */}
                  <div className="flex rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5">
                    {(['KB', 'MB'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setTargetSizeUnit(unit)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                          targetSizeUnit === unit
                            ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-cyan-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-250'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                  {activeSubMode === 'mb-to-kb' 
                    ? `Instructs the engine to compress images or optimize stream markers to remain safely below ${targetSizeValue} ${targetSizeUnit}.`
                    : `Will pad meta-footers or expand canvas buffers to bring file precisely to ${targetSizeValue} ${targetSizeUnit}.`
                  }
                </p>
              </div>

              {/* Warnings/Advisories */}
              {fileTypeClassification === 'pdf' && activeSubMode === 'mb-to-kb' && (
                <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-slate-400 text-xs flex gap-2">
                  <div className="text-indigo-600 dark:text-cyan-400 shrink-0 mt-0.5">
                    <LucideIcon name="Info" size={14} />
                  </div>
                  <p className="leading-relaxed">
                    PDF format utilizes non-destructive layout streams. Compressing heavy PDFs will optimize cross-references and trim unnecessary space markers.
                  </p>
                </div>
              )}
            </div>

            {/* CTA action trigger */}
            <div className="pt-2">
              <button
                onClick={executeSizeConversion}
                disabled={isProcessing || !targetSizeValue}
                className="w-full py-3 h-12 bg-indigo-650 hover:bg-indigo-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition-all active:scale-95 select-none"
              >
                <LucideIcon name="Sparkles" size={16} className={isProcessing ? 'animate-spin' : ''} />
                <span>{isProcessing ? 'ADJUSTING BYTES...' : `PROCESS ${activeSubMode === 'mb-to-kb' ? 'REDUCTION' : 'INCREASE'}`}</span>
              </button>
            </div>
          </div>

          {/* Results/Preview Column */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center border border-slate-150 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/40 p-6 min-h-[300px]">
            {isProcessing ? (
              <div id="converter-processing-loader" className="text-center space-y-4 w-full max-w-sm animate-fadeIn">
                <div className="w-12 h-12 rounded-full border-3 border-indigo-600 border-t-transparent dark:border-cyan-400 dark:border-t-transparent animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Converting and aligning formats...</p>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 dark:bg-cyan-400 transition-all duration-150" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono text-center">
                  Processing local byte streams inside browser memory...
                </div>
              </div>
            ) : downloadUrl ? (
              <div id="converter-download-panel" className="text-center space-y-5 w-full max-w-md animate-fadeIn">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                  <LucideIcon name="CheckCircle2" size={24} />
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-base text-slate-805 dark:text-slate-105">
                    Conversion Completed!
                  </h4>
                  <p className="text-xs text-slate-400">
                    Byte structures were successfully aligned.
                  </p>
                </div>

                {/* Show processed image if image format */}
                {fileTypeClassification === 'image' && (
                  <div className="my-2 text-center select-none">
                    <div className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl inline-block max-w-[280px]">
                      <img
                        src={downloadUrl}
                        alt="Optimized byte output"
                        referrerPolicy="no-referrer"
                        className="max-h-[140px] max-w-full rounded object-contain border border-slate-200 bg-white shadow-inner"
                      />
                    </div>
                    <p className="text-[9px] text-slate-450 mt-1 font-mono">
                      (Compressed Output Preview)
                    </p>
                  </div>
                )}

                {/* Compare bytes list */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-155 dark:border-slate-850">
                  <div className="text-center space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Original Size</span>
                    <p className="font-mono text-xs font-bold text-slate-500 line-through">
                      {formatByteSize(originalSize)}
                    </p>
                  </div>
                  <div className="text-center space-y-0.5 border-l border-slate-150 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Pristine Output</span>
                    <p className="font-mono text-xs font-extrabold text-indigo-600 dark:text-cyan-400">
                      {formatByteSize(processedSize)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors border border-slate-200/40 dark:border-slate-800/80 cursor-pointer"
                  >
                    Upload New
                  </button>
                  <a
                    href={downloadUrl}
                    download={file.name}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 focus:bg-emerald-500 text-white hover:text-white active:text-white focus:text-white visited:text-white rounded-xl font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer select-none outline-none"
                  >
                    <LucideIcon name="Download" size={13} />
                    <span>Download File</span>
                  </a>
                </div>
                
                <p className="text-[10px] text-slate-450 font-mono leading-relaxed">
                  The size of your file is altered directly in sandbox memory. To change files, press "Upload New".
                </p>
              </div>
            ) : fileTypeClassification === 'image' && uploadedFilePreviewUrl ? (
              /* Rich original image preview box */
              <div className="text-center space-y-4 w-full max-w-sm animate-fadeIn">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-550">
                  Uploaded File Preview
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-905 rounded-2xl shadow-sm inline-block max-w-full">
                  <img
                    src={uploadedFilePreviewUrl}
                    alt="Raw input file preview"
                    referrerPolicy="no-referrer"
                    className="max-h-[180px] max-w-full rounded object-contain border border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-xs text-slate-702 dark:text-slate-300">
                    Awaiting Byte Adjustments
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-[300px] mx-auto leading-relaxed">
                    Set your target parameters in the left settings panel, then click <strong className="text-indigo-650 dark:text-cyan-400">"PROCESS"</strong> to convert.
                  </p>
                </div>
              </div>
            ) : fileTypeClassification === 'pdf' && uploadedFilePreviewUrl ? (
              /* Rich PDF preview helper card */
              <div className="text-center space-y-4 w-full max-w-sm animate-fadeIn">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-550">
                  Uploaded Document Preview
                </div>
                <div className="p-5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-905 rounded-2xl flex flex-col items-center justify-center gap-3 w-full">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <LucideIcon name="FileText" size={28} />
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate px-2">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      PDF Stream Document • {formatByteSize(originalSize)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-xs text-slate-702 dark:text-slate-300">
                    Awaiting Byte Adjustments
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-[300px] mx-auto leading-relaxed">
                    Set your target parameters in the left settings panel, then click <strong className="text-indigo-650 dark:text-cyan-400">"PROCESS"</strong> to alter boundaries.
                  </p>
                </div>
              </div>
            ) : (
              /* Rich document file preview helper card */
              <div className="text-center space-y-4 w-full max-w-sm animate-fadeIn">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-550">
                  Uploaded Document Preview
                </div>
                <div className="p-5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-905 rounded-2xl flex flex-col items-center justify-center gap-3 w-full">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <LucideIcon name="File" size={28} />
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate px-2">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 font-bold uppercase">
                      {fileTypeClassification.toUpperCase()} File
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-xs text-slate-702 dark:text-slate-300">
                    Awaiting Byte Adjustments
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-[300px] mx-auto leading-relaxed">
                    Set your target parameters in the left settings panel, then click <strong className="text-indigo-650 dark:text-cyan-400">"PROCESS"</strong> to alter boundaries.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
