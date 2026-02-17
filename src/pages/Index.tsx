import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';
import StickyBottomBar from '@/components/StickyBottomBar';
import TicketSelection from '@/components/TicketSelection';
import BuyerDetails from '@/components/BuyerDetails';
import OrderSummary from '@/components/OrderSummary';
import ThankYou from '@/components/ThankYou';
import LoadingOverlay from '@/components/LoadingOverlay';
import PendingPaymentOverlay from '@/components/PendingPaymentOverlay';
import { type TicketSelection as TicketSelectionType, type BuyerInfo, type GuestInfo, type TicketType } from '@/types/order';
import { useWixTickets } from '@/hooks/useWixTickets';
import { useWixPayment } from '@/hooks/useWixPayment';
import type { PendingPaymentData } from '@/hooks/useWixPayment';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { getTestGuest, getTestPayer } from '@/config/testPrefill';

const isInsideWix = window.parent !== window;
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

const Index = () => {
  const [step, setStep] = useState(1);
  const [selections, setSelections] = useState<TicketSelectionType[]>([]);
  const [buyer, setBuyer] = useState<BuyerInfo>({ email: '', firstName: '', lastName: '', phone: '' });
  const [guests, setGuests] = useState<GuestInfo[]>([]);
  const [useMyDetails, setUseMyDetails] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderNumber, setOrderNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPayer, setShowPayer] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [showCompany, setShowCompany] = useState(false);

  // Wix integration hooks
  const { tickets, ensureWixData, isAdminTest } = useWixTickets();
  const {
    createOrderAndPay,
    loading: paymentLoading,
    loadingMessage,
    error: paymentError,
    setError: setPaymentError,
    pendingPayment,
    setPendingPayment,
    pollPaymentStatus,
    sendPendingWhatsapp,
    cancelPendingPayment,
    clearPendingPayment,
    checkExistingPendingOrder,
  } = useWixPayment();
  const [paymentStatus, setPaymentStatus] = useState<'Successful' | 'Pending' | null>(null);
  const [pdfLink, setPdfLink] = useState<string | null>(null);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [existingPendingData, setExistingPendingData] = useState<PendingPaymentData | null>(null);

  const totalTickets = useMemo(
    () => selections.reduce((sum, s) => sum + s.quantity, 0),
    [selections]
  );

  const totalPrice = useMemo(
    () =>
      selections.reduce((sum, s) => {
        const t = tickets.find((ticket) => ticket.type === s.type);
        return sum + (t?.price || 0) * s.quantity;
      }, 0),
    [selections, tickets]
  );

  const syncGuests = useCallback(
    (ticketCount: number) => {
      const needed = ticketCount;
      setGuests((prev) => {
        if (prev.length >= needed) return prev.slice(0, needed);
        return [...prev, ...Array.from({ length: needed - prev.length }, () => ({ firstName: '', lastName: '', phone: '', wantWhatsapp: true }))];
      });
    },
    []
  );

  // מילוי אוטומטי לבדיקות – רק כשמצב admin test פעיל (מגיע מ-Velo דרך URL param + Secret Manager)
  useEffect(() => {
    if (!isAdminTest || step !== 2 || totalTickets <= 0) return;
    setGuests(
      Array.from({ length: totalTickets }, (_, i) => {
        const g = getTestGuest(i);
        return { firstName: g.firstName, lastName: g.lastName, email: g.email, phone: g.phone };
      })
    );
  }, [step, totalTickets, isAdminTest]);

  // מילוי פרטי משלם לבדיקות כשמסמנים "פרטי המשלם שונים" (admin test בלבד)
  useEffect(() => {
    if (!isAdminTest || !showPayer) return;
    const payer = getTestPayer();
    setBuyer({ firstName: payer.firstName, lastName: payer.lastName, email: payer.email, phone: payer.phone });
  }, [showPayer, isAdminTest]);

  // Check localStorage for a pending order from a previous session
  useEffect(() => {
    if (!isInsideWix) return;

    checkExistingPendingOrder().then((result) => {
      if (!result) return;

      const { data, currentStatus, ticketsPdf } = result;

      if (currentStatus === 'paid') {
        // Order was confirmed while user was away
        setOrderNumber(data.orderNumber);
        setPaymentStatus('Successful');
        setPdfLink(ticketsPdf || null);
        clearPendingPayment();
        setStep(3);
        toast({ title: 'ההזמנה שלך אושרה!', description: `מספר הזמנה: ${data.orderNumber}` });
      } else if (currentStatus === 'pending-payment' || currentStatus === 'in-progress') {
        // Still pending – show dialog
        setExistingPendingData(data);
        setShowPendingDialog(true);
      } else {
        // Cancelled, failed, or unknown – clean up
        clearPendingPayment();
      }
    });
  }, []);

  const handleSelectionsChange = (newSelections: TicketSelectionType[]) => {
    setSelections(newSelections);
    const count = newSelections.reduce((sum, s) => sum + s.quantity, 0);
    syncGuests(count);
  };

  const handleBuyTicket = (type: TicketType) => {
    if (selections.length === 0 || selections[0].type !== type) {
      handleSelectionsChange([{ type, quantity: 1 }]);
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nameRegex = /^[a-zA-Zא-ת\u0590-\u05FF\s']+$/;
  const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
  const phoneRegex = /^05\d{8}$/;

  const validateName = (value: string, label: string): string | null => {
    if (!value.trim()) return `${label} הוא שדה חובה`;
    if (!nameRegex.test(value.trim())) return `${label} יכול להכיל רק אותיות וגרש`;
    return null;
  };

  const validatePhone = (value: string): string | null => {
    const cleaned = value.replace(/[-\s]/g, '');
    if (!cleaned) return 'טלפון הוא שדה חובה';
    if (!phoneRegex.test(cleaned)) return 'מספר טלפון לא תקין (05XXXXXXXX)';
    return null;
  };

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) return 'אימייל הוא שדה חובה';
    if (!emailRegex.test(value.trim())) return 'כתובת אימייל לא תקינה';
    return null;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const missingFields: string[] = [];

    // Validate each guest ticket
    guests.forEach((guest, idx) => {
      const fnErr = validateName(guest.firstName, 'שם פרטי');
      if (fnErr) { newErrors[`guest_${idx}_firstName`] = fnErr; missingFields.push(`כרטיס ${idx + 1} - שם פרטי`); }

      const lnErr = validateName(guest.lastName, 'שם משפחה');
      if (lnErr) { newErrors[`guest_${idx}_lastName`] = lnErr; missingFields.push(`כרטיס ${idx + 1} - שם משפחה`); }

      const phErr = validatePhone(guest.phone);
      if (phErr) { newErrors[`guest_${idx}_phone`] = phErr; missingFields.push(`כרטיס ${idx + 1} - טלפון`); }

      // Email required for all tickets
      const emErr = validateEmail(guest.email || '');
      if (emErr) { newErrors[`guest_${idx}_email`] = emErr; missingFields.push(`כרטיס ${idx + 1} - אימייל`); }
    });

    // Validate payer fields if showPayer
    if (showPayer) {
      const emErr = validateEmail(buyer.email);
      if (emErr) { newErrors.payer_email = emErr; missingFields.push('משלם - אימייל'); }

      const fnErr = validateName(buyer.firstName, 'שם פרטי');
      if (fnErr) { newErrors.payer_firstName = fnErr; missingFields.push('משלם - שם פרטי'); }

      const lnErr = validateName(buyer.lastName, 'שם משפחה');
      if (lnErr) { newErrors.payer_lastName = lnErr; missingFields.push('משלם - שם משפחה'); }

      const phErr = validatePhone(buyer.phone);
      if (phErr) { newErrors.payer_phone = phErr; missingFields.push('משלם - טלפון'); }

      if (showCompany && !companyName.trim()) {
        newErrors.payer_companyName = 'שם חברה הוא שדה חובה';
        missingFields.push('משלם - שם חברה');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (step === 2) {
      if (!validateStep2()) return;

      if (isInsideWix) {
        // Send to Wix: create order + open payment
        try {
          const result = await createOrderAndPay({
            selections,
            ticketsList: tickets,
            guests,
            buyer,
            showPayer,
            companyName: companyName || undefined,
            totalPrice,
            ensureWixData,
          });

          if (result.status === 'Pending') {
            // Pending payment – PendingPaymentOverlay will handle polling
            // pendingPayment state was already set by useWixPayment
            setOrderNumber(result.orderNumber);
            return;
          }

          setOrderNumber(result.orderNumber);
          setReferralCode(result.referralCode);
          setPdfLink(result.pdfLink || null);
          setPaymentStatus(result.status || 'Successful');
          setStep(3);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
          // Error is handled by useWixPayment - it sets paymentError state
        }
      } else {
        // Dev mode: skip payment, go to thank you
        setOrderNumber(Math.random().toString(36).substring(2, 10).toUpperCase());
        setReferralCode(Math.random().toString(36).substring(2, 10).toUpperCase());
        setStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const steps = [1, 2, 3];

  // Auto-clear payment error after 3.7 seconds
  useEffect(() => {
    if (paymentError) {
      const timer = setTimeout(() => {
        setPaymentError(null);
      }, 3700);
      return () => clearTimeout(timer);
    }
  }, [paymentError, setPaymentError]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <StickyHeader />
      <LoadingOverlay visible={paymentLoading} message={loadingMessage} />

      {/* Pending payment polling overlay */}
      {pendingPayment && (
        <PendingPaymentOverlay
          visible={!!pendingPayment}
          pendingData={pendingPayment}
          pollPaymentStatus={pollPaymentStatus}
          sendPendingWhatsapp={sendPendingWhatsapp}
          cancelPendingPayment={cancelPendingPayment}
          onPaymentConfirmed={({ orderNumber: on, ticketsPdf: tp }) => {
            clearPendingPayment();
            setOrderNumber(on);
            setPdfLink(tp || null);
            setPaymentStatus('Successful');
            setStep(3);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onPaymentFailed={() => {
            clearPendingPayment();
            setPaymentError('התשלום לא אושר על ידי חברת האשראי. ניתן לנסות שוב.');
          }}
          onCancelled={() => {
            clearPendingPayment();
            setPaymentError('ההזמנה בוטלה. ניתן לנסות שוב.');
          }}
          onTimeout={() => {
            setPendingPayment(null);
            if (typeof window !== 'undefined' && window.top) {
              window.top.location.href = 'https://www.tonyrobbins.co.il/';
            }
          }}
        />
      )}

      {/* Returning user: existing pending order dialog */}
      <AnimatePresence>
        {showPendingDialog && existingPendingData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="mx-4 max-w-sm w-full rounded-2xl bg-card border border-border shadow-2xl p-6 text-center space-y-4"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
              <h3 className="text-[18px] font-bold text-foreground">יש לך הזמנה ממתינה</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                ביצעת הזמנה מספר <span className="font-bold">{existingPendingData.orderNumber}</span>
                {' '}בתאריך{' '}
                <span className="font-medium">
                  {new Date(existingPendingData.timestamp).toLocaleString('he-IL', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
                {' '}שעדיין ממתינה לאישור חברת האשראי.
              </p>
              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => {
                    setShowPendingDialog(false);
                    setPendingPayment(existingPendingData);
                  }}
                  className="w-full h-11 text-[15px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                >
                  להמשיך לחכות לאישור
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPendingDialog(false);
                    setExistingPendingData(null);
                    clearPendingPayment();
                  }}
                  className="w-full h-11 text-[15px] font-medium rounded-xl"
                >
                  לבצע הזמנה חדשה
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment error message */}
      <AnimatePresence>
        {paymentError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 left-4 right-4 z-[100] bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg text-center text-sm font-medium"
          >
            {paymentError}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto flex flex-col">

      {/* Step Indicator - centered */}
      <motion.div
        className="max-w-5xl mx-auto w-[95%] pt-3 pb-1 hidden md:flex justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center justify-center gap-0">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold leading-[0] pt-[1px] transition-all shrink-0 ${
                  s <= step
                    ? 'bg-cta text-cta-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 sm:w-16 h-0.5 mx-1 shrink-0 ${s < step ? 'bg-cta' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-[95%] pb-28">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={isMobile ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TicketSelection
                selections={selections}
                onChange={handleSelectionsChange}
                onBuyTicket={handleBuyTicket}
                tickets={tickets}
                loading={false}
              />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <BuyerDetails
                buyer={buyer}
                onBuyerChange={setBuyer}
                guests={guests}
                onGuestsChange={setGuests}
                useMyDetails={useMyDetails}
                onUseMyDetailsChange={setUseMyDetails}
                totalTickets={totalTickets}
                errors={errors}
                selections={selections}
                showPayer={showPayer}
                onShowPayerChange={setShowPayer}
                tickets={tickets}
                showCompany={showCompany}
                onShowCompanyChange={setShowCompany}
                companyName={companyName}
                onCompanyNameChange={setCompanyName}
              />
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="px-4 h-12"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={paymentLoading}
                  className="flex-1 h-12 text-base font-bold bg-cta hover:bg-cta/90 text-cta-foreground rounded-xl shadow-lg"
                >
                  מעבר לתשלום
                </Button>
              </div>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <ThankYou
                orderNumber={orderNumber}
                referralCode={referralCode}
                selections={selections}
                guests={guests}
                buyer={buyer}
                showPayer={showPayer}
                tickets={tickets}
                paymentStatus={paymentStatus}
                pdfLink={pdfLink}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <StickyBottomBar
        step={step}
        totalPrice={totalPrice}
        ticketCount={totalTickets}
        onNext={handleNext}
        onBack={handleBack}
        disabled={false}
      />
      </div>
    </div>
  );
};

export default Index;
