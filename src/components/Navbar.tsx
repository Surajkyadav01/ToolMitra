import { useState, useEffect, useRef } from 'react';
import LucideIcon from './LucideIcon';
import { CATEGORIES, TOOLS } from '../data';
import { CategoryId, Tool } from '../types';

interface NavbarProps {
  onSelectCategory: (categoryId: CategoryId | 'all') => void;
  selectedCategory: CategoryId | 'all';
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigateHome: () => void;
  onOpenAbout: () => void;
  onSelectTool: (tool: Tool) => void;
}

export default function Navbar({
  onSelectCategory,
  selectedCategory,
  searchQuery,
  onSearchChange,
  onNavigateHome,
  onOpenAbout,
  onSelectTool
}: NavbarProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        (desktopSearchRef.current && !desktopSearchRef.current.contains(event.target as Node)) &&
        (!mobileSearchRef.current || !mobileSearchRef.current.contains(event.target as Node))
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matchingTools = searchQuery.trim()
    ? TOOLS.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  useEffect(() => {
    // Initial theme setup check - explicitly default to light mode on first load
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
      if (!savedTheme) {
        localStorage.setItem('theme', 'light');
      }
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-50 w-full transition-all duration-300 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/60 py-3 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div
            id="navbar-logo-container"
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-transform duration-200">
              <LucideIcon name="Wrench" size={20} className="animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 border-2 border-white dark:border-slate-900 animate-indicator-bounce" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl tracking-tight text-slate-900 dark:text-white leading-5">
                Tool<span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-cyan-400 dark:to-blue-400">Mitra</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">
                Digital Companion
              </span>
            </div>
          </div>

          {/* Catalog Quick Search (Desktop) */}
          <div ref={desktopSearchRef} className="hidden md:flex items-center flex-1 max-w-md mx-6 relative">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 select-none">
                <LucideIcon name="Search" size={16} />
              </span>
              <input
                id="desktop-search-input"
                type="text"
                placeholder="Search tools... (try 'compress', 'Aadhaar', 'resize')"
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setShowDropdown(true);
                }}
                className="w-full text-sm pl-9 pr-4 py-2 bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-cyan-400/20 focus:bg-white dark:focus:bg-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-sm search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    onSearchChange('');
                    setShowDropdown(false);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <LucideIcon name="X" size={16} />
                </button>
              )}
            </div>

            {/* Desktop Search Autocomplete Dropdown */}
            {showDropdown && matchingTools.length > 0 && (
              <div id="desktop-search-results-dropdown" className="absolute top-full left-0 md:left-auto md:right-0 lg:left-0 mt-2 w-[330px] sm:w-[410px] bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-fadeIn text-slate-800">
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center select-none">
                  <span>Matching workspaces ({matchingTools.length})</span>
                  <button onClick={() => setShowDropdown(false)} className="text-[10px] lowercase text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer">close</button>
                </div>
                {matchingTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      onSelectTool(tool);
                      onSearchChange('');
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-indigo-50/50 dark:hover:bg-slate-800/45 transition-colors group cursor-pointer border-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 font-sans">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-650 dark:text-cyan-400 flex items-center justify-center shrink-0">
                        <LucideIcon name={tool.iconName} size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-850 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 truncate">
                          {tool.name}
                        </div>
                        <div className="text-[10px] text-slate-450 dark:text-slate-500 truncate max-w-[280px]">
                          {tool.description}
                        </div>
                      </div>
                    </div>
                    <LucideIcon name="ArrowRight" size={12} className="text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors transform group-hover:translate-x-1 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Categories Links & Theme */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => {
                onSelectCategory('all');
                onSearchChange('');
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all' && searchQuery === ''
                  ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-cyan-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Tools
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onSearchChange('');
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.id && searchQuery === ''
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-cyan-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
            <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-2" />
            <button
              onClick={onOpenAbout}
              className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Why ToolMitra?
            </button>
          </nav>

          {/* Actions: Theme Toggle & Mobile Menu Control */}
          <div className="flex items-center gap-2">
            
            {/* Theme Toggle */}
            <button
              id="theme-toggle-button"
              onClick={toggleTheme}
              aria-label="Toggle visual theme"
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all shrink-0"
            >
              <LucideIcon name={isDarkMode ? 'Sun' : 'Moon'} size={18} />
            </button>

            {/* CTA App Trigger */}
            <button
              onClick={() => {
                onSelectCategory('all');
                document.getElementById('tools-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-sky-500 dark:to-indigo-500 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-xl shadow-md hover:shadow-indigo-500/20 active:translate-y-[1px] transition-all"
            >
              <span>Explore Tools</span>
              <LucideIcon name="ArrowRight" size={14} />
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <LucideIcon name={mobileMenuOpen ? 'X' : 'Menu'} size={20} />
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-drawer" className="lg:hidden absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xl py-4 px-4 flex flex-col gap-3 animate-fadeIn">
          {/* Mobile Search */}
          <div ref={mobileSearchRef} className="relative w-full md:hidden mb-2">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 select-none">
                <LucideIcon name="Search" size={16} />
              </span>
              <input
                id="mobile-search-input"
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setShowDropdown(true);
                }}
                className="w-full text-sm pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 focus:border-indigo-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-cyan-400/20 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-sm search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    onSearchChange('');
                    setShowDropdown(false);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 cursor-pointer"
                >
                  <LucideIcon name="X" size={16} />
                </button>
              )}
            </div>

            {/* Mobile Search Autocomplete Dropdown */}
            {showDropdown && matchingTools.length > 0 && (
              <div id="mobile-search-results-dropdown" className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center select-none">
                  <span>Matching workspaces ({matchingTools.length})</span>
                  <button onClick={() => setShowDropdown(false)} className="text-[10px] lowercase text-slate-400 hover:text-slate-600 cursor-pointer">close</button>
                </div>
                {matchingTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      onSelectTool(tool);
                      onSearchChange('');
                      setMobileMenuOpen(false);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-indigo-50/50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer border-none font-sans"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-650 dark:text-cyan-400 flex items-center justify-center shrink-0">
                        <LucideIcon name={tool.iconName} size={12} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-850 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 truncate">
                          {tool.name}
                        </div>
                      </div>
                    </div>
                    <LucideIcon name="ArrowRight" size={12} className="text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2">
            Categories
          </div>
          <button
            onClick={() => {
              onSelectCategory('all');
              onSearchChange('');
              setMobileMenuOpen(false);
              document.getElementById('tools-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              selectedCategory === 'all' && searchQuery === ''
                ? 'bg-blue-50 dark:bg-slate-800/50 text-blue-600 dark:text-cyan-400'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LucideIcon name="LayoutGrid" size={18} />
            <span>All Digital Tools</span>
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                onSelectCategory(cat.id);
                onSearchChange('');
                setMobileMenuOpen(false);
                document.getElementById('tools-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                selectedCategory === cat.id && searchQuery === ''
                  ? 'bg-blue-50 dark:bg-slate-800/50 text-blue-600 dark:text-cyan-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LucideIcon name={cat.iconName} size={18} />
              <span>{cat.name}</span>
            </button>
          ))}
          <div className="h-[1px] bg-slate-200 dark:bg-slate-800 my-1" />
          <button
            onClick={() => {
              onOpenAbout();
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <LucideIcon name="Info" size={18} />
            <span>Why Choose ToolMitra</span>
          </button>
        </div>
      )}
    </header>
  );
}
