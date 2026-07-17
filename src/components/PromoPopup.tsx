import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PromoPopupProps {
  deadlineISO: string;
  title: string;
  subtitle?: string;
  description: string;
  onDismiss: () => void;
  forceShow?: boolean;
  showTimer?: boolean;
}

const PromoPopup = ({ deadlineISO, title, subtitle, description, onDismiss, forceShow = false, showTimer = true }: PromoPopupProps) => {
  const getTimeLeft = () => {
    const target = new Date(deadlineISO).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((target - now) / 1000));
    return {
      days: Math.floor(diff / 86400),
      hours: Math.floor(diff % 86400 / 3600),
      minutes: Math.floor(diff % 3600 / 60),
      seconds: diff % 60,
      total: diff,
    };
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!forceShow && timeLeft.total <= 0) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
          className="mx-4 max-w-md w-full text-center space-y-5 rounded-3xl border border-border bg-white dark:bg-card shadow-2xl p-8 sm:p-10"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm sm:text-base font-semibold text-destructive">
                {subtitle}
              </p>
            )}
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          {/* Countdown timer */}
          {showTimer && (
            <div className="flex items-center justify-center gap-2" dir="ltr">
              {timeLeft.days > 0 && (
                <>
                  <TimerUnit value={pad(timeLeft.days)} label="ימים" />
                  <span className="font-bold text-destructive animate-pulse text-lg">:</span>
                </>
              )}
              <TimerUnit value={pad(timeLeft.hours)} label="שעות" />
              <span className="font-bold text-destructive animate-pulse text-lg">:</span>
              <TimerUnit value={pad(timeLeft.minutes)} label="דקות" />
              <span className="font-bold text-destructive animate-pulse text-lg">:</span>
              <TimerUnit value={pad(timeLeft.seconds)} label="שניות" />
            </div>
          )}

          <button
            onClick={onDismiss}
            className="w-full h-12 px-8 text-[15px] font-bold bg-destructive hover:bg-destructive/90 text-white rounded-xl shadow-lg transition-colors"
          >
            לבחירת כרטיסים
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const TimerUnit = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className="flex gap-[2px]">
      {value.split('').map((digit, i) => (
        <div
          key={`${i}-${digit}`}
          className="bg-destructive text-white font-mono font-extrabold rounded-md flex items-center justify-center shadow-md text-[18px] w-[24px] h-[32px]"
        >
          {digit}
        </div>
      ))}
    </div>
    <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
  </div>
);

export default PromoPopup;
