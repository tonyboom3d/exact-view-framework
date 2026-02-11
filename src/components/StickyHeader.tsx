import { useEffect, useState, useRef } from 'react';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StickyHeader = () => {
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 15, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const totalSeconds = prev.hours * 3600 + prev.minutes * 60 + prev.seconds - 1;
        if (totalSeconds <= 0) return { hours: 0, minutes: 0, seconds: 0 };
        return {
          hours: Math.floor(totalSeconds / 3600),
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
            <h1 className="text-lg font-bold text-foreground leading-tight">
              Tony Robbins
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Unleash the Power Within
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>15-18 מרץ 2025</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>פלורידה, ארה"ב</span>
            </div>
          </div>
        </div>
        <motion.div
          className="mt-3 flex items-center justify-center gap-3 bg-cta/5 rounded-xl px-4 py-2.5"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Clock className="w-4 h-4 text-cta" />
          <span className="text-sm font-semibold text-foreground">
            המחיר עולה בעוד
          </span>
          <div className="flex items-center gap-1" dir="ltr">
            <FlipDigit value={pad(timeLeft.hours)} />
            <span className="text-lg font-bold text-cta animate-pulse mx-0.5">:</span>
            <FlipDigit value={pad(timeLeft.minutes)} />
            <span className="text-lg font-bold text-cta animate-pulse mx-0.5">:</span>
            <FlipDigit value={pad(timeLeft.seconds)} />
          </div>
        </motion.div>
      </div>
    </motion.header>
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
          className="bg-foreground/90 text-background font-mono text-lg font-extrabold rounded-md px-2 py-1 min-w-[36px] text-center shadow-md"
          style={{ perspective: '200px', backfaceVisibility: 'hidden' }}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default StickyHeader;
