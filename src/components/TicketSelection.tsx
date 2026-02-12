import { useState } from 'react';
import { Minus, Plus, User, Users, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type TicketSelection as TicketSelectionType, type TicketType, type TicketInfo } from '@/types/order';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import SeatingMap from '@/components/SeatingMap';

interface TicketSelectionProps {
  selections: TicketSelectionType[];
  onChange: (selections: TicketSelectionType[]) => void;
  onBuyTicket: (type: TicketType) => void;
  tickets: TicketInfo[];
  loading?: boolean;
}

const TicketSelection = ({ selections, onChange, onBuyTicket, tickets, loading }: TicketSelectionProps) => {
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
    <div className="space-y-5 md:max-w-[calc(100%-30px)]">
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-[31px] font-bold text-foreground">בחרו את הכרטיסים שלכם</h2>
      </motion.div>

      {loading && (
        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <Skeleton className="h-14 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex items-end gap-4">
                  <Skeleton className="flex-1 h-6" />
                  <div className="flex flex-col gap-2 items-center">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && <div className="space-y-5">
        {tickets.map((ticket, index) => {
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
              className={`relative rounded-xl border overflow-hidden transition-all duration-200 ${
                isSoldOut
                  ? 'border-border bg-background opacity-70'
                  : isActive
                  ? 'border-cta/40 bg-background shadow-lg ring-2 ring-cta/30 scale-[1.02]'
                  : isHoveredFromMap
                  ? 'border-cta/30 bg-background shadow-md ring-1 ring-cta/20 scale-[1.01]'
                  : 'border-border bg-background hover:scale-[1.02] hover:shadow-md cursor-pointer'
              }`}
              onClick={() => !isSoldOut && !isActive && setTicketType(ticket.type)}
              onMouseEnter={() => setHoveredTicket(ticket.type)}
              onMouseLeave={() => setHoveredTicket(null)}
            >
              {/* Color band with ticket name + price + sold-out badge */}
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ background: ticket.color }}
              >
                <h3 className="font-bold text-[20px] text-white flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  {ticket.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-bold text-white/90">
                    ₪{ticket.price.toLocaleString()}
                  </span>
                  {isSoldOut && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="bg-destructive text-white text-[17px] font-bold px-6 py-1.5 rounded -rotate-12 shadow-lg">
                        אזלו הכרטיסים
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {/* Description */}
                <p className="text-[17px] sm:text-[18px] text-muted-foreground mb-3 sm:mb-4 line-clamp-2 min-h-[3em]">{ticket.description}</p>

                 {/* Row layout: progress bar right, buttons left (RTL) */}
                 <div className="flex items-end gap-4">
                   {/* Progress bar (appears on right in RTL) */}
                   <motion.div
                     className="flex-1 min-w-0"
                     initial={{ scaleX: 0 }}
                     animate={{ scaleX: 1 }}
                     transition={{ duration: 0.6, delay: 0.3 + index * 0.12 }}
                     style={{ transformOrigin: 'right' }}
                   >
                     <p className="text-[15px] text-muted-foreground mb-1 text-right font-medium">
                       {ticket.fomoPercent}% כרטיסים נרכשו
                     </p>
                     <div className="bg-muted rounded-full h-3 border border-border overflow-hidden">
                       <div
                         className="h-3 rounded-full relative overflow-hidden"
                         style={{ width: `${ticket.fomoPercent}%`, background: ticket.progressColor }}
                       >
                         {!ticket.soldOut && (
                           <div
                             className="absolute inset-0 rounded-full"
                             style={{
                               background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)`,
                               animation: 'progress-shimmer 3s ease-in-out infinite',
                             }}
                           />
                         )}
                       </div>
                     </div>
                   </motion.div>

                   {/* Buttons (appears on left in RTL) */}
                   <div className="flex flex-col gap-2 items-center shrink-0">
                     {/* Quantity selector */}
                     <div className="flex items-center gap-2">
                       <Button
                         variant="outline"
                         size="icon"
                         className="h-8 w-8 rounded-full"
                         onClick={(e) => { e.stopPropagation(); if (!isSoldOut) { if (isActive) updateQuantity(ticket.type, 1); else onChange([{ type: ticket.type, quantity: 2 }]); } }}
                         disabled={isSoldOut}
                       >
                         <Plus className="w-3.5 h-3.5" />
                       </Button>
                       <div className="flex items-center gap-1">
                         {(isActive ? qty : 1) > 1 ? (
                           <Users className="w-4 h-4 text-cta" />
                         ) : (
                           <User className="w-4 h-4 text-cta" />
                         )}
                         <span className="w-6 text-center font-bold text-foreground text-[18px]">{isActive ? qty : 1}</span>
                       </div>
                       <Button
                         variant="outline"
                         size="icon"
                         className="h-8 w-8 rounded-full"
                         onClick={(e) => { e.stopPropagation(); if (!isSoldOut) { if (isActive) updateQuantity(ticket.type, -1); } }}
                         disabled={isSoldOut || (isActive && qty <= 1) || !isActive}
                       >
                         <Minus className="w-3.5 h-3.5" />
                       </Button>
                     </div>

                     {/* Buy button */}
                     <Button
                       onClick={(e) => {
                         e.stopPropagation();
                         if (isSoldOut) return;
                         if (!isActive) onChange([{ type: ticket.type, quantity: 1 }]);
                         onBuyTicket(ticket.type);
                       }}
                       disabled={isSoldOut}
                       className="h-10 px-5 font-bold bg-cta hover:bg-cta/90 text-cta-foreground rounded-lg shadow text-[16px] sm:text-[17px] whitespace-nowrap"
                     >
                       {qty > 1 ? `לרכישה - ₪${(ticket.price * qty).toLocaleString()}` : 'לרכישה'}
                     </Button>
                   </div>
                 </div>
               </div>
            </motion.div>
          );
        })}
      </div>}

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
          tickets={tickets}
        />
      </motion.div>
    </div>
  );
};

export default TicketSelection;
