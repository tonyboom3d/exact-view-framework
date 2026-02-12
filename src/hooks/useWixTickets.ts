import { useState, useEffect } from 'react';
import { sendMessage } from '@/lib/wixBridge';
import type { TicketInfo } from '@/types/order';

interface WixTicketRaw {
  _id: string;
  name: string;
  price: number;
  description: string;
  soldOut: boolean;
  soldPercent: number;
  color: string;
  progressColor: string;
  colorClass: string;
  mapLabel: string;
}

export function useWixTickets() {
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTickets() {
      try {
        setLoading(true);
        setError(null);
        const data = await sendMessage<{ tickets: WixTicketRaw[] }>('GET_TICKETS');
        if (cancelled) return;

        const mapped: TicketInfo[] = data.tickets.map((t) => ({
          wixId: t._id,
          type: t.name.toLowerCase().replace(/\s+/g, '-'),
          name: t.name,
          price: t.price,
          description: t.description,
          fomoText: `${t.soldPercent}% כרטיסים נרכשו`,
          fomoPercent: t.soldPercent,
          soldOut: t.soldOut,
          color: t.color,
          progressColor: t.progressColor,
          colorClass: t.colorClass || 'bg-blue-600',
          mapLabel: t.mapLabel,
        }));

        setTickets(mapped);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || 'Failed to load tickets');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTickets();
    return () => { cancelled = true; };
  }, []);

  return { tickets, loading, error, refetch: () => {} };
}
