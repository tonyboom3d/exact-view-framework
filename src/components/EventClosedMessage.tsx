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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative flex flex-1 items-center justify-center px-4 py-12 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cta/20 via-background to-primary/15" />
      <div className="absolute top-1/4 -right-16 w-72 h-72 rounded-full bg-cta/25 blur-3xl" />
      <div className="absolute bottom-1/4 -left-16 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative max-w-md w-full text-center space-y-6 rounded-3xl border border-white/50 bg-white/35 dark:bg-black/25 backdrop-blur-xl shadow-2xl p-8 sm:p-10">
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
      </div>
    </motion.div>
  );
};

export default EventClosedMessage;
