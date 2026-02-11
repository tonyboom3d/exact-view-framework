import { useEffect, useState } from 'react';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StickyHeader = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 2, minutes: 15, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const totalSeconds = prev.days * 86400 + prev.hours * 3600 + prev.minutes * 60 + prev.seconds - 1;
        if (totalSeconds <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        return {
          days: Math.floor(totalSeconds / 86400),
          hours: Math.floor((totalSeconds % 86400) / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60,
        };
      });
    }, 1000);
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
          <div>
            <h1 className="text-[20px] font-bold text-foreground leading-tight">
              Tony Robbins
            </h1>
            <p className="text-[15px] text-muted-foreground font-medium">
              Unleash the Power Within
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-[14px] text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>15-18 מרץ 2025</span>
            </div>
            <div className="flex items-center gap-1 text-[14px] text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>פלורידה, ארה"ב</span>
            </div>
          </div>
        </div>
        <motion.div
          className="mt-3 flex items-center justify-center gap-3 bg-cta/5 rounded-xl px-4 py-3"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Clock className="w-5 h-5 text-cta" />
          <span className="text-[15px] font-semibold text-foreground">
            המחיר עולה בעוד
          </span>
          <div className="flex items-center gap-1.5" dir="ltr">
            <FlipUnit value={pad(timeLeft.seconds)} label="שניות" />
            <span className="text-xl font-bold text-cta animate-pulse">:</span>
            <FlipUnit value={pad(timeLeft.minutes)} label="דקות" />
            <span className="text-xl font-bold text-cta animate-pulse">:</span>
            <FlipUnit value={pad(timeLeft.hours)} label="שעות" />
            <span className="text-xl font-bold text-cta animate-pulse">:</span>
            <FlipUnit value={pad(timeLeft.days)} label="ימים" />
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
          className="bg-foreground/90 text-background font-mono text-[20px] font-extrabold rounded-md w-[28px] h-[36px] flex items-center justify-center shadow-md"
          style={{ perspective: '200px', backfaceVisibility: 'hidden' }}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default StickyHeader;
