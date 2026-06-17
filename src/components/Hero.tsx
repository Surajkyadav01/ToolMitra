import LucideIcon from './LucideIcon';
import { useLanguage } from '../lib/LanguageContext';

interface HeroProps {
  onExploreClick: () => void;
  onSearchQuery: (query: string) => void;
}

export default function Hero({ onExploreClick, onSearchQuery }: HeroProps) {
  const { t } = useLanguage();
  const quickSearches = ['Aadhaar', 'compress', 'passport', 'sign resize'];

  return (
    <section
      id="hero-section"
      className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28 border-b border-slate-200/60 dark:border-slate-800 bg-gradient-to-b from-blue-50/50 via-[#f8fafc] to-transparent dark:bg-none"
    >
      {/* Decorative vector meshes & ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] pointer-events-none opacity-50 dark:opacity-20 select-none">
        <div className="absolute top-[-10%] left-[10%] w-[350px] h-[350px] rounded-full bg-blue-100/40 dark:bg-blue-400 blur-[80px]" />
        <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-indigo-100/40 dark:bg-indigo-500 blur-[100px]" />
        <div className="absolute bottom-[5%] left-[30%] w-[250px] h-[250px] rounded-full bg-sky-100/50 dark:bg-cyan-400 blur-[80px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Banner Announcement */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/80 dark:bg-blue-900/40 border border-blue-100/40 dark:border-blue-950/40 text-blue-700 dark:text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-6 animate-pulse">
          <LucideIcon name="Sparkles" size={12} />
          <span>{t('hero_announcement', 'New Document Suite Added')}</span>
        </div>

        {/* Brand Main Slogan & Tagline */}
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-slate-900 dark:text-white tracking-tight max-w-4xl mx-auto leading-[1.15] mb-6">
          {t('hero_title_pre', 'Your Ultimate ')}{' '}
          <span className="relative inline-block bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-sky-400 dark:to-teal-300">
            {t('hero_title_mid', 'Digital Tools')}
          </span>{' '}
          {t('hero_title_post', ' Companion')}
        </h1>

        {/* Short Description */}
        <p className="font-sans text-base sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 font-light">
          {t('hero_description', 'Free online workflows for PDF editing, image compressing, document formatting, and photo resizing right inside your browser window. Only premium client execution.')}
        </p>

        {/* Main CTA Elements */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-8">
          <button
            onClick={onExploreClick}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 dark:from-sky-500 dark:to-indigo-500 hover:from-blue-700 hover:to-indigo-800 text-white font-medium rounded-2xl shadow-xl shadow-blue-500/15 dark:shadow-none hover:scale-[1.02] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <LucideIcon name="LayoutGrid" size={18} />
            <span>{t('hero_cta_explore', 'Explore All Tools')}</span>
          </button>

          <button
            onClick={() => {
              const el = document.getElementById('about-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <LucideIcon name="ShieldCheck" size={18} className="text-emerald-500" />
            <span>{t('hero_cta_security', 'Verify Security')}</span>
          </button>
        </div>

        {/* Hot Quick Searches */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 mb-14">
          <span className="flex items-center gap-1 font-mono">
            <LucideIcon name="Search" size={12} />
            <span>{t('hero_trending', 'Trending:')}</span>
          </span>
          {quickSearches.map((term) => (
            <button
              key={term}
              onClick={() => onSearchQuery(term)}
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold transition-all cursor-pointer border border-transparent hover:border-slate-300/30"
            >
              #{term}
            </button>
          ))}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border border-slate-150/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 p-6 md:p-8 rounded-2xl md:rounded-3xl backdrop-blur-md shadow-sm">
          <div className="text-center space-y-1">
            <div className="font-display font-bold text-3xl sm:text-4xl bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent dark:from-cyan-400 dark:to-blue-400 leading-none">
              25+
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
              {t('hero_stat_utilities', 'Web Utilities')}
            </div>
          </div>
          <div className="text-center space-y-1 border-l border-slate-100 dark:border-slate-800">
            <div className="font-display font-bold text-3xl sm:text-4xl bg-gradient-to-r from-blue-750 to-indigo-600 bg-clip-text text-transparent dark:from-cyan-400 dark:to-blue-400 leading-none">
              100%
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
              {t('hero_stat_private', 'Local (Private)')}
            </div>
          </div>
          <div className="text-center space-y-1 border-l border-slate-100 dark:border-slate-800">
            <div className="font-display font-bold text-3xl sm:text-4xl bg-gradient-to-r from-blue-750 to-indigo-600 bg-clip-text text-transparent dark:from-cyan-400 dark:to-blue-400 leading-none">
              0 MB
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
              {t('hero_stat_server_logs', 'Server Logs')}
            </div>
          </div>
          <div className="text-center space-y-1 border-l border-slate-100 dark:border-slate-800">
            <div className="font-display font-bold text-3xl sm:text-4xl bg-gradient-to-r from-blue-750 to-indigo-600 bg-clip-text text-transparent dark:from-cyan-400 dark:to-blue-400 leading-none">
              Free
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
              {t('hero_stat_unlimited', 'Unlimited Access')}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
