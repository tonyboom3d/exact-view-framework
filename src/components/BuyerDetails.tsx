import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';
import { TICKETS, type TicketSelection } from '@/types/order';
import type { BuyerInfo, GuestInfo } from '@/types/order';
import { motion, AnimatePresence } from 'framer-motion';

interface BuyerDetailsProps {
  buyer: BuyerInfo;
  onBuyerChange: (buyer: BuyerInfo) => void;
  guests: GuestInfo[];
  onGuestsChange: (guests: GuestInfo[]) => void;
  useMyDetails: boolean;
  onUseMyDetailsChange: (v: boolean) => void;
  totalTickets: number;
  errors: Record<string, string>;
  selections: TicketSelection[];
}

interface FlatTicket {
  index: number;
  ticketName: string;
  ticketNumber: number;
}

const BuyerDetails = ({
  buyer,
  onBuyerChange,
  guests,
  onGuestsChange,
  useMyDetails,
  onUseMyDetailsChange,
  totalTickets,
  errors,
  selections,
}: BuyerDetailsProps) => {
  // Flatten selections into individual tickets
  const flatTickets = useMemo<FlatTicket[]>(() => {
    const result: FlatTicket[] = [];
    let globalIndex = 0;
    for (const sel of selections) {
      const ticketInfo = TICKETS.find((t) => t.type === sel.type);
      for (let i = 0; i < sel.quantity; i++) {
        result.push({
          index: globalIndex,
          ticketName: ticketInfo?.name || sel.type,
          ticketNumber: i + 1,
        });
        globalIndex++;
      }
    }
    return result;
  }, [selections]);

  const [openTicketIndex, setOpenTicketIndex] = useState(0);
  const [showPayer, setShowPayer] = useState(false);
  const [showCompany, setShowCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const phoneRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Ensure guests array matches totalTickets
  useEffect(() => {
    if (guests.length < totalTickets) {
      const newGuests = [...guests];
      while (newGuests.length < totalTickets) {
        newGuests.push({ firstName: '', lastName: '', phone: '' });
      }
      onGuestsChange(newGuests);
    }
  }, [totalTickets, guests, onGuestsChange]);

  const updateGuest = (index: number, field: keyof GuestInfo, value: string) => {
    const updated = [...guests];
    if (!updated[index]) updated[index] = { firstName: '', lastName: '', phone: '' };
    updated[index] = { ...updated[index], [field]: value };
    onGuestsChange(updated);
  };

  const isTicketComplete = (idx: number) => {
    const guest = guests[idx];
    if (!guest) return false;
    return guest.firstName.trim() !== '' && guest.lastName.trim() !== '' && guest.phone.trim() !== '';
  };

  const goToNextTicket = (currentIdx: number) => {
    if (currentIdx < flatTickets.length - 1) {
      setOpenTicketIndex(currentIdx + 1);
    }
  };

  const toggleTicket = (idx: number) => {
    // Only allow opening a ticket if all previous tickets are complete
    if (idx > 0 && !isTicketComplete(idx - 1)) return;
    // Allow opening any ticket before current too
    for (let i = 0; i < idx; i++) {
      if (!isTicketComplete(i)) return;
    }
    setOpenTicketIndex((prev) => (prev === idx ? -1 : idx));
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-foreground">פרטי המשתתפים</h2>
        <p className="text-sm text-muted-foreground mt-1">נא למלא את הפרטים לכל כרטיס</p>
      </div>

      {/* Payer checkbox */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Checkbox
          id="showPayer"
          checked={showPayer}
          onCheckedChange={(v) => setShowPayer(v as boolean)}
        />
        <Label htmlFor="showPayer" className="text-sm cursor-pointer font-medium">
          פרטי המשלם שונים מפרטי המשתתף
        </Label>
      </div>

      {/* Payer details section */}
      <AnimatePresence>
        {showPayer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
              <h3 className="text-base font-bold text-foreground">פרטי המשלם</h3>
              <div>
                <Label className="text-sm font-medium">אימייל *</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={buyer.email}
                  onChange={(e) => onBuyerChange({ ...buyer, email: e.target.value })}
                  className={`mt-1 text-right ${errors.email ? 'border-destructive' : ''}`}
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">שם פרטי *</Label>
                  <Input
                    placeholder="ישראל"
                    value={buyer.firstName}
                    onChange={(e) => onBuyerChange({ ...buyer, firstName: e.target.value })}
                    className={`mt-1 text-right placeholder:text-right ${errors.firstName ? 'border-destructive' : ''}`}
                  />
                  {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium">שם משפחה *</Label>
                  <Input
                    placeholder="ישראלי"
                    value={buyer.lastName}
                    onChange={(e) => onBuyerChange({ ...buyer, lastName: e.target.value })}
                    className={`mt-1 text-right placeholder:text-right ${errors.lastName ? 'border-destructive' : ''}`}
                  />
                  {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">טלפון *</Label>
                <Input
                  type="tel"
                  placeholder="050-1234567"
                  value={buyer.phone}
                  onChange={(e) => onBuyerChange({ ...buyer, phone: e.target.value })}
                  className={`mt-1 text-right ${errors.phone ? 'border-destructive' : ''}`}
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>

              {/* Company name checkbox */}
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="showCompany"
                  checked={showCompany}
                  onCheckedChange={(v) => setShowCompany(v as boolean)}
                />
                <Label htmlFor="showCompany" className="text-sm cursor-pointer">
                  הוספת שם חברה לחשבונית
                </Label>
              </div>

              <AnimatePresence>
                {showCompany && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div>
                      <Label className="text-sm font-medium">שם חברה *</Label>
                      <Input
                        placeholder="שם החברה"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="mt-1 text-right placeholder:text-right"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket sections */}
      <div className="space-y-3">
        {flatTickets.map((ticket) => {
          const isOpen = openTicketIndex === ticket.index;
          const guest = guests[ticket.index];
          const canOpen = ticket.index === 0 || isTicketComplete(ticket.index - 1);
          const allPreviousComplete = (() => {
            for (let i = 0; i < ticket.index; i++) {
              if (!isTicketComplete(i)) return false;
            }
            return true;
          })();

          return (
            <div
              key={ticket.index}
              className={`rounded-xl border bg-card overflow-hidden transition-shadow ${
                !allPreviousComplete ? 'border-border/50 opacity-50' : 'border-border'
              }`}
            >
              {/* Header */}
              <button
                type="button"
                onClick={() => allPreviousComplete && toggleTicket(ticket.index)}
                className={`w-full flex items-center justify-between p-4 text-right ${
                  !allPreviousComplete ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
                disabled={!allPreviousComplete}
              >
                <span className="text-sm font-bold text-foreground">
                  כרטיס {ticket.ticketName} #{ticket.ticketNumber}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Fields */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium">שם פרטי *</Label>
                          <Input
                            placeholder="שם פרטי"
                            value={guest?.firstName || ''}
                            onChange={(e) => updateGuest(ticket.index, 'firstName', e.target.value)}
                            className="mt-1 text-right placeholder:text-right"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">שם משפחה *</Label>
                          <Input
                            placeholder="שם משפחה"
                            value={guest?.lastName || ''}
                            onChange={(e) => updateGuest(ticket.index, 'lastName', e.target.value)}
                            className="mt-1 text-right placeholder:text-right"
                          />
                        </div>
                      </div>
                      {ticket.index === 0 && (
                        <div>
                          <Label className="text-xs font-medium">אימייל *</Label>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            value={guest?.email || ''}
                            onChange={(e) => updateGuest(ticket.index, 'email', e.target.value)}
                            className="mt-1 text-right"
                            dir="ltr"
                            style={{ textAlign: 'right' }}
                          />
                        </div>
                      )}
                      <div>
                        <Label className="text-xs font-medium">טלפון *</Label>
                        <Input
                          type="tel"
                          placeholder="050-1234567"
                          value={guest?.phone || ''}
                          onChange={(e) => updateGuest(ticket.index, 'phone', e.target.value)}
                          className="mt-1 text-right"
                          dir="ltr"
                          style={{ textAlign: 'right' }}
                          ref={(el) => { phoneRefs.current[ticket.index] = el; }}
                        />
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          📲 שילחו לוואטסאפ את הכרטיס
                        </p>
                      </div>
                      {/* Next ticket button */}
                      {ticket.index < flatTickets.length - 1 && (
                        <button
                          type="button"
                          disabled={!isTicketComplete(ticket.index)}
                          onClick={() => goToNextTicket(ticket.index)}
                          className={`w-full mt-2 h-12 rounded-xl text-base font-bold transition-all shadow-lg ${
                            isTicketComplete(ticket.index)
                              ? 'bg-primary text-primary-foreground hover:opacity-90'
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                          }`}
                        >
                          → מילוי הכרטיס הבא
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BuyerDetails;
