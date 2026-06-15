export type ToolId =
  | 'jpg-to-pdf'
  | 'pdf-to-jpg'
  | 'pdf-merge'
  | 'pdf-split'
  | 'pdf-compress'
  | 'img-resize'
  | 'img-compress'
  | 'jpg-to-png'
  | 'png-to-jpg'
  | 'webp-to-jpg'
  | 'jpg-to-webp'
  | 'bg-remover'
  | 'passport-photo'
  | 'signature-resize'
  | 'aadhaar-resize'
  | 'aadhaar-merge'
  | 'ai-resume'
  | 'qr-generator'
  | 'age-calculator'
  | 'pdf-to-word'
  | 'word-to-pdf'
    | 'img-crop'
  | 'ai-img-enhance'
  | 'mb-to-kb-converter';

export type CategoryId = 'pdf' | 'image' | 'document';

export interface Tool {
  id: ToolId;
  name: string;
  description: string;
  categoryId: CategoryId;
  iconName: string; // Used to dynamic render lucide-react icons safely
  badge?: string;
  isFullyInteractive: boolean;
}

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  iconName: string;
}

export interface Feature {
  title: string;
  description: string;
  iconName: string;
}

export interface FAQ {
  question: string;
  answer: string;
}
