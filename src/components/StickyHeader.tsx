import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import tonyImg from '@/assets/tony-robbins.png';
import { EventUIConfig } from '@/config/eventConfig';

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

const StickyHeader = ({ config }: { config?: EventUIConfig }) => {
  const title = config?.title ?? 'Tony Robbins';
  const subtitle = config?.subtitle ?? 'Unleash the Power Within REMOTE';
  const datesText = config?.datesText ?? '4 ימים, 16-19 ביוני 2026';
  const locationText = config?.locationText ?? 'אולם התיאטרון סינמה סיטי גלילות';
  const deadlineISO = config?.priceTimerDeadlineISO ?? '2026-06-12T00:00:00+03:00';
  const showTimer = config?.showHeaderPriceTimer ?? true;

  const getTimeLeft = () => {
    const target = new Date(deadlineISO).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((target - now) / 1000));
    return {
      days: Math.floor(diff / 86400),
      hours: Math.floor(diff % 86400 / 3600),
      minutes: Math.floor(diff % 3600 / 60),
      seconds: diff % 60
    };
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const totalSeconds = timeLeft.days * 86400 + timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;

  const LiveBadge = () => (
    <span className="inline-flex items-center gap-1.5" dir="ltr">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
      <span className="text-[13px] font-bold text-red-500 uppercase">Live</span>
    </span>
  );

  return (
    <motion.header
      className={`sticky top-0 z-50 bg-background border-b border-border transition-[padding] duration-300 will-change-transform ${
        isScrolled ? 'py-1' : 'py-3 sm:py-4'
      }`}
      style={{ transform: 'translateZ(0)' }}
      initial={isMobile ? false : { y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}>

      <div className="max-w-5xl mx-auto w-[95%]">
        <motion.div
          className={`relative flex-col gap-1 bg-cta/5 rounded-xl overflow-visible flex items-end justify-center transition-[padding] duration-300 ${
            isScrolled 
              ? 'px-2 sm:px-3 py-2 sm:py-2 min-h-[56px] md:min-h-[64px]' 
              : 'px-3 sm:px-4 py-3 sm:py-4 min-h-[120px] md:min-h-[140px]'
          }`}
          initial={isMobile ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}>

          <img
            src={tonyImg}
            alt="Tony Robbins"
            className={`absolute z-0 right-[-15px] sm:right-2 bottom-0 w-auto object-contain pointer-events-none transition-[height] duration-300 ${
              isScrolled 
                ? 'h-[68px] sm:h-[88px]' 
                : 'h-[124px] sm:h-[132px] md:h-[140px]'
            }`}
            style={{ transform: 'scaleX(-1) translateZ(0)' }}
          />

          {/* Countdown timer - desktop only (tablet/mobile uses button row timer) */}
          {showTimer && totalSeconds > 0 && (
            <div className="hidden lg:flex flex-col md:flex-row-reverse md:items-center items-end gap-0.5 md:gap-2">
              {/* Mobile: "סיום הטבת מחיר בעוד" above timer */}
              <span className={`md:hidden font-bold text-foreground whitespace-nowrap transition-[font-size] duration-300 ${
                isScrolled 
                  ? 'text-[12px] sm:text-[14px]' 
                  : 'text-[15px] sm:text-[17px]'
              }`}>
                סיום הטבת מחיר בעוד
              </span>
              <div className={`gap-1 sm:gap-1.5 flex items-center justify-start transition-[gap] duration-300 ${
                isScrolled ? 'gap-0.5 sm:gap-1' : ''
              }`} dir="ltr">
                <FlipUnit value={pad(timeLeft.days)} label="ימים" isScrolled={isScrolled} />
                <span className={`font-bold text-destructive animate-pulse transition-[font-size] duration-300 ${
                  isScrolled ? 'text-xs sm:text-sm' : 'text-sm sm:text-lg'
                }`}>:</span>
                <FlipUnit value={pad(timeLeft.hours)} label="שעות" isScrolled={isScrolled} />
                <span className={`font-bold text-destructive animate-pulse transition-[font-size] duration-300 ${
                  isScrolled ? 'text-xs sm:text-sm' : 'text-sm sm:text-lg'
                }`}>:</span>
                <FlipUnit value={pad(timeLeft.minutes)} label="דקות" isScrolled={isScrolled} />
                <span className={`font-bold text-destructive animate-pulse transition-[font-size] duration-300 ${
                  isScrolled ? 'text-xs sm:text-sm' : 'text-sm sm:text-lg'
                }`}>:</span>
                <FlipUnit value={pad(timeLeft.seconds)} label="שניות" isScrolled={isScrolled} />
              </div>
              {/* Desktop: "סיום הטבת מחיר בעוד" on same row, right of timer */}
              <span className={`hidden md:block font-bold text-foreground whitespace-nowrap transition-[font-size] duration-300 ${
                isScrolled 
                  ? 'text-[12px] md:text-[14px]' 
                  : 'text-[15px] md:text-[17px]'
              }`}>
                סיום הטבת מחיר בעוד
              </span>
            </div>
          )}

          {/* Event details: desktop absolute block | mobile inside banner next to image */}
          <AnimatePresence>
            {!isScrolled && (
              <>
                <motion.div
                  key="header-event-desktop"
                  className="hidden md:flex md:flex-col md:items-start md:justify-center absolute left-[320px] top-0 bottom-0 right-[140px] py-2 z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}>
                  {config?.showLiveBadge && (
                    <div className="mb-0.5">
                      <LiveBadge />
                    </div>
                  )}
                  <h1 className="text-[20px] font-bold text-foreground leading-tight text-right">
                    {title}
                  </h1>
                  <p className="text-[14px] text-foreground/80 font-semibold text-right">
                    {subtitle}
                  </p>
                  <div className="flex flex-wrap items-center justify-start gap-x-3 text-[12px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {datesText}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {locationText}
                    </span>
                  </div>
                </motion.div>
                <motion.div
                  key="header-event-mobile"
                  className="md:hidden absolute inset-y-0 left-3 right-[42%] sm:right-[40%] z-10 flex flex-col justify-center items-end text-right py-2 pr-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}>
                  {config?.showLiveBadge && (
                    <div className="mb-0.5">
                      <LiveBadge />
                    </div>
                  )}
                  <h1 className="text-[17px] font-bold text-foreground leading-tight">
                    {title}
                  </h1>
                  <p className="text-[12px] text-foreground/80 font-semibold mt-0.5">
                    {subtitle}
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-x-2 text-[11px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {datesText}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {locationText}
                    </span>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.header>);

};

const FlipUnit = ({ value, label, isScrolled }: {value: string; label: string; isScrolled: boolean}) => {
  return (
    <div className="flex flex-col items-center gap-0">
      <div className="flex gap-[2px]">
        {value.split('').map((digit, i) =>
        <FlipDigit key={`${i}-${digit}`} value={digit} isScrolled={isScrolled} />
        )}
      </div>
      <span className={`text-muted-foreground font-medium transition-[font-size] duration-300 ${
        isScrolled ? 'text-[9px] sm:text-[10px]' : 'text-[11px] sm:text-[12px]'
      }`}>{label}</span>
    </div>);

};

const FlipDigit = ({ value, isScrolled }: {value: string; isScrolled: boolean}) => {
  return (
    <div className="relative inline-flex">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`bg-destructive text-white font-mono font-extrabold rounded-md flex items-center justify-center shadow-md transition-[width,height,font-size] duration-300 will-change-transform ${
            isScrolled 
              ? 'text-[12px] sm:text-[15px] w-[14px] sm:w-[18px] h-[20px] sm:h-[24px]' 
              : 'text-[16px] sm:text-[19px] w-[18px] sm:w-[24px] h-[26px] sm:h-[30px]'
          }`}
          style={{ transform: 'translateZ(0)' }}>
          {value}
        </motion.div>
      </AnimatePresence>
    </div>);

};

export default StickyHeader;
