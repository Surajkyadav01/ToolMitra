import LucideIcon from './LucideIcon';
import { FEATURES } from '../data';
import { useLanguage } from '../lib/LanguageContext';

export default function FeatureSection() {
  const { t } = useLanguage();

  return (
    <section id="features-section" className="py-20 bg-transparent dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight mb-4">
            {t('feat_header_title', 'Engineered For Performance & Privacy')}
          </h2>
          <p className="font-sans text-slate-500 dark:text-slate-400 text-base sm:text-lg">
            {t('feat_header_subtitle', 'Unlike other platforms that collect user files details on remote storage, ToolMitra runs entirely client-side. Speed, data confinement, and zero paywalls come standard.')}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feat, index) => (
            <div
              key={index}
              className="group p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500 dark:hover:border-cyan-400 shadow-sm shadow-slate-100/50 dark:shadow-none hover:shadow-xl hover:shadow-indigo-500/[0.08] hover:-translate-y-1.5 active:scale-[0.96] transition-all duration-300 cursor-pointer select-none"
            >
              {/* Icon layout */}
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-50 to-indigo-100/50 dark:from-slate-800 dark:to-slate-850 text-indigo-600 dark:text-cyan-400 flex items-center justify-center mb-6 shadow-sm group-hover:scale-115 group-hover:rotate-3 transition-transform duration-300">
                <LucideIcon name={feat.iconName} size={24} />
              </div>

              {/* Title & Description */}
              <h3 className="font-sans font-bold text-lg text-slate-900 dark:text-white mb-2.5 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                {t(`feat_item_${index}_title`, feat.title)}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                {t(`feat_item_${index}_desc`, feat.description)}
              </p>
            </div>
          ))}
        </div>

        {/* Local Processing Guarantee Callout */}
        <div className="mt-16 p-6 md:p-8 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-650 to-indigo-750 dark:from-indigo-950/80 dark:to-slate-900 border border-indigo-500/25 dark:border-indigo-500/20 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl text-center md:text-left">
            <h4 className="font-display font-extrabold text-xl md:text-2xl tracking-tight">
              {t('feat_footer_title', '100% Client-Side Privacy Guarantee')}
            </h4>
            <p className="text-sm text-indigo-100 dark:text-slate-400 leading-relaxed">
              {t('feat_footer_desc', 'We compile code to execute file manipulation solely in browser Memory. Your Aadhaar photos, digital signatures, and passport layouts remain entirely within your device context, protected from leak vulnerabilities.')}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/11 dark:bg-slate-800/40 px-5 py-3 rounded-xl border border-white/20 dark:border-slate-700 font-mono text-sm self-stretch md:self-auto justify-center">
            <LucideIcon name="ShieldCheck" size={18} className="text-cyan-300" />
            <span>{t('feat_footer_active', 'Encrypted local workspace active')}</span>
          </div>
        </div>

      </div>
    </section>
  );
}
