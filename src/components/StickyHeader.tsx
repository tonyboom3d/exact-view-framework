import { useEffect, useState } from 'react';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import tonyImg from '@/assets/tony-robbins.png';

const StickyHeader = () => {
  const getTimeLeft = () => {
    const target = new Date('2026-03-15T23:50:00+02:00').getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((target - now) / 1000));
    return {
      days: Math.floor(diff / 86400),
      hours: Math.floor((diff % 86400) / 3600),
      minutes: Math.floor((diff % 3600) / 60),
      seconds: diff % 60,
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
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1 text-[14px] text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>12 במרץ 2026, 16:00 – 15 במרץ 2026, 23:50</span>
            </div>
            <div className="flex items-center gap-1 text-[14px] text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>מלון פרימה מילניום, התדהר 2, רעננה, ישראל</span>
            </div>
          </div>
          <div className="text-left">
            <h1 className="text-[20px] font-bold text-foreground leading-tight">
              Tony Robbins
            </h1>
            <p className="text-[15px] text-muted-foreground font-medium">
              Unleash the Power Within
            </p>
          </div>
        </div>
        <motion.div
          className="relative mt-6 flex flex-col items-center justify-center gap-1 bg-cta/5 rounded-xl px-4 py-3 overflow-visible"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <img
            src={tonyImg}
            alt="Tony Robbins"
            className="absolute right-2 bottom-0 h-[170px] w-auto object-contain pointer-events-none"
            style={{ transform: 'scaleX(-1)' }}
          />
          <span className="text-[15px] font-semibold text-foreground mb-1">
            מתחילים בעוד
          </span>
          <div className="flex items-center gap-1.5" dir="ltr">
            <FlipUnit value={pad(timeLeft.days)} label="ימים" />
            <span className="text-xl font-bold text-destructive animate-pulse">:</span>
            <FlipUnit value={pad(timeLeft.hours)} label="שעות" />
            <span className="text-xl font-bold text-destructive animate-pulse">:</span>
            <FlipUnit value={pad(timeLeft.minutes)} label="דקות" />
            <span className="text-xl font-bold text-destructive animate-pulse">:</span>
            <FlipUnit value={pad(timeLeft.seconds)} label="שניות" />
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
};

const FlipUnit = ({ value, label }: { value: string; label: string }) => {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex gap-[3px]">
        {value.split('').map((digit, i) => (
          <FlipDigit key={`${i}-${digit}`} value={digit} />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
};

const FlipDigit = ({ value }: { value: string }) => {
  return (
    <div className="relative inline-flex">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-destructive text-white font-mono text-[20px] font-extrabold rounded-md w-[28px] h-[36px] flex items-center justify-center shadow-md"
          style={{ perspective: '200px', backfaceVisibility: 'hidden' }}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default StickyHeader;
