import { useEffect, useState } from 'react';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

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
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">
              Tony Robbins
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Unleash the Power Within
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>15-18 מרץ 2025</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>פלורידה, ארה"ב</span>
            </div>
          </div>
        </div>
        <motion.div
          className="mt-2 flex items-center justify-center gap-2 bg-cta/5 rounded-lg px-3 py-1.5"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Clock className="w-3.5 h-3.5 text-cta" />
          <span className="text-xs font-medium text-foreground">
            המחיר עולה בעוד
          </span>
          <div className="flex items-center gap-1 font-mono text-sm font-bold text-cta" dir="ltr">
            <span>{pad(timeLeft.hours)}</span>
            <span className="animate-pulse">:</span>
            <span>{pad(timeLeft.minutes)}</span>
            <span className="animate-pulse">:</span>
            <span>{pad(timeLeft.seconds)}</span>
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
};

export default StickyHeader;
