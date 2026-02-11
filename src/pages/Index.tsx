import { useState, useMemo, useCallback } from 'react';
import StickyHeader from '@/components/StickyHeader';
import StickyBottomBar from '@/components/StickyBottomBar';
import TicketSelection from '@/components/TicketSelection';
import BuyerDetails from '@/components/BuyerDetails';
import OrderSummary from '@/components/OrderSummary';
import ThankYou from '@/components/ThankYou';
import { TICKETS, type TicketSelection as TicketSelectionType, type BuyerInfo, type GuestInfo, type TicketType } from '@/types/order';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const generateId = () => Math.random().toString(36).substring(2, 10).toUpperCase();

const Index = () => {
  const [step, setStep] = useState(1);
  const [selections, setSelections] = useState<TicketSelectionType[]>([]);
  const [buyer, setBuyer] = useState<BuyerInfo>({ email: '', firstName: '', lastName: '', phone: '' });
  const [guests, setGuests] = useState<GuestInfo[]>([]);
  const [useMyDetails, setUseMyDetails] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderNumber] = useState(() => generateId());
  const [referralCode] = useState(() => generateId());

  const totalTickets = useMemo(
    () => selections.reduce((sum, s) => sum + s.quantity, 0),
    [selections]
  );

  const totalPrice = useMemo(
    () =>
      selections.reduce((sum, s) => {
        const t = TICKETS.find((ticket) => ticket.type === s.type);
        return sum + (t?.price || 0) * s.quantity;
      }, 0),
    [selections]
  );

  const syncGuests = useCallback(
    (ticketCount: number) => {
      const needed = Math.max(0, ticketCount - 1);
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
    if (totalTickets === 0) {
      toast({ title: 'יש לבחור לפחות כרטיס אחד', variant: 'destructive' });
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!buyer.email.trim()) newErrors.email = 'שדה חובה';
    else if (!emailRegex.test(buyer.email)) newErrors.email = 'אימייל לא תקין';

    if (!buyer.firstName.trim()) newErrors.firstName = 'שדה חובה';
    if (!buyer.lastName.trim()) newErrors.lastName = 'שדה חובה';
    if (!buyer.phone.trim()) newErrors.phone = 'שדה חובה';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
    } else if (step === 3) {
      toast({ title: 'התשלום לא מחובר כרגע', description: 'זהו דמו בלבד — מעבר לדף תודה.' });
      setStep(4);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const steps = [1, 2, 3, 4];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StickyHeader />

      {/* Step Indicator */}
      <motion.div
        className="max-w-4xl mx-auto w-full px-4 py-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s <= step
                    ? 'bg-cta text-cta-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${s < step ? 'bg-cta' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pb-28">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TicketSelection selections={selections} onChange={handleSelectionsChange} onBuyTicket={handleBuyTicket} />
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
              />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <OrderSummary selections={selections} />
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <ThankYou orderNumber={orderNumber} referralCode={referralCode} selections={selections} />
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
  );
};

export default Index;
