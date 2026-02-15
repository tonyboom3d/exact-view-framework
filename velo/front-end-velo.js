import { orders } from 'wix-events.v2';
import wixPay from 'wix-pay-frontend';
import { getTicketMeta, createEventPayment, confirmEventOrder, saveAbandonedCart, updateCartAfterPayment } from 'backend/eventLogics';

$w.onReady(async function () {
  const EVENT_ID = '9e19a44f-9fc3-48f2-a9fd-83cedb993d1c'; 

  const htmlComponent = $w('#eventIframe')

  // Store ticket meta for later use in checkout
  let ticketMetaMap = {};

  // 1. On load – fetch ticket meta from backend (CMS) and send INIT_EVENT_DATA
  try {
    const ticketsPayload = await getTicketMeta();

    console.log('INIT_EVENT_DATA: loaded tickets from CMS', {
      count: ticketsPayload.length,
      keys: ticketsPayload.map((t) => t.key),
    });

    // Build a map for quick lookup by ticketId
    ticketsPayload.forEach((t) => {
      ticketMetaMap[t.id] = t;
    });

    htmlComponent.postMessage({
      type: 'INIT_EVENT_DATA',
      payload: {
        eventId: EVENT_ID,
        tickets: ticketsPayload,
      },
    });
  } catch (error) {
    console.error('INIT_EVENT_DATA: failed to load ticket metadata from backend', error);
  }

  // 2. Listen for messages from the iframe UI
  htmlComponent.onMessage(async (event) => {
    const message = event.data;
    if (!message || typeof message.type !== 'string') {
      return;
    }

    // Handle REQUEST_INIT – the iframe is asking for ticket data (re-send INIT_EVENT_DATA)
    if (message.type === 'REQUEST_INIT') {
      console.log('REQUEST_INIT: iframe requested ticket data, re-fetching and sending...');
      try {
        const ticketsPayload = await getTicketMeta();
        // Refresh the local map too
        ticketsPayload.forEach((t) => {
          ticketMetaMap[t.id] = t;
        });
        htmlComponent.postMessage({
          type: 'INIT_EVENT_DATA',
          payload: {
            eventId: EVENT_ID,
            tickets: ticketsPayload,
          },
        });
        console.log('REQUEST_INIT: re-sent INIT_EVENT_DATA with', ticketsPayload.length, 'tickets');
      } catch (error) {
        console.error('REQUEST_INIT: failed to re-fetch ticket metadata', error);
      }
      return;
    }

    if (message.type === 'START_CHECKOUT') {
      // Messages from the React iframe are sent as { type, requestId, data }.
      // Prefer `data` but keep `payload` as a fallback for safety.
      const payload = message.data || message.payload || {};
      const requestId = message.requestId; // Preserve requestId for response matching
      
      try {
        console.log('START_CHECKOUT: received payload from iframe', {
          selectedTickets: payload.selectedTickets,
          mainBuyerDetails: payload.mainBuyerDetails,
          hasPayer: !!payload.payer,
          totalAmountFromIframe: payload.totalAmount,
          requestId,
        });

        const result = await handleStartCheckout(EVENT_ID, payload, ticketMetaMap);

        if (result.status === 'Successful') {
          console.log('PAYMENT_SUCCESS: checkout & payment completed', {
            orderNumber: result.orderNumber,
            amount: result.amount,
            currency: result.currency,
          });
          htmlComponent.postMessage({
            type: 'PAYMENT_SUCCESS',
            requestId, // Include requestId so the iframe Promise resolves
            success: true,
            data: {
              orderNumber: result.orderNumber,
              totalAmount: result.amount,
              currency: result.currency || 'ILS',
              customerEmail: result.customerEmail,
              pdfLink: result.ticketsPdf,
              status: 'Successful',
            },
          });
        } else if (result.status === 'Pending') {
          console.log('PAYMENT_PENDING: payment is pending verification');
          htmlComponent.postMessage({
            type: 'PAYMENT_SUCCESS',
            requestId,
            success: true,
            data: {
              orderNumber: result.orderNumber,
              totalAmount: result.amount,
              currency: result.currency || 'ILS',
              customerEmail: result.customerEmail,
              pdfLink: result.ticketsPdf,
              status: 'Pending',
            },
          });
        } else if (result.status === 'Cancelled') {
          console.log('PAYMENT_CANCELLED: user cancelled payment');
          htmlComponent.postMessage({
            type: 'PAYMENT_CANCELLED',
            requestId,
            success: false,
            error: 'תהליך התשלום בוטל.',
          });
        } else {
          // Failed or other status
          console.log('PAYMENT_FAILED: payment failed', { status: result.status });
          htmlComponent.postMessage({
            type: 'PAYMENT_ERROR',
            requestId,
            success: false,
            error: 'התשלום נכשל, אנא נסה שוב.',
          });
        }
      } catch (error) {
        console.error('START_CHECKOUT: error in checkout/payment flow', error);
        htmlComponent.postMessage({
          type: 'PAYMENT_ERROR',
          requestId,
          success: false,
          error: 'משהו השתבש בתהליך ההזמנה, אנא נסה שוב.',
        });
      }
    }
  });
});

