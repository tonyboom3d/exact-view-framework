import { useState, useEffect, useCallback } from 'react';
import { sendMessage, onMessage } from '@/lib/wixBridge';
import type { GuestInfo, BuyerInfo, TicketInfo } from '@/types/order';
import type { TicketSelection } from '@/types/order';

interface PaymentResult {
  orderNumber: string;
  referralCode?: string;
  status?: 'Successful' | 'Pending';
  totalAmount?: number;
  currency?: string;
  customerEmail?: string;
  pdfLink?: string;
  paymentId?: string;
  buyerPhone?: string;
  buyerFirstName?: string;
}

export interface PendingPaymentData {
  orderNumber: string;
  paymentId: string;
  buyerPhone: string;
  buyerFirstName: string;
  totalAmount: number;
  currency: string;
  customerEmail: string;
  timestamp: number;
}

const PENDING_ORDER_KEY = 'pendingOrder';

export function useWixPayment() {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPaymentData | null>(null);

  async function createOrderAndPay(params: {
    selections: TicketSelection[];
    ticketsList: TicketInfo[];
    guests: GuestInfo[];
    buyer: BuyerInfo;
    showPayer: boolean;
    companyName?: string;
    totalPrice: number;
    ensureWixData?: () => Promise<TicketInfo[]>;
  }): Promise<PaymentResult> {
    const { selections, guests, buyer, showPayer, companyName, totalPrice, ensureWixData } = params;

    setLoading(true);
    setError(null);

    try {
      setLoadingMessage('טוען נתוני כרטיסים...');

      // Ensure we have real Wix ticket GUIDs before proceeding
      let ticketsList = params.ticketsList;
      if (ensureWixData) {
        try {
          ticketsList = await ensureWixData();
          console.log('[useWixPayment] ensureWixData resolved, tickets ready');
        } catch (err: any) {
          console.warn('[useWixPayment] ensureWixData failed:', err.message);
          throw err;
        }
      }

      setLoadingMessage('מתחיל תהליך תשלום...');

      // Build selected tickets array for START_CHECKOUT
      const selectedTickets = selections
        .filter((s) => s.quantity > 0)
        .map((s) => {
          const ticket = ticketsList.find((t) => t.type === s.type);
          return {
            ticketId: ticket?.wixId || '',
            quantity: s.quantity,
          };
        });

      // Final safety check: validate that all ticketIds are real Wix GUIDs
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidTicket = selectedTickets.find((t) => !guidRegex.test(t.ticketId));
      if (invalidTicket) {
        console.warn('[useWixPayment] Invalid ticketId after ensureWixData:', invalidTicket.ticketId);
        throw new Error('נתוני הכרטיסים עדיין לא נטענו. אנא רעננו את הדף ונסו שוב.');
      }

      // Main buyer details (first guest)
      const firstGuest = guests[0];
      const mainBuyerDetails = {
        firstName: firstGuest?.firstName || buyer.firstName || '',
        lastName: firstGuest?.lastName || buyer.lastName || '',
        email: firstGuest?.email || buyer.email || '',
        phone: firstGuest?.phone || buyer.phone || '',
      };

      // Flat array of all guest full names
      const allGuestNames = guests.map((g) => `${g.firstName} ${g.lastName}`.trim());
      // Full guest details (one per ticket) for Wix Events checkout when multiple tickets
      const guestsDetails = guests.map((g) => ({
        firstName: g.firstName || '',
        lastName: g.lastName || '',
        email: g.email || '',
        phone: g.phone || '',
        wantWhatsapp: g.wantWhatsapp !== false,
      }));

      const payload = {
        selectedTickets,
        mainBuyerDetails,
        allGuestNames,
        guests: guestsDetails,
        payer: showPayer ? buyer : undefined,
        companyName: companyName || undefined,
        totalAmount: totalPrice,
      };

      // Single START_CHECKOUT command – Velo side will handle reserve/checkout/payment.
      // Use long timeout (10 minutes) since user might take time to complete payment.
      const paymentResult = await sendMessage<PaymentResult>('START_CHECKOUT', payload, 10 * 60 * 1000);

      // Check if this is a Pending result (polling flow)
      if (paymentResult.status === 'Pending' && paymentResult.paymentId) {
        console.log('[useWixPayment] Payment is Pending – entering polling flow', {
          paymentId: paymentResult.paymentId,
          orderNumber: paymentResult.orderNumber,
        });

        const pendingData: PendingPaymentData = {
          orderNumber: paymentResult.orderNumber,
          paymentId: paymentResult.paymentId,
          buyerPhone: paymentResult.buyerPhone || '',
          buyerFirstName: paymentResult.buyerFirstName || '',
          totalAmount: paymentResult.totalAmount || 0,
          currency: paymentResult.currency || 'ILS',
          customerEmail: paymentResult.customerEmail || '',
          timestamp: Date.now(),
        };

        // Save to localStorage for returning users
        try {
          localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(pendingData));
        } catch (e) { /* localStorage might be unavailable */ }

        setLoading(false);
        setLoadingMessage('');
        setPendingPayment(pendingData);
        return paymentResult;
      }

      // Payment completed – update message before hiding overlay
      setLoadingMessage('יש להמתין מספר רגעים...');
      
      // Small delay to show the "wait" message before transitioning
      await new Promise(resolve => setTimeout(resolve, 800));

      // Clear any pending order from localStorage on successful payment
      try { localStorage.removeItem(PENDING_ORDER_KEY); } catch (e) { /* */ }

      setLoading(false);
      setLoadingMessage('');
      return paymentResult;
    } catch (err: any) {
      setLoading(false);
      setLoadingMessage('');
      setError(err.message || 'שגיאה בתשלום');
      throw err;
    }
  }

  /**
   * Polls the CMS for payment status changes. Returns the resolved status.
   * Called by PendingPaymentOverlay every 5 seconds for 60 seconds.
   */
  const pollPaymentStatus = useCallback(async (paymentId: string) => {
    try {
      const result = await sendMessage<{ status: string; orderNumber?: string; ticketsPdf?: string }>(
        'CHECK_PAYMENT_STATUS',
        { paymentId },
        10000
      );
      return result;
    } catch (err) {
      console.warn('[useWixPayment] pollPaymentStatus failed:', err);
      return { status: 'error' };
    }
  }, []);

  /**
   * Sends a WhatsApp notification to the buyer that their payment is being verified.
   * Called after 60 seconds of polling with no result.
   */
  const sendPendingWhatsapp = useCallback(async (phone: string, firstName: string, orderNumber: string) => {
    try {
      await sendMessage('SEND_PENDING_WHATSAPP', { phone, firstName, orderNumber }, 15000);
      console.log('[useWixPayment] Pending WhatsApp notification sent');
    } catch (err) {
      console.warn('[useWixPayment] sendPendingWhatsapp failed:', err);
    }
  }, []);

  /**
   * Clears the pending payment state and localStorage.
   */
  const clearPendingPayment = useCallback(() => {
    setPendingPayment(null);
    try { localStorage.removeItem(PENDING_ORDER_KEY); } catch (e) { /* */ }
  }, []);

  /**
   * Checks localStorage for a pending order from a previous session.
   * Returns the data if found and < 24 hours old, otherwise null.
   */
  const checkExistingPendingOrder = useCallback(async (): Promise<{
    data: PendingPaymentData;
    currentStatus: string;
    ticketsPdf?: string;
  } | null> => {
    try {
      const stored = localStorage.getItem(PENDING_ORDER_KEY);
      if (!stored) return null;

      const data: PendingPaymentData = JSON.parse(stored);
      const hoursPassed = (Date.now() - data.timestamp) / (1000 * 60 * 60);

      if (hoursPassed > 24) {
        localStorage.removeItem(PENDING_ORDER_KEY);
        return null;
      }

      // Check current status from CMS
      const result = await sendMessage<{ status: string; orderNumber?: string; ticketsPdf?: string }>(
        'CHECK_PAYMENT_STATUS',
        { paymentId: data.paymentId },
        10000
      );

      return { data, currentStatus: result.status, ticketsPdf: result.ticketsPdf };
    } catch (err) {
      console.warn('[useWixPayment] checkExistingPendingOrder failed:', err);
      return null;
    }
  }, []);

  // Listen for intermediate "payment received" signal – update loading text
  useEffect(() => {
    const unsub = onMessage('PAYMENT_PROCESSING', () => {
      setLoadingMessage('רק רגע בבקשה...');
    });
    return unsub;
  }, []);

  // Listen for payment cancellation (user closed modal without paying)
  useEffect(() => {
    const unsub = onMessage('PAYMENT_CANCELLED', (msg: any) => {
      setLoading(false);
      setLoadingMessage('');
      const message = msg?.payload?.message || 'תהליך התשלום בוטל.';
      setError(message);
    });
    return unsub;
  }, []);

  // Listen for payment error (failed payment)
  useEffect(() => {
    const unsub = onMessage('PAYMENT_ERROR', (msg: any) => {
      setLoading(false);
      setLoadingMessage('');
      const message = msg?.payload?.message || 'שגיאה בתהליך התשלום';
      setError(message);
    });
    return unsub;
  }, []);

  return {
    createOrderAndPay,
    loading,
    loadingMessage,
    error,
    setError,
    pendingPayment,
    setPendingPayment,
    pollPaymentStatus,
    sendPendingWhatsapp,
    clearPendingPayment,
    checkExistingPendingOrder,
  };
}
