import { Lock, ShieldCheck } from 'lucide-react';
import { TICKETS, type TicketSelection } from '@/types/order';

interface OrderSummaryProps {
  selections: TicketSelection[];
}

const OrderSummary = ({ selections }: OrderSummaryProps) => {
  const activeSelections = selections.filter((s) => s.quantity > 0);
  const total = activeSelections.reduce((sum, s) => {
    const ticket = TICKETS.find((t) => t.type === s.type);
    return sum + (ticket?.price || 0) * s.quantity;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground">סיכום הזמנה</h2>
        <p className="text-sm text-muted-foreground mt-1">בדוק את הפרטים לפני התשלום</p>
      </div>

      <div className="rounded-xl border border-border bg-background p-4 space-y-4">
        {activeSelections.map((s) => {
          const ticket = TICKETS.find((t) => t.type === s.type);
          if (!ticket) return null;
          return (
            <div key={s.type} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{ticket.name}</p>
                <p className="text-xs text-muted-foreground">x{s.quantity}</p>
              </div>
              <p className="font-bold text-foreground">₪{(ticket.price * s.quantity).toLocaleString()}</p>
            </div>
          );
        })}

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-extrabold text-foreground">סה״כ לתשלום</span>
            <span className="text-xl font-extrabold text-foreground">₪{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>תשלום מאובטח</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>הצפנת SSL</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
