import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HOME_URL = 'https://www.tonyrobbins.co.il/';

const EventClosedMessage = () => {
  const goHome = () => {
    if (window.top) window.top.location.href = HOME_URL;
    else window.location.href = HOME_URL;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
        className="mx-4 max-w-md w-full text-center space-y-6 rounded-3xl border border-border bg-white dark:bg-card shadow-2xl p-8 sm:p-10"
      >
        <div className="w-20 h-20 mx-auto rounded-full bg-white/40 dark:bg-white/10 backdrop-blur-sm border border-white/50 flex items-center justify-center">
          <span className="text-4xl">🎉</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            התחלנו!
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
            ניפגש באירוע הבא...
          </p>
          <p className="text-base text-muted-foreground/80">
            פרטים בקרוב.
          </p>
        </div>

        <Button
          onClick={goHome}
          className="h-12 px-8 text-[15px] font-bold bg-black/85 hover:bg-black/75 backdrop-blur-sm text-white rounded-xl shadow-lg"
        >
          <Home className="w-4 h-4 ml-2" />
          חזרה לראשי
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default EventClosedMessage;
