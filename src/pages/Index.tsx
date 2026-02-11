import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import PaymentDialog from '@/components/PaymentDialog';
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
  const [showPayment, setShowPayment] = useState(false);

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
    // If no ticket selected yet, default to 1 of this type
    if (selections.length === 0 || selections[0].type !== type) {
      handleSelectionsChange([{ type, quantity: 1 }]);
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
      setShowPayment(true);
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePaymentConfirm = () => {
    setShowPayment(false);
    toast({ title: 'התשלום בוצע בהצלחה!', description: 'זהו דמו בלבד — מעבר לדף תודה.' });
    setStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const steps = [1, 2, 3, 4];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <StickyHeader />

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
                selections={selections}
              />
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 h-12 text-base font-bold rounded-xl"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 h-12 text-base font-bold bg-cta hover:bg-cta/90 text-cta-foreground rounded-xl shadow-lg"
                >
                  מעבר לתשלום
                </Button>
              </div>
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
      <PaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        onConfirm={handlePaymentConfirm}
        totalPrice={totalPrice}
      />
      </div>
    </div>
  );
};

export default Index;
