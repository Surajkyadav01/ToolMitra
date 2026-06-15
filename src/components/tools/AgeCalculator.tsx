import React, { useState, useEffect } from 'react';
import LucideIcon from '../LucideIcon';

// Helper to get local date ISO string (YYYY-MM-DD)
const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
};

export default function AgeCalculator() {
  const [dob, setDob] = useState<string>('2000-01-01');
  const [refDate, setRefDate] = useState<string>(getLocalDateString(new Date()));
  const [now, setNow] = useState<Date>(new Date());

  // Keep a ticking clock for real-time second level countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute metrics
  const birth = parseLocalDate(dob);
  const target = parseLocalDate(refDate);

  const isValid = birth.getTime() <= target.getTime();

  // 1. Calculate age in Years, Months, Days
  const getDetailedAge = () => {
    if (!isValid) return { years: 0, months: 0, days: 0 };
    
    let years = target.getFullYear() - birth.getFullYear();
    let months = target.getMonth() - birth.getMonth();
    let days = target.getDate() - birth.getDate();

    if (days < 0) {
      // Find the last day of the month before the target month
      const prevMonthLastDate = new Date(target.getFullYear(), target.getMonth(), 0).getDate();
      
      // If the birthday is greater than the total days in the previous month
      // we borrow from the birth month's days instead of the previous month's days to avoid negatives.
      const birthMonthLastDate = new Date(birth.getFullYear(), birth.getMonth() + 1, 0).getDate();
      
      // Select correct offset: if birth day is greater than previous month's maximum days,
      // we bound the borrowing to prevent negative days.
      const daysToBorrow = birth.getDate() > prevMonthLastDate ? birthMonthLastDate : prevMonthLastDate;
      
      days += daysToBorrow;
      months--;
    }

    if (months < 0) {
      months += 12;
      years--;
    }

    // Double check to prevent rare off-by-one or negative day errors
    if (days < 0) {
      days = 0;
    }

    return { years, months, days };
  };

  const detailedAge = getDetailedAge();

  // 2. Total lived metrics
  const diffMs = Math.max(0, target.getTime() - birth.getTime());
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = detailedAge.years * 12 + detailedAge.months;
  const totalHours = totalDays * 24;
  const totalMinutes = totalHours * 60;
  const totalSeconds = totalMinutes * 60;

  // 3. Next Birthday Countdown
  const getNextBirthdayInfo = () => {
    const targetYear = now.getFullYear();
    let nextBday = new Date(targetYear, birth.getMonth(), birth.getDate());
    
    // If birthday already passed this year, take next year
    if (nextBday.getTime() < now.getTime()) {
      nextBday = new Date(targetYear + 1, birth.getMonth(), birth.getDate());
    }

    const diff = nextBday.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayName = weekdays[nextBday.getDay()];

    return { days, hours, minutes, seconds, weekdayName, dateStr: nextBday.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) };
  };

  const nextBdayInfo = getNextBirthdayInfo();

  // 4. fun planetary ages
  const planetaryAges = [
    { planet: 'Mercury', orbitDays: 88, desc: 'Mercurial years fly by fast!' },
    { planet: 'Venus', orbitDays: 224.7, desc: 'Venusian years of heat & sparkle.' },
    { planet: 'Mars', orbitDays: 687, desc: 'Your age if you were on a spacer colony.' },
    { planet: 'Jupiter', orbitDays: 4333, desc: 'Jupiter orbits the sun very slowly!' },
  ].map(p => {
    const age = (totalDays / p.orbitDays).toFixed(2);
    return { ...p, age };
  });

  return (
    <div className="space-y-8">
      {/* Input row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">
            Select Date of Birth (DoB)
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none z-10 flex items-center">
              <LucideIcon name="Calendar" size={15} />
            </span>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-805 border border-slate-205 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-sans"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">
            Calculate Age At (Reference Date)
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none z-10 flex items-center">
              <LucideIcon name="CalendarDays" size={15} />
            </span>
            <input
              type="date"
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
              className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-805 border border-slate-205 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-sans"
            />
          </div>
        </div>
      </div>

      {!isValid && (
        <div className="p-4 bg-red-500/10 border border-red-500/15 text-red-650 dark:text-red-400 text-xs rounded-2xl flex items-center gap-2">
          <LucideIcon name="AlertCircle" size={14} />
          <span>Error: Date of Birth cannot be in the future relative to the reference date. Please adjust your calendar dates.</span>
        </div>
      )}

      {isValid && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Main big display card */}
          <div className="lg:col-span-4 p-6 bg-indigo-650 text-white dark:bg-slate-900 border border-indigo-700 dark:border-slate-850 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 -translate-y-8" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200 dark:text-cyan-400">
                Current Age Sizing
              </span>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-5xl font-extrabold tracking-tight">
                  {detailedAge.years}
                </span>
                <span className="text-sm font-semibold text-indigo-205 dark:text-slate-400">
                  years old
                </span>
              </div>
              <p className="mt-2 text-xs text-indigo-150 dark:text-slate-400">
                {detailedAge.months} months, &amp; {detailedAge.days} days
              </p>
            </div>

            <div className="mt-8 border-t border-indigo-500/30 dark:border-slate-800 pt-4 space-y-2 text-[11px] text-indigo-105 dark:text-slate-450">
              <div className="flex justify-between">
                <span>Born:</span>
                <span className="font-bold">{birth.toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              </div>
              <div className="flex justify-between">
                <span>At age checkpoint:</span>
                <span className="font-bold">{target.toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              </div>
            </div>
          </div>

          {/* Countdown & Next Birthday */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 border border-slate-150 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-405 dark:text-slate-500 tracking-wider">
                  Next Birthday Countdown
                </span>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-1.5">
                  {nextBdayInfo.dateStr}
                </h4>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                  Will fall on a <span className="font-bold text-indigo-650 dark:text-cyan-450">{nextBdayInfo.weekdayName}</span>
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-2 rounded-xl">
                  <span className="block text-lg font-bold text-slate-800 dark:text-white">{nextBdayInfo.days}</span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Days</span>
                </div>
                <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-2 rounded-xl">
                  <span className="block text-lg font-bold text-slate-800 dark:text-white">{nextBdayInfo.hours}</span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Hrs</span>
                </div>
                <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-2 rounded-xl">
                  <span className="block text-lg font-bold text-slate-800 dark:text-white">{nextBdayInfo.minutes}</span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Min</span>
                </div>
                <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-2 rounded-xl animate-pulse">
                  <span className="block text-lg font-bold text-indigo-600 dark:text-cyan-400">{nextBdayInfo.seconds}</span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Sec</span>
                </div>
              </div>
            </div>

            {/* General metrics summary */}
            <div className="p-5 border border-slate-150 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-405 dark:text-slate-500 tracking-wider">
                Total Milestones Lived
              </span>
              <div className="grid grid-cols-2 gap-3 mt-3 divide-y divide-slate-100 dark:divide-slate-850">
                <div className="pt-2">
                  <span className="text-[9px] text-slate-450 uppercase tracking-widest block">Months</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-indigo-400">{totalMonths.toLocaleString()}</span>
                </div>
                <div className="pt-2">
                  <span className="text-[9px] text-slate-450 uppercase tracking-widest block">Weeks</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-indigo-400">{totalWeeks.toLocaleString()}</span>
                </div>
                <div className="pt-2">
                  <span className="text-[9px] text-slate-450 uppercase tracking-widest block">Days</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-indigo-400">{totalDays.toLocaleString()}</span>
                </div>
                <div className="pt-2">
                  <span className="text-[9px] text-slate-450 uppercase tracking-widest block">Hours</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-indigo-400">{totalHours.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Planetary Age & Seconds details */}
          <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            {planetaryAges.map((pa) => (
              <div
                key={pa.planet}
                className="p-4 border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-905 rounded-xl text-center space-y-1 shadow-sm hover:border-slate-200 dark:hover:border-slate-800 transition-colors"
              >
                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-450">{pa.planet} Era Age</span>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{pa.age} <span className="text-xs text-slate-400">Yrs</span></p>
                <span className="text-[9px] text-slate-400 block">{pa.desc}</span>
              </div>
            ))}
          </div>

          <div className="lg:col-span-12 p-4 bg-slate-50 dark:bg-slate-850/20 rounded-2xl text-center">
            <span className="text-[9px] uppercase font-bold text-slate-450 tracking-wider">Total seconds lived on planet earth</span>
            <p className="text-xl font-mono font-extrabold text-slate-700 dark:text-slate-300 mt-1">{totalSeconds.toLocaleString()} seconds</p>
          </div>
        </div>
      )}

      {/* FAQs and details */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-8 mt-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">About Age Calculator</h2>
        <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed max-w-4xl mb-6">
          The ToolMitra Age Calculator calculates exactly how long you have lived. From years, months, and days down to planetary milestones (Mercury, Venus, Mars, and Jupiter) and accurate seconds counting. Our engine also schedules real-time timers to countdown the exact seconds remaining until your next birthday.
        </p>

        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-205 mb-4">Frequently Asked Questions (FAQ)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Is my Date of Birth recorded?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Never! No inputs are uploaded, stored, or sent across network pipes. All calendar differences are calculated completely locally inside your browser thread.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">How are planetary years calculated?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Each planet has unique orbit times (e.g. Mercury takes 88 days, Mars takes 687 days). We divide your total days lived by each planet's specific solar orbit rotation cycles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
