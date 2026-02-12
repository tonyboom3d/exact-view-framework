import { useState, useEffect } from 'react';
import { onVeloInit } from '@/lib/wixBridge';
import { FALLBACK_TICKETS, type TicketInfo } from '@/types/order';

interface WixTicketMeta {
  /**
   * Logical key that matches the ticket `type` on the React side (e.g. "general", "vip", "premier").
   */
  key: string;
  /**
   * Real Wix Events ticket GUID to be used in START_CHECKOUT.
   */
  id: string;
  /**
   * Optional metadata coming from CMS / Velo.
   */
  soldPercent?: number;
  isSoldOut?: boolean;
  /**
   * Optional price override coming from CMS.
   * If provided, it will override the fallback price in the UI.
   */
  price?: number;
}

const isInsideWix = window.parent !== window;

export function useWixTickets() {
  // Start with fallback tickets immediately — always visible
  const [tickets, setTickets] = useState<TicketInfo[]>(FALLBACK_TICKETS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('[useWixTickets] isInsideWix:', isInsideWix);

    if (!isInsideWix) {
      console.log('[useWixTickets] Not inside Wix iframe, using fallback tickets');
      return;
    }

    setLoading(true);
    console.log('[useWixTickets] Waiting for INIT_EVENT_DATA from Velo...');

    // Listen for INIT_EVENT_DATA pushed from Velo with minimal ticket metadata.
    const unsubscribe = onVeloInit((payload: { tickets?: WixTicketMeta[] }) => {
      console.log('[useWixTickets] Received INIT_EVENT_DATA payload:', payload);

      if (!payload?.tickets || !Array.isArray(payload.tickets)) {
        console.warn('[useWixTickets] Invalid payload, no tickets array');
        setLoading(false);
        return;
      }

      console.log('[useWixTickets] Processing', payload.tickets.length, 'tickets from CMS');

      setTickets((prev) =>
        prev.map((fallback) => {
          const meta = payload.tickets!.find(
            (t) => t.key.toLowerCase() === fallback.type.toLowerCase()
          );

          if (!meta) {
            console.log(`[useWixTickets] No CMS match for type: ${fallback.type}`);
            return fallback;
          }

          console.log(`[useWixTickets] Merging CMS data for ${fallback.type}:`, {
            wixId: meta.id,
            soldPercent: meta.soldPercent,
            isSoldOut: meta.isSoldOut,
            price: meta.price,
          });

          const soldPercent = meta.soldPercent ?? fallback.fomoPercent;

          return {
            ...fallback,
            // Update technical / dynamic fields + allow price override from CMS
            wixId: meta.id || fallback.wixId,
            soldOut: meta.isSoldOut ?? fallback.soldOut,
            price: meta.price ?? fallback.price,
            fomoPercent: soldPercent,
            fomoText:
              soldPercent != null
                ? `${soldPercent}% כרטיסים נרכשו`
                : fallback.fomoText,
          };
        })
      );

      setLoading(false);
      console.log('[useWixTickets] Tickets updated from CMS');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { tickets, loading };
}
