import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PendingPaymentData } from '@/hooks/useWixPayment';

interface PendingPaymentOverlayProps {
  visible: boolean;
  pendingData: PendingPaymentData;
  onPaymentConfirmed: (data: { orderNumber: string; ticketsPdf?: string }) => void;
  onPaymentFailed: () => void;
  onTimeout: () => void;
  onCancelled: () => void;
  pollPaymentStatus: (paymentId: string) => Promise<{ status: string; ticketsPdf?: string }>;
  sendPendingWhatsapp: (phone: string, firstName: string, orderNumber: string) => Promise<void>;
  cancelPendingPayment: (paymentId: string) => Promise<void>;
}

type OverlayPhase = 'polling' | 'confirmed' | 'failed' | 'timeout';

const POLL_INTERVAL = 5000;
const MAX_POLL_DURATION = 60000;

const PendingPaymentOverlay = ({
  visible,
  pendingData,
  onPaymentConfirmed,
  onPaymentFailed,
  onTimeout,
  onCancelled,
  pollPaymentStatus,
  sendPendingWhatsapp,
  cancelPendingPayment,
}: PendingPaymentOverlayProps) => {
  const [phase, setPhase] = useState<OverlayPhase>('polling');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const whatsappSentRef = useRef(false);
  const resolvedRef = useRef(false);
  const manuallyCancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleManualCancel = useCallback(async () => {
    if (resolvedRef.current || !pendingData?.paymentId) return;

    setIsCancelling(true);
    manuallyCancelledRef.current = true;
    resolvedRef.current = true;
    cleanup();

    try {
      await cancelPendingPayment(pendingData.paymentId);
      console.log('[PendingOverlay] Manual cancel completed');
    } catch (err) {
      console.warn('[PendingOverlay] Manual cancel failed:', err);
    }

    setIsCancelling(false);
    onCancelled();
  }, [pendingData, cancelPendingPayment, onCancelled, cleanup]);

  useEffect(() => {
    if (!visible || !pendingData?.paymentId) return;

    resolvedRef.current = false;
    whatsappSentRef.current = false;
    startTimeRef.current = Date.now();
    setPhase('polling');
    setElapsedSeconds(0);

    // Timer for elapsed seconds display
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    // Polling interval
    intervalRef.current = setInterval(async () => {
      if (resolvedRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;

      try {
        const result = await pollPaymentStatus(pendingData.paymentId);
        console.log('[PendingOverlay] poll result:', result);

        if (resolvedRef.current) return;

        if (result.status === 'paid') {
          resolvedRef.current = true;
          cleanup();
          setPhase('confirmed');
          setTimeout(() => {
            onPaymentConfirmed({
              orderNumber: pendingData.orderNumber,
              ticketsPdf: result.ticketsPdf,
            });
          }, 2000);
          return;
        }

        if (result.status === 'cancelled' || result.status === 'failed' || result.status === 'declined') {
          resolvedRef.current = true;
          cleanup();
          setPhase('failed');
          setTimeout(() => {
            onPaymentFailed();
          }, 3000);
          return;
        }
      } catch (err) {
        console.warn('[PendingOverlay] poll error:', err);
      }

      // Check if we've exceeded the max duration
      if (elapsed >= MAX_POLL_DURATION && !resolvedRef.current) {
        resolvedRef.current = true;
        cleanup();

        // Send WhatsApp notification ONLY if user didn't manually cancel (fire-and-forget)
        if (!whatsappSentRef.current && !manuallyCancelledRef.current && pendingData.buyerPhone) {
          whatsappSentRef.current = true;
          sendPendingWhatsapp(
            pendingData.buyerPhone,
            pendingData.buyerFirstName,
            pendingData.orderNumber
          ).catch(() => {});
        }

        setPhase('timeout');
      }
    }, POLL_INTERVAL);

    return cleanup;
  }, [visible, pendingData, pollPaymentStatus, sendPendingWhatsapp, onPaymentConfirmed, onPaymentFailed, cleanup]);

  if (!visible) return null;

  const progressPercent = Math.min((elapsedSeconds / 60) * 100, 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="mx-4 max-w-md w-full rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
        >
          {/* Phase: Polling */}
          {phase === 'polling' && (
            <div className="p-8 text-center space-y-6">
              {/* Animated shield + loader */}
              <div className="relative w-20 h-20 mx-auto">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full bg-primary/10"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="w-10 h-10 text-primary/30" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[20px] font-bold text-foreground">
                  בודקים את סטטוס התשלום
                </h3>
                <p className="text-[15px] text-muted-foreground leading-relaxed">
                  אנחנו בודקים את סטטוס התשלום שלך מול חברת האשראי.
                  <br />
                  התהליך לרוב לוקח מספר שניות.
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground/70">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{elapsedSeconds} שניות</span>
                </div>
              </div>

              {/* Warning not to close */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-[13px] text-amber-800 dark:text-amber-200 font-medium">
                  ⏳ אנא אל תסגרו חלונית זו ואל תרעננו את הדף
                </p>
              </div>

              {/* Manual cancel option */}
              <div className="pt-2 border-t border-border/50">
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  אם לא ביצעת תשלום בפועל ניתן לסגור את החלונית{' '}
                  <button
                    onClick={handleManualCancel}
                    disabled={isCancelling}
                    className="text-primary hover:text-primary/80 underline underline-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCancelling ? 'מבטל...' : 'בלחיצה כאן'}
                  </button>
                  {' '}ולדלג על ההמתנה
                </p>
              </div>

              <p className="text-[12px] text-muted-foreground/50">
                מספר הזמנה: {pendingData.orderNumber}
              </p>
            </div>
          )}

          {/* Phase: Confirmed */}
          {phase === 'confirmed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </motion.div>
              <h3 className="text-[22px] font-bold text-foreground">התשלום אושר!</h3>
              <p className="text-[15px] text-muted-foreground">
                ההזמנה שלך אושרה בהצלחה. עוברים לדף האישור...
              </p>
            </motion.div>
          )}

          {/* Phase: Failed */}
          {phase === 'failed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center space-y-4"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-[20px] font-bold text-foreground">התשלום לא אושר</h3>
              <p className="text-[15px] text-muted-foreground">
                חברת האשראי לא אישרה את התשלום.
                <br />
                ניתן לנסות שוב עם כרטיס אחר.
              </p>
            </motion.div>
          )}

          {/* Phase: Timeout (60 seconds passed) */}
          {phase === 'timeout' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center space-y-5"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Clock className="w-10 h-10 text-blue-600" />
              </div>
              <div className="space-y-3">
                <h3 className="text-[20px] font-bold text-foreground">ההזמנה שלך בבדיקה</h3>
                <p className="text-[15px] text-muted-foreground leading-relaxed">
                  עדיין לא קיבלנו אישור מחברת האשראי.
                  <br />
                  נעדכן אותך ברגע שנקבל אישור בוואטסאפ ובמייל.
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-[14px] text-muted-foreground">
                  מספר הזמנה: <span className="font-bold text-foreground">{pendingData.orderNumber}</span>
                </p>
                <p className="text-[13px] text-muted-foreground/70">
                  {new Date().toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>

              <Button
                onClick={onTimeout}
                className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              >
                הבנתי, חזרה לאתר
              </Button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PendingPaymentOverlay;
