import { type TicketType, type TicketInfo } from '@/types/order';
import { motion } from 'framer-motion';

interface SeatingMapProps {
  hoveredTicket: TicketType | null;
  activeTicket: TicketType | null;
  onHoverZone: (type: TicketType | null) => void;
  tickets?: TicketInfo[];
}

const ZONE_COLORS: Record<TicketType, string> = {
  general: '#2980b9',
  premier: '#c8a951',
  vip: '#7b1fa2',
};

const ZONE_LABELS: Record<TicketType, string> = {
  premier: 'Premier',
  vip: 'VIP',
  general: 'General Admission',
};

// Each seat row: array of { cx, cy, type }
function generateSeats() {
  const seats: { cx: number; cy: number; type: TicketType }[] = [];

  // The layout is a fan shape opening to the right, stage on the left
  // We'll create rows of rectangular seats arranged in arcs

  // Top section - General (blue) - 3 rows fanning out
  const topRows = [
    { y: 65, xStart: 155, count: 10, type: 'general' as TicketType },
    { y: 80, xStart: 145, count: 11, type: 'general' as TicketType },
    { y: 95, xStart: 135, count: 12, type: 'general' as TicketType },
  ];

  // Top VIP strip
  const topVip = [
    { y: 110, xStart: 130, count: 3, type: 'vip' as TicketType },
  ];

  // Middle section - mixed
  const midRows = [
    { y: 125, xStart: 125, count: 13, type: 'general' as TicketType },
    { y: 140, xStart: 120, count: 14, type: 'general' as TicketType },
    { y: 155, xStart: 115, count: 14, type: 'general' as TicketType },
  ];

  // Premier + VIP center rows
  const centerRows = [
    { y: 175, xStart: 110, count: 4, type: 'premier' as TicketType },
    { y: 190, xStart: 110, count: 4, type: 'premier' as TicketType },
  ];
  const centerVip = [
    { y: 175, xStart: 160, count: 3, type: 'vip' as TicketType },
    { y: 190, xStart: 160, count: 3, type: 'vip' as TicketType },
  ];
  const centerGeneral = [
    { y: 175, xStart: 200, count: 8, type: 'general' as TicketType },
    { y: 190, xStart: 200, count: 8, type: 'general' as TicketType },
  ];

  // Bottom section
  const bottomVip = [
    { y: 215, xStart: 130, count: 3, type: 'vip' as TicketType },
  ];
  const bottomRows = [
    { y: 230, xStart: 135, count: 12, type: 'general' as TicketType },
    { y: 245, xStart: 145, count: 11, type: 'general' as TicketType },
    { y: 260, xStart: 155, count: 10, type: 'general' as TicketType },
  ];

  const allRows = [
    ...topRows, ...topVip, ...midRows,
    ...centerRows, ...centerVip, ...centerGeneral,
    ...bottomVip, ...bottomRows,
  ];

  for (const row of allRows) {
    const spacing = 14;
    for (let i = 0; i < row.count; i++) {
      seats.push({
        cx: row.xStart + i * spacing,
        cy: row.y,
        type: row.type,
      });
    }
  }

  return seats;
}

const SEATS = generateSeats();

const SeatingMap = ({ hoveredTicket, activeTicket, onHoverZone, tickets = [] }: SeatingMapProps) => {
  const getOpacity = (type: TicketType) => {
    if (!hoveredTicket && !activeTicket) return 1;
    if (hoveredTicket === type || activeTicket === type) return 1;
    return 0.2;
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="text-[19px] font-bold text-foreground text-center mb-3">מפת הושבה</h3>
      <svg viewBox="50 20 370 280" className="w-full h-auto" style={{ direction: 'ltr' }}>
        {/* Venue outline */}
        <polygon
          points="90,40 340,25 380,80 395,160 380,240 340,295 90,280 75,160"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />

        {/* Stage - dashed rectangle on left */}
        <rect
          x="60" y="130" width="35" height="60" rx="2"
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
        <text
          x="77" y="165"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="hsl(var(--muted-foreground))"
        >
          במה
        </text>

        {/* Seats */}
        {SEATS.map((seat, i) => {
          const ticket = tickets.find(t => t.type === seat.type);
          return (
            <motion.rect
              key={i}
              x={seat.cx - 4}
              y={seat.cy - 5}
              width="8"
              height="10"
              rx="1.5"
              fill={ZONE_COLORS[seat.type]}
              initial={{ opacity: 1 }}
              animate={{ opacity: getOpacity(seat.type) }}
              transition={{ duration: 0.2 }}
              onMouseEnter={() => onHoverZone(seat.type)}
              onMouseLeave={() => onHoverZone(null)}
              style={{ cursor: ticket?.soldOut ? 'default' : 'pointer' }}
            />
          );
        })}

        {/* Legend */}
        <g transform="translate(290, 215)">
          {(['premier', 'vip', 'general'] as TicketType[]).map((type, i) => (
            <g
              key={type}
              transform={`translate(0, ${i * 18})`}
              onMouseEnter={() => onHoverZone(type)}
              onMouseLeave={() => onHoverZone(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x="0" y="0" width="12" height="12" rx="2"
                fill={ZONE_COLORS[type]}
                stroke={type === 'premier' ? ZONE_COLORS[type] : 'none'}
                strokeWidth="1"
              />
              {type === 'premier' && (
                <>
                  <line x1="0" y1="0" x2="12" y2="12" stroke="white" strokeWidth="0.8" />
                  <line x1="12" y1="0" x2="0" y2="12" stroke="white" strokeWidth="0.8" />
                </>
              )}
              <text
                x="18" y="10"
                fontSize="13"
                fontWeight="500"
                fill="hsl(var(--foreground))"
              >
                {ZONE_LABELS[type]}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <p className="text-[12px] text-muted-foreground text-center mt-2">
        העבר את העכבר מעל הכרטיסים או המפה כדי לראות את אזור ההושבה
      </p>
    </div>
  );
};

export default SeatingMap;
