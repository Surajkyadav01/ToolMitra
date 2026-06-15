import { useState } from 'react';
import LucideIcon from './LucideIcon';
import { DEMO_FAQS } from '../data';

export default function AboutSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const choicePoints = [
    {
      title: 'Easy to Use',
      description: 'Zero technical friction. Drag, drop, adjust sliders, and download. Simple design is our goal.',
      icon: 'Sliders'
    },
    {
      title: 'Completely Free',
      description: 'All 16 PDF tools, signature managers, and layout filters are 100% unlocked with zero fee schedules.',
      icon: 'CheckCircle2'
    },
    {
      title: 'Fast Results',
      description: 'Your browser computes tasks instantly. No files upload over slow networks, getting tasks done in milliseconds.',
      icon: 'Gauge'
    },
    {
      title: 'Secure Processing',
      description: 'Data never migrates to static servers. All files remain strictly confined inside your browser tab.',
      icon: 'ShieldCheck'
    },
    {
      title: 'Active on Mobile & Desktop',
      description: 'Wizards adapt dynamically to small mobile viewports, allowing on-the-go document preparations.',
      icon: 'Smartphone'
    },
    {
      title: 'No Technical Skills Required',
      description: 'Built for students, government form filers, and non-technical elders alike. Clean and humble inputs.',
      icon: 'UserX'
    }
  ];

  return (
    <section id="about-section" className="py-20 bg-transparent dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Why Choose ToolMitra Block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-20">
          <div className="lg:col-span-5 space-y-5">
            <div className="text-indigo-650 dark:text-cyan-400 font-bold text-xs uppercase tracking-widest font-mono">
              About ToolMitra
            </div>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight leading-tight">
              Simplify Everyday Digital Operations For Free
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-normal">
              ToolMitra is an elegant, high-performance offline-first web companion designed to take the friction out of public exam registrations, bank clearances, and file formatting. Users can extract PDF pages, compress huge image payloads, craft custom biometric passport frames, crop signature segments under mandated portal filesizes, and merge double-sided Aadhaar cards.
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-normal font-sans">
              We focus on premium visual polish without marketing popup distractions, keeping your workflow safe, private, and exceptionally straightforward.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {choicePoints.map((point, index) => (
              <div
                key={index}
                className="group p-5.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500 dark:hover:border-cyan-400 shadow-sm shadow-slate-100/50 dark:shadow-none hover:shadow-xl hover:shadow-indigo-500/[0.08] hover:-translate-y-1.5 active:scale-[0.96] transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-50 to-indigo-100/50 dark:from-slate-800 dark:to-slate-850 text-indigo-650 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <LucideIcon name={point.icon} size={18} />
                  </div>
                  <h4 className="font-sans font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                    {point.title}
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="h-[1px] bg-slate-150 dark:bg-slate-800/60 my-12" />

        {/* Dynamic Accordion FAQ Section */}
        <div id="faq-block" className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2 mb-10">
            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h3>
            <p className="text-sm text-slate-400">
               Everything you need to understand regarding operations, browser storage, and file limits.
            </p>
          </div>

          <div className="space-y-3">
            {DEMO_FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-200 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className={`w-full flex items-center justify-between p-5 text-left font-sans font-semibold transition-all duration-205 outline-none focus:outline-none focus:ring-0 focus:bg-transparent ${
                      isOpen
                        ? 'text-indigo-650 bg-indigo-50/50 dark:bg-slate-800/60 dark:text-cyan-400 border-none'
                        : 'text-slate-900 bg-transparent dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40 border-none'
                    }`}
                  >
                    <span>{faq.question}</span>
                    <span className={`shrink-0 p-1 rounded-lg transition-colors ${
                      isOpen ? 'bg-indigo-600 text-white dark:bg-cyan-400 dark:text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      <LucideIcon
                        name={isOpen ? 'X' : 'Plus'}
                        size={14}
                        className="transition-transform duration-200"
                      />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal border-t border-slate-100 dark:border-slate-850/30">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
