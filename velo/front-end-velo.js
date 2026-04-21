import { orders } from 'wix-events.v2';
import wixPay from 'wix-pay-frontend';
import { analytics } from '@wix/site';
import { session } from 'wix-storage';
import { getTicketMeta, createEventPayment, confirmEventOrder, saveAbandonedCart, updateCartAfterPayment, checkPaymentStatus, sendPendingPaymentWhatsapp, cancelPendingPayment, getOrderDetails } from 'backend/eventLogics';
import wixWindowFrontend from "wix-window-frontend";

$w.onReady(async function () {
    const PRODUCTION_EVENT_ID = '86ac2d0f-e2dc-4c86-9c10-efeb710aa570';
    const TEST_EVENT_ID = '9e19a44f-9fc3-48f2-a9fd-83cedb993d1c';

    const htmlComponent = $w('#eventIframe')

    // Check if admin test mode is active (set by masterPage.js after URL token validation)
    const isAdminTest = session.getItem('isAdminTest') === 'true';

    // In admin test mode, use the test event (with test tickets at 1 ILS)
    const EVENT_ID = isAdminTest ? TEST_EVENT_ID : PRODUCTION_EVENT_ID;

    if (isAdminTest) {
        console.log('[veloEventHandler] Admin test mode is ACTIVE – using test event', TEST_EVENT_ID);
    }

    // Store ticket meta for later use in checkout
    let ticketMetaMap = {};

    // 1. On load – fetch ticket meta from backend (CMS) and send INIT_EVENT_DATA
    try {
        const ticketsPayload = await getTicketMeta(isAdminTest);

        console.log('INIT_EVENT_DATA: loaded tickets from CMS', {
            count: ticketsPayload.length,
            keys: ticketsPayload.map((t) => t.key),
            isAdminTest,
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
                isAdminTest,
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
            try {
                const ticketsPayload = await getTicketMeta(isAdminTest);
                // Refresh the local map too
                ticketsPayload.forEach((t) => {
                    ticketMetaMap[t.id] = t;
                });
                htmlComponent.postMessage({
                    type: 'INIT_EVENT_DATA',
                    payload: {
                        eventId: EVENT_ID,
                        tickets: ticketsPayload,
                        isAdminTest,
                    },
                });
            } catch (error) {
                console.error('REQUEST_INIT: failed to re-fetch ticket metadata', error);
            }
            return;
        }

        // Handle CHECK_PAYMENT_STATUS – iframe polls CMS for payment status updates
        if (message.type === 'CHECK_PAYMENT_STATUS') {
            const { paymentId } = message.data || {};
            const requestId = message.requestId;
            try {
                const statusResult = await checkPaymentStatus(paymentId);
                htmlComponent.postMessage({
                    type: 'CHECK_PAYMENT_STATUS',
                    requestId,
                    success: true,
                    data: statusResult,
                });
            } catch (err) {
                htmlComponent.postMessage({
                    type: 'CHECK_PAYMENT_STATUS',
                    requestId,
                    success: false,
                    error: String(err),
                });
            }
            return;
        }

        // Handle GET_PDF – iframe requests PDF link for a specific order
        if (message.type === 'GET_PDF') {
            const { orderNumber, eventId } = message.data || {};
            const requestId = message.requestId;
            // console.log('🟡 GET_PDF: fetching PDF for order', { orderNumber, eventId: eventId || EVENT_ID });
            try {
                const orderDetails = await getOrderDetails(orderNumber, eventId || EVENT_ID);
                const pdfUrl = orderDetails?.ticketsPdf || '';
                // console.log('🟡 GET_PDF: result', { orderNumber, hasPdf: !!pdfUrl, pdfUrl: pdfUrl ? pdfUrl.substring(0, 80) + '...' : 'EMPTY' });
                htmlComponent.postMessage({
                    type: 'GET_PDF',
                    requestId,
                    success: true,
                    data: { pdfUrl },
                });
            } catch (err) {
                console.error('🟡 GET_PDF: ❌ failed', err);
                htmlComponent.postMessage({
                    type: 'GET_PDF',
                    requestId,
                    success: false,
                    error: String(err),
                });
            }
            return;
        }

        // Handle SEND_PENDING_WHATSAPP – iframe requests WhatsApp notification after 60s polling timeout
        if (message.type === 'SEND_PENDING_WHATSAPP') {
            const { phone, firstName, orderNumber } = message.data || {};
            const requestId = message.requestId;
            try {
                const waResult = await sendPendingPaymentWhatsapp(phone, firstName, orderNumber);
                htmlComponent.postMessage({
                    type: 'SEND_PENDING_WHATSAPP',
                    requestId,
                    success: true,
                    data: waResult,
                });
            } catch (err) {
                htmlComponent.postMessage({
                    type: 'SEND_PENDING_WHATSAPP',
                    requestId,
                    success: false,
                    error: String(err),
                });
            }
            return;
        }

        // Handle CANCEL_PENDING_PAYMENT – user manually cancelled pending payment (clicked "skip waiting")
        if (message.type === 'CANCEL_PENDING_PAYMENT') {
            const { paymentId } = message.data || {};
            const requestId = message.requestId;
            try {
                const cancelResult = await cancelPendingPayment(paymentId);
                htmlComponent.postMessage({
                    type: 'CANCEL_PENDING_PAYMENT',
                    requestId,
                    success: true,
                    data: cancelResult,
                });
            } catch (err) {
                htmlComponent.postMessage({
                    type: 'CANCEL_PENDING_PAYMENT',
                    requestId,
                    success: false,
                    error: String(err),
                });
            }
            return;
        }

        // Handle TRACK_ADD_TO_CART – fire-and-forget, no response needed
        if (message.type === 'TRACK_ADD_TO_CART') {
            const { name, price, quantity, currency, variant } = message.data || {};
            try {
                // const addToCartPayload = {
                //     origin: 'Wix Events - custom flow',
                //     name: 'Wix Events - custom flow',
                //     price: price,
                //     currency: 'ILS',
                //     category: `ticket type ${name}`,
                //     variant: variant || name || 'ticket',
                //     quantity: quantity || 1,
                // }

                // wixWindowFrontend.trackEvent("AddToCart", {
                //     origin: 'Wix Events - custom flow',
                //     name: 'Wix Events - custom flow',
                //     price: price,
                //     currency: 'ILS',
                //     category: `ticket type ${name}`,
                //     variant: variant || name || 'ticket',
                //     quantity: quantity || 1,
                // });

                wixWindowFrontend.trackEvent("CustomEvent", {
                    event: "addToCart - wix event",
                });

                console.log('[veloEventHandler] analytics event fired: AddToCart');
            } catch (trackErr) {
                console.error('[veloEventHandler] TRACK_ADD_TO_CART failed', trackErr);
            }
            return;
        }

        // Handle TRACK_INITIATE_CHECKOUT – fire-and-forget, no response needed
        if (message.type === 'TRACK_INITIATE_CHECKOUT') {
            const { contents } = message.data || {};
            try {
                // const initiateCheckoutPayload = {
                //     origin: 'Wix Events - new',
                //     contents: Array.isArray(contents) ? contents : [],
                // };
                // analytics.trackEvent('InitiateCheckout', initiateCheckoutPayload);
                wixWindowFrontend.trackEvent("CustomEvent", {
                    event: "InitiateCheckout - wix event",

                });

                console.log('[veloEventHandler] analytics event fired: InitiateCheckout');
            } catch (trackErr) {
                console.error('[veloEventHandler] TRACK_INITIATE_CHECKOUT failed', trackErr);
            }
            return;
        }

        if (message.type === 'START_CHECKOUT') {
            // Messages from the React iframe are sent as { type, requestId, data }.
            // Prefer `data` but keep `payload` as a fallback for safety.
            const payload = message.data || message.payload || {};
            const requestId = message.requestId; // Preserve requestId for response matching

            try {
                // console.log('START_CHECKOUT: received payload from iframe', {
                //   selectedTickets: payload.selectedTickets,
                //   mainBuyerDetails: payload.mainBuyerDetails,
                //   hasPayer: !!payload.payer,
                //   totalAmountFromIframe: payload.totalAmount,
                //   requestId,
                // });

                const result = await handleStartCheckout(EVENT_ID, payload, ticketMetaMap, () => {
                    // Intermediate notification: payment popup closed with a valid result.
                    // Update the iframe loading message before heavy processing (confirm/PDF/WhatsApp).
                    htmlComponent.postMessage({ type: 'PAYMENT_PROCESSING' });
                });

                if (result.status === 'successful') {
                    // console.log('PAYMENT_SUCCESS: checkout & payment completed', {
                    //   orderNumber: result.orderNumber,
                    //   amount: result.amount,
                    //   currency: result.currency,
                    // });
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
                            status: 'Successful', // React ThankYou expects capitalized
                        },
                    });

                    // Send enriched GA4 purchase context to React iframe.
                    // React's purchaseTracking.ts will push this to window.parent.dataLayer
                    // where GTM is loaded. Dedup guard in React prevents double-push.
                    const purchaseItems = result.purchaseItems || [];
                    htmlComponent.postMessage({
                        type: 'TRACK_PURCHASE',
                        data: {
                            transaction_id: result.orderNumber,
                            value: result.amount,
                            currency: result.currency || 'ILS',
                            payment_type: 'Meshulam',
                            num_items: purchaseItems.reduce((sum, it) => sum + it.quantity, 0),
                            items: purchaseItems,
                        },
                    });
                    console.log('[veloEventHandler] TRACK_PURCHASE sent to iframe', {
                        orderNumber: result.orderNumber,
                        value: result.amount,
                        numItems: purchaseItems.reduce((sum, it) => sum + it.quantity, 0),
                    });
                } else if (result.status === 'pending') {
                    // IMPORTANT: "Pending" from wixPay.startPayment does NOT mean payment succeeded.
                    // With Grow/Meshulam, closing the popup without paying returns "Pending".
                    // Do NOT treat this as success. The webhook wixPay_onPaymentUpdate will
                    // fire later with the real status (Successful / Cancelled / Failed).
                    htmlComponent.postMessage({
                        type: 'PAYMENT_PENDING',
                        requestId,
                        success: true,
                        data: {
                            orderNumber: result.orderNumber,
                            totalAmount: result.amount,
                            currency: result.currency || 'ILS',
                            customerEmail: result.customerEmail,
                            status: 'Pending',
                            paymentId: result.paymentId,
                            buyerPhone: result.buyerPhone,
                            buyerFirstName: result.buyerFirstName,
                        },
                    });
                } else if (result.status === 'cancelled') {
                    htmlComponent.postMessage({
                        type: 'PAYMENT_CANCELLED',
                        requestId,
                        success: false,
                        error: 'תהליך התשלום בוטל.',
                    });
                } else {
                    // Failed or other status
                    // console.log('PAYMENT_FAILED: payment failed', { status: result.status });
                    htmlComponent.postMessage({
                        type: 'PAYMENT_ERROR',
                        requestId,
                        success: false,
                        error: 'התשלום נכשל, אנא נסה שוב.',
                    });
                }
            } catch (error) {
                console.error('START_CHECKOUT: error in checkout/payment flow', error);
                const errorCode = error?.details?.applicationError?.code || '';
                let userMessage = 'משהו השתבש בתהליך ההזמנה, אנא נסה שוב.';
                if (errorCode === 'INVALID_FORM_RESPONSE') {
                    userMessage = 'אחד מהפרטים שהוזנו אינו תקין (אימייל, שם או טלפון). אנא בדקו ונסו שוב.';
                } else if (errorCode === 'INVALID_RESERVATION') {
                    userMessage = 'ההזמנה פגה תוקף, אנא נסו שוב.';
                }
                htmlComponent.postMessage({
                    type: 'PAYMENT_ERROR',
                    requestId,
                    success: false,
                    error: userMessage,
                });
            }
        }
    });
});

