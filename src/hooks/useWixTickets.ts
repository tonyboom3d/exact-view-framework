import { useState, useEffect, useRef, useCallback } from 'react';
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
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useWixTickets() {
  // Start with fallback tickets immediately — always visible
  const [tickets, setTickets] = useState<TicketInfo[]>(FALLBACK_TICKETS);
  const [loading, setLoading] = useState(false);
  const [wixDataReady, setWixDataReady] = useState(!isInsideWix); // true immediately outside Wix

  // Promise that resolves when real Wix ticket data has arrived
  const wixReadyResolveRef = useRef<(() => void) | null>(null);
  const wixReadyPromiseRef = useRef<Promise<void>>(
    isInsideWix
      ? new Promise<void>((resolve) => { wixReadyResolveRef.current = resolve; })
      : Promise.resolve()
  );

  // Ref to latest tickets for use inside callbacks
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;

  const mergeTicketData = useCallback((payload: { tickets?: WixTicketMeta[] }) => {
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

    setWixDataReady(true);
    setLoading(false);
    // Resolve the awaitable promise
    if (wixReadyResolveRef.current) {
      wixReadyResolveRef.current();
      wixReadyResolveRef.current = null;
    }
    console.log('[useWixTickets] Tickets updated from CMS');
  }, []);

  useEffect(() => {
    console.log('[useWixTickets] isInsideWix:', isInsideWix);

    if (!isInsideWix) {
      console.log('[useWixTickets] Not inside Wix iframe, using fallback tickets');
      return;
    }

    setLoading(true);
    console.log('[useWixTickets] Waiting for INIT_EVENT_DATA from Velo...');

    const unsubscribe = onVeloInit(mergeTicketData);

    return () => {
      unsubscribe();
    };
  }, [mergeTicketData]);

  /**
   * Ensures ticket data with real Wix GUIDs is available before proceeding.
   * If data hasn't arrived yet, sends REQUEST_INIT to Velo and waits (up to `timeout` ms).
   * Returns the latest tickets array with real GUIDs.
   */
  const ensureWixData = useCallback(async (timeout = 8000): Promise<TicketInfo[]> => {
    // Outside Wix – fallback tickets are fine
    if (!isInsideWix) return ticketsRef.current;

    // Already have real data
    if (wixDataReady) return ticketsRef.current;

    console.log('[useWixTickets] Wix data not ready yet – sending REQUEST_INIT to Velo');
    // Ask Velo to re-send INIT_EVENT_DATA
    window.parent.postMessage({ type: 'REQUEST_INIT' }, '*');

    // Wait for the data to arrive (or timeout)
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout waiting for ticket data from Wix')), timeout)
    );

    try {
      await Promise.race([wixReadyPromiseRef.current, timeoutPromise]);
      return ticketsRef.current;
    } catch {
      // If still not ready after timeout, check if any ticket has a real GUID now
      const hasRealIds = ticketsRef.current.some((t) => GUID_REGEX.test(t.wixId));
      if (hasRealIds) return ticketsRef.current;
      throw new Error('נתוני הכרטיסים עדיין לא נטענו מ-Wix. אנא רעננו את הדף ונסו שוב.');
    }
  }, [wixDataReady]);

  return { tickets, loading, wixDataReady, ensureWixData };
}
