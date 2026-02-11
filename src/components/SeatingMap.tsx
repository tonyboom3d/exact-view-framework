import { type TicketType, TICKETS } from '@/types/order';
import { motion } from 'framer-motion';

interface SeatingMapProps {
  hoveredTicket: TicketType | null;
  activeTicket: TicketType | null;
  onHoverZone: (type: TicketType | null) => void;
}

const ZONES: { type: TicketType; label: string; color: string; y: number; height: number; rx: number }[] = [
  { type: 'vip', label: 'VIP', color: '#5B2C6F', y: 95, height: 40, rx: 6 },
  { type: 'premier', label: 'Premier', color: '#B8860B', y: 145, height: 55, rx: 6 },
  { type: 'general', label: 'General', color: '#2D6A4F', y: 210, height: 70, rx: 6 },
];

const SeatingMap = ({ hoveredTicket, activeTicket, onHoverZone }: SeatingMapProps) => {
  const getZoneOpacity = (type: TicketType) => {
    if (!hoveredTicket && !activeTicket) return 0.25;
    if (hoveredTicket === type || activeTicket === type) return 0.85;
    return 0.12;
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="text-base font-bold text-foreground text-center mb-3">מפת הושבה</h3>
      <svg viewBox="0 0 400 300" className="w-full h-auto" style={{ direction: 'ltr' }}>
        {/* Stage */}
        <rect x="100" y="20" width="200" height="45" rx="22" fill="hsl(var(--foreground))" opacity="0.1" />
        <text x="200" y="48" textAnchor="middle" fontSize="15" fontWeight="700" fill="hsl(var(--muted-foreground))">
          STAGE
        </text>

        {/* Seating zones */}
        {ZONES.map((zone) => {
          const isHighlighted = hoveredTicket === zone.type || activeTicket === zone.type;
          const ticket = TICKETS.find(t => t.type === zone.type);
          return (
            <g
              key={zone.type}
              onMouseEnter={() => onHoverZone(zone.type)}
              onMouseLeave={() => onHoverZone(null)}
              style={{ cursor: ticket?.soldOut ? 'default' : 'pointer' }}
            >
              <motion.rect
                x="40"
                y={zone.y}
                width="320"
                height={zone.height}
                rx={zone.rx}
                fill={zone.color}
                initial={{ opacity: 0.25 }}
                animate={{ opacity: getZoneOpacity(zone.type) }}
                transition={{ duration: 0.25 }}
                stroke={isHighlighted ? zone.color : 'transparent'}
                strokeWidth={isHighlighted ? 2 : 0}
              />
              <text
                x="200"
                y={zone.y + zone.height / 2 + 5}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill="white"
                style={{ pointerEvents: 'none' }}
              >
                {zone.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground text-center mt-2">
        העבר את העכבר מעל הכרטיסים או המפה כדי לראות את אזור ההושבה
      </p>
    </div>
  );
};

export default SeatingMap;