async function handleStartCheckout(eventId, data, ticketMetaMap, onPaymentReceived) {
    const {
        selectedTickets,
        mainBuyerDetails,
        allGuestNames,
        payer,
        companyName,
        totalAmount: totalAmountFromIframe, // Amount calculated in the UI (fallback if CMS has no prices)
    } = data;

    // console.log('handleStartCheckout: start', {
    //   eventId,
    //   selectedTickets,
    //   mainBuyerDetails,
    //   hasPayer: !!payer,
    //   companyName,
    // });

    // Step A: Reserve tickets (wix-events.v2)
    const ticketQuantities = selectedTickets.map((t) => ({
        ticketDefinitionId: t.ticketId,
        quantity: t.quantity,
    }));
    // console.log('handleStartCheckout: creating reservation', { eventId, ticketQuantities });

    const reservationRes = await orders.createReservation(eventId, { ticketQuantities });
    // console.log('handleStartCheckout: reservationRes RAW', JSON.stringify(reservationRes));

    const reservationId = reservationRes._id || reservationRes.id;
    // console.log('handleStartCheckout: reservation created', { reservationId });

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

    // console.log('handleStartCheckout: checkout with guests', { guestCount: guests.length, primaryEmail });

    // Step C: Checkout in Wix Events (v2)
    // If payer is provided (showPayer = true), use payer as the Wix Events buyer.
    // Otherwise, use first guest (mainBuyerDetails) as the buyer.
    const buyerDetails = payer ? { firstName: payer.firstName, lastName: payer.lastName, email: payer.email } : { firstName: mainBuyerDetails.firstName, lastName: mainBuyerDetails.lastName, email: mainBuyerDetails.email };

    // console.log('handleStartCheckout: calling orders.checkout', {
    //   eventId,
    //   reservationId,
    //   guestCount: guests.length,
    //   buyer: buyerDetails,
    // });

    const checkoutRes = await orders.checkout(eventId, {
        reservationId,
        guests,
        buyer: buyerDetails,
    });
    // console.log('handleStartCheckout: checkout created', {
    //   orderNumber: checkoutRes.order && checkoutRes.order.orderNumber,
    // });

    // Step D: Determine user info for payment
    // If payer is provided (different payer selected), use payer details.
    // Otherwise, use first ticket guest details (mainBuyerDetails).
    const userInfo = payer ? {
        firstName: payer.firstName,
        lastName: payer.lastName,
        email: payer.email,
        phone: payer.phone,
    } : {
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
        const fallbackPrice = totalAmountFromIframe && totalQuantity > 0 ?
            Math.round((totalAmountFromIframe / totalQuantity) * 100) / 100 :
            0;
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

    // console.log('handleStartCheckout: computed amount from items', {
    //   amount,
    //   items,
    //   totalAmountFromIframe,
    // });

    // Step F: Create payment in backend (secure – price defined server-side)
    const payment = await createEventPayment({
        items,
        amount,
        userInfo,
    });
    // console.log('handleStartCheckout: backend payment created', {
    //   paymentId: payment.id,
    // });

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
        const payerDetailsForCms = payer ? { firstName: payer.firstName, lastName: payer.lastName, email: payer.email, phone: payer.phone, companyName: companyName || '' } : { firstName: mainBuyerDetails.firstName, lastName: mainBuyerDetails.lastName, email: mainBuyerDetails.email, phone: mainBuyerDetails.phone, companyName: '' };

        // The payer phone is used as the unique identifier for upsert logic
        const payerPhone = payer ? (payer.phone || '') : (mainBuyerDetails.phone || '');

        cartId = await saveAbandonedCart({
            buyerName,
            paymentId: payment.id,
            orderNumber: checkoutRes.order.orderNumber || '',
            eventId,
            totalAmount: amount,
            selectedTickets: selectedTicketsForCms,
            guests: guestsFromPayload,
            hasDifferentPayer: !!payer,
            payerDetails: payerDetailsForCms,
            payerPhone,
            affiliateId: '',
        });
        // console.log('handleStartCheckout: abandoned cart saved', { cartId });
    } catch (cartError) {
        console.error('handleStartCheckout: abandoned cart save failed (non-blocking)', cartError);
    }

    // Step G: Start payment with Wix Pay (opens payment UI in browser)
    let paymentRes;
    try {
        // const addPaymentInfoPayload = {
        //     origin: 'Wix Events',
        //     option: 'Meshulam',
        // };

        // analytics.trackEvent('AddPaymentInfo', addPaymentInfoPayload);
        // console.log('[veloEventHandler] analytics event fired: AddPaymentInfo', addPaymentInfoPayload);
        wixWindowFrontend.trackEvent("CustomEvent", {
            event: "AddPaymentInfo - wix event",
        });

        paymentRes = await wixPay.startPayment(payment.id, {
            termsAndConditionsLink: 'https://www.tonyrobbins.co.il/terms',
            showThankYouPage: false,
            skipUserInfoPage: true,
        });
        // console.log('handleStartCheckout: startPayment RAW result', JSON.stringify(paymentRes));
    } catch (error) {
        // If startPayment is rejected (e.g., user closed modal), treat as cancellation
        // console.log('handleStartCheckout: startPayment rejected/cancelled', error);
        // Update cart status to cancelled (fire-and-forget)
        if (cartId) {
            updateCartAfterPayment(cartId, { status: 'cancelled', orderNumber: checkoutRes.order.orderNumber }).catch(() => {});
        }
        return {
            status: 'cancelled',
            orderNumber: checkoutRes.order.orderNumber,
            ticketsPdf: checkoutRes.order.ticketsPdf,
            customerEmail: userInfo.email,
        };
    }

    const rawStatus = paymentRes.status || '';
    const finalStatus = rawStatus.toLowerCase();

    // Notify iframe that payment popup closed with a valid result so the loading
    // message can change from "מתחיל תהליך תשלום..." to "רק רגע בבקשה..." immediately.
    // Only treat "successful" as a valid payment. "Pending" from Grow/Meshulam
    // can mean the user just closed the popup without paying.
    const hasValidPayment = finalStatus === 'successful' &&
        paymentRes.transactionId &&
        paymentRes.payment && paymentRes.payment.id;

    if (hasValidPayment && typeof onPaymentReceived === 'function') {
        try { onPaymentReceived(); } catch (_) { /* non-blocking */ }
    }

    // Step H: Handle payment result based on status
    if (finalStatus === 'successful') {
        // H1: Confirm the order in Wix Events immediately (INITIATED → PAID)
        try {
            await confirmEventOrder(eventId, checkoutRes.order.orderNumber);
        } catch (confirmError) {
            console.error('handleStartCheckout: failed to confirm order (payment was successful)', confirmError);
        }

        // H2: Update cart to paid (fire-and-forget, don't block UI)
        // PDF fetching & WhatsApp delivery are handled in the backend by
        // wixEventsOrders_onOrderConfirmed (events.js) – no need to wait here.
        if (cartId) {
            updateCartAfterPayment(cartId, {
                status: 'paid',
                transactionId: paymentRes.transactionId || '',
                orderNumber: checkoutRes.order.orderNumber,
            }).catch((err) => {
                console.error('handleStartCheckout: cart update after payment failed (non-blocking)', err);
            });
        }

        // console.log('handleStartCheckout: payment successful, returning immediately to UI', {
        //   orderNumber: checkoutRes.order.orderNumber,
        // });
    } else if (finalStatus === 'pending') {
        // Payment is pending verification by card company (common with Grow/Meshulam).
        // Do NOT confirm the order yet – the wixPay_onPaymentUpdate event handler
        // in events.js will confirm it when the payment status changes to Successful.

        if (cartId) {
            updateCartAfterPayment(cartId, {
                status: 'pending-payment',
                transactionId: paymentRes.transactionId || '',
                orderNumber: checkoutRes.order.orderNumber,
            }).catch((err) => {
                console.error('handleStartCheckout: cart update to pending-payment failed (non-blocking)', err);
            });
        }
    } else {
        // Cancelled, Failed, or other status
        if (cartId) {
            const cartStatus = finalStatus === 'cancelled' ? 'cancelled' : 'failed';
            updateCartAfterPayment(cartId, {
                status: cartStatus,
                transactionId: paymentRes.transactionId || '',
                orderNumber: checkoutRes.order.orderNumber,
            }).catch((err) => {
                console.error('handleStartCheckout: cart update after payment failed (non-blocking)', err);
            });
        }
    }

    // Fire Purchase tracking event only after a successful payment
    let purchaseItems = [];
    if (finalStatus === 'successful') {
        try {
            // Build GA4-compatible items array from CMS ticket meta
            purchaseItems = selectedTickets.map((t) => {
                const meta = ticketMetaMap[t.ticketId] || {};
                return {
                    item_id: t.ticketId,
                    item_name: meta.name || 'כרטיס',
                    item_category: 'Event Ticket',
                    item_variant: meta.key || meta.name || 'ticket',
                    price: meta.price || 0,
                    quantity: t.quantity,
                };
            });

            const numItems = selectedTickets.reduce((sum, t) => sum + t.quantity, 0);
            const orderNumber = checkoutRes.order.orderNumber;

            // Wix CustomEvent for GTM trigger (consistent with AddToCart / InitiateCheckout pattern)
            wixWindowFrontend.trackEvent("CustomEvent", {
                event: "purchase - wix event",
            });

            // Keep legacy analytics.trackEvent for Wix's own BI / pixel tracking
            analytics.trackEvent('Purchase', {
                id: orderNumber,
                origin: 'Wix Events',
                revenue: amount,
                currency: 'ILS',
                tax: 0,
                shipping: 0,
                contents: purchaseItems.map((it) => ({
                    id: it.item_id,
                    name: it.item_name,
                    price: it.price,
                    quantity: it.quantity,
                })),
            });
            console.log('[veloEventHandler] analytics event fired: Purchase', { orderNumber, amount, numItems });

        } catch (trackErr) {
            console.error('[veloEventHandler] Purchase tracking failed (non-blocking)', trackErr);
        }
    }

    return {
        status: finalStatus,
        orderNumber: checkoutRes.order.orderNumber,
        ticketsPdf: '',
        customerEmail: userInfo.email,
        amount,
        paymentId: payment.id,
        buyerPhone: userInfo.phone,
        buyerFirstName: userInfo.firstName,
        purchaseItems, // GA4 items passed back to caller for TRACK_PURCHASE postMessage
    };
}

