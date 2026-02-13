import { useState, useEffect } from 'react';
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
}

export function useWixPayment() {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function createOrderAndPay(params: {
    selections: TicketSelection[];
    ticketsList: TicketInfo[];
    guests: GuestInfo[];
    buyer: BuyerInfo;
    showPayer: boolean;
    companyName?: string;
    totalPrice: number;
  }): Promise<PaymentResult> {
    const { selections, ticketsList, guests, buyer, showPayer, companyName, totalPrice } = params;

    setLoading(true);
    setError(null);

    try {
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

      // Validate that all ticketIds are real Wix GUIDs (not fallback dev- IDs)
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidTicket = selectedTickets.find((t) => !guidRegex.test(t.ticketId));
      if (invalidTicket) {
        console.warn('[useWixPayment] Invalid ticketId detected:', invalidTicket.ticketId, '– ticket data may not have loaded from Wix yet');
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

  return { createOrderAndPay, loading, loadingMessage, error, setError };
}