async function handleStartCheckout(eventId, data, ticketMetaMap) {
  const {
    selectedTickets,
    mainBuyerDetails,
    allGuestNames,
    payer,
    companyName,
    totalAmount: totalAmountFromIframe, // Amount calculated in the UI (fallback if CMS has no prices)
  } = data;

  console.log('handleStartCheckout: start', {
    eventId,
    selectedTickets,
    mainBuyerDetails,
    hasPayer: !!payer,
    companyName,
  });

  // Step A: Reserve tickets (wix-events.v2)
  const reservationRes = await orders.createReservation(eventId, {
    ticketQuantities: selectedTickets.map((t) => ({
      ticketDefinitionId: t.ticketId,
      quantity: t.quantity,
    })),
  });
  const reservationId = reservationRes._id || reservationRes.id;
  console.log('handleStartCheckout: reservation created', { reservationId });

  // Step B: Build guests array — one per ticket, each with form inputValues
  // Event form fields: firstName, lastName, email, phone
  const guestsFromPayload = data.guests || [];
  const totalTickets = selectedTickets.reduce((sum, t) => sum + t.quantity, 0);

  // Determine the primary email to use as fallback for guests without email:
  // If payer is provided, use payer email; otherwise use first guest / mainBuyer email
  const primaryEmail = payer ? payer.email : (mainBuyerDetails.email || '');

  const guests = [];
  for (let i = 0; i < totalTickets; i++) {
    const g = guestsFromPayload[i] || {};
    // For email: use guest's own email if available, otherwise fall back to primaryEmail
    const guestEmail = (g.email || '').trim() || primaryEmail.trim();
    guests.push({
      form: {
        inputValues: [
          { inputName: 'firstName', value: (g.firstName || mainBuyerDetails.firstName || '').trim() },
          { inputName: 'lastName', value: (g.lastName || mainBuyerDetails.lastName || '').trim() },
          { inputName: 'email', value: guestEmail },
          { inputName: 'phone', value: (g.phone || mainBuyerDetails.phone || '').trim() },
        ],
      },
    });
  }

  console.log('handleStartCheckout: checkout with guests', { guestCount: guests.length, primaryEmail });

  // Step C: Checkout in Wix Events (v2)
  // If payer is provided (showPayer = true), use payer as the Wix Events buyer.
  // Otherwise, use first guest (mainBuyerDetails) as the buyer.
  const buyerDetails = payer
    ? { firstName: payer.firstName, lastName: payer.lastName, email: payer.email }
    : { firstName: mainBuyerDetails.firstName, lastName: mainBuyerDetails.lastName, email: mainBuyerDetails.email };

  const checkoutRes = await orders.checkout(eventId, {
    reservationId,
    guests,
    buyer: buyerDetails,
  });
  console.log('handleStartCheckout: checkout created', {
    orderNumber: checkoutRes.order && checkoutRes.order.orderNumber,
  });

  // Step D: Determine user info for payment
  // If payer is provided (different payer selected), use payer details.
  // Otherwise, use first ticket guest details (mainBuyerDetails).
  const userInfo = payer
    ? {
        firstName: payer.firstName,
        lastName: payer.lastName,
        email: payer.email,
        phone: payer.phone,
      }
    : {
        firstName: mainBuyerDetails.firstName,
        lastName: mainBuyerDetails.lastName,
        email: mainBuyerDetails.email,
        phone: mainBuyerDetails.phone,
      };

  // Step E: Build items array from selected tickets (prices from CMS/backend)
  // Calculate total quantity for fallback price distribution
  const totalQuantity = selectedTickets.reduce((sum, t) => sum + t.quantity, 0);

  const items = selectedTickets.map((t) => {
    const meta = ticketMetaMap[t.ticketId] || {};
    // Use CMS price if available; otherwise distribute totalAmountFromIframe evenly
    const priceFromCms = meta.price;
    const fallbackPrice = totalAmountFromIframe && totalQuantity > 0
      ? Math.round((totalAmountFromIframe / totalQuantity) * 100) / 100
      : 0;
    const price = priceFromCms > 0 ? priceFromCms : fallbackPrice;

    return {
      name: meta.name || 'כרטיס',
      price,
      quantity: t.quantity,
    };
  });

  // Calculate total amount from items
  let amount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Safety: if still 0, use the iframe total directly
  if (amount <= 0 && totalAmountFromIframe > 0) {
    amount = totalAmountFromIframe;
  }

  console.log('handleStartCheckout: computed amount from items', {
    amount,
    items,
    totalAmountFromIframe,
  });

  // Step F: Create payment in backend (secure – price defined server-side)
  const payment = await createEventPayment({
    items,
    amount,
    userInfo,
  });
  console.log('handleStartCheckout: backend payment created', {
    paymentId: payment.id,
  });

  // Step F2: Save abandoned cart record to CMS (fire-and-forget – must not block checkout)
  let cartId = null;
  try {
    const guestsFromPayload = data.guests || [];
    const buyerName = `${mainBuyerDetails.firstName} ${mainBuyerDetails.lastName}`.trim();

    // Build enriched selectedTickets with names & prices for the CMS record
    // Use items array (already resolved with correct names from ticketMetaMap in Step E)
    const selectedTicketsForCms = selectedTickets.map((t, idx) => {
      const itemInfo = items[idx] || {};
      return {
        ticketId: t.ticketId,
        ticketName: itemInfo.name || 'כרטיס',
        quantity: t.quantity,
        price: itemInfo.price || 0,
      };
    });

    // Determine payer details: if separate payer use their info, otherwise use first guest (mainBuyer)
    const payerDetailsForCms = payer
      ? { firstName: payer.firstName, lastName: payer.lastName, email: payer.email, phone: payer.phone, companyName: companyName || '' }
      : { firstName: mainBuyerDetails.firstName, lastName: mainBuyerDetails.lastName, email: mainBuyerDetails.email, phone: mainBuyerDetails.phone, companyName: '' };

    // The payer phone is used as the unique identifier for upsert logic
    const payerPhone = payer ? (payer.phone || '') : (mainBuyerDetails.phone || '');

    cartId = await saveAbandonedCart({
      buyerName,
      paymentId: payment.id,
      orderNumber: checkoutRes.order.orderNumber || '',
      totalAmount: amount,
      selectedTickets: selectedTicketsForCms,
      guests: guestsFromPayload,
      hasDifferentPayer: !!payer,
      payerDetails: payerDetailsForCms,
      payerPhone,
      affiliateId: '',
    });
    console.log('handleStartCheckout: abandoned cart saved', { cartId });
  } catch (cartError) {
    console.error('handleStartCheckout: abandoned cart save failed (non-blocking)', cartError);
  }

  // Step G: Start payment with Wix Pay (opens payment UI in browser)
  let paymentRes;
  try {
    paymentRes = await wixPay.startPayment(payment.id, {
      termsAndConditionsLink: 'https://www.tonyrobbins.co.il/terms',
      showThankYouPage: false,
      skipUserInfoPage: true,
    });
    console.log('handleStartCheckout: startPayment RAW result', JSON.stringify(paymentRes));
  } catch (error) {
    // If startPayment is rejected (e.g., user closed modal), treat as cancellation
    console.log('handleStartCheckout: startPayment rejected/cancelled', error);
    // Update cart status to cancelled (fire-and-forget)
    if (cartId) {
      updateCartAfterPayment(cartId, { status: 'cancelled', orderNumber: checkoutRes.order.orderNumber }).catch(() => {});
    }
    return {
      status: 'Cancelled',
      orderNumber: checkoutRes.order.orderNumber,
      ticketsPdf: checkoutRes.order.ticketsPdf,
      customerEmail: userInfo.email,
    };
  }


  let finalStatus = paymentRes.status;

  if (finalStatus === 'Pending') {
    console.log('handleStartCheckout: Pending → treating as Cancelled (Grow/Meshulam card flow)');
    finalStatus = 'Cancelled';
  }

  // Step H: If payment is successful, confirm the order in Wix Events
  // This changes the order status from INITIATED to PAID and triggers ticket emails
  if (finalStatus === 'Successful') {
    try {
      await confirmEventOrder(eventId, checkoutRes.order.orderNumber);
      console.log('handleStartCheckout: order confirmed in Wix Events');
    } catch (confirmError) {
      console.error('handleStartCheckout: failed to confirm order (payment was successful)', confirmError);
      // Don't fail the entire flow - payment was successful, order confirmation can be retried
    }
  }

  // Step I: Update abandoned cart record with payment result (fire-and-forget)
  if (cartId) {
    const cartStatus = finalStatus === 'Successful' ? 'paid' : (finalStatus === 'Cancelled' ? 'cancelled' : 'failed');
    updateCartAfterPayment(cartId, {
      status: cartStatus,
      transactionId: paymentRes.transactionId || '',
      orderNumber: checkoutRes.order.orderNumber,
    }).catch((err) => {
      console.error('handleStartCheckout: cart update after payment failed (non-blocking)', err);
    });
  }

  return {
    status: finalStatus,
    orderNumber: checkoutRes.order.orderNumber,
    ticketsPdf: checkoutRes.order.ticketsPdf,
    customerEmail: userInfo.email,
  };
}