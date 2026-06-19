import { useState } from 'react';
import LucideIcon from './LucideIcon';
import { SOCIAL_LINKS } from '../data';
import { useLanguage } from '../lib/LanguageContext';

interface FooterProps {
  onSelectCategory: (id: 'all' | 'pdf' | 'image' | 'document') => void;
  onOpenAbout: () => void;
}

export default function Footer({ onSelectCategory, onOpenAbout }: FooterProps) {
  const [modalType, setModalType] = useState<'privacy' | 'terms' | 'contact' | null>(null);
  const { t } = useLanguage();

  const handleOpenModal = (type: 'privacy' | 'terms' | 'contact') => {
    setModalType(type);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseModal = () => {
    setModalType(null);
    document.body.style.overflow = 'unset';
  };

  return (
    <footer id="main-footer" className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Brand & Desc */}
          <div className="md:col-span-1.5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white">
                <LucideIcon name="Wrench" size={16} />
              </div>
              <span className="font-display font-bold text-lg text-white tracking-tight">
                Tool<span className="text-cyan-400">Mitra</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              {t('footer_description', 'Your comprehensive desktop & mobile companion for lightning-fast digital file conversions, privacy-first photo formatting, and PDF operations. All processing is executed 100% locally inside your client browser.')}
            </p>
            {/* Social Media Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={SOCIAL_LINKS.linkedin}
                target="_blank"
                rel="noreferrer"
                id="footer-social-linkedin"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white flex items-center justify-center transition-colors"
                title="Connect on LinkedIn"
              >
                <LucideIcon name="Linkedin" size={16} />
              </a>
              <a
                href={SOCIAL_LINKS.youtube}
                target="_blank"
                rel="noreferrer"
                id="footer-social-youtube"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-red-500 flex items-center justify-center transition-colors"
                title="Subscribe on YouTube"
              >
                <LucideIcon name="Youtube" size={16} />
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noreferrer"
                id="footer-social-instagram"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-pink-500 flex items-center justify-center transition-colors"
                title="Follow on Instagram"
              >
                <LucideIcon name="Instagram" size={16} />
              </a>
              <a
                href={SOCIAL_LINKS.website}
                target="_blank"
                rel="noreferrer"
                id="footer-social-website"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-cyan-400 flex items-center justify-center transition-colors animate-fadeIn"
                title="Visit My Tech Hub Website"
              >
                <LucideIcon name="Globe" size={16} />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-white text-sm tracking-wider uppercase mb-4">
              {t('footer_tool_suites', 'Digital Tool Suites')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                   onClick={() => {
                    onSelectCategory('pdf');
                    document.getElementById('tools-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-cyan-400 font-medium transition-colors cursor-pointer"
                >
                  {t('cat_pdf_name', 'PDF Document Tools')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('image');
                    document.getElementById('tools-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-cyan-400 font-medium transition-colors cursor-pointer"
                >
                  {t('cat_image_name', 'Image Compressors')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('document');
                    document.getElementById('tools-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-cyan-400 font-medium transition-colors cursor-pointer"
                >
                  {t('cat_document_name', 'Document & Form Prep')}
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenAbout}
                  className="hover:text-cyan-400 font-medium transition-colors cursor-pointer text-left"
                >
                  {t('footer_why_browser', 'Why Browser Processing?')}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Care */}
          <div>
            <h4 className="font-display font-semibold text-white text-sm tracking-wider uppercase mb-4">
              {t('legalPrivacy', 'Resources & Legal')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => handleOpenModal('privacy')}
                  className="hover:text-cyan-400 font-medium transition-colors cursor-pointer"
                >
                  {t('privacy', 'Privacy Policy')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('terms')}
                  className="hover:text-cyan-400 font-medium transition-colors cursor-pointer"
                >
                  {t('terms', 'Terms of Service')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    document.getElementById('ratings-feedback-section')?.scrollIntoView({ behavior: 'smooth' });
                    // Open modal after small delay
                    setTimeout(() => {
                      document.getElementById('open-feedback-button')?.click();
                    }, 400);
                  }}
                  className="hover:text-cyan-400 font-medium transition-colors cursor-pointer text-left flex items-center gap-1.5 text-amber-400"
                >
                  <LucideIcon name="Sparkles" size={12} className="text-amber-400" />
                  <span>{t('rate_experience', 'Rate Our Experience')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleOpenModal('contact')}
                  className="hover:text-cyan-400 font-medium transition-colors cursor-pointer"
                >
                  {t('contact', 'Contact Support')}
                </button>
              </li>
              <li className="flex items-center gap-1 text-xs text-emerald-400 bg-slate-800/60 px-2 py-1 rounded w-max mt-2">
                <LucideIcon name="ShieldCheck" size={12} />
                <span>{t('footer_client_safe', '100% Client-Side Safe')}</span>
              </li>
            </ul>
          </div>

          {/* Column 4: WhatsApp Inquiry Form */}
          <div>
            <h4 className="font-display font-semibold text-white text-sm tracking-wider uppercase mb-4">
              {t('footer_whatsapp_integration', 'WhatsApp Integration')}
            </h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              {t('footer_whatsapp_desc', 'Facing issue with a document or need a custom utility? Send a direct WhatsApp ping.')}
            </p>
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-2 px-3 rounded-lg shadow transition-all hover:scale-[1.02]"
            >
              <LucideIcon name="Phone" size={14} />
              <span>{t('footer_whatsapp_btn', 'Contact WhatsApp Support')}</span>
            </a>
          </div>
        </div>

        <div className="h-[1px] bg-slate-800 my-8" />

        {/* Footer Base */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} ToolMitra. {t('footer_copyright', 'All Rights Reserved. Made for developers, creators, and students.')}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => handleOpenModal('privacy')} className="hover:text-slate-300">
              {t('privacy', 'Privacy')}
            </button>
            <span>&bull;</span>
            <button onClick={() => handleOpenModal('terms')} className="hover:text-slate-300">
              {t('terms', 'Terms')}
            </button>
            <span>&bull;</span>
            <button onClick={() => handleOpenModal('contact')} className="hover:text-slate-300">
              {t('contact', 'Developer Info')}
            </button>
          </div>
        </div>
      </div>

      {/* Reusable dialog implementation inside footer for Privacy, Terms, Contact to ensure absolute self-sufficiency */}
      {modalType && (
        <div
          id="footer-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
          onClick={handleCloseModal}
        >
          <div
            id="footer-modal-content"
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
            >
              <LucideIcon name="X" size={16} />
            </button>

            {modalType === 'privacy' && (
              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <LucideIcon name="ShieldCheck" size={20} />
                  </span>
                  <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
                    {t('privacy', 'Privacy Policy')}
                  </h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  Last Updated: June 2026.
                </p>
                <p className="text-sm leading-relaxed">
                  At ToolMitra, security is our foundational cornerstone. Because we operate entirely inside client-side virtual sandboxes, we provide a definitive and bulletproof privacy guarantee:
                </p>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30 p-4 rounded-xl space-y-2">
                  <h5 className="font-semibold text-emerald-800 dark:text-emerald-400 text-xs uppercase tracking-wider">
                    Our Zero-Upload Policy
                  </h5>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                     ToolMitra never records, uploads, stores or logs files process requests, image assets, PDF documents, or signatures. All computations, cropping, canvas sizing, and format manipulations run strictly in your browser. When you close the utility tab, all memory is wiped immediately.
                  </p>
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white pt-2 text-md">
                  1. Local Browser Storage
                </h4>
                <p className="text-sm leading-relaxed">
                  We use cookies or standard device local storage exclusively to save your configuration preferences (e.g., preserving Dark/Light mode preference). No personal identifier telemetry is recorded.
                </p>
                <h4 className="font-semibold text-slate-900 dark:text-white pt-2 text-md">
                  2. Third-Party Links
                </h4>
                <p className="text-sm leading-relaxed">
                   We reference official direct social URLs of our developer platform. We hold no accountability for the privacy structures of external platforms (e.g. LinkedIn, YouTube, Instagram).
                </p>
              </div>
            )}

            {modalType === 'terms' && (
              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <LucideIcon name="FileText" size={20} />
                  </span>
                  <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
                    {t('terms', 'Terms of Service')}
                  </h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  Last Updated: June 2026.
                </p>
                <p className="text-sm leading-relaxed">
                  Thank you for relying on ToolMitra ("we", "the platform"). Adhere to these straightforward terms of usage:
                </p>
                <h4 className="font-semibold text-slate-900 dark:text-white pt-2 text-md">
                  1. Permitted Personal & Professional Use
                </h4>
                <p className="text-sm leading-relaxed">
                  You are fully authorized to invoke all image compressors, PDF utility sandboxes, and passport formatting wizards for any personal, learning, or commercial form preparation task free of charge. No licensing keys are required.
                </p>
                <h4 className="font-semibold text-slate-900 dark:text-white pt-2 text-md">
                  2. Disclaimer of Liabilities
                </h4>
                <p className="text-sm leading-relaxed">
                  ToolMitra makes no regulatory layout assertions. While we target exact portal sizing (e.g., standard Indian passport guidelines or UIDAI specs), users are responsible for verifying actual guidelines prior to critical exam submissions.
                </p>
                <h4 className="font-semibold text-slate-900 dark:text-white pt-2 text-md">
                  3. Abuse Prevention
                </h4>
                <p className="text-sm leading-relaxed">
                  You must not frame this application or attempt systematic resource scraping. Since the software executes inside client machines, behave responsibly to keep your browser tab responsive.
                </p>
              </div>
            )}

            {modalType === 'contact' && (
              <div className="space-y-6 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <LucideIcon name="Phone" size={20} />
                  </span>
                  <div className="flex flex-col">
                    <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-white leading-6">
                      {t('footer_dev_contact', 'Developer Contact')}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('footer_reach_out', 'Reach Out & Collaborate')}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                  <div className="space-y-1">
                    <div className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      {t('footer_author_title', 'Author & Architect')}
                    </div>
                    <div className="font-display font-bold text-lg text-slate-800 dark:text-white">
                      Sunil Kumar Yadav / Suraj
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 leading-snug">
                      Developing intuitive open-source utility platforms for students and job aspirants.
                    </div>
                  </div>
                  <a
                    href={SOCIAL_LINKS.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow shrink-0 self-stretch md:self-auto justify-center"
                  >
                    <LucideIcon name="Phone" size={14} />
                    <span>WhatsApp Developer</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a
                    href={SOCIAL_LINKS.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-150 dark:border-slate-800 hover:border-red-500/30 hover:bg-red-500/5 dark:hover:bg-red-950/10 transition-colors"
                  >
                    <span className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center shrink-0">
                      <LucideIcon name="Youtube" size={18} />
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm text-slate-950 dark:text-slate-100">{t('footer_youtube_channel', 'YouTube Channel')}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">Tech Info Daily</span>
                    </div>
                  </a>

                  <a
                    href={SOCIAL_LINKS.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-150 dark:border-slate-800 hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-colors"
                  >
                    <span className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                      <LucideIcon name="Linkedin" size={18} />
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm text-slate-950 dark:text-slate-100">{t('footer_linkedin_profile', 'LinkedIn Profile')}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">Sunil Kumar Yadav</span>
                    </div>
                  </a>

                  <a
                    href={SOCIAL_LINKS.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-150 dark:border-slate-800 hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-950/10 transition-colors"
                  >
                    <span className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950/40 text-pink-600 flex items-center justify-center shrink-0">
                      <LucideIcon name="Instagram" size={18} />
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm text-slate-950 dark:text-slate-100">{t('footer_instagram_feed', 'Instagram Feed')}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">@its_.surajx01</span>
                    </div>
                  </a>

                  <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60">
                    <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center shrink-0">
                      <LucideIcon name="CheckCircle2" size={18} />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-slate-950 dark:text-slate-100">{t('footer_support_state', 'Support State')}</span>
                      <span className="text-xs text-emerald-500 font-medium">{t('footer_always_active', 'Always Active')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
