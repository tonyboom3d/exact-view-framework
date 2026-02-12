import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import tonyImg from '@/assets/tony-robbins.png';

const StickyHeader = () => {
  const getTimeLeft = () => {
    const target = new Date('2026-03-12T16:00:00+02:00').getTime();
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

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <motion.header
      className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}>

      <div className="max-w-5xl mx-auto w-[95%] py-2">
        {/* Desktop (md+): event details in header */}
        <div className="hidden md:flex md:items-center md:justify-between md:gap-4 md:mb-3">
          <div className="text-right min-w-0">
            <h1 className="text-[22px] font-bold text-foreground leading-tight truncate">
              Tony Robbins
            </h1>
            <p className="text-[15px] text-foreground/80 font-semibold truncate">
              Unleash the Power Within REMOTE
            </p>
            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-0.5 text-[13px] text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                4 ימים, 12-15 במרץ 2026
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                מלון פרימה מילניום, רעננה
              </span>
            </div>
          </div>
        </div>

        <motion.div
          className="relative flex-col gap-1 bg-cta/5 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 overflow-visible flex items-end justify-center"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}>

          <img
            src={tonyImg}
            alt="Tony Robbins"
            className="absolute right-[-15px] sm:right-2 bottom-0 h-[100px] sm:h-[120px] w-auto object-contain pointer-events-none"
            style={{ transform: 'scaleX(-1)' }} />

          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[15px] sm:text-[17px] font-bold text-foreground whitespace-nowrap">
              מתחילים בעוד
            </span>
            <div className="gap-1 sm:gap-1.5 flex items-center justify-start" dir="ltr">
              <FlipUnit value={pad(timeLeft.days)} label="ימים" />
              <span className="text-sm sm:text-lg font-bold text-destructive animate-pulse">:</span>
              <FlipUnit value={pad(timeLeft.hours)} label="שעות" />
              <span className="text-sm sm:text-lg font-bold text-destructive animate-pulse">:</span>
              <FlipUnit value={pad(timeLeft.minutes)} label="דקות" />
              <span className="text-sm sm:text-lg font-bold text-destructive animate-pulse">:</span>
              <FlipUnit value={pad(timeLeft.seconds)} label="שניות" />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.header>);

};

const FlipUnit = ({ value, label }: {value: string;label: string;}) => {
  return (
    <div className="flex flex-col items-center gap-0">
      <div className="flex gap-[2px]">
        {value.split('').map((digit, i) =>
        <FlipDigit key={`${i}-${digit}`} value={digit} />
        )}
      </div>
      <span className="text-[11px] sm:text-[12px] text-muted-foreground font-medium">{label}</span>
    </div>);

};

const FlipDigit = ({ value }: {value: string;}) => {
  return (
    <div className="relative inline-flex">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-destructive text-white font-mono text-[16px] sm:text-[19px] font-extrabold rounded-md w-[18px] sm:w-[24px] h-[26px] sm:h-[30px] flex items-center justify-center shadow-md"
          style={{ perspective: '200px', backfaceVisibility: 'hidden' }}>

          {value}
        </motion.div>
      </AnimatePresence>
    </div>);

};

export default StickyHeader;