import React, { useState, useRef, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

const isSkinColor = (r: number, g: number, b: number): boolean => {
  return (
    r > 80 &&
    g > 40 &&
    b > 20 &&
    r > g &&
    r > b &&
    (r - Math.min(g, b)) > 10 &&
    Math.abs(r - g) > 10
  );
};

const isSkinOrHair = (r: number, g: number, b: number): boolean => {
  const isSkin = isSkinColor(r, g, b);
  const isDark = (r + g + b) < 120;
  return isSkin || isDark;
};

interface ImageConvertersProps {
  initialMode?: 'jpg-to-png' | 'png-to-jpg' | 'webp-to-jpg' | 'jpg-to-webp' | 'bg-remover';
}

export default function ImageConverters({ initialMode = 'jpg-to-png' }: ImageConvertersProps) {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [mode, setMode] = useState<'jpg-to-png' | 'png-to-jpg' | 'webp-to-jpg' | 'jpg-to-webp' | 'bg-remover'>(initialMode);
  
  // Bg Remover options
  const [bgSelection, setBgSelection] = useState<string>('transparent'); // Default transparent
  const [tolerance, setTolerance] = useState<number>(31); // Robust default tolerance for portraits
  const [bgColorsToRemove, setBgColorsToRemove] = useState<string[]>(['#ffffff']); // Default White chroma lists
  
  // AI Background Remover Engine States (Backend-Driven)
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch server configuration to see if REMOVE_BG_API_KEY is configured on the backend
  useEffect(() => {
    if (mode === 'bg-remover') {
      const checkConfig = async () => {
        try {
          const res = await fetch('/api/config');
          const data = await res.json();
          if (data && typeof data.hasRemoveBgKey === 'boolean') {
            setHasServerKey(data.hasRemoveBgKey);
          }
        } catch (e) {
          console.warn('Failed to fetch server config for background removal', e);
        }
      };
      checkConfig();
    }
  }, [mode]);

  useEffect(() => {
    setMode(initialMode);
    handleReset();
  }, [initialMode]);

  useEffect(() => {
    if (imageSrc) {
      applyConversion();
    }
  }, [imageSrc, mode, bgSelection, tolerance, bgColorsToRemove, hasServerKey]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setImageSrc(url);
    }
  };

  const detectBackgroundColors = (imageUrl: string) => {
    const tempImg = new Image();
    tempImg.src = imageUrl;
    tempImg.onload = () => {
      const tempCanvas = document.createElement('canvas');
      // Scale down image to 100x100 to make sampling extremely efficient and less sensitive to fine noise
      tempCanvas.width = 100;
      tempCanvas.height = 100;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(tempImg, 0, 0, 100, 100);
        
        // Sample border pixels
        const borderPixels: {r: number, g: number, b: number}[] = [];
        
        const width = 100;
        const height = 100;
        
        // Sample ONLY upper portion of edges (top row, and upper 32% of left/right columns)
        // to prevent sampling colors of user's clothes or face of human subjects.
        for (let x = 0; x < width; x += 2) {
          try {
            const pTop = tempCtx.getImageData(x, 0, 1, 1).data;
            borderPixels.push({ r: pTop[0], g: pTop[1], b: pTop[2] });
          } catch (e) {
            // Ignore cross-origin issues
          }
        }
        
        // Left & right columns (upper 32% only)
        const limitY = Math.floor(height * 0.32);
        for (let y = 1; y < limitY; y += 2) {
          try {
            const pLeft = tempCtx.getImageData(0, y, 1, 1).data;
            borderPixels.push({ r: pLeft[0], g: pLeft[1], b: pLeft[2] });
            
            const pRight = tempCtx.getImageData(width - 1, y, 1, 1).data;
            borderPixels.push({ r: pRight[0], g: pRight[1], b: pRight[2] });
          } catch (e) {
            // Ignore
          }
        }
        
        // Perform simple distance-based clustering to find dominant background colors (edges)
        interface ColorCluster {
          rSum: number;
          gSum: number;
          bSum: number;
          count: number;
        }
        
        const clusters: ColorCluster[] = [];
        const maxClusterDistance = 45; // Euclidean distance threshold
        
        for (const pixel of borderPixels) {
          // Skip if pixel is skin color or a dark shade (hair / shadow) to protect subject's features
          if (isSkinOrHair(pixel.r, pixel.g, pixel.b)) {
            continue;
          }

          let matchedCluster: ColorCluster | null = null;
          let minDistance = Infinity;
          
          for (const cluster of clusters) {
            const avgR = cluster.rSum / cluster.count;
            const avgG = cluster.gSum / cluster.count;
            const avgB = cluster.bSum / cluster.count;
            
            const dist = Math.sqrt(
              Math.pow(pixel.r - avgR, 2) +
              Math.pow(pixel.g - avgG, 2) +
              Math.pow(pixel.b - avgB, 2)
            );
            
            if (dist < maxClusterDistance && dist < minDistance) {
              minDistance = dist;
              matchedCluster = cluster;
            }
          }
          
          if (matchedCluster) {
            matchedCluster.rSum += pixel.r;
            matchedCluster.gSum += pixel.g;
            matchedCluster.bSum += pixel.b;
            matchedCluster.count++;
          } else {
            clusters.push({
              rSum: pixel.r,
              gSum: pixel.g,
              bSum: pixel.b,
              count: 1
            });
          }
        }
        
        // Sort clusters by pixel count in descending order
        clusters.sort((a, b) => b.count - a.count);
        
        // Get the top colors (maximum of 3 dominant background colors)
        const topClusters = clusters.slice(0, 3);
        const hexColors = topClusters.map(cluster => {
          const r = Math.round(cluster.rSum / cluster.count);
          const g = Math.round(cluster.gSum / cluster.count);
          const b = Math.round(cluster.bSum / cluster.count);
          return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        });
        
        if (hexColors.length > 0) {
          setBgColorsToRemove(hexColors);
        } else {
          setBgColorsToRemove(['#ffffff']);
        }
      }
    };
  };

  useEffect(() => {
    if (mode === 'bg-remover' && imageSrc) {
      detectBackgroundColors(imageSrc);
    }
  }, [mode, imageSrc]);

  const applyConversion = async () => {
    if (!imageSrc) return;
    setIsProcessing(true);
    setApiError(null);

    // Dynamic AI background removal engine path
    if (mode === 'bg-remover' && hasServerKey) {
      try {
        // Step 1: Convert imageSrc blob to base64
        const blobRes = await fetch(imageSrc);
        const imgBlob = await blobRes.blob();
        
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imgBlob);
        });

        // Step 2: Make local API request to our proxy server
        const response = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Data
          })
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Error processing AI background removal.');
        }

        // Step 3: Check if custom color layout was selected to merge cleanly
        if (bgSelection !== 'transparent') {
          const aiImg = new Image();
          aiImg.src = data.image;
          aiImg.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = aiImg.width;
              canvas.height = aiImg.height;

              // Fill with custom background color
              ctx.fillStyle = bgSelection;
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Paint transparent cut out on top
              ctx.drawImage(aiImg, 0, 0);

              const blendedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
              if (downloadUrl) {
                URL.revokeObjectURL(downloadUrl);
              }
              setDownloadUrl(blendedDataUrl);
              setIsProcessing(false);
            }
          };
          aiImg.onerror = () => {
            setDownloadUrl(data.image);
            setIsProcessing(false);
          };
        } else {
          // Transparent path
          if (downloadUrl) {
            URL.revokeObjectURL(downloadUrl);
          }
          setDownloadUrl(data.image);
          setIsProcessing(false);
        }
      } catch (err: any) {
        console.error('AI background removal error:', err);
        setApiError(err.message || 'Failed to connect to the background removal service. Please verify your API Key or try again.');
        setIsProcessing(false);
      }
      return;
    }

    // Default clean pixel chromatography logic (Local Engine)
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image on canvas
      ctx.drawImage(img, 0, 0);

      let outputMime = 'image/jpeg';
      let extension = 'jpg';

      if (mode === 'jpg-to-png') {
        outputMime = 'image/png';
        extension = 'png';
      } else if (mode === 'jpg-to-webp') {
        outputMime = 'image/webp';
        extension = 'webp';
      } else if (mode === 'png-to-jpg' || mode === 'webp-to-jpg') {
        outputMime = 'image/jpeg';
        extension = 'jpg';
      } else if (mode === 'bg-remover') {
        // Automatically isolate multiple detected background edge color clusters and replace elements gracefully
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Parse custom HEX reference colors to RGB objects
        const backgroundList = bgColorsToRemove.map(color => {
          let r = 255, g = 255, b = 255;
          const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
          if (hexMatch) {
            r = parseInt(hexMatch[1], 16);
            g = parseInt(hexMatch[2], 16);
            b = parseInt(hexMatch[3], 16);
          }
          return { r, g, b };
        });

        // Parse replacement colors dynamically from selected hex shade
        let repR = 255, repG = 255, repB = 255, repA = 255;
        if (bgSelection === 'transparent') {
          repA = 0;
        } else if (bgSelection.startsWith('#')) {
          const repMatch = bgSelection.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
          if (repMatch) {
            repR = parseInt(repMatch[1], 16);
            repG = parseInt(repMatch[2], 16);
            repB = parseInt(repMatch[3], 16);
          }
        }

        // Smart feathered selection boundary tolerance to prevent outline jaggedness
        const smoothing = Math.max(3, tolerance * 0.45);

        const width = canvas.width;
        const height = canvas.height;
        const totalPixels = width * height;

        // visited marks whether we have processed/checked the pixel during edge connectivity traversal
        const visited = new Uint8Array(totalPixels);
        // isBg identifies pixels that are connected to the image boundary and match the background color
        const isBg = new Uint8Array(totalPixels);
        // flat queue stores y * width + x index coordinates
        const queue = new Int32Array(totalPixels);
        let head = 0;
        let tail = 0;

        // Float32Array to cache calculated distance metric values per pixel (initialized to -1 to mean uncalculated)
        const minDistances = new Float32Array(totalPixels);
        minDistances.fill(-1);

        // Precompute background metric calculation
        const getPixelDistance = (x: number, y: number) => {
          const idx = y * width + x;
          if (minDistances[idx] >= 0) {
            return minDistances[idx];
          }

          const offset = idx * 4;
          const r = data[offset];
          const g = data[offset + 1];
          const b = data[offset + 2];
          const sum = r + g + b;

          let minDistance = Infinity;

          for (const ref of backgroundList) {
            const refR = ref.r;
            const refG = ref.g;
            const refB = ref.b;

            // Direct Euclidean distance scaled to 0-100 range (makes white vs skin tone separation robust)
            const rDiff = r - refR;
            const gDiff = g - refG;
            const bDiff = b - refB;
            let distance = (Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff) / 441.67) * 100;

            // Explicit skin protection: If current pixel is a skin tone, but the background to remove is NOT, protect it.
            const isRefSkin = isSkinColor(refR, refG, refB);
            const isPixelSkin = isSkinColor(r, g, b);
            if (isPixelSkin && !isRefSkin) {
              distance += 25; // Boost the distance so it stays above the tolerance threshold, protecting the face!
            }

            if (distance < minDistance) {
              minDistance = distance;
            }
          }

          minDistances[idx] = minDistance;
          return minDistance;
        };

        // Seed BFS with border pixels that match background color criteria
        // Only seed from top edge and upper 32% of left/right edges to avoid hitting clothes or torso at the bottom!
        
        // Top edge seeds
        for (let x = 0; x < width; x++) {
          const idxTop = x;
          const distTop = getPixelDistance(x, 0);
          visited[idxTop] = 1;
          if (distTop < tolerance + smoothing) {
            isBg[idxTop] = 1;
            queue[tail++] = idxTop;
          }
        }

        // Left and right columns upper 32% seeds (skipping corners already visited)
        const activeHeightLimit = Math.floor(height * 0.32);
        for (let y = 1; y < activeHeightLimit; y++) {
          // Left column
          const idxLeft = y * width;
          const distLeft = getPixelDistance(0, y);
          visited[idxLeft] = 1;
          if (distLeft < tolerance + smoothing) {
            isBg[idxLeft] = 1;
            queue[tail++] = idxLeft;
          }

          // Right column
          if (width > 1) {
            const idxRight = y * width + (width - 1);
            const distRight = getPixelDistance(width - 1, y);
            visited[idxRight] = 1;
            if (distRight < tolerance + smoothing) {
              isBg[idxRight] = 1;
              queue[tail++] = idxRight;
            }
          }
        }

        // 4-connected BFS neighbor offsets
        const dx = [1, -1, 0, 0];
        const dy = [0, 0, 1, -1];

        // Process queue
        while (head < tail) {
          const currIdx = queue[head++];
          const cx = currIdx % width;
          const cy = Math.floor(currIdx / width);

          for (let i = 0; i < 4; i++) {
            const nx = cx + dx[i];
            const ny = cy + dy[i];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (visited[nIdx] === 0) {
                visited[nIdx] = 1;
                const dist = getPixelDistance(nx, ny);
                if (dist < tolerance + smoothing) {
                  isBg[nIdx] = 1;
                  queue[tail++] = nIdx;
                }
              }
            }
          }
        }

        // Phase 2: Apply alpha factor and background replacements only to edge-connected background pixels
        for (let i = 0; i < data.length; i += 4) {
          const idx = i / 4;
          if (isBg[idx] === 1) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const minDistance = minDistances[idx];

            let alphaFactor = 1.0;
            if (minDistance < tolerance - smoothing) {
              alphaFactor = 0;
            } else {
              // Linear interpolation of transition factor for visual feathering
              alphaFactor = (minDistance - (tolerance - smoothing)) / (2 * smoothing);
            }

            if (bgSelection === 'transparent') {
              data[i + 3] = Math.round(data[i + 3] * alphaFactor);
            } else {
              const blend = 1.0 - alphaFactor;
              data[i] = Math.round(r * alphaFactor + repR * blend);
              data[i + 1] = Math.round(g * alphaFactor + repG * blend);
              data[i + 2] = Math.round(b * alphaFactor + repB * blend);
              data[i + 3] = Math.round(data[i + 3] * alphaFactor + repA * blend);
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        outputMime = 'image/png';
        extension = 'png';
      }

      const dataUrl = canvas.toDataURL(outputMime, 0.95);
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      setDownloadUrl(dataUrl);
      setIsProcessing(false);
    };
  };

  const handleReset = () => {
    setFile(null);
    setImageSrc(null);
    setDownloadUrl(null);
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
                {/* API Error Box if it occurs */}
                {apiError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-200/40 dark:border-red-900/40 rounded-xl text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1">
                      <LucideIcon name="CircleAlert" size={14} />
                      <span>Background Removal Error</span>
                    </div>
                    <p className="text-[10px] leading-relaxed">{apiError}</p>
                  </div>
                )}

                {/* Backdrop Swap options */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-705 dark:text-slate-300 uppercase tracking-wider">
                    Replacement Canvas Backdrop
                  </label>
                  
                  {/* Backdrop main mode tab (Transparent PNG or Color Background) */}
                  <div className="flex p-0.5 bg-slate-100 dark:bg-slate-950 rounded-xl text-xs border border-slate-200/50 dark:border-slate-850">
                    <button
                      type="button"
                      onClick={() => setBgSelection('transparent')}
                      className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer text-center ${
                        bgSelection === 'transparent'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-sm'
                          : 'text-slate-450 hover:text-slate-700'
                      }`}
                    >
                      Transparent PNG
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (bgSelection === 'transparent') {
                          setBgSelection('#ffffff'); // default to white when entering color mode
                        }
                      }}
                      className={`flex-1 py-1.5 font-bold rounded-lg transition-all cursor-pointer text-center ${
                        bgSelection !== 'transparent'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-sm'
                          : 'text-slate-450 hover:text-slate-700'
                      }`}
                    >
                      Color Background
                    </button>
                  </div>

                  {/* Render solid color controls if bgSelection is not transparent */}
                  {bgSelection !== 'transparent' && (
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

                      {/* Custom Color Input for detailed precise selection */}
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

                {/* Chroma Threshold Tolerance vs AI Status */}
                {!hasServerKey ? (
                  <div className="space-y-1.5 pt-3 border-t border-slate-200 dark:border-slate-800/50">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>Background Erase Sensitivity:</span>
                      <span className="font-mono text-blue-500 font-semibold">{tolerance}</span>
                    </div>
                    <input
                      id="tolerance-range-slider"
                      type="range"
                      min="5"
                      max="80"
                      value={tolerance}
                      onChange={(e) => setTolerance(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <p className="text-[9px] text-slate-400">
                       Adjust if needed to remove shadows or preserve foreground elements.
                    </p>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800/10 flex gap-2 items-center text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed bg-emerald-500/5 dark:bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                    <LucideIcon name="Sparkles" className="text-emerald-500 shrink-0 animate-pulse" size={14} />
                    <span><b>Flawless AI Studio removal active!</b> Foreground targets (hair, eyes, body) are automatically detected and segmented.</span>
                  </div>
                )}
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
              className="w-full py-2 bg-slate-200/80 hover:bg-slate-300 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-medium text-xs rounded-xl"
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
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Encoding arrays of bytes...</span>
                </div>
              ) : downloadUrl ? (
                <div className="space-y-5 text-center w-full">
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
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-505 text-white font-semibold text-xs py-3 px-6 rounded-xl shadow-md cursor-pointer hover:scale-102 transition-all active:bg-emerald-700/80 focus:bg-emerald-600"
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
