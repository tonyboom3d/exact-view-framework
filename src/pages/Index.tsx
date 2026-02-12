import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import StickyHeader from '@/components/StickyHeader';
import StickyBottomBar from '@/components/StickyBottomBar';
import TicketSelection from '@/components/TicketSelection';
import BuyerDetails from '@/components/BuyerDetails';
import OrderSummary from '@/components/OrderSummary';
import ThankYou from '@/components/ThankYou';
import LoadingOverlay from '@/components/LoadingOverlay';
import { type TicketSelection as TicketSelectionType, type BuyerInfo, type GuestInfo, type TicketType } from '@/types/order';
import { useWixTickets } from '@/hooks/useWixTickets';
import { useWixPayment } from '@/hooks/useWixPayment';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const isInsideWix = window.parent !== window;

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
  const { tickets } = useWixTickets();
  const { createOrderAndPay, loading: paymentLoading, loadingMessage } = useWixPayment();

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
        return [...prev, ...Array.from({ length: needed - prev.length }, () => ({ firstName: '', lastName: '', phone: '' }))];
      });
    },
    []
  );

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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

      // Email required for first ticket
      if (idx === 0) {
        const emErr = validateEmail(guest.email || '');
        if (emErr) { newErrors[`guest_${idx}_email`] = emErr; missingFields.push(`כרטיס ${idx + 1} - אימייל`); }
      }
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
          });
          setOrderNumber(result.orderNumber);
          setReferralCode(result.referralCode);
          setStep(3);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
          toast({
            title: 'שגיאה',
            description: err.message || 'אירעה שגיאה בתהליך התשלום',
            variant: 'destructive',
          });
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

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <StickyHeader />
      <LoadingOverlay visible={paymentLoading} message={loadingMessage} />

      <div className="flex-1 overflow-y-auto flex flex-col">

      {/* Step Indicator */}
      <motion.div
        className="max-w-5xl mx-auto w-[95%] py-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full inline-flex items-center justify-center text-base font-bold leading-[0] pt-[1px] transition-all ${
                  s <= step
                    ? 'bg-cta text-cta-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${s < step ? 'bg-cta' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-[95%] pb-28">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
