import { useState, useEffect } from 'react';
import { Check, Calendar, ChevronDown, Mail, Facebook, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TicketSelection, TicketInfo, GuestInfo, BuyerInfo } from '@/types/order';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface ThankYouProps {
  orderNumber: string;
  referralCode: string;
  selections: TicketSelection[];
  guests: GuestInfo[];
  buyer: BuyerInfo;
  showPayer: boolean;
  tickets: TicketInfo[];
  paymentStatus?: 'Successful' | 'Pending' | null;
}

const ThankYou = ({ orderNumber, referralCode, selections, guests, buyer, showPayer, tickets, paymentStatus }: ThankYouProps) => {
  const [showDetails, setShowDetails] = useState(false);

  // Only show confetti when payment is successful (not pending)
  useEffect(() => {
    if (paymentStatus === 'Pending') return;
    
    const duration = 600;
    const end = Date.now() + duration;
    const fire = (angle: number, origin: { x: number; y: number }) => {
      confetti({ particleCount: 60, angle, spread: 55, origin, ticks: 150 });
    };
    const interval = setInterval(() => {
      if (Date.now() > end) return clearInterval(interval);
      fire(60, { x: 0, y: 0.5 });
      fire(120, { x: 1, y: 0.5 });
    }, 150);
    return () => clearInterval(interval);
  }, [paymentStatus]);

  const shareLink = 'https://www.tonyrobbins.co.il/';
  const shareText = `נרשמתי לסדנת UPW REMOTE של טוני רובינס בישראל 🔥\n\n4 ימים של כלים, אסטרטגיות ושינוי אמיתי – 12-15 במרץ 2026.\n\n${shareLink}\n\nמי שבעניין – זה הזמן.`;

  const activeSelections = selections.filter(s => s.quantity > 0);
  const totalTickets = activeSelections.reduce((sum, s) => sum + s.quantity, 0);
  const totalPrice = activeSelections.reduce((sum, s) => {
    const ticket = tickets.find(t => t.type === s.type);
    return sum + (ticket?.price || 0) * s.quantity;
  }, 0);

  const eventTitle = 'Tony Robbins — Unleash the Power Within REMOTE';
  const eventLocation = 'מלון פרימה מילניום התדהר 2 רעננה';
  const eventDescription = 'Tony Robbins UPW Event';
  // March 12, 2026 16:00 to March 16, 2026 02:00 (Israel local time, UTC+2)
  const calendarStartUTC = '20260312T140000Z';
  const calendarEndUTC = '20260316T000000Z';

  const addToGoogleCalendar = () => {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventTitle,
      dates: `${calendarStartUTC}/${calendarEndUTC}`,
      location: eventLocation,
      details: eventDescription,
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
  };

  const addToAppleCalendar = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${calendarStartUTC}`,
      `DTEND:${calendarEndUTC}`,
      `SUMMARY:${eventTitle}`,
      `LOCATION:${eventLocation}`,
      `DESCRIPTION:${eventDescription}`,
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

  const addToMicrosoftCalendar = () => {
    const params = new URLSearchParams({
      subject: eventTitle,
      startdt: '2026-03-12T16:00:00',
      enddt: '2026-03-16T02:00:00',
      location: eventLocation,
      body: eventDescription,
      path: '/calendar/action/compose',
      rru: 'addevent',
    });
    window.open(`https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`, '_blank');
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`, '_blank');
  };

  const shareX = () => {
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareInstagram = () => {
    // Instagram doesn't have a direct share URL, copy text and notify user
    navigator.clipboard.writeText(shareText).then(() => {
      toast({ title: 'הטקסט הועתק! הדביקו אותו בסטורי או בהודעה באינסטגרם' });
    }).catch(() => {
      toast({ title: 'לא ניתן להעתיק', variant: 'destructive' });
    });
  };

  const shareEmail = () => {
    const subject = encodeURIComponent('הזמנה ל-Tony Robbins UPW');
    const body = encodeURIComponent(shareText);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const ShareButtons = () => (
    <div className="grid grid-cols-2 gap-2">
      <Button
        onClick={shareWhatsApp}
        className="gap-1.5 text-[14px] h-10 font-medium bg-[#25D366] hover:bg-[#1da851] text-white border-0"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.613-1.46A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.17 0-4.207-.69-5.87-1.882l-.42-.312-2.735.866.725-2.652-.283-.45A9.72 9.72 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z"/></svg>
        WhatsApp
      </Button>
      <Button
        onClick={shareFacebook}
        className="gap-1.5 text-[14px] h-10 font-medium bg-[#1877F2] hover:bg-[#1565c0] text-white border-0"
      >
        <Facebook className="w-4 h-4" />
        Facebook
      </Button>
      <Button
        onClick={shareX}
        className="gap-1.5 text-[14px] h-10 font-medium bg-[#000000] hover:bg-[#333333] text-white border-0"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        X
      </Button>
      <Button
        onClick={shareInstagram}
        className="gap-1.5 text-[14px] h-10 font-medium text-white border-0"
        style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
        Instagram
      </Button>
      <Button
        onClick={shareEmail}
        className="gap-1.5 text-[14px] h-10 font-medium bg-[#6B7280] hover:bg-[#4B5563] text-white border-0 col-span-2"
      >
        <Mail className="w-4 h-4" />
        שלח במייל
      </Button>
    </div>
  );

  // If payment is pending, show loading state
  if (paymentStatus === 'Pending') {
    return (
      <div className="space-y-6 text-center py-12">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
        <div className="space-y-3">
          <h2 className="text-[24px] font-bold text-foreground">התשלום בבדיקה</h2>
          <p className="text-[16px] text-muted-foreground leading-relaxed max-w-md mx-auto">
            התשלום עדיין בבדיקה מול חברת האשראי.
            <br />
            לאחר השלמת התשלום הכרטיסים ישלחו אליך למייל.
          </p>
          <p className="text-[14px] text-muted-foreground/70 mt-4">
            מספר הזמנה: {orderNumber}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-center">
      {/* Success header */}
      <div className="w-14 h-14 bg-[hsl(var(--success))]/10 rounded-full flex items-center justify-center mx-auto">
        <Check className="w-7 h-7 text-[hsl(var(--success))]" />
      </div>
      <div>
        <h2 className="text-[28px] font-bold text-foreground">ההזמנה התקבלה!</h2>
        <p className="text-[17px] text-muted-foreground mt-1">מספר הזמנה: {orderNumber}</p>
      </div>

      {/* Calendar buttons */}
      <div className="flex gap-2 justify-center flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={addToGoogleCalendar}
          className="gap-1.5 text-[14px]"
        >
          <Calendar className="w-3.5 h-3.5" />
          Google
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={addToAppleCalendar}
          className="gap-1.5 text-[14px]"
        >
          <Calendar className="w-3.5 h-3.5" />
          Apple
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={addToMicrosoftCalendar}
          className="gap-1.5 text-[14px]"
        >
          <Calendar className="w-3.5 h-3.5" />
          Outlook
        </Button>
      </div>

      {/* Event details */}
      <div className="text-center text-[15px] text-muted-foreground space-y-0.5">
        <p className="font-medium">4 ימים, 12-15 במרץ 2026</p>
        <p>מלון פרימה מילניום, רעננה</p>
      </div>

      {/* Order summary */}
      <div className="rounded-xl border border-border bg-background p-4 text-right space-y-3">
        <p className="text-[17px] font-bold text-foreground">סיכום הזמנה</p>
        
        <div className="space-y-1.5">
          {activeSelections.map((s) => {
            const ticket = tickets.find((t) => t.type === s.type);
            if (!ticket) return null;
            return (
               <div key={s.type} className="flex items-center justify-between text-[16px]">
                 <span className="text-muted-foreground">{ticket.name} x{s.quantity}</span>
                <span className="font-medium text-foreground">₪{(ticket.price * s.quantity).toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-2 flex items-center justify-between">
            <span className="text-[17px] font-bold text-foreground">סה״כ ({totalTickets} כרטיסים)</span>
            <span className="text-[21px] font-extrabold text-foreground">₪{totalPrice.toLocaleString()}</span>
        </div>

        {/* Expandable ticket details */}
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 text-[14px] text-primary font-medium cursor-pointer mx-auto"
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
                    const ticket = tickets.find(t => t.type === sel.type);
                    for (let i = 0; i < sel.quantity; i++) {
                      if (counter === flatIndex) {
                        ticketLabel = `${ticket?.name} #${i + 1}`;
                      }
                      counter++;
                    }
                  }

                  return (
                    <div key={idx} className="bg-muted/30 rounded-lg p-3 space-y-1">
                       <p className="text-[14px] font-bold text-foreground">{ticketLabel}</p>
                       <p className="text-[14px] text-muted-foreground">{guest.firstName} {guest.lastName}</p>
                       <p className="text-[14px] text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>{guest.phone}</p>
                       {guest.email && <p className="text-[14px] text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>{guest.email}</p>}
                    </div>
                  );
                })}

                {showPayer && (buyer.firstName || buyer.lastName) && (
                  <div className="bg-primary/5 rounded-lg p-3 space-y-1 border border-primary/20">
                     <p className="text-[14px] font-bold text-foreground">פרטי המשלם</p>
                     <p className="text-[14px] text-muted-foreground">{buyer.firstName} {buyer.lastName}</p>
                     <p className="text-[14px] text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>{buyer.phone}</p>
                     {buyer.email && <p className="text-[14px] text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>{buyer.email}</p>}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Share section */}
      <div className="rounded-xl border border-border bg-background p-5 space-y-3">
        <p className="text-[17px] font-bold text-foreground">שתפו חברים שגם ירצו להצטרף</p>
        <ShareButtons />
      </div>
    </div>
  );
};

export default ThankYou;