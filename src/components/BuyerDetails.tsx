import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';
import type { TicketSelection, TicketInfo, BuyerInfo, GuestInfo } from '@/types/order';
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
  showPayer: boolean;
  onShowPayerChange: (v: boolean) => void;
  tickets: TicketInfo[];
  showCompany: boolean;
  onShowCompanyChange: (v: boolean) => void;
  companyName: string;
  onCompanyNameChange: (v: string) => void;
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
  showPayer,
  onShowPayerChange,
  tickets,
  showCompany,
  onShowCompanyChange,
  companyName,
  onCompanyNameChange,
}: BuyerDetailsProps) => {
  // Flatten selections into individual tickets
  const flatTickets = useMemo<FlatTicket[]>(() => {
    const result: FlatTicket[] = [];
    let globalIndex = 0;
    for (const sel of selections) {
      const ticketInfo = tickets.find((t) => t.type === sel.type);
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
        <h2 className="text-[27px] font-bold text-foreground">פרטי המשתתפים</h2>
        <p className="text-[18px] text-muted-foreground mt-1">נא למלא את הפרטים לכל כרטיס</p>
      </div>

      {/* Payer checkbox */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Checkbox
          id="showPayer"
          checked={showPayer}
          onCheckedChange={(v) => onShowPayerChange(v as boolean)}
        />
        <Label htmlFor="showPayer" className="text-[17px] cursor-pointer font-medium">
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
              <h3 className="text-[21px] font-bold text-foreground">פרטי המשלם</h3>
              <div>
                <Label className="text-[17px] font-medium">אימייל *</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={buyer.email}
                  onChange={(e) => onBuyerChange({ ...buyer, email: e.target.value })}
                  className={`mt-1 text-right ${errors.payer_email ? 'border-destructive' : ''}`}
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
                {errors.payer_email && <p className="text-sm text-destructive mt-1">{errors.payer_email}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[17px] font-medium">שם פרטי *</Label>
                  <Input
                    placeholder="ישראל"
                    value={buyer.firstName}
                    onChange={(e) => onBuyerChange({ ...buyer, firstName: e.target.value })}
                    className={`mt-1 text-right placeholder:text-right ${errors.payer_firstName ? 'border-destructive' : ''}`}
                  />
                  {errors.payer_firstName && <p className="text-sm text-destructive mt-1">{errors.payer_firstName}</p>}
                </div>
                <div>
                  <Label className="text-[17px] font-medium">שם משפחה *</Label>
                  <Input
                    placeholder="ישראלי"
                    value={buyer.lastName}
                    onChange={(e) => onBuyerChange({ ...buyer, lastName: e.target.value })}
                    className={`mt-1 text-right placeholder:text-right ${errors.payer_lastName ? 'border-destructive' : ''}`}
                  />
                  {errors.payer_lastName && <p className="text-sm text-destructive mt-1">{errors.payer_lastName}</p>}
                </div>
              </div>
              <div>
                <Label className="text-[17px] font-medium">טלפון *</Label>
                <Input
                  type="tel"
                  placeholder="050-1234567"
                  value={buyer.phone}
                  onChange={(e) => onBuyerChange({ ...buyer, phone: e.target.value })}
                  className={`mt-1 text-right ${errors.payer_phone ? 'border-destructive' : ''}`}
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
                {errors.payer_phone && <p className="text-sm text-destructive mt-1">{errors.payer_phone}</p>}
              </div>

              {/* Company name checkbox */}
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="showCompany"
                  checked={showCompany}
                  onCheckedChange={(v) => onShowCompanyChange(v as boolean)}
                />
                <Label htmlFor="showCompany" className="text-[17px] cursor-pointer">
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
                      <Label className="text-[17px] font-medium">שם חברה *</Label>
                      <Input
                        placeholder="שם החברה"
                        value={companyName}
                        onChange={(e) => onCompanyNameChange(e.target.value)}
                        className={`mt-1 text-right placeholder:text-right ${errors.payer_companyName ? 'border-destructive' : ''}`}
                      />
                      {errors.payer_companyName && <p className="text-sm text-destructive mt-1">{errors.payer_companyName}</p>}
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
                className={`w-full flex items-center justify-between p-3 text-right ${
                  !allPreviousComplete ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
                disabled={!allPreviousComplete}
              >
                <span className="text-[18px] font-bold text-foreground">
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
                    <div className="px-4 pb-1 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[15px] font-medium">שם פרטי *</Label>
                          <Input
                            placeholder="שם פרטי"
                            value={guest?.firstName || ''}
                            onChange={(e) => updateGuest(ticket.index, 'firstName', e.target.value)}
                            className={`mt-1 text-right placeholder:text-right ${errors[`guest_${ticket.index}_firstName`] ? 'border-destructive' : ''}`}
                          />
                          {errors[`guest_${ticket.index}_firstName`] && <p className="text-sm text-destructive mt-1">{errors[`guest_${ticket.index}_firstName`]}</p>}
                        </div>
                        <div>
                          <Label className="text-[15px] font-medium">שם משפחה *</Label>
                          <Input
                            placeholder="שם משפחה"
                            value={guest?.lastName || ''}
                            onChange={(e) => updateGuest(ticket.index, 'lastName', e.target.value)}
                            className={`mt-1 text-right placeholder:text-right ${errors[`guest_${ticket.index}_lastName`] ? 'border-destructive' : ''}`}
                          />
                          {errors[`guest_${ticket.index}_lastName`] && <p className="text-sm text-destructive mt-1">{errors[`guest_${ticket.index}_lastName`]}</p>}
                        </div>
                      </div>
                      {ticket.index === 0 && (
                        <div>
                          <Label className="text-[15px] font-medium">אימייל *</Label>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            value={guest?.email || ''}
                            onChange={(e) => updateGuest(ticket.index, 'email', e.target.value)}
                            className={`mt-1 text-right ${errors[`guest_${ticket.index}_email`] ? 'border-destructive' : ''}`}
                            dir="ltr"
                            style={{ textAlign: 'right' }}
                          />
                          {errors[`guest_${ticket.index}_email`] && <p className="text-sm text-destructive mt-1">{errors[`guest_${ticket.index}_email`]}</p>}
                        </div>
                      )}
                      <div>
                        <Label className="text-[15px] font-medium">טלפון *</Label>
                        <Input
                          type="tel"
                          placeholder="050-1234567"
                          value={guest?.phone || ''}
                          onChange={(e) => updateGuest(ticket.index, 'phone', e.target.value)}
                          className={`mt-1 text-right ${errors[`guest_${ticket.index}_phone`] ? 'border-destructive' : ''}`}
                          dir="ltr"
                          style={{ textAlign: 'right' }}
                          ref={(el) => { phoneRefs.current[ticket.index] = el; }}
                        />
                        {errors[`guest_${ticket.index}_phone`] && <p className="text-sm text-destructive mt-1">{errors[`guest_${ticket.index}_phone`]}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <Checkbox id={`whatsapp-${ticket.index}`} defaultChecked />
                          <Label htmlFor={`whatsapp-${ticket.index}`} className="text-[15px] text-muted-foreground cursor-pointer">
                            שילחו לוואטסאפ את הכרטיס
                          </Label>
                        </div>
                      </div>
                      {/* Next ticket button */}
                      {ticket.index < flatTickets.length - 1 && (
                        <div className="flex justify-start mt-2">
                          <button
                            type="button"
                            disabled={!isTicketComplete(ticket.index)}
                            onClick={() => goToNextTicket(ticket.index)}
                            className={`px-4 py-1.5 rounded-lg text-[17px] font-medium transition-all ${
                              isTicketComplete(ticket.index)
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                            }`}
                          >
                            מילוי הכרטיס הבא →
                          </button>
                        </div>
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
