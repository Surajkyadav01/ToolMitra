import { Category, Tool, Feature, FAQ } from './types';

export const CATEGORIES: Category[] = [
  {
    id: 'pdf',
    name: 'PDF Tools',
    description: 'Merge, split, compress, and convert PDF files directly in your browser.',
    iconName: 'FileText'
  },
  {
    id: 'image',
    name: 'Image Tools',
    description: 'Resize, compress, convert formats, and refine your visual assets.',
    iconName: 'Image'
  },
  {
    id: 'document',
    name: 'Document & Photo Tools',
    description: 'Prepare and resize photos for legal documents, passports, exam forms, and Aadhaar cards.',
    iconName: 'Briefcase'
  }
];

export const TOOLS: Tool[] = [
  // PDF
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    description: 'Convert JPG, JPEG, and PNG images into high-quality PDF files instantly.',
    categoryId: 'pdf',
    iconName: 'FileSymlink',
    isFullyInteractive: true
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Extract pages from a PDF document and save them as crisp JPG image files.',
    categoryId: 'pdf',
    iconName: 'ImageUp',
    isFullyInteractive: true
  },
  {
    id: 'pdf-merge',
    name: 'PDF Merge',
    description: 'Combine multiple PDF documents into a single, unified file.',
    categoryId: 'pdf',
    iconName: 'Combine',
    isFullyInteractive: true
  },
  {
    id: 'pdf-split',
    name: 'PDF Split',
    description: 'Extract specific pages, custom ranges, or split a PDF into separate pages.',
    categoryId: 'pdf',
    iconName: 'Scissors',
    isFullyInteractive: true
  },
  {
    id: 'pdf-compress',
    name: 'PDF Compress',
    description: 'Reduce the file size of your PDF documents while keeping optimal resolution.',
    categoryId: 'pdf',
    iconName: 'Minimize',
    isFullyInteractive: true
  },
  // Image
  {
    id: 'img-resize',
    name: 'Image Resize',
    description: 'Adjust width and height in pixels or percentage with aspect ratio locks.',
    categoryId: 'image',
    iconName: 'Maximize2',
    badge: 'Popular',
    isFullyInteractive: true
  },
  {
    id: 'img-compress',
    name: 'Image Compress',
    description: 'Optimize image byte size with visual quality control for quick standard uploads.',
    categoryId: 'image',
    iconName: 'TrendingDown',
    badge: 'Popular',
    isFullyInteractive: true
  },
  {
    id: 'jpg-to-png',
    name: 'JPG to PNG',
    description: 'Convert lossy JPG images to transparent-capable lossless PNG formats.',
    categoryId: 'image',
    iconName: 'Shuffle',
    isFullyInteractive: true
  },
  {
    id: 'png-to-jpg',
    name: 'PNG to JPG',
    description: 'Convert heavy PNG layout images into lightweight, shareable JPG format.',
    categoryId: 'image',
    iconName: 'RefreshCw',
    isFullyInteractive: true
  },
  {
    id: 'webp-to-jpg',
    name: 'WEBP to JPG',
    description: 'Convert modern next-gen WEBP web graphics to highly compatible standard JPG.',
    categoryId: 'image',
    iconName: 'FileCheck',
    isFullyInteractive: true
  },
  {
    id: 'jpg-to-webp',
    name: 'JPG to WEBP',
    description: 'Modernize standard JPG files by encoding them into ultra-compressed WEBP formats.',
    categoryId: 'image',
    iconName: 'Zap',
    isFullyInteractive: true
  },
  {
    id: 'bg-remover',
    name: 'Background Remover',
    description: 'Isolate key subjects and apply clean solid white/blue backdrops instantly.',
    categoryId: 'image',
    iconName: 'Sparkles',
    badge: 'AI Smart',
    isFullyInteractive: true
  },
  // Document & Photo
  {
    id: 'passport-photo',
    name: 'Passport Photo Maker',
    description: 'Format, crop, and frame standard 2x2 inch and 3.5x4.5 cm passport sizing.',
    categoryId: 'document',
    iconName: 'UserCircle2',
    badge: 'Form Ready',
    isFullyInteractive: true
  },
  {
    id: 'signature-resize',
    name: 'Signature Resize',
    description: 'Normalize sign images to standard bank & exam specifications (under 20KB/50KB limits).',
    categoryId: 'document',
    iconName: 'PenTool',
    isFullyInteractive: true
  },
  {
    id: 'aadhaar-resize',
    name: 'Aadhaar Photo Resize',
    description: 'Resize and crop profile photos to standard UIDAI Aadhaar specifications.',
    categoryId: 'document',
    iconName: 'CreditCard',
    isFullyInteractive: true
  },
  {
    id: 'aadhaar-merge',
    name: 'Merge Aadhaar Card',
    description: 'Combine front and back sides of your Aadhaar card into a neat single, printable sheet.',
    categoryId: 'document',
    iconName: 'Layers',
    badge: 'New',
    isFullyInteractive: true
  },
  {
    id: 'ai-resume',
    name: 'AI ATS Resume Builder',
    description: 'Build professional, ATS-friendly resumes with a smart co-pilot, skill suggesters and PDF exports.',
    categoryId: 'document',
    iconName: 'Briefcase',
    badge: 'AI Smart',
    isFullyInteractive: true
  },
  {
    id: 'qr-generator',
    name: 'QR Code Generator',
    description: 'Create clean, high-resolution customizable QR codes for links, text, emails, phone dials, and UPI receipts.',
    categoryId: 'document',
    iconName: 'QrCode',
    badge: 'Instantly',
    isFullyInteractive: true
  },
  {
    id: 'age-calculator',
    name: 'Age Calculator',
    description: 'Check exact years, months, days, countdown next birthdays, and explore planetary age structures.',
    categoryId: 'document',
    iconName: 'Calendar',
    badge: 'Useful',
    isFullyInteractive: true
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word Converter',
    description: 'Locally read vector elements or OCR structures from PDF and convert pages into editable Word DOCX files.',
    categoryId: 'pdf',
    iconName: 'FileText',
    badge: 'New',
    isFullyInteractive: true
  },
  {
    id: 'word-to-pdf',
    name: 'Word to PDF Converter',
    description: 'Encode standard Microsoft Word DOCX layouts into professional high-resolution printable PDF formats.',
    categoryId: 'pdf',
    iconName: 'FileSymlink',
    badge: 'New',
    isFullyInteractive: true
  },
  {
    id: 'img-crop',
    name: 'Image Crop Tool',
    description: 'Crop and rotate any image to free layout, 1:1, widescreen, or custom standard biometric form sizes.',
    categoryId: 'image',
    iconName: 'Crop',
    badge: 'Precise',
    isFullyInteractive: true
  },
  {
    id: 'ai-img-enhance',
    name: 'AI Image Enhancer',
    description: 'Upscale, sharpen, and increase resolution of low-quality graphics with dual comparative split slider.',
    categoryId: 'image',
    iconName: 'Sparkles',
    badge: 'AI Active',
    isFullyInteractive: true
  },
  {
    id: 'mb-to-kb-converter',
    name: 'MB To KB / KB To MB',
    description: 'Compress, optimize or expand file sizes to meet precise portal specifications. Supports PDF, JPG, and PNG.',
    categoryId: 'document',
    iconName: 'Shuffle',
    badge: 'Best',
    isFullyInteractive: true
  }
];

