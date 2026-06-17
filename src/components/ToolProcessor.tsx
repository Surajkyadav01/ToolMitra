import LucideIcon from './LucideIcon';
import { Tool, Category } from '../types';
import { CATEGORIES } from '../data';
import { ArrowLeft } from 'lucide-react';

// Import specialized digital tools
import ImageCompressor from './tools/ImageCompressor';
import ImageResizer from './tools/ImageResizer';
import AadhaarMerger from './tools/AadhaarMerger';
import AadhaarPhotoResizer from './tools/AadhaarPhotoResizer';
import PassportPhotoMaker from './tools/PassportPhotoMaker';
import SignatureResizer from './tools/SignatureResizer';
import ImageConverters from './tools/ImageConverters';
import PdfWizards from './tools/PdfWizards';
import QRCodeGenerator from './tools/QRCodeGenerator';
import AgeCalculator from './tools/AgeCalculator';
import ImageCropTool from './tools/ImageCropTool';
import AiImageEnhancer from './tools/AiImageEnhancer';
import PdfToWordConverter from './tools/PdfToWordConverter';
import WordToPdfConverter from './tools/WordToPdfConverter';
import AiResumeBuilder from './tools/AiResumeBuilder';
import MbKbConverter from './tools/MbKbConverter';
import PdfEditor from './tools/PdfEditor';

interface ToolProcessorProps {
  tool: Tool;
  onBack: () => void;
}

export default function ToolProcessor({ tool, onBack }: ToolProcessorProps) {
  const category: Category | undefined = CATEGORIES.find((cat) => cat.id === tool.categoryId);

  const renderActiveToolComponent = () => {
    switch (tool.id) {
      case 'img-compress':
        return <ImageCompressor />;
      
      case 'img-resize':
        return <ImageResizer />;
      
      case 'aadhaar-merge':
        return <AadhaarMerger />;
      
      case 'passport-photo':
        return <PassportPhotoMaker />;

      case 'aadhaar-resize':
        return <AadhaarPhotoResizer />;
      
      case 'signature-resize':
        return <SignatureResizer />;
      
      case 'jpg-to-png':
      case 'png-to-jpg':
      case 'webp-to-jpg':
      case 'jpg-to-webp':
        return <ImageConverters initialMode={tool.id} />;
      
      case 'bg-remover':
        return <ImageConverters initialMode="bg-remover" />;
      
      // PDF Wizards
      case 'jpg-to-pdf':
      case 'pdf-to-jpg':
      case 'pdf-merge':
      case 'pdf-split':
      case 'pdf-compress':
        return <PdfWizards initialMode={tool.id} />;
      
      case 'qr-generator':
        return <QRCodeGenerator />;
      
      case 'age-calculator':
        return <AgeCalculator />;
      
      case 'img-crop':
        return <ImageCropTool />;
      
      case 'ai-img-enhance':
        return <AiImageEnhancer />;
      
      case 'pdf-to-word':
        return <PdfToWordConverter />;
      
      case 'pdf-editor':
        return <PdfEditor />;
      
      case 'word-to-pdf':
        return <WordToPdfConverter />;
      
      case 'ai-resume':
        return <AiResumeBuilder />;
      
      case 'mb-to-kb-converter':
        return <MbKbConverter />;
      
      default:
        return (
          <div className="py-12 text-center text-slate-500">
            This workspace tool is currently compiling. Select a different processor from catalog.
          </div>
        );
    }
  };

  return (
    <div id="tool-processor-workspace-wrapper" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Workspace Header & Breadcrumbs */}
      <div id="workspace-header-strip" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
        
        {/* Navigation path details */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              onClick={onBack}
              className="hover:text-blue-500 transition-colors font-medium cursor-pointer"
            >
              ToolMitra Catalog
            </button>
            <span>&raquo;</span>
            <span className="font-medium text-slate-500 dark:text-slate-400">
              {category?.name || 'Workspace Suite'}
            </span>
            <span>&raquo;</span>
            <span className="text-blue-600 dark:text-cyan-400 font-bold font-mono">
              {tool.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-full bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-750 text-slate-650 hover:text-blue-500 dark:text-slate-300 dark:hover:text-cyan-450 transition-all cursor-pointer flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 active:scale-95 duration-150 shrink-0"
              title="Go back to list of tools"
              aria-label="Go back"
            >
              <ArrowLeft size={18} className="stroke-[2.5]" />
            </button>
            <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white leading-9">
              {tool.name}
            </h2>
            {tool.badge && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-slate-800 text-blue-650 dark:text-cyan-400 text-[10px] font-semibold">
                {tool.badge}
              </span>
            )}
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3">
          {/* Back Trigger */}
          <button
            onClick={onBack}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-250 font-medium text-sm rounded-xl hover:bg-slate-50 dark:hover:bg-slate-705 active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <LucideIcon name="X" size={14} />
            <span>Select Another Tool</span>
          </button>
          
          {/* Encrypted processing seal */}
          <div className="hidden md:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/15 p-2 rounded-xl text-emerald-600 dark:text-emerald-450 text-[11px] font-mono leading-none">
            <LucideIcon name="ShieldCheck" size={12} className="animate-pulse" />
            <span>Encrypted (Local Client Sandbox)</span>
          </div>
        </div>

      </div>

      {/* Main Core Tool Workspace Card Container */}
      <div
        id="tool-core-workspace-card"
        className="bg-white dark:bg-slate-900/60 border border-slate-150/90 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow"
      >
        {renderActiveToolComponent()}
      </div>

      {/* Workspace Base safety disclaimer */}
      <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-400 dark:text-slate-550 max-w-lg mx-auto text-center leading-relaxed">
        <LucideIcon name="ShieldCheck" size={12} className="text-emerald-500 shrink-0" />
        <span>
          Aadhaar files, signature strokes, and photograph pixels remain strictly contained inside client processes. Closing this workspace instantly flushes browser memory caches.
        </span>
      </div>

    </div>
  );
}