// Wix Studio - Velo

const ISRAEL_TZ = 'Asia/Jerusalem';

// שעות פעילות
const START_HOUR = 10; // 10:00
const END_HOUR = 17; // עד 16:59

// תאריך סיום (לא יוצג מהיום הזה והלאה)
const STOP_DATE = { day: 12, month: 3 }; // 12/03

$w.onReady(function () {

    $w('#button12').hide();
    $w('#button13').hide();

    updateButtonsVisibility();
    setInterval(updateButtonsVisibility, 60000);
});

function updateButtonsVisibility() {

    const now = new Date();

    // זמן לפי ישראל
    const israelNow = new Date(
        now.toLocaleString('en-US', { timeZone: ISRAEL_TZ })
    );

    const year = israelNow.getFullYear();
    const month = israelNow.getMonth() + 1;
    const day = israelNow.getDate();
    const hour = israelNow.getHours();
    const weekday = israelNow.getDay();
    // 0=ראשון, 1=שני ... 6=שבת

    // בדיקת תאריך סיום
    const stopDateObj = new Date(year, STOP_DATE.month - 1, STOP_DATE.day);
    if (israelNow >= stopDateObj) {
        hideButtons();
        return;
    }

    // ראשון (0) עד חמישי (4)
    const isWeekday = weekday >= 0 && weekday <= 4;

    // שעות פעילות
    const isInHours = hour >= START_HOUR && hour < END_HOUR;

    if (isWeekday && isInHours) {
        showButtons();
    } else {
        hideButtons();
    }
}

function showButtons() {
    $w('#button12').show();
    $w('#button13').show();
}

function hideButtons() {
    $w('#button12').hide();
    $w('#button13').hide();
}