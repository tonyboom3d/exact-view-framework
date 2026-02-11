import { useState } from 'react';
import { Minus, Plus, User, Users, ShoppingCart } from 'lucide-react';
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
          const isSoldOut = ticket.soldOut;

          return (
            <motion.div
              key={ticket.type}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.12 }}
              className={`relative rounded-xl border overflow-hidden transition-all ${
                isSoldOut
                  ? 'border-border bg-background opacity-60'
                  : isActive
                  ? 'border-cta/40 bg-background shadow-lg ring-2 ring-cta/30'
                  : isHoveredFromMap
                  ? 'border-cta/30 bg-cta/5 shadow-md ring-1 ring-cta/20'
                  : 'border-border bg-background hover:border-foreground/10 hover:shadow-sm cursor-pointer'
              }`}
              onClick={() => !isSoldOut && !isActive && setTicketType(ticket.type)}
              onMouseEnter={() => setHoveredTicket(ticket.type)}
              onMouseLeave={() => setHoveredTicket(null)}
            >
              {/* Color band with ticket name + FOMO percent */}
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ backgroundColor: ticket.color }}
              >
                <h3 className="font-bold text-base text-white">{ticket.name}</h3>
                <span className="text-xs font-bold text-white/90">
                  {ticket.fomoPercent}% נמכרו
                </span>
              </div>

              <div className="p-4">
                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3">{ticket.description}</p>

                {/* Bottom row: progress bar (right) + quantity + buy button (left) */}
                <div className="flex items-center gap-3">
                  {/* Progress bar - right side (flex-1) */}
                  <motion.div
                    className="flex-1"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.12 }}
                    style={{ transformOrigin: 'right' }}
                  >
                    <div className="bg-muted rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{ width: `${ticket.fomoPercent}%`, backgroundColor: ticket.color }}
                      />
                    </div>
                  </motion.div>

                  {/* Quantity selector */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={(e) => { e.stopPropagation(); if (!isSoldOut) { if (isActive) updateQuantity(ticket.type, -1); } }}
                      disabled={isSoldOut || (isActive && qty <= 1) || !isActive}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {(isActive ? qty : 1) > 1 ? (
                        <Users className="w-3.5 h-3.5 text-cta" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-cta" />
                      )}
                      <span className="w-5 text-center font-bold text-foreground text-sm">{isActive ? qty : 1}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={(e) => { e.stopPropagation(); if (!isSoldOut) { if (isActive) updateQuantity(ticket.type, 1); else onChange([{ type: ticket.type, quantity: 2 }]); } }}
                      disabled={isSoldOut}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Buy button - compact */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSoldOut) return;
                      if (!isActive) onChange([{ type: ticket.type, quantity: 1 }]);
                      onBuyTicket(ticket.type);
                    }}
                    disabled={isSoldOut}
                    className="h-9 px-4 font-bold bg-cta hover:bg-cta/90 text-cta-foreground rounded-lg shadow text-sm whitespace-nowrap"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 ml-1.5" />
                    {isSoldOut ? 'אזל' : `₪${(ticket.price * qty).toLocaleString()}`}
                  </Button>
                </div>
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
