import { useState } from 'react';
import { Minus, Plus, ZoomIn, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { TICKETS, type TicketSelection as TicketSelectionType, type TicketType } from '@/types/order';

interface TicketSelectionProps {
  selections: TicketSelectionType[];
  onChange: (selections: TicketSelectionType[]) => void;
}

const TicketSelection = ({ selections, onChange }: TicketSelectionProps) => {
  const getQuantity = (type: TicketType) =>
    selections.find((s) => s.type === type)?.quantity || 0;

  const updateQuantity = (type: TicketType, delta: number) => {
    const current = getQuantity(type);
    const newQty = Math.max(0, Math.min(10, current + delta));
    const filtered = selections.filter((s) => s.type !== type);
    if (newQty > 0) {
      onChange([...filtered, { type, quantity: newQty }]);
    } else {
      onChange(filtered);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground">בחר את הכרטיסים שלך</h2>
        <p className="text-sm text-muted-foreground mt-1">בחר את סוג הכרטיס והכמות הרצויה</p>
      </div>

      <div className="space-y-3">
        {TICKETS.map((ticket) => {
          const qty = getQuantity(ticket.type);
          return (
            <div
              key={ticket.type}
              className={`relative rounded-xl border p-4 transition-all ${
                ticket.soldOut
                  ? 'opacity-50 border-border bg-muted/50'
                  : qty > 0
                  ? 'border-foreground/20 bg-background shadow-md'
                  : 'border-border bg-background hover:border-foreground/10 hover:shadow-sm'
              }`}
            >
              {ticket.soldOut && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-destructive/90 text-destructive-foreground px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 -rotate-6 shadow-lg">
                    <Ban className="w-4 h-4" />
                    המלאי אזל
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-foreground">{ticket.name}</h3>
                    {!ticket.soldOut && (
                      <span className="text-[10px] font-bold text-[hsl(var(--fomo))] bg-[hsl(var(--fomo))]/10 px-2 py-0.5 rounded-full">
                        {ticket.fomoText}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{ticket.description}</p>
                </div>
                <div className="text-left mr-4">
                  <span className="text-lg font-extrabold text-foreground">₪{ticket.price.toLocaleString()}</span>
                </div>
              </div>

              {!ticket.soldOut && (
                <div className="flex items-center justify-end mt-3 gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => updateQuantity(ticket.type, -1)}
                    disabled={qty === 0}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <span className="w-6 text-center font-bold text-foreground">{qty}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => updateQuantity(ticket.type, 1)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {!ticket.soldOut && (
                <div className="mt-2">
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-[hsl(var(--fomo))] h-1.5 rounded-full transition-all"
                      style={{ width: `${ticket.fomoPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Seating Map */}
      <Dialog>
        <DialogTrigger asChild>
          <button className="w-full mt-4 rounded-xl border border-dashed border-border p-6 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer">
            <ZoomIn className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">מפת הושבה — לחץ להגדלה</span>
            <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">
              STAGE LAYOUT PLACEHOLDER
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <div className="w-full h-80 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            STAGE LAYOUT — FULL VIEW
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketSelection;
