import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../lib/LanguageContext';
import { Star, MessageSquareCode, Send, ThumbsUp, CheckCircle, ShieldAlert, X } from 'lucide-react';

interface FeedbackItem {
  id: string;
  name: string;
  rating: number;
  feedback: string;
  email?: string;
  date: string;
}

export default function RatingsSection() {
  const { language } = useLanguage();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch all feedbacks from server
  const fetchFeedbacks = async () => {
    try {
      const response = await fetch('/api/feedbacks');
      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data);
      }
    } catch (err) {
      console.error('Failed to load live ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleOpenFeedback = () => {
    // Reset form states
    setRating(0);
    setFeedback('');
    setEmail('');
    setName('');
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseFeedback = () => {
    setIsModalOpen(false);
    document.body.style.overflow = 'unset';
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setSubmitError(language === 'hi' ? 'कृपया कम से कम 1 स्टार रेटिंग अवश्य चुनें।' : 'Please select at least 1 star rating.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback, email, name }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        setSubmitSuccess(true);
        // Soft refresh of local list of feedbacks
        fetchFeedbacks();
      } else {
        setSubmitError(resData.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitError(language === 'hi' ? 'सर्वर कनेक्शन विफल। कृपया पुनः प्रयास करें।' : 'Failed to connect to the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute live statistics
  const totalReviews = feedbacks.length;
  const ratingSum = feedbacks.reduce((acc, current) => acc + current.rating, 0);
  const averageRating = totalReviews > 0 ? (ratingSum / totalReviews).toFixed(1) : '5.0';

  // Simple localized helpers
  const textTitle = language === 'hi' ? 'उपयोगकर्ताओं के अनुभव और लाइव रेटिंग' : 'Users Ratings & True Reviews';
  const textSubtitle = language === 'hi' ? 'देखें कि देश-विदेश के क्रिएटर, छात्र और पेशेवर टूलमित्रा के बारे में क्या महसूस करते हैं।' : 'Check real-time satisfaction and read what developers, students, and creators globally say about ToolMitra.';
  const textBtnRate = language === 'hi' ? 'अपना अनुभव समीक्षा लिखें' : 'Rate Your Experience';
  const textOverall = language === 'hi' ? 'औसत संतुष्टि स्कोर' : 'Average Satisfaction Score';
  const textReviewsCount = language === 'hi' ? '{count} सत्यापित रेटिंग' : '{count} verified user reviews';

  return (
    <section id="ratings-feedback-section" className="py-10 bg-slate-50 dark:bg-slate-900/10 border-t border-slate-100 dark:border-slate-850">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header - smaller and professional */}
        <div className="text-center max-w-2xl mx-auto mb-6 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-indigo-600 dark:text-cyan-400 bg-indigo-50/60 dark:bg-cyan-950/20 border border-indigo-100/30 dark:border-cyan-900/20">
            <ThumbsUp size={11} className="animate-bounce" />
            <span className="uppercase tracking-wider">{language === 'hi' ? 'लाइव प्रतिक्रिया' : 'Real-time feedback'}</span>
          </div>
          <h2 className="font-display font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-none">
            {textTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {textSubtitle}
          </p>
        </div>

        {/* Compact Average Score and CTA bar */}
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <span className="text-4xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
              {averageRating}
            </span>
            <div>
              <div className="flex items-center text-amber-400 gap-0.5 justify-center sm:justify-start">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={14} 
                    fill={star <= Math.round(Number(averageRating)) ? 'currentColor' : 'none'} 
                    className={star <= Math.round(Number(averageRating)) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-750'} 
                  />
                ))}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 block">
                {textReviewsCount.replace('{count}', String(totalReviews))}
              </span>
            </div>
          </div>

          <button
            id="open-feedback-button"
            onClick={handleOpenFeedback}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-cyan-500 dark:to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl shadow-sm cursor-pointer hover:scale-[1.01] active:scale-95 transition-all w-full sm:w-auto justify-center"
          >
            <MessageSquareCode size={14} />
            <span>{textBtnRate}</span>
          </button>
        </div>

        {/* Feedbacks reviews List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-indigo-600 animate-spin mx-auto" />
            <span className="text-[10px] text-slate-400 mt-2 block">Loading live ratings...</span>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-500">No reviews found. Be the first one to rate your experience!</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedbacks.map((item, idx) => (
              <div 
                key={item.id || idx} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between"
              >
                {/* Visual decoration top left accent bar */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 opacity-20 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-extrabold text-xs text-slate-900 dark:text-white truncate max-w-[150px]">
                      {item.name}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(item.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Stars list of review */}
                  <div className="flex items-center text-amber-400 gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        size={11} 
                        className={s <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-800'} 
                      />
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed font-normal italic">
                    "{item.feedback || (language === 'hi' ? 'उपयोगकर्ता ने कोई लिखित टिप्पणी नहीं छोड़ी।' : 'User left no written feedback comment.')}"
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-50 dark:border-slate-850 flex items-center gap-1.5 text-[9px] text-slate-400">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  <span>{language === 'hi' ? 'सत्यापित उपयोगकर्ता' : 'Verified Web User'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Floating Rates / Suggestion Box Dialog Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div 
            id="feedback-modal-overlay" 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={handleCloseFeedback}
          >
            <motion.div
              id="feedback-modal-box"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Close Button */}
              <button 
                onClick={handleCloseFeedback}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>

              {!submitSuccess ? (
                /* Form Submit State */
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-lg text-slate-900 dark:text-white tracking-tight">
                      {language === 'hi' ? 'रेट योर एक्सपीरियंस' : 'Rate Your Experience'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'hi' 
                        ? 'फीडबैक तुरंत विकासक के सुरक्षित इनबॉक्स में भेज दिया जाएगा।' 
                        : 'Your ratings are live and comments land direct as emails in our secure feedback box.'
                      }
                    </p>
                  </div>

                  {/* 1. Rating Emoji/Star bar selector */}
                  <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100/80 dark:border-slate-850 p-3 rounded-xl text-center space-y-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
                      {language === 'hi' ? 'आप कितने संतुष्ट हैं?' : 'How satisfied are you?'}
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const isGold = (hoveredRating !== null ? num <= hoveredRating : num <= rating);
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setRating(num)}
                            onMouseEnter={() => setHoveredRating(num)}
                            onMouseLeave={() => setHoveredRating(null)}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer transform hover:scale-110 active:scale-95"
                            title={`${num} Stars`}
                          >
                            <Star 
                              size={24} 
                              fill={isGold ? 'currentColor' : 'none'} 
                              className={isGold ? 'text-amber-400' : 'text-slate-350 dark:text-slate-655'} 
                            />
                          </button>
                        );
                      })}
                    </div>
                    {/* Emoji Label Indicator */}
                    <span className="text-xs font-semibold text-indigo-600 dark:text-cyan-400 mt-0.5 block">
                      {rating === 0 && (language === 'hi' ? '⭐ कृपया स्टार चुनकर रेटिंग दें' : '⭐ Please tap a star to rate')}
                      {rating === 1 && (language === 'hi' ? '😞 बेहद असंतुष्ट' : '😞 Not Satisfied / Had issues')}
                      {rating === 2 && (language === 'hi' ? '😐 असंतुष्ट' : '😐 Needs Improvement')}
                      {rating === 3 && (language === 'hi' ? '🙂 ठीक-ठाक' : '🙂 Decent experience')}
                      {rating === 4 && (language === 'hi' ? '😃 संतुष्ट' : '😃 Satisfied & Happy')}
                      {rating === 5 && (language === 'hi' ? '😍 बेहद संतुष्ट / बेहतरीन' : '😍 Extremely Happy / Excellent!')}
                    </span>
                  </div>

                  {/* 2. Optional Name Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      {language === 'hi' ? 'आपका नाम (वैकल्पिक)' : 'Your Name (Optional)'}
                    </label>
                    <input 
                      type="text" 
                      placeholder={language === 'hi' ? 'जैसे: अमित शर्मा' : 'e.g. Amit Sharma'}
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-cyan-400 text-slate-900 dark:text-white px-3 py-2 rounded-xl text-xs outline-none transition-colors"
                    />
                  </div>

                  {/* 3. Suggestion / Feedback textarea */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      {language === 'hi' ? 'आपका संदेश / प्रतिक्रिया' : 'Why this rating? Share details (Optional)'}
                    </label>
                    <textarea 
                      rows={2.5}
                      placeholder={language === 'hi' 
                        ? 'हमें अपनी समस्या या सुझाव विस्तार से बताएं...' 
                        : 'Explain any issues, feature request comments, or feedback details...'
                      }
                      value={feedback} 
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-cyan-400 text-slate-900 dark:text-white px-3 py-2 rounded-xl text-xs outline-none transition-colors resize-none"
                    />
                  </div>

                  {/* 4. Optional Email */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      {language === 'hi' ? 'आपका ईमेल (वैकल्पिक, उत्तर पाने के लिए)' : 'Email Inbox address (Optional - if you want response)'}
                    </label>
                    <input 
                      type="email" 
                      placeholder="e.g. user@example.com"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-cyan-400 text-slate-900 dark:text-white px-3 py-2 rounded-xl text-xs outline-none transition-colors"
                    />
                    <p className="text-[9px] text-slate-400 leading-snug">
                      {language === 'hi' 
                        ? 'यदि आप उत्तर चाहते हैं, तो कृपया ईमेल भरें। इसे अन्य बाहरी एजेंसियों के साथ कभी साझा नहीं किया जाएगा।' 
                        : 'We will strictly protect your privacy. Our product team will contact you back directly.'
                      }
                    </p>
                  </div>

                  {/* Error display */}
                  {submitError && (
                    <div className="flex items-start gap-2 text-[10px] text-red-500 bg-red-55 px-3 py-2 rounded-xl border border-red-200/50 dark:border-red-900/10">
                      <ShieldAlert size={12} className="shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Form Submission buttons */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleCloseFeedback}
                      className="flex-1 px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 hover:dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-xs border border-slate-200 dark:border-slate-850 rounded-xl transition-all cursor-pointer text-center"
                    >
                      {language === 'hi' ? 'रद्द करें' : 'Back / Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-cyan-500 dark:to-blue-600 hover:from-blue-550 hover:to-indigo-550 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin" />
                      ) : (
                        <Send size={12} />
                      )}
                      <span>{language === 'hi' ? 'सबमिट करें' : 'Submit Feedback'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Success Animated View */
                <div className="text-center py-6 space-y-4 animate-scaleUp">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/30">
                    <CheckCircle size={24} className="animate-pulse" />
                  </div>
                  <div className="space-y-1.5 px-4">
                    <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">
                      {language === 'hi' ? 'प्रतिक्रिया भेजने के लिए धन्यवाद!' : 'Feedback Sent Successfully!'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-350 leading-relaxed font-normal">
                      {language === 'hi' 
                        ? 'आपकी रेटिंग अब वेबसाइट समीक्षाओं में लाइव दिखा दी गई है। प्रतिक्रिया ईमेल पर भेज दी गई है।' 
                        : 'Your rating is now published live on our reviews feed. The feedback has been dispatched over email.'
                      }
                    </p>
                  </div>
                  <button
                    onClick={handleCloseFeedback}
                    className="px-6 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 hover:dark:bg-slate-700 text-white dark:text-slate-205 text-xs uppercase tracking-wider font-bold rounded-xl transition-colors cursor-pointer w-full"
                  >
                    {language === 'hi' ? 'जारी रखें' : 'Awesome / Okay'}
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