export const FEATURES: Feature[] = [
  {
    title: 'Fast Processing',
    description: 'All processing occurs directly in your browser workspace, completing in milliseconds.',
    iconName: 'Gauge'
  },
  {
    title: 'Secure & Private',
    description: 'Your sensitive files never upload to any remote server. Your personal privacy is 100% safe.',
    iconName: 'ShieldCheck'
  },
  {
    title: 'Mobile Friendly',
    description: 'Responsive, lightweight layout works fluidly across modern phones, tablets, and desktops.',
    iconName: 'Smartphone'
  },
  {
    title: 'No Registration',
    description: 'Absolutely no sign-ups or credentials required. Skip login pages and get straight to work.',
    iconName: 'UserX'
  },
  {
    title: '100% Free to Use',
    description: 'Fully unlocked and unlimited access. No premium tier subscriptions or paywalls.',
    iconName: 'CheckCircle2'
  },
  {
    title: 'High Quality Output',
    description: 'Calculations utilize advanced image scaling filters to retain crisp vectors and deep resolution.',
    iconName: 'Sparkles'
  }
];

export const DEMO_FAQS: FAQ[] = [
  {
    question: 'Are my uploaded files safe and secure?',
    answer: 'Absolutely! Unlike typical online tools that upload your files to server logs, ToolMitra performs 100% of all calculations locally inside your own browser tab using modern HTML5 APIs. Your confidential reports, passport captures, and personal signatures never touch the internet.'
  },
  {
    question: 'How do I combine the front and back of my Aadhaar card?',
    answer: 'Simply select our "Merge Aadhaar Card" tool, select the image file for your front side, select the image file for your back side, customize the alignment layout (side-by-side or stacked), and tap download. ToolMitra merges them seamlessly!'
  },
  {
    question: 'How do I shrink signature sizes to fit exam portals?',
    answer: 'Portal uploads usually reject signature files containing too many kilobytes. Select "Signature Resize", crop your signature tightly, customize width/height, and slide the quality scale down. ToolMitra helps compress files to fit below Indian portal requirements (e.g., 20KB or 50KB limits).'
  },
  {
    question: 'Does ToolMitra support next-gen images?',
    answer: 'Yes! We support converting standard formats to modern web-optimized WEBP formats, as well as converting next-gen WEBP assets back to standard PNG/JPG graphics for compatibility.'
  }
];

export const SOCIAL_LINKS = {
  linkedin: 'https://www.linkedin.com/in/sunil-kumar-yadav-125ab6353?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
  youtube: 'https://youtube.com/@techinfodaily_in?si=wo0k4zvVrRFPDkgU',
  instagram: 'https://www.instagram.com/its_.surajx01?igsh=eG16NHNmYzcyOXhq',
  whatsapp: 'https://wa.me/916393869405',
  website: 'https://surajkyadav01.github.io/Suraj-Tech-Hub/'
};
