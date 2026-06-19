import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface PromoBannerProps {
  deadlineISO: string;
  textDeadlineISO?: string;
}

const PromoBanner = ({ deadlineISO, textDeadlineISO }: PromoBannerProps) => {
  const getTimeLeft = () => {
    const target = new Date(deadlineISO).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((target - now) / 1000));
    return {
      hours: Math.floor(diff / 3600),
      minutes: Math.floor(diff % 3600 / 60),
      seconds: diff % 60,
      total: diff,
    };
  };

  const isTextVisible = () => {
    if (!textDeadlineISO) return true;
    return Date.now() < new Date(textDeadlineISO).getTime();
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  const [showText, setShowText] = useState(isTextVisible);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft());
      setShowText(isTextVisible());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (timeLeft.total <= 0) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full rounded-xl border border-amber-200 bg-gradient-to-l from-amber-50 to-orange-50 px-4 py-3 flex items-center justify-between gap-3"
      dir="rtl"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 inline-flex items-center justify-center bg-orange-500 text-white font-extrabold text-sm rounded-lg px-2.5 py-1 shadow-sm">
          1+1
        </span>
        {showText && (
          <span className="text-sm font-medium text-foreground/90 truncate">
            על כל סוגי הכרטיסים — רוכשים כרטיס ומקבלים את השני במתנה!
          </span>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground font-mono font-medium" dir="ltr">
        <Clock className="w-3.5 h-3.5" />
        <span>{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}</span>
      </div>
    </motion.div>
  );
};

export default PromoBanner;
