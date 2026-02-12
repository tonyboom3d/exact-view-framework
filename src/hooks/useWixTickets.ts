import { useState, useEffect } from 'react';
import { sendMessage } from '@/lib/wixBridge';
import { FALLBACK_TICKETS, type TicketInfo } from '@/types/order';

interface WixTicketRaw {
  _id: string;
  name: string;
  price?: number;
  description?: string;
  soldOut?: boolean;
  soldPercent?: number;
  color?: string;
  progressColor?: string;
  colorClass?: string;
  mapLabel?: string;
}

const isInsideWix = window.parent !== window;

export function useWixTickets() {
  // Start with fallback tickets immediately — always visible
  const [tickets, setTickets] = useState<TicketInfo[]>(FALLBACK_TICKETS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isInsideWix) return;

    let cancelled = false;

    async function fetchTickets() {
      try {
        setLoading(true);
        const data = await sendMessage<{ tickets: WixTicketRaw[] }>('GET_TICKETS');
        if (cancelled) return;

        // Merge Wix data into fallback tickets — update _id and names if different
        setTickets((prev) => {
          return prev.map((fallback) => {
            // Try to match by type/name similarity
            const wixTicket = data.tickets.find(
              (w) =>
                w.name.toLowerCase().includes(fallback.type) ||
                fallback.name.toLowerCase().includes(w.name.toLowerCase()) ||
                fallback.type === w.name.toLowerCase().replace(/\s+/g, '-')
            );

            if (wixTicket) {
              return {
                ...fallback,
                wixId: wixTicket._id,
                name: wixTicket.name || fallback.name,
                price: wixTicket.price ?? fallback.price,
                description: wixTicket.description || fallback.description,
                soldOut: wixTicket.soldOut ?? fallback.soldOut,
                fomoPercent: wixTicket.soldPercent ?? fallback.fomoPercent,
                fomoText: wixTicket.soldPercent != null
                  ? `${wixTicket.soldPercent}% כרטיסים נרכשו`
                  : fallback.fomoText,
              };
            }
            return fallback;
          });
        });
      } catch (err) {
        // Silently fail — fallback tickets remain
        console.warn('Failed to fetch Wix tickets, using defaults:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTickets();
    return () => { cancelled = true; };
  }, []);

  return { tickets, loading };
}
