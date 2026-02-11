import { useState } from 'react';
import { Minus, Plus, ZoomIn, Ban, User, Users, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { TICKETS, type TicketSelection as TicketSelectionType, type TicketType } from '@/types/order';
import { motion } from 'framer-motion';

interface TicketSelectionProps {
  selections: TicketSelectionType[];
  onChange: (selections: TicketSelectionType[]) => void;
  onBuyTicket: (type: TicketType) => void;
}

const TicketSelection = ({ selections, onChange, onBuyTicket }: TicketSelectionProps) => {
  const getQuantity = (type: TicketType) =>
    selections.find((s) => s.type === type)?.quantity || 0;

  const updateQuantity = (type: TicketType, delta: number) => {
    const current = getQuantity(type);
    const newQty = Math.max(1, Math.min(10, current + delta));
    // Only one ticket type at a time — clear others
    onChange([{ type, quantity: newQty }]);
  };

  const setTicketType = (type: TicketType) => {
    const current = getQuantity(type);
    if (current === 0) {
      // Switch to this type, start at 1
      onChange([{ type, quantity: 1 }]);
    }
  };

  const activeType = selections.length > 0 ? selections[0].type : null;

  return (
    <div className="space-y-4">
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl font-bold text-foreground">בחר את הכרטיסים שלך</h2>
        <p className="text-sm text-muted-foreground mt-1">בחר את סוג הכרטיס והכמות הרצויה</p>
      </motion.div>

      <div className="space-y-3">
        {TICKETS.map((ticket, index) => {
          const qty = getQuantity(ticket.type);
          const isActive = activeType === ticket.type;
          return (
            <motion.div
              key={ticket.type}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.12 }}
              className={`relative rounded-xl border p-4 transition-all ${
                ticket.soldOut
                  ? 'opacity-50 border-border bg-muted/50'
                  : isActive
                  ? 'border-cta/40 bg-background shadow-md ring-1 ring-cta/20'
                  : 'border-border bg-background hover:border-foreground/10 hover:shadow-sm cursor-pointer'
              }`}
              onClick={() => !ticket.soldOut && !isActive && setTicketType(ticket.type)}
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
                      <span className="text-[10px] font-bold text-cta bg-cta/10 px-2 py-0.5 rounded-full">
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

              {!ticket.soldOut && isActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={(e) => { e.stopPropagation(); updateQuantity(ticket.type, -1); }}
                        disabled={qty <= 1}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <div className="flex items-center gap-1.5">
                        {qty > 1 ? (
                          <Users className="w-4 h-4 text-cta" />
                        ) : (
                          <User className="w-4 h-4 text-cta" />
                        )}
                        <span className="w-6 text-center font-bold text-foreground">{qty}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={(e) => { e.stopPropagation(); updateQuantity(ticket.type, 1); }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <Button
                      onClick={(e) => { e.stopPropagation(); onBuyTicket(ticket.type); }}
                      className="h-10 px-6 font-bold bg-cta hover:bg-cta/90 text-cta-foreground rounded-xl shadow-lg"
                    >
                      <ShoppingCart className="w-4 h-4 ml-2" />
                      רכישה — ₪{(ticket.price * qty).toLocaleString()}
                    </Button>
                  </div>
                </motion.div>
              )}

              {!ticket.soldOut && (
                <motion.div
                  className="mt-2"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.12 }}
                  style={{ transformOrigin: 'right' }}
                >
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-cta h-1.5 rounded-full transition-all"
                      style={{ width: `${ticket.fomoPercent}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Seating Map */}
      <Dialog>
        <DialogTrigger asChild>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="w-full mt-4 rounded-xl border border-dashed border-border p-6 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">מפת הושבה — לחץ להגדלה</span>
            <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">
              STAGE LAYOUT PLACEHOLDER
            </div>
          </motion.button>
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
