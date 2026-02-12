import { useState, useEffect } from 'react';
import { sendMessage, onMessage } from '@/lib/wixBridge';
import type { GuestInfo, BuyerInfo, TicketInfo } from '@/types/order';
import type { TicketSelection } from '@/types/order';

interface CreateOrderData {
  tickets: { ticketId: string; quantity: number }[];
  guests: GuestInfo[];
  payer?: BuyerInfo;
  companyName?: string;
}

interface PaymentResult {
  orderNumber: string;
  referralCode: string;
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
      // Step 1: Create order
      setLoadingMessage('יוצר הזמנה...');

      const orderTickets = selections
        .filter((s) => s.quantity > 0)
        .map((s) => {
          const ticket = ticketsList.find((t) => t.type === s.type);
          return {
            ticketId: ticket?.wixId || '',
            quantity: s.quantity,
          };
        });

      const orderData: CreateOrderData = {
        tickets: orderTickets,
        guests,
        ...(showPayer ? { payer: buyer } : {}),
        ...(companyName ? { companyName } : {}),
      };

      const orderResponse = await sendMessage<{ orderId: string; paymentToken: string }>(
        'CREATE_ORDER',
        orderData
      );

      // Step 2: Open payment
      setLoadingMessage('פותח חלון תשלום...');

      // Determine buyer info for payment - use payer details if showPayer, otherwise first guest
      const paymentBuyer = showPayer
        ? buyer
        : {
            firstName: guests[0]?.firstName || '',
            lastName: guests[0]?.lastName || '',
            phone: guests[0]?.phone || '',
            email: guests[0]?.email || buyer.email || '',
          };

      const paymentResult = await sendMessage<PaymentResult>('OPEN_PAYMENT', {
        orderId: orderResponse.orderId,
        paymentToken: orderResponse.paymentToken,
        amount: totalPrice,
        buyerInfo: paymentBuyer,
      });

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

  // Listen for payment cancellation
  useEffect(() => {
    const unsub = onMessage('PAYMENT_CANCELLED', () => {
      setLoading(false);
      setLoadingMessage('');
      setError(null);
    });
    return unsub;
  }, []);

  return { createOrderAndPay, loading, loadingMessage, error };
}
