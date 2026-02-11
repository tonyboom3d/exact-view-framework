import { useState } from 'react';
import { Check, Copy, Gift, Calendar, ChevronDown, Mail, Facebook, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TICKETS, type TicketSelection } from '@/types/order';
import type { GuestInfo, BuyerInfo } from '@/types/order';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface ThankYouProps {
  orderNumber: string;
  referralCode: string;
  selections: TicketSelection[];
  guests: GuestInfo[];
  buyer: BuyerInfo;
  showPayer: boolean;
}

const ThankYou = ({ orderNumber, referralCode, selections, guests, buyer, showPayer }: ThankYouProps) => {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const referralLink = `https://upw-tickets.com/ref/${referralCode}`;
  const shareText = `הי! רכשתי כרטיסים ל-Tony Robbins UPW 🔥\nקנה דרך הקישור שלי וקבל 200 ₪ הנחה:\n${referralLink}`;

  const activeSelections = selections.filter(s => s.quantity > 0);
  const totalTickets = activeSelections.reduce((sum, s) => sum + s.quantity, 0);
  const totalPrice = activeSelections.reduce((sum, s) => {
    const ticket = TICKETS.find(t => t.type === s.type);
    return sum + (ticket?.price || 0) * s.quantity;
  }, 0);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: 'הקישור הועתק!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'לא ניתן להעתיק', variant: 'destructive' });
    }
  };

  const addToGoogleCalendar = () => {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Tony Robbins — Unleash the Power Within',
      dates: '20250315T090000Z/20250318T210000Z',
      location: 'Florida, USA',
      details: 'Tony Robbins UPW Event',
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
  };

  const addToAppleCalendar = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART:20250315T090000Z',
      'DTEND:20250318T210000Z',
      'SUMMARY:Tony Robbins — Unleash the Power Within',
      'LOCATION:Florida, USA',
      'DESCRIPTION:Tony Robbins UPW Event',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upw-event.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent('הזמנה ל-Tony Robbins UPW');
    const body = encodeURIComponent(shareText);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="space-y-5 text-center">
      {/* Success header */}
      <div className="w-14 h-14 bg-[hsl(var(--success))]/10 rounded-full flex items-center justify-center mx-auto">
        <Check className="w-7 h-7 text-[hsl(var(--success))]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">ההזמנה התקבלה!</h2>
        <p className="text-sm text-muted-foreground mt-1">מספר הזמנה: {orderNumber}</p>
      </div>

      {/* Calendar buttons */}
      <div className="flex gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={addToGoogleCalendar}
          className="gap-1.5 text-xs"
        >
          <Calendar className="w-3.5 h-3.5" />
          Google Calendar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={addToAppleCalendar}
          className="gap-1.5 text-xs"
        >
          <Calendar className="w-3.5 h-3.5" />
          Apple Calendar
        </Button>
      </div>

      {/* Order summary */}
      <div className="rounded-xl border border-border bg-background p-4 text-right space-y-3">
        <p className="text-sm font-bold text-foreground">סיכום הזמנה</p>
        
        <div className="space-y-1.5">
          {activeSelections.map((s) => {
            const ticket = TICKETS.find((t) => t.type === s.type);
            if (!ticket) return null;
            return (
              <div key={s.type} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{ticket.name} x{s.quantity}</span>
                <span className="font-medium text-foreground">₪{(ticket.price * s.quantity).toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">סה״כ ({totalTickets} כרטיסים)</span>
          <span className="text-base font-extrabold text-foreground">₪{totalPrice.toLocaleString()}</span>
        </div>

        {/* Expandable ticket details */}
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 text-xs text-primary font-medium cursor-pointer mx-auto"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          {showDetails ? 'הסתר פרטים' : 'הצג פרטי כרטיסים'}
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-2 border-t border-border">
                {guests.slice(0, totalTickets).map((guest, idx) => {
                  const flatIndex = idx;
                  let ticketLabel = '';
                  let counter = 0;
                  for (const sel of activeSelections) {
                    const ticket = TICKETS.find(t => t.type === sel.type);
                    for (let i = 0; i < sel.quantity; i++) {
                      if (counter === flatIndex) {
                        ticketLabel = `${ticket?.name} #${i + 1}`;
                      }
                      counter++;
                    }
                  }

                  return (
                    <div key={idx} className="bg-muted/30 rounded-lg p-3 space-y-1">
                      <p className="text-xs font-bold text-foreground">{ticketLabel}</p>
                      <p className="text-xs text-muted-foreground">{guest.firstName} {guest.lastName}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>{guest.phone}</p>
                      {guest.email && <p className="text-xs text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>{guest.email}</p>}
                    </div>
                  );
                })}

                {showPayer && (buyer.firstName || buyer.lastName) && (
                  <div className="bg-primary/5 rounded-lg p-3 space-y-1 border border-primary/20">
                    <p className="text-xs font-bold text-foreground">פרטי המשלם</p>
                    <p className="text-xs text-muted-foreground">{buyer.firstName} {buyer.lastName}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>{buyer.phone}</p>
                    {buyer.email && <p className="text-xs text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>{buyer.email}</p>}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Win-Win Ambassador Section */}
      <div className="rounded-xl border-2 border-dashed border-[hsl(var(--cta))]/30 bg-[hsl(var(--cta))]/5 p-5 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Gift className="w-5 h-5 text-[hsl(var(--cta))]" />
          <p className="text-lg font-extrabold text-foreground">Win - Win</p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          שתפו את הקישור לחברים שלכם ותרוויחו <span className="font-bold text-foreground">₪200</span> על כל הרשמה
          <br />
          ובנוסף <span className="font-bold text-foreground">₪200 הנחה</span> לחבר שלכם.
        </p>

        {/* Referral link */}
        <div className="bg-background rounded-lg p-3 flex items-center gap-2" dir="ltr">
          <input
            readOnly
            value={referralLink}
            className="flex-1 text-xs bg-transparent outline-none text-muted-foreground"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyLink}>
            {copied ? <Check className="w-4 h-4 text-[hsl(var(--success))]" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={copyLink}
            variant="outline"
            className="gap-1.5 text-xs h-10 font-medium"
          >
            <Copy className="w-3.5 h-3.5" />
            העתק קישור
          </Button>
          <Button
            onClick={shareWhatsApp}
            className="gap-1.5 text-xs h-10 font-medium bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.613-1.46A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.17 0-4.207-.69-5.87-1.882l-.42-.312-2.735.866.725-2.652-.283-.45A9.72 9.72 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z"/></svg>
            WhatsApp
          </Button>
          <Button
            onClick={shareFacebook}
            variant="outline"
            className="gap-1.5 text-xs h-10 font-medium"
          >
            <Facebook className="w-3.5 h-3.5" />
            Facebook
          </Button>
          <Button
            onClick={shareTwitter}
            variant="outline"
            className="gap-1.5 text-xs h-10 font-medium"
          >
            <Twitter className="w-3.5 h-3.5" />
            Twitter
          </Button>
          <Button
            onClick={shareEmail}
            variant="outline"
            className="gap-1.5 text-xs h-10 font-medium col-span-2"
          >
            <Mail className="w-3.5 h-3.5" />
            שלח במייל
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;