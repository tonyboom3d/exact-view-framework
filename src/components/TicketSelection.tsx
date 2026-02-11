import { useState } from 'react';
import { Minus, Plus, Ban, User, Users, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TICKETS, type TicketSelection as TicketSelectionType, type TicketType } from '@/types/order';
import { motion } from 'framer-motion';
import SeatingMap from '@/components/SeatingMap';

interface TicketSelectionProps {
  selections: TicketSelectionType[];
  onChange: (selections: TicketSelectionType[]) => void;
  onBuyTicket: (type: TicketType) => void;
}

const TicketSelection = ({ selections, onChange, onBuyTicket }: TicketSelectionProps) => {
  const [hoveredTicket, setHoveredTicket] = useState<TicketType | null>(null);

  const getQuantity = (type: TicketType) =>
    selections.find((s) => s.type === type)?.quantity || 0;

  const updateQuantity = (type: TicketType, delta: number) => {
    const current = getQuantity(type);
    const newQty = Math.max(1, Math.min(10, current + delta));
    onChange([{ type, quantity: newQty }]);
  };

  const setTicketType = (type: TicketType) => {
    const current = getQuantity(type);
    if (current === 0) {
      onChange([{ type, quantity: 1 }]);
    }
  };

  const activeType = selections.length > 0 ? selections[0].type : null;

  const handleMapHover = (type: TicketType | null) => {
    setHoveredTicket(type);
  };

  return (
    <div className="space-y-5">
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-foreground">בחר את הכרטיסים שלך</h2>
        <p className="text-base text-muted-foreground mt-1">בחר את סוג הכרטיס והכמות הרצויה</p>
      </motion.div>

      <div className="space-y-4">
        {TICKETS.map((ticket, index) => {
          const qty = activeType === ticket.type ? getQuantity(ticket.type) : 1;
          const isActive = activeType === ticket.type;
          const isHoveredFromMap = hoveredTicket === ticket.type;
          return (
            <motion.div
              key={ticket.type}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.12 }}
              className={`relative rounded-xl border overflow-hidden transition-all ${
                ticket.soldOut
                  ? 'opacity-50 border-border bg-muted/50'
                  : isActive
                  ? 'border-cta/40 bg-background shadow-lg ring-2 ring-cta/30'
                  : isHoveredFromMap
                  ? 'border-cta/30 bg-cta/5 shadow-md ring-1 ring-cta/20'
                  : 'border-border bg-background hover:border-foreground/10 hover:shadow-sm cursor-pointer'
              }`}
              onClick={() => !ticket.soldOut && !isActive && setTicketType(ticket.type)}
              onMouseEnter={() => !ticket.soldOut && setHoveredTicket(ticket.type)}
              onMouseLeave={() => setHoveredTicket(null)}
            >
              {/* Color band at top */}
              <div className="h-2" style={{ backgroundColor: ticket.color }} />

              {ticket.soldOut && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-destructive/90 text-destructive-foreground px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 -rotate-6 shadow-lg">
                    <Ban className="w-4 h-4" />
                    המלאי אזל
                  </div>
                </div>
              )}

              <div className="p-4">
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-foreground">{ticket.name}</h3>
                      {!ticket.soldOut && (
                        <span className="text-[11px] font-bold text-cta bg-cta/10 px-2 py-0.5 rounded-full">
                          {ticket.fomoText}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{ticket.description}</p>
                  </div>
                </div>

                {/* Progress bar with percentage */}
                {!ticket.soldOut && (
                  <motion.div
                    className="mt-3"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.12 }}
                    style={{ transformOrigin: 'right' }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-cta h-2 rounded-full transition-all"
                          style={{ width: `${ticket.fomoPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {ticket.fomoPercent}% נמכרו
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Always visible: quantity + buy button */}
                {!ticket.soldOut && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + index * 0.12 }}
                    className="mt-4"
                  >
                    {/* Quantity row */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-muted-foreground">כמות כרטיסים</span>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={(e) => { e.stopPropagation(); if (isActive) updateQuantity(ticket.type, -1); else { onChange([{ type: ticket.type, quantity: 1 }]); } }}
                          disabled={isActive && qty <= 1}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <div className="flex items-center gap-1.5">
                          {(isActive ? qty : 1) > 1 ? (
                            <Users className="w-4 h-4 text-cta" />
                          ) : (
                            <User className="w-4 h-4 text-cta" />
                          )}
                          <span className="w-6 text-center font-bold text-foreground text-base">{isActive ? qty : 1}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={(e) => { e.stopPropagation(); if (isActive) updateQuantity(ticket.type, 1); else { onChange([{ type: ticket.type, quantity: 2 }]); } }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Buy button */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isActive) onChange([{ type: ticket.type, quantity: 1 }]);
                        onBuyTicket(ticket.type);
                      }}
                      className="w-full h-11 font-bold bg-cta hover:bg-cta/90 text-cta-foreground rounded-xl shadow-lg text-base"
                    >
                      <ShoppingCart className="w-4 h-4 ml-2" />
                      רכישה — ₪{(ticket.price * qty).toLocaleString()}
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Interactive Seating Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <SeatingMap
          hoveredTicket={hoveredTicket}
          activeTicket={activeType}
          onHoverZone={handleMapHover}
        />
      </motion.div>
    </div>
  );
};

export default TicketSelection;
