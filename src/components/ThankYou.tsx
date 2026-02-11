import { useState } from 'react';
import { Check, Copy, Share2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TICKETS, type TicketSelection } from '@/types/order';
import { toast } from '@/hooks/use-toast';

interface ThankYouProps {
  orderNumber: string;
  referralCode: string;
  selections: TicketSelection[];
}

const ThankYou = ({ orderNumber, referralCode, selections }: ThankYouProps) => {
  const [copied, setCopied] = useState(false);

  const referralLink = `https://upw-tickets.com/ref/${referralCode}`;

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

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `הי! רכשתי כרטיסים ל-Tony Robbins UPW 🔥\nקנה דרך הקישור שלי וקבל הנחה:\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 bg-[hsl(var(--success))]/10 rounded-full flex items-center justify-center mx-auto">
        <Check className="w-8 h-8 text-[hsl(var(--success))]" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground">ההזמנה התקבלה!</h2>
        <p className="text-sm text-muted-foreground mt-1">מספר הזמנה: {orderNumber}</p>
      </div>

      <div className="rounded-xl border border-border p-4 text-right space-y-2">
        <p className="text-sm font-medium text-foreground">פרטי האירוע</p>
        <p className="text-xs text-muted-foreground">Tony Robbins — Unleash the Power Within</p>
        <p className="text-xs text-muted-foreground">15-18 מרץ 2025 | פלורידה, ארה"ב</p>
        <div className="border-t border-border pt-2 mt-2">
          {selections.filter(s => s.quantity > 0).map((s) => {
            const ticket = TICKETS.find((t) => t.type === s.type);
            return ticket ? (
              <p key={s.type} className="text-xs text-muted-foreground">
                {ticket.name} x{s.quantity}
              </p>
            ) : null;
          })}
        </div>
      </div>

      {/* Ambassador System */}
      <div className="rounded-xl border-2 border-dashed border-[hsl(var(--cta))]/30 bg-[hsl(var(--cta))]/5 p-5 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Gift className="w-5 h-5 text-[hsl(var(--cta))]" />
          <p className="font-bold text-foreground">מערכת שגרירים</p>
        </div>
        <p className="text-sm text-muted-foreground">
          כל חבר שרוכש דרכך — אתה מקבל <span className="font-bold text-foreground">₪200 זיכוי</span>
        </p>

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

        <Button
          onClick={shareWhatsApp}
          className="w-full bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white font-bold rounded-xl h-11"
        >
          <Share2 className="w-4 h-4 ml-2" />
          שתף בוואטסאפ
        </Button>
      </div>
    </div>
  );
};

export default ThankYou;
