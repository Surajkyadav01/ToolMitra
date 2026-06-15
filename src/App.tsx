/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeatureSection from './components/FeatureSection';
import AboutSection from './components/AboutSection';
import Footer from './components/Footer';
import ToolProcessor from './components/ToolProcessor';
import LucideIcon from './components/LucideIcon';

import { TOOLS, CATEGORIES } from './data';
import { Tool, CategoryId } from './types';

export default function App() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<CategoryId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  // Auto-scroll to top when a specific tool is launched to help the user start right away
  useEffect(() => {
    if (selectedTool) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedTool]);

  const handleSelectTool = (tool: Tool) => {
    setSelectedTool(tool);
  };

  const handleSelectCategory = (id: CategoryId | 'all') => {
    setSelectedCategoryId(id);
    setSelectedTool(null); // Return to list view
    setTimeout(() => {
      document.getElementById('tools-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleSearchQuery = (query: string) => {
    setSearchQuery(query);
    if (query.trim() !== '') {
      setSelectedTool(null); // Return to list view to witness search results
      setSelectedCategoryId('all'); // Clear category filter when actively searching
      // Wait for React to apply state update, then scroll catalog into view so they see the result!
      setTimeout(() => {
        document.getElementById('tools-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handleNavigateHome = () => {
    setSelectedCategoryId('all');
    setSearchQuery('');
    setSelectedTool(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAbout = () => {
    setSelectedTool(null);
    setSelectedCategoryId('all');
    setSearchQuery('');
    // Wait for render, then scroll to about block
    setTimeout(() => {
      document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Filter tools based on active visual filters
  const filteredTools = TOOLS.filter((t) => {
    const matchesCat = selectedCategoryId === 'all' || t.categoryId === selectedCategoryId;
    const matchesSearch =
      searchQuery === '' ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div id="toolmitra-app-shell" className="min-h-screen bg-[#f8fafc] text-slate-850 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      
      {/* 1. Global Navigation Bar */}
      <Navbar
        onSelectCategory={handleSelectCategory}
        selectedCategory={selectedCategoryId}
        searchQuery={searchQuery}
        onSearchChange={handleSearchQuery}
        onNavigateHome={handleNavigateHome}
        onOpenAbout={handleOpenAbout}
        onSelectTool={handleSelectTool}
      />

      <main className="flex-grow">
        {selectedTool ? (
          /* Active Interactive Workspace View */
          <div id="interactive-workspace" className="animate-fadeIn">
            <ToolProcessor tool={selectedTool} onBack={() => setSelectedTool(null)} />
          </div>
        ) : (
          /* Landing Catalog View */
          <div id="landing-catalog-view" className="space-y-4">
            
            {/* 2. Premium Hero Slogan and Stats Section */}
            <Hero onExploreClick={() => {
              document.getElementById('tools-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
            }} onSearchQuery={handleSearchQuery} />

            {/* 3. Central Interactive Tools Catalog Block */}
            <section id="tools-catalog-section" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              {/* Category selector panel */}
              <div id="catalog-category-navigator" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
                    Browse Free Digital Toolboxes
                  </h3>
                  <p className="text-sm text-slate-400">
                    {searchQuery
                      ? `Found ${filteredTools.length} matching workspaces for "${searchQuery}"`
                      : 'Choose a category below to filter specialized browser utilities'}
                  </p>
                </div>

                {/* Categories filtering boxes with premium borders & icons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleSelectCategory('all')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all active:scale-95 cursor-pointer ${
                      selectedCategoryId === 'all'
                        ? 'border-indigo-600 dark:border-cyan-400 bg-indigo-50/40 dark:bg-cyan-500/10 text-indigo-700 dark:text-cyan-400 shadow-sm font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 shadow-sm'
                    }`}
                  >
                    <LucideIcon name="LayoutGrid" size={13} className={selectedCategoryId === 'all' ? 'text-indigo-600 dark:text-cyan-400 animate-pulse' : 'text-slate-400'} />
                    <span>All Suites</span>
                  </button>
                  {CATEGORIES.map((cat) => {
                    const isActive = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all active:scale-95 cursor-pointer ${
                          isActive
                            ? 'border-indigo-600 dark:border-cyan-400 bg-indigo-50/40 dark:bg-cyan-500/10 text-indigo-700 dark:text-cyan-400 shadow-sm font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 shadow-sm'
                        }`}
                      >
                        <LucideIcon name={cat.iconName} size={13} className={isActive ? 'text-indigo-600 dark:text-cyan-400' : 'text-slate-400'} />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tools Catalog Cards Grid */}
              {filteredTools.length === 0 ? (
                /* Search Empty State */
                <div id="search-empty-state" className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-150 max-w-lg mx-auto p-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <LucideIcon name="AlertCircle" size={26} />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-display font-semibold text-slate-800 dark:text-slate-200">
                      No matching tools found
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      We couldn't locate any tools or files templates matching <strong className="font-semibold text-slate-600">{searchQuery}</strong>. Try scanning simpler terms.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSearchQuery('')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Reset Filter Search
                  </button>
                </div>
              ) : (
                /* Tools Grid */
                <div id="tools-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredTools.map((tool) => (
                    <div
                      key={tool.id}
                      id={`tool-card-${tool.id}`}
                      onClick={() => handleSelectTool(tool)}
                      className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-cyan-400 shadow-sm shadow-slate-100/50 dark:shadow-none hover:shadow-xl hover:shadow-indigo-500/[0.08] hover:-translate-y-1.5 active:scale-[0.96] rounded-3xl p-5.5 flex flex-col justify-between transition-all duration-300 cursor-pointer overflow-hidden"
                    >
                      {/* Interactive background accent glow on card hover */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 to-indigo-600/5 dark:from-sky-500/10 dark:to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="space-y-4 relative z-10">
                        {/* Top layout: Icon & badge */}
                        <div className="flex items-center justify-between">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-100 dark:shadow-none group-hover:scale-110 transition-transform duration-300">
                            <LucideIcon name={tool.iconName} size={20} />
                          </div>
                          {tool.badge && (
                            <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
                              {tool.badge}
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="font-display font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors leading-6">
                            {tool.name}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal mt-2 min-h-[60px] md:min-h-[64px] h-auto line-clamp-3">
                            {tool.description}
                          </p>
                        </div>
                      </div>

                      {/* Footer Trigger node */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-850 mt-4 flex items-center justify-between text-xs font-semibold relative z-10">
                        <span className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                          Launch Workspace
                        </span>
                        <span className="text-indigo-605 dark:text-cyan-400 group-hover:translate-x-1.5 transition-transform duration-200">
                          <LucideIcon name="ArrowRight" size={14} />
                        </span>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </section>

            {/* 4. Functional Benefits / Security Section */}
            <FeatureSection />

            {/* 5. Rich About and expandable FAQ segment */}
            <AboutSection />

          </div>
        )}
      </main>

      {/* 6. Legal / Developers profile Footer Block */}
      <Footer onSelectCategory={handleSelectCategory} onOpenAbout={handleOpenAbout} />

    </div>
  );
}
