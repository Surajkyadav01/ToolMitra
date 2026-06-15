import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

export default function PassportPhotoMaker() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [preset, setPreset] = useState<'india-standard' | 'us-visa' | 'custom'>('india-standard');
  const [bgColor, setBgColor] = useState<string>('#ffffff'); // Background color choice (White, light blue etc)
  const [sheetLayout, setSheetLayout] = useState<'single' | '4x6-sheet'>('single');
  const [copiesCount, setCopiesCount] = useState<number>(6);
  const [zoom, setZoom] = useState<number>(100);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (imageSrc) {
      renderPassportPhoto();
    }
  }, [preset, bgColor, sheetLayout, copiesCount, zoom, offsetY, offsetX, imageSrc]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      loadFileData(selectedFile);
    }
  };

  const loadFileData = (selectedFile: File) => {
    setFile(selectedFile);
    setImageSrc(URL.createObjectURL(selectedFile));
    setZoom(100);
    setOffsetX(0);
    setOffsetY(0);
  };

  const renderPassportPhoto = () => {
    if (!imageSrc) return;
    setIsProcessing(true);

    const img = new Image();
    
    // Register event handlers first before assigning .src to avoid cache races
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        // Sizing targets in pixel units
        let targetW = 350; // default 3.5cm
        let targetH = 450; // default 4.5cm

        if (preset === 'us-visa') {
          targetW = 400; // 2x2 in
          targetH = 400;
        } else if (preset === 'custom') {
          targetW = 350;
          targetH = 350;
        }

        const drawSinglePassport = (context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
          // Draw solid background backdrop
          context.fillStyle = bgColor;
          context.fillRect(x, y, w, h);

          // Draw image with zoom and coordinate offsets centered
          context.save();
          
          // Clip to passport area
          context.beginPath();
          context.rect(x, y, w, h);
          context.clip();

          // Scale factors
          const scale = (Number(zoom) || 100) / 100;
          const imgRatio = img.width > 0 ? img.height / img.width : 1;
          let drawW = w * scale;
          let drawH = drawW * imgRatio;

          // If high landscape
          if (drawH < h) {
            drawH = h * scale;
            drawW = drawH / imgRatio;
          }

          const drawX = x + (w - drawW) / 2 + (Number(offsetX) || 0);
          const drawY = y + (h - drawH) / 2 + (Number(offsetY) || 0);

          context.drawImage(img, drawX, drawY, drawW, drawH);
          
          // Draw elegant thin grey crop border on layout
          context.strokeStyle = 'rgba(148, 163, 184, 0.5)';
          context.lineWidth = 1;
          context.strokeRect(x, y, w, h);

          context.restore();
        };

        if (sheetLayout === 'single') {
          canvas.width = targetW;
          canvas.height = targetH;
          drawSinglePassport(ctx, 0, 0, targetW, targetH);
        } else {
          // Grid configurations for each copies choice to fit beautifully
          const gridConfigs: Record<number, { cols: number; rows: number }> = {
            2: { cols: 2, rows: 1 },
            4: { cols: 2, rows: 2 },
            6: { cols: 3, rows: 2 },
            8: { cols: 4, rows: 2 },
            12: { cols: 4, rows: 3 },
            16: { cols: 4, rows: 4 }
          };

          const config = gridConfigs[copiesCount] || { cols: 3, rows: 2 };
          const { cols, rows } = config;
          const cardPadding = 12;
          
          canvas.width = (targetW * cols) + (cardPadding * (cols + 1));
          canvas.height = (targetH * rows) + (cardPadding * (rows + 1));

          ctx.fillStyle = '#ffffff'; // White sheet base
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          let placed = 0;
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              if (placed >= copiesCount) break;
              const drawX = col * targetW + (col + 1) * cardPadding;
              const drawY = row * targetH + (row + 1) * cardPadding;
              drawSinglePassport(ctx, drawX, drawY, targetW, targetH);
              placed++;
            }
          }
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        if (downloadUrl) {
          // Safely avoid revoking dataUrls
        }
        setDownloadUrl(dataUrl);
        setIsProcessing(false);
      } catch (err) {
        console.error("Passport photo processing error:", err);
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      console.error("Passport photo failed to load onto diagnostic image object.");
      setIsProcessing(false);
    };

    img.src = imageSrc;
  };

  const handleReset = () => {
    setFile(null);
    setImageSrc(null);
    setDownloadUrl(null);
  };

  return (
    <div id="passport-maker-container" className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <LucideIcon name="UserCircle2" className="text-blue-500" size={24} />
        <div>
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
            Passport Photo Creator
          </h3>
          <p className="text-xs text-slate-400">
            Design biometric profile layouts to match official online government specifications.
          </p>
        </div>
      </div>

      {!imageSrc ? (
        <div
          id="passport-uploader"
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-850/20 cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-500 dark:text-cyan-400 flex items-center justify-center">
            <LucideIcon name="Upload" size={26} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              Upload portrait photograph, or <span className="text-blue-600 dark:text-cyan-400 font-bold">browse</span>
            </p>
            <p className="text-xs text-slate-400">Works best with clear visual portraits on plain backdrops</p>
          </div>
        </div>
      ) : (
        <div id="passport-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls form column */}
          <div className="lg:col-span-5 space-y-5 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Format Specifications
            </h4>

            {/* Sizing presets select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-705 dark:text-slate-300">Biometric Sizing Preset</label>
              <select
                id="passport-preset-select"
                value={preset}
                onChange={(e) => setPreset(e.target.value as any)}
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="india-standard">Standard India Job / Passport (3.5 x 4.5 cm)</option>
                <option value="us-visa">US Visa / Passport (2 x 2 inch / 5.1 x 5.1 cm)</option>
                <option value="custom">Square Form Print (3.5 x 3.5 cm)</option>
              </select>
            </div>

            {/* Backdrop Color Preset */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-705 dark:text-slate-300">Backdrop Substitution color</label>
              <div className="flex items-center gap-2.5">
                {[
                  { label: 'White', hex: '#ffffff' },
                  { label: 'Form Blue', hex: '#3b82f6' },
                  { label: 'Sky Blue', hex: '#93c5fd' },
                  { label: 'Light Gray', hex: '#f1f5f9' }
                ].map((bg) => (
                  <button
                    key={bg.hex}
                    type="button"
                    onClick={() => setBgColor(bg.hex)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      bgColor === bg.hex
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-750 dark:bg-slate-800 dark:text-cyan-400'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-600'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Print configuration layout */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-705 dark:text-slate-300">Sheet Print Layout</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSheetLayout('single')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    sheetLayout === 'single'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-750 dark:bg-slate-800 dark:text-cyan-400'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-550'
                  }`}
                >
                  <LucideIcon name="UserCircle2" size={14} />
                  <span>Single Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSheetLayout('4x6-sheet')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    sheetLayout === '4x6-sheet'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-750 dark:bg-slate-800 dark:text-cyan-400'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-550'
                  }`}
                >
                  <LucideIcon name="Layers" size={14} />
                  <span>Multiple Prints Sheet</span>
                </button>
              </div>

              {/* Dynamic Copies Count Picker */}
              {sheetLayout === '4x6-sheet' && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  <label className="text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Number of copies to include</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[2, 4, 6, 8, 12, 16].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCopiesCount(num)}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          copiesCount === num
                            ? 'border-indigo-600 bg-indigo-600/90 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-slate-950'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/45 text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-805'
                        }`}
                      >
                        {num} {num === 1 ? 'Copy' : 'Copies'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Position Adjustment Sliders */}
            <div className="space-y-4 pt-3 border-t border-slate-200/40 dark:border-slate-850/50">
              <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Face Alignment Controls
              </h5>

              {/* Zoom Scale */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Photo Zoom scale:</span>
                  <span className="font-mono text-blue-500 font-semibold">{zoom}%</span>
                </div>
                <input
                  id="passport-zoom-slider"
                  type="range"
                  min="50"
                  max="200"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Pan X & Y */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>Pan Horizontal</span>
                  </div>
                  <input
                    id="passport-pan-x"
                    type="range"
                    min="-150"
                    max="150"
                    value={offsetX}
                    onChange={(e) => setOffsetX(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>Pan Vertical</span>
                  </div>
                  <input
                    id="passport-pan-y"
                    type="range"
                    min="-150"
                    max="150"
                    value={offsetY}
                    onChange={(e) => setOffsetY(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2.5 bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:text-slate-300 font-medium text-xs rounded-xl transition-all"
            >
              Choose Different Portrait
            </button>
          </div>

          {/* Sizing display panel (Right) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <h4 className="font-display font-medium text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">
              Passport Framed Preview
            </h4>

            <div className="flex-1 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150 p-6 flex flex-col items-center justify-center min-h-[350px]">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Positioning headshot...</span>
                </div>
              ) : downloadUrl ? (
                <div className="space-y-4 text-center max-w-full">
                  <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 rounded-2xl inline-block max-h-[300px] overflow-hidden shadow-lg select-none">
                    <img
                      src={downloadUrl}
                      alt="Form Headshot"
                      referrerPolicy="no-referrer"
                      className="max-h-[250px] max-w-full object-contain"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                    {sheetLayout === 'single'
                      ? 'Single photo formatted perfectly for biometric forms.'
                      : 'Structured 3x2 grid layout ready for printing on standard photographic card stock.'}
                  </p>
                  <a
                    href={downloadUrl}
                    download={`toolmitra_passport_${preset}_${sheetLayout}.jpg`}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-505 text-white font-semibold text-xs py-3 px-6 rounded-xl shadow-md cursor-pointer hover:scale-102 transition-all"
                  >
                    <LucideIcon name="Download" size={14} />
                    <span>Download Crop Layout</span>
                  </a>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <LucideIcon name="UserCircle2" className="text-slate-355 mx-auto" size={40} />
                  <p className="text-slate-450 text-xs">No photograph loaded</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
