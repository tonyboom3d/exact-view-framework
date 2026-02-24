import wixData from 'wix-data';
import wixPayBackend from 'wix-pay-backend';
import { orders } from 'wix-events.v2';
import { elevate } from 'wix-auth';
import { triggeredEmails } from 'wix-crm-backend';
import { contacts } from 'wix-crm-backend';
import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
// Test mode disabled for production. Admin test mode is controlled via URL param + Secret Manager.
const TEST_MODE_ENABLED = false;

// Elevated functions (require elevated permissions)
const elevatedConfirmOrder = elevate(orders.confirmOrder);
const elevatedGetOrder = elevate(orders.getOrder);

/**
 * Validates an admin test token against the secret stored in Wix Secret Manager.
 * Returns true only if the token matches the stored secret.
 */
export async function validateAdminToken(token) {
    try {
        if (!token) return false;
        const secret = await getSecret('adminTestToken');
        return token === secret;
    } catch (error) {
        console.error('validateAdminToken: failed', error);
        return false;
    }
}

/** Get price from CMS item – Wix might use 'price' or 'priceAmount' etc. */
function getItemPrice(item) {
    const raw = item.price ?? item.priceAmount ?? item.amount ?? item.ticketPrice ?? 0;
    const num = Number(raw);
    return typeof num === 'number' && !Number.isNaN(num) ? num : 0;
}

// Admin test mode: override General Admission ticket to use the test-event ticket ID
const ADMIN_TEST_GENERAL_TICKET_ID = '8aaefbe9-2f9e-41f6-8937-094f81abb164';

export async function getTicketMeta(isAdminTest = false) {
    const cmsTickets = await wixData.query('TonyRobbinsTickets').find({ suppressAuth: true });
    const items = cmsTickets.items;
    if (items.length > 0) {
        const first = items[0];
        const keys = Object.keys(first).filter((k) => k !== '_id' && k !== '_owner');
        console.log('[getTicketMeta] CMS item keys (check price field name):', keys, 'sample:', { price: first.price, priceAmount: first.priceAmount, amount: first.amount });
    }

    return items.map((item) => {
        const price = isAdminTest ? 1 : getItemPrice(item);
        // In admin test mode, override General Admission ticket ID to match the test event
        const ticketId = (isAdminTest && item.ticketKey && item.ticketKey.toLowerCase() === 'general')
            ? ADMIN_TEST_GENERAL_TICKET_ID
            : item.wixTicketId;

        return {
            key: item.ticketKey,
            id: ticketId,
            soldPercent: item.soldPercent,
            isSoldOut: item.isSoldOut,
            price,
            name: item.name,
            tagText: item.textOnTag || '',
        };
    });
}

// ── A/B Test Configuration ───────────────────────────────────────────

/**
 * Fetches the A/B test configuration from the ABTestConfig single-item CMS collection.
 * Returns the newFlowPercentage (0-100) that determines what % of users see the new flow.
 */
export async function getABTestConfig() {
    try {
        const result = await wixData.query('ABTestConfig').find({ suppressAuth: true });

        if (result.items.length === 0) {
            console.log('getABTestConfig: no config found, defaulting to 0%');
            return { newFlowPercentage: 0 };
        }

        const config = result.items[0];
        console.log('getABTestConfig: found config', { newFlowPercentage: config.newFlowPercentage });
        return {
            newFlowPercentage: config.newFlowPercentage || 0,
        };
    } catch (error) {
        console.error('getABTestConfig: failed to fetch config', error);
        return { newFlowPercentage: 0 };
    }
}

export async function createEventPayment(paymentData) {
    const { items, amount, userInfo } = paymentData;

    const fullUserInfo = {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        phone: userInfo.phone,
        countryCode: 'ISR',
    };

    const payment = await wixPayBackend.createPayment({
        items,
        amount,
        userInfo: fullUserInfo,
    });

    return payment;
}

/**
 * Confirms an order in Wix Events after payment is successful.
 * Changes order status from INITIATED/PENDING to PAID, which triggers
 * the email with tickets to the buyer (and guests).
 * 
 * NOTE: If the order is already confirmed (PAID status), this function
 * will skip the confirmation and return successfully. This handles the case
 * where Wix Pay automatically confirms the order before we call this.
 */
export async function confirmEventOrder(eventId, orderNumber) {
    console.log('confirmEventOrder: confirming order', { eventId, orderNumber });

    // First check current order status to avoid "ORDER_ACTION_NOT_AVAILABLE" error
    try {
        const rawOrderData = await elevatedGetOrder(
            { eventId, orderNumber },
            { fieldset: ['DETAILS'] }
        );
        // Handle both { order: {...} } and direct order response
        const orderObj = rawOrderData?.order || rawOrderData || {};
        const currentStatus = orderObj?.status;

        console.log('confirmEventOrder: current order status', { orderNumber, currentStatus });

        // If order is already PAID/CONFIRMED, skip confirmation (already done by Wix Pay)
        if (currentStatus === 'PAID' || currentStatus === 'CONFIRMED') {
            console.log('confirmEventOrder: order already confirmed, skipping', { orderNumber, currentStatus });
            return { orders: [orderObj], alreadyConfirmed: true };
        }

        // If order is not in a state that can be confirmed, log and skip
        if (currentStatus !== 'INITIATED' && currentStatus !== 'PENDING') {
            console.warn('confirmEventOrder: order not in confirmable state', { orderNumber, currentStatus });
            return { orders: [], skipped: true, reason: `Order status is ${currentStatus}` };
        }
    } catch (statusCheckError) {
        // If we can't check status, proceed with confirmation attempt
        console.warn('confirmEventOrder: could not check order status, proceeding with confirmation', {
            orderNumber,
            error: String(statusCheckError),
        });
    }

    // Proceed with confirmation
    const result = await elevatedConfirmOrder(eventId, { orderNumber: [orderNumber] });
    console.log('confirmEventOrder: order confirmed', { confirmedOrders: result?.orders?.length });
    return result;
}

/**
 * Cancels an unconfirmed order in Wix Events.
 * Used to clean up orders when payment is cancelled or failed.
 * Only works on orders that haven't been confirmed yet (status INITIATED/PENDING).
 * If the order is already confirmed (PAID), this will log a warning and skip.
 *
 * @param {string} eventId - The Wix Events event ID
 * @param {string} orderNumber - The order number to cancel
 */
export async function cancelEventOrder(eventId, orderNumber) {
    try {
        console.log('cancelEventOrder: attempting to cancel', { eventId, orderNumber });

        // First, check the current order status
        const rawOrderData = await elevatedGetOrder(
            { eventId, orderNumber },
            { fieldset: ['DETAILS'] }
        );
        // Handle both { order: {...} } and direct order response
        const orderObj = rawOrderData?.order || rawOrderData || {};
        const currentStatus = orderObj?.status;

        if (currentStatus === 'PAID' || currentStatus === 'CONFIRMED') {
            console.warn('cancelEventOrder: order already confirmed/paid, cannot cancel', {
                orderNumber,
                currentStatus,
            });
            return { success: false, reason: 'already_confirmed' };
        }

        // Note: Wix Events v2 API does not have a deleteOrder method.
        // Orders with status INITIATED or PENDING will remain in that state
        // and won't be processed further since payment failed.
        // The order will naturally expire or remain pending, which is acceptable.
        console.log('cancelEventOrder: order remains in unconfirmed state (payment failed)', {
            orderNumber,
            currentStatus,
        });
        return { success: true, reason: 'order_left_pending' };
    } catch (error) {
        // If the order doesn't exist or is already deleted, that's OK
        const errMsg = String(error);
        if (errMsg.includes('NOT_FOUND') || errMsg.includes('not found')) {
            console.log('cancelEventOrder: order not found (may already be deleted)', { orderNumber });
            return { success: true, reason: 'not_found' };
        }
        console.error('cancelEventOrder: failed to cancel order', { orderNumber, error: errMsg });
        return { success: false, error: errMsg };
    }
}

// ── Post-payment: fetch order & send ticket email ───────────────────

const DEFAULT_EVENT_ID = '86ac2d0f-e2dc-4c86-9c10-efeb710aa570';

/**
 * Fetches order details from Wix Events after payment is confirmed.
 * Returns only the fields we need: email, fullName, ticketsPdf, orderNumber, status.
 * @param {string} orderNumber
 * @param {string} [eventId] - optional, defaults to production event
 */
export async function getOrderDetails(orderNumber, eventId) {
    const resolvedEventId = eventId || DEFAULT_EVENT_ID;
    console.log('🔷📋 getOrderDetails: fetching order', { orderNumber, eventId: resolvedEventId });
    const result = await elevatedGetOrder(
        { eventId: resolvedEventId, orderNumber },
        { fieldset: ['DETAILS', 'TICKETS'] }
    );

    // Wix Events v2 SDK may return { order: {...} } or the order directly.
    // Handle both structures.
    const order = result?.order || result || {};

    // Debug: log raw result structure to identify correct path
    console.log('🔷📋 getOrderDetails: RAW result type', typeof result);
    console.log('🔷📋 getOrderDetails: RAW result keys', Object.keys(result || {}));
    console.log('🔷📋 getOrderDetails: has result.order?', !!result?.order);
    console.log('🔷📋 getOrderDetails: order keys', Object.keys(order));
    console.log('🔷📋 getOrderDetails: order.ticketsPdf', order.ticketsPdf);
    console.log('🔷📋 getOrderDetails: order.tickets length', Array.isArray(order.tickets) ? order.tickets.length : 'not-array');
    if (Array.isArray(order.tickets) && order.tickets.length > 0) {
        console.log('🔷📋 getOrderDetails: first ticket keys', Object.keys(order.tickets[0]));
        console.log('🔷📋 getOrderDetails: first ticket ticketPdfUrl', order.tickets[0]?.ticketPdfUrl);
    }

    // PDF URL can be in different locations:
    // 1. order.ticketsPdf (combined PDF for all tickets)
    // 2. order.tickets[0].ticketPdfUrl (per-ticket PDF)
    let ticketPdfUrl = order.ticketsPdf || '';
    if (!ticketPdfUrl && Array.isArray(order.tickets) && order.tickets.length > 0) {
        ticketPdfUrl = order.tickets[0]?.ticketPdfUrl || '';
    }

    // Convert signed Wix Events PDF URL to a public CDN URL
    let publicPdfUrl = ticketPdfUrl;
    if (ticketPdfUrl) {
        const converted = await convertPdfToPublicUrl(ticketPdfUrl, order.orderNumber || orderNumber);
        if (converted) {
            publicPdfUrl = converted;
        }
    }

    console.log('🔷📋 getOrderDetails: fetched', {
        orderNumber: order.orderNumber,
        status: order.status,
        email: order.email,
        fullName: order.fullName,
        hasTicketsPdf: !!publicPdfUrl,
        ticketsPdfUrl: publicPdfUrl || 'MISSING',
        pdfSource: order.ticketsPdf ? 'order.ticketsPdf' : (order.tickets?.[0]?.ticketPdfUrl ? 'order.tickets[0].ticketPdfUrl' : 'NONE'),
    });
    return {
        orderNumber: order.orderNumber || orderNumber,
        status: order.status,
        email: order.email || '',
        firstName: order.firstName || '',
        lastName: order.lastName || '',
        fullName: order.fullName || '',
        ticketsPdf: publicPdfUrl,
        ticketsQuantity: order.ticketsQuantity || 0,
        contactId: order.contactId || '',
    };
}

/**
 * Sends a triggered email with ticket details to the buyer.
 * Requires a triggered email template to be set up in Wix with the emailId.
 * 
 * Variables available in the email template:
 *   {{fullName}}, {{orderNumber}}, {{ticketsPdf}}, {{ticketsQuantity}}
 * 
 * @param {string} emailId - The triggered email template ID (from Wix Triggered Emails)
 * @param {string} contactId - The Wix contact ID of the buyer
 * @param {object} orderData - Order details from getOrderDetails
 */
export async function sendTicketEmail(emailId, contactId, orderData) {
    try {
        if (!contactId) {
            console.warn('sendTicketEmail: no contactId, trying to find by email');
            if (orderData.email) {
                const queryResults = await contacts.queryContacts()
                    .eq('info.emails.email', orderData.email)
                    .find();
                if (queryResults.items.length > 0) {
                    contactId = queryResults.items[0]._id;
                    console.log('sendTicketEmail: found contactId by email', { contactId });
                } else {
                    console.error('sendTicketEmail: no contact found for email', { email: orderData.email });
                    return { success: false, error: 'Contact not found' };
                }
            } else {
                console.error('sendTicketEmail: no contactId and no email');
                return { success: false, error: 'No contactId or email' };
            }
        }

        console.log('sendTicketEmail: sending email', { emailId, contactId, orderNumber: orderData.orderNumber });

        await triggeredEmails.emailContact(emailId, contactId, {
            variables: {
                fullName: orderData.fullName || `${orderData.firstName} ${orderData.lastName}`.trim(),
                orderNumber: orderData.orderNumber || '',
                ticketsPdf: orderData.ticketsPdf || '',
                ticketsQuantity: String(orderData.ticketsQuantity || 1),
            },
        });

        console.log('sendTicketEmail: email sent successfully');
        return { success: true };
    } catch (error) {
        console.error('sendTicketEmail: failed', error);
        return { success: false, error: String(error) };
    }
}

// ── Abandoned Cart tracking ──────────────────────────────────────────

/**
 * Saves or updates an abandoned-cart record in the aboundedcarts CMS collection.
 * Uses payerPhone to detect if the user already has an existing record (upsert).
 * Called right after createEventPayment, before the user enters payment details.
 * Returns the CMS item _id so it can be updated after payment.
 */
export async function saveAbandonedCart(cartData) {
    try {
        const payerPhone = (cartData.payerPhone || '').trim();

        const guestsJson = JSON.stringify(cartData.guests || []);
        const selectedTicketsJson = JSON.stringify(cartData.selectedTickets || []);
        const payerDetailsJson = cartData.payerDetails ? JSON.stringify(cartData.payerDetails) : '';

        console.log('saveAbandonedCart: preparing record', {
            buyerName: cartData.buyerName,
            payerPhone,
            orderNumber: cartData.orderNumber,
            guestsLength: guestsJson.length,
            selectedTicketsLength: selectedTicketsJson.length,
        });

        const record = {
            title: `${cartData.buyerName || 'Guest'} – ${new Date().toLocaleString('he-IL')}`,
            status: 'in-progress',
            paymentId: cartData.paymentId || '',
            transactionId: '',
            orderNumber: cartData.orderNumber || '',
            eventId: cartData.eventId || '',
            totalAmount: cartData.totalAmount || 0,
            selectedTickets: selectedTicketsJson,
            guests: guestsJson,
            hasDifferentPayer: !!cartData.hasDifferentPayer,
            payerDetails: payerDetailsJson,
            payerPhone,
            affiliateId: cartData.affiliateId || '',
            ticketsPdf: '',
        };

        // Check if a record already exists for this phone number
        let existingRecord = null;
        if (payerPhone) {
            const existing = await wixData.query('aboundedcarts')
                .eq('payerPhone', payerPhone)
                .descending('_createdDate')
                .limit(1)
                .find({ suppressAuth: true });

            if (existing.items.length > 0) {
                existingRecord = existing.items[0];
            }
        }

        if (existingRecord) {
            // Update existing record with fresh data
            Object.assign(existingRecord, record);
            console.log('saveAbandonedCart: updating existing record', { _id: existingRecord._id, payerPhone });
            const result = await wixData.update('aboundedcarts', existingRecord, { suppressAuth: true });
            console.log('saveAbandonedCart: updated', { _id: result._id });
            return result._id;
        } else {
            // Insert new record
            console.log('saveAbandonedCart: inserting new record', { title: record.title, payerPhone });
            const result = await wixData.insert('aboundedcarts', record, { suppressAuth: true });
            console.log('saveAbandonedCart: inserted', { _id: result._id });
            return result._id;
        }
    } catch (error) {
        console.error('saveAbandonedCart: failed (non-blocking)', error);
        return null;
    }
}

/**
 * Updates an existing abandoned-cart record after payment completes.
 * Fetches the record first, merges the update fields, then saves.
 */
export async function updateCartAfterPayment(cartId, updateData) {
    try {
        if (!cartId) {
            console.warn('updateCartAfterPayment: no cartId, skipping');
            return;
        }

        console.log('updateCartAfterPayment: fetching record', { cartId });
        const record = await wixData.get('aboundedcarts', cartId, { suppressAuth: true });
        if (!record) {
            console.warn('updateCartAfterPayment: record not found', { cartId });
            return;
        }

        // Merge update fields
        if (updateData.status) record.status = updateData.status;
        if (updateData.transactionId) record.transactionId = updateData.transactionId;
        if (updateData.orderNumber) record.orderNumber = updateData.orderNumber;
        if (updateData.ticketsPdf) record.ticketsPdf = updateData.ticketsPdf;

        console.log('updateCartAfterPayment: updating record', { cartId, status: record.status });
        await wixData.update('aboundedcarts', record, { suppressAuth: true });
        console.log('updateCartAfterPayment: updated successfully');
    } catch (error) {
        console.error('updateCartAfterPayment: failed (non-blocking)', error);
    }
}

// ── Pending Payment Confirmation (called by wixPay_onPaymentUpdate) ──

/**
 * Updates an abandoned-cart record by paymentId (used by the webhook handler
 * when we don't have the cartId handy).
 * @param {string} paymentId - The Wix Pay payment ID
 * @param {string} newStatus - The new status to set (e.g. 'cancelled', 'failed')
 */
export async function updateCartByPaymentId(paymentId, newStatus) {
    try {
        if (!paymentId) {
            console.warn('updateCartByPaymentId: no paymentId, skipping');
            return;
        }

        const results = await wixData.query('aboundedcarts')
            .eq('paymentId', paymentId)
            .descending('_createdDate')
            .limit(1)
            .find({ suppressAuth: true, consistentRead: true });

        if (results.items.length === 0) {
            console.warn('updateCartByPaymentId: no record found', { paymentId });
            return;
        }

        const record = results.items[0];
        record.status = newStatus;
        await wixData.update('aboundedcarts', record, { suppressAuth: true });
        console.log('updateCartByPaymentId: updated', { paymentId, newStatus, _id: record._id });
    } catch (error) {
        console.error('updateCartByPaymentId: failed', error);
    }
}

/**
 * Confirms a pending order after the payment provider approves the charge.
 * Called by the wixPay_onPaymentUpdate event handler in events.js.
 *
 * Flow:
 *   1. Look up aboundedcarts by paymentId
 *   2. If not found → throw (so the event retries)
 *   3. If already 'paid' → return early (idempotent)
 *   4. confirmEventOrder in Wix Events
 *   5. Fetch order details (PDF)
 *   6. Update CMS to 'paid'
 *   7. Trigger WhatsApp delivery (fire-and-forget)
 *
 * @param {string} paymentId - The Wix Pay payment ID
 * @param {string} [transactionId] - Optional transaction ID from the event
 * @returns {Promise<{success: boolean, orderNumber?: string, alreadyConfirmed?: boolean}>}
 */
export async function confirmPendingPayment(paymentId, transactionId) {
    console.log('confirmPendingPayment: starting', { paymentId, transactionId });

    // Step 1: Look up the CMS record by paymentId (consistentRead to avoid stale cache)
    const results = await wixData.query('aboundedcarts')
        .eq('paymentId', paymentId)
        .descending('_createdDate')
        .limit(1)
        .find({ suppressAuth: true, consistentRead: true });

    if (results.items.length === 0) {
        // Record not found – throw so the webhook retries
        console.error('confirmPendingPayment: no cart record found for paymentId', { paymentId });
        throw new Error(`Cart record not found for paymentId: ${paymentId}`);
    }

    const record = results.items[0];
    const { orderNumber, eventId, status } = record;

    console.log('confirmPendingPayment: found record', {
        _id: record._id,
        orderNumber,
        eventId,
        currentStatus: status,
    });

    // Step 2: Idempotency – if already paid, skip
    if (status === 'paid') {
        console.log('confirmPendingPayment: order already confirmed (status=paid), skipping', { orderNumber });
        return { success: true, orderNumber, alreadyConfirmed: true };
    }

    // Step 3: Validate required fields
    if (!orderNumber || !eventId) {
        console.error('confirmPendingPayment: missing orderNumber or eventId', { orderNumber, eventId });
        throw new Error(`Missing orderNumber or eventId for paymentId: ${paymentId}`);
    }

    // Step 4: Confirm the order in Wix Events (INITIATED/PENDING → PAID)
    try {
        await confirmEventOrder(eventId, orderNumber);
        console.log('confirmPendingPayment: order confirmed in Wix Events', { orderNumber });
    } catch (confirmError) {
        console.error('confirmPendingPayment: failed to confirm order', confirmError);
        throw confirmError;
    }

    // Step 5: Fetch order details (PDF) – wait for Wix Events to generate
    // Retry up to 5 times with 15 second intervals to give Wix time to create the PDF
    let ticketsPdf = '';
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds

        try {
            const orderData = await getOrderDetails(orderNumber, eventId);
            ticketsPdf = orderData.ticketsPdf || '';

            console.log(`🔷💳 confirmPendingPayment: PDF fetch attempt ${attempt}/${maxRetries}`, {
                ticketsPdf: ticketsPdf || 'MISSING',
            });

            if (ticketsPdf) {
                break; // Got the PDF, exit retry loop
            }
        } catch (fetchError) {
            console.error(`confirmPendingPayment: PDF fetch attempt ${attempt} failed`, fetchError);
        }
    }

    if (!ticketsPdf) {
        console.warn('🔷💳 confirmPendingPayment: PDF not available after all retries', { orderNumber });
    }

    // Note: getOrderDetails already converts the signed PDF URL to a public URL
    // via convertPdfToPublicUrl, so no additional conversion is needed here.

    // Step 6: Update CMS record to 'paid'
    try {
        record.status = 'paid';
        if (transactionId) record.transactionId = transactionId;
        if (ticketsPdf) record.ticketsPdf = ticketsPdf;
        await wixData.update('aboundedcarts', record, { suppressAuth: true });
        console.log('confirmPendingPayment: CMS record updated to paid', { _id: record._id });
    } catch (updateError) {
        console.error('confirmPendingPayment: failed to update CMS (non-blocking)', updateError);
    }

    // Step 7: Trigger WhatsApp delivery (fire-and-forget)
    if (ticketsPdf) {
        try {
            let guests = [];
            try {
                guests = JSON.parse(record.guests || '[]');
            } catch (e) {
                guests = [];
            }

            if (guests.length > 0) {
                processWhatsappDelivery(orderNumber, guests, ticketsPdf)
                    .then((waResult) => {
                        console.log('confirmPendingPayment: WhatsApp delivery result', waResult);
                    })
                    .catch((waErr) => {
                        console.error('confirmPendingPayment: WhatsApp delivery failed (non-blocking)', waErr);
                    });
            }
        } catch (waError) {
            console.error('confirmPendingPayment: WhatsApp setup failed (non-blocking)', waError);
        }
    }

    console.log('confirmPendingPayment: done', { orderNumber, paymentId });
    return { success: true, orderNumber, alreadyConfirmed: false };
}

// ── PDF Public URL Conversion ────────────────────────────────────────

/**
 * Converts a Wix Events signed PDF URL (JWS token) into a direct,
 * publicly accessible PDF download URL.
 *
 * The Wix Events ticketsPdf URL (events.wixapps.net) serves an HTML page
 * with a "Download Tickets" button, not a direct PDF. The actual flow is:
 *   1. events.wixapps.net redirects to papyrus.wixapps.net with a new JWS token
 *   2. The download button calls papyrus.wixapps.net/papyrus-document/v1/documents/download-url?fileToken=...
 *   3. That endpoint returns JSON with the direct PDF download URL
 *
 * @param {string} wixPdfUrl - The signed Wix Events PDF URL
 * @param {string} [orderNumber] - Order number for logging
 * @returns {Promise<string>} Direct PDF URL, or empty string on failure
 */
export async function convertPdfToPublicUrl(wixPdfUrl, orderNumber) {
    const tag = '🔷📄 [convertPdfToPublicUrl]';

    if (!wixPdfUrl) {
        console.warn(`${tag} called with empty URL`);
        return '';
    }

    console.log(`${tag} START`, { orderNumber, wixPdfUrl: wixPdfUrl.substring(0, 80) + '...' });

    try {
        // ── Step 1: Fetch the page and extract the papyrus JWS token ─
        // events.wixapps.net redirects to papyrus.wixapps.net with a new
        // JWS token containing the documentId. wix-fetch auto-follows
        // redirects, so we get the final HTML page directly.
        let fileToken = '';

        const pageResponse = await fetch(wixPdfUrl);
        const finalUrl = pageResponse.url || '';

        if (finalUrl && finalUrl.includes('papyrus.wixapps.net')) {
            try {
                const urlObj = new URL(finalUrl);
                fileToken = urlObj.searchParams.get('file') || '';
            } catch (e) { /* ignore */ }
            console.log(`${tag} Step 1 – got papyrus URL from response.url`, { hasToken: !!fileToken });
        }

        // If response.url didn't work, extract token from the HTML body
        if (!fileToken) {
            const html = await pageResponse.text();
            const tokenMatch = html.match(/file=JWS\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/);
            if (tokenMatch) {
                fileToken = tokenMatch[0].replace('file=', '');
                console.log(`${tag} Step 1 – extracted token from HTML`);
            }
        }

        // Fallback: use the original JWS token from events.wixapps.net
        if (!fileToken) {
            try {
                const originalUrl = new URL(wixPdfUrl);
                fileToken = originalUrl.searchParams.get('file') || '';
                if (fileToken) {
                    console.log(`${tag} Step 1 – using original token as fallback`);
                }
            } catch (e) { /* ignore */ }
        }

        if (!fileToken) {
            console.error(`${tag} could not extract fileToken`);
            return '';
        }

        console.log(`${tag} Step 1 – extracted fileToken`, { tokenPrefix: fileToken.substring(0, 40) + '...' });

        // ── Step 2: Call the papyrus download-url endpoint ───────────
        const downloadUrlEndpoint = `https://papyrus.wixapps.net/papyrus-document/v1/documents/download-url?fileToken=${fileToken}`;
        const downloadResponse = await fetch(downloadUrlEndpoint);
        const downloadText = await downloadResponse.text();

        console.log(`${tag} Step 2 – response`, {
            status: downloadResponse.status,
            contentType: downloadResponse.headers.get('content-type'),
            bodyLength: downloadText.length,
        });

        if (!downloadResponse.ok) {
            console.error(`${tag} Step 2 – endpoint error`, { status: downloadResponse.status, body: downloadText.substring(0, 200) });
            return '';
        }

        let downloadData;
        try {
            downloadData = JSON.parse(downloadText);
        } catch (e) {
            if (downloadText.startsWith('http')) {
                console.log(`${tag} Step 2 – direct URL string`);
                return downloadText.trim();
            }
            console.error(`${tag} Step 2 – unparseable response`, { first100: downloadText.substring(0, 100) });
            return '';
        }

        const publicUrl = downloadData.downloadPageUrl
            || downloadData.url
            || downloadData.downloadUrl
            || downloadData.pdfUrl
            || downloadData.fileUrl
            || downloadData.download_url
            || '';

        if (!publicUrl) {
            console.error(`${tag} Step 2 – no URL in response`, { keys: Object.keys(downloadData) });
            return '';
        }

        console.log(`${tag} COMPLETE`, { orderNumber, publicUrl: publicUrl.substring(0, 80) + '...' });
        return publicUrl;

    } catch (error) {
        console.error(`${tag} EXCEPTION`, { orderNumber, error: String(error) });
        return '';
    }
}

// ── WhatsApp Ticket Delivery ─────────────────────────────────────────

const GREEN_API_INSTANCE_ID = '7105503780';

/**
 * Retrieves WhatsApp delivery preferences for a given order by querying aboundedcarts.
 * Returns the parsed guests array (with wantWhatsapp) and the ticketsPdf URL if available.
 */
export async function getWhatsappPrefsForOrder(orderNumber) {
    try {
        if (!orderNumber) return null;

        const results = await wixData.query('aboundedcarts')
            .eq('orderNumber', orderNumber)
            .descending('_createdDate')
            .limit(1)
            .find({ suppressAuth: true });

        if (results.items.length === 0) {
            console.log('getWhatsappPrefsForOrder: no record found', { orderNumber });
            return null;
        }

        const record = results.items[0];
        let guests = [];
        try {
            guests = JSON.parse(record.guests || '[]');
        } catch (e) {
            guests = [];
        }

        return {
            orderNumber: record.orderNumber,
            ticketsPdf: record.ticketsPdf || '',
            guests,
            status: record.status,
        };
    } catch (error) {
        console.error('getWhatsappPrefsForOrder: failed', error);
        return null;
    }
}

/**
 * Sends a WhatsApp text message to a guest after ticket purchase.
 * @param {string} phone - Phone number in international format without + (e.g. 972523813929)
 * @param {string} pdfUrl - (currently unused) Direct URL to the ticket PDF
 * @param {string} guestName - Guest's first name for the message
 * @param {string} orderNumber - Order number for the message
 */
export async function sendTicketFileToWhatsapp(phone, pdfUrl, guestName, orderNumber) {
    try {
        const apiTokenInstance = await getSecret('greenApiToken');

        const message = `היי ${guestName || ''},
נרשמת בהצלחה ל-UPW REMOTE סדנת הדגל של Tony Robbins בישראל.

🎫 הכרטיס שלך לאירוע נשלח אליך במייל
מספר הזמנה: ${orderNumber || ''}

פרטים לשמירה:
12–15 במרץ 2026
אולמי ME, מלון פרימה מילניום
רח׳ תדהר 2, רעננה

הטבת לינה למשתתפים:
קוד הנחה להזמנת חדרים: REMOTEXPR

חוויה בעוצמה כזו הכי נכון לעבור יחד.
אם יש חבר או חברה שכדאי שישתתפו גם כן - ניתן להעביר להם את קישור ההרשמה:
https://www.tonyrobbins.co.il

לקראת האירוע נשלח עדכונים ופרטים חשובים נוספים.
מזמינים אותך לעקוב אחרינו בפייסבוק ובאינסטגרם.

צוות UPW REMOTE ישראל`;

        console.log('🔷📱 sendTicketFileToWhatsapp: sending text message', {
            phone,
            orderNumber,
        });

        const response = await fetch(
            `https://api.green-api.com/waInstance${GREEN_API_INSTANCE_ID}/sendMessage/${apiTokenInstance}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: `${phone}@c.us`,
                    message,
                    linkPreview: true,
                }),
            }
        );

        const responseText = await response.text();
        console.log('🔷📱 sendTicketFileToWhatsapp: raw response', {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
        });

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('🔷📱 sendTicketFileToWhatsapp: failed to parse response JSON', { responseText });
            return { success: false, error: 'Invalid JSON response from Green API', rawResponse: responseText };
        }

        if (result.error || result.message) {
            console.error('🔷📱 sendTicketFileToWhatsapp: Green API returned error', {
                error: result.error,
                message: result.message,
                code: result.code,
            });
            return { success: false, error: result.message || result.error || 'Unknown Green API error', rawResult: result };
        }

        if (result.idMessage) {
            console.log('🔷📱 sendTicketFileToWhatsapp: ✅ success', { idMessage: result.idMessage, orderNumber });
            return { success: true, idMessage: result.idMessage };
        } else {
            console.warn('🔷📱 sendTicketFileToWhatsapp: no idMessage in response', result);
            return { success: false, error: 'No idMessage in response', rawResult: result };
        }
    } catch (error) {
        console.error('🔷📱 sendTicketFileToWhatsapp: exception', { error: String(error), stack: error.stack });
        return { success: false, error: String(error) };
    }

    /* ── PDF sending via sendFileByUrl (commented out for future use) ──
    const caption = `היי ${guestName || ''},
נרשמת ל-UPW REMOTE סדנת הדגל של Tony Robbins בישראל.
מרגש אותנו שבחרת להשתתף!

🎫 מצורף הכרטיס שלך לאירוע!
מספר הזמנה: ${orderNumber || ''}
...`;

    const messageBody = {
        chatId: `${phone}@c.us`,
        urlFile: pdfUrl,
        fileName: `ticket-${orderNumber || 'upw'}.pdf`,
        caption: caption,
    };

    const response = await fetch(
        `https://api.green-api.com/waInstance${GREEN_API_INSTANCE_ID}/sendFileByUrl/${apiTokenInstance}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageBody),
        }
    );
    ── End PDF sending ── */
}

/**
 * Formats a phone number to international format for WhatsApp (972...).
 */
function formatPhoneForWhatsapp(phone) {
    let cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('05')) {
        cleanPhone = '972' + cleanPhone.substring(1);
    }
    return cleanPhone;
}

/**
 * Processes WhatsApp ticket delivery for all guests of an order who opted in.
 * Called after successful payment and order confirmation.
 * @param {string} orderNumber - The Wix Events order number
 * @param {Array} guests - The guests array from the checkout payload (with wantWhatsapp)
 * @param {string} ticketsPdf - The PDF URL from order details
 */
export async function processWhatsappDelivery(orderNumber, guests, ticketsPdf) {
    try {
        console.log('🔷📱 processWhatsappDelivery: starting', {
            orderNumber,
            guestsCount: guests.length,
        });

        // PDF requirement removed – sending text-only message now
        // if (!ticketsPdf) {
        //     console.warn('🔷📱 processWhatsappDelivery: no ticketsPdf available, skipping', { orderNumber });
        //     return { sent: 0, skipped: 0 };
        // }

        let sent = 0;
        let skipped = 0;

        for (let i = 0; i < guests.length; i++) {
            const guest = guests[i];
            console.log(`🔷📱 processWhatsappDelivery: processing guest ${i}`, {
                name: `${guest.firstName} ${guest.lastName}`,
                phone: guest.phone,
                wantWhatsapp: guest.wantWhatsapp,
            });

            if (guest.wantWhatsapp === false) {
                skipped++;
                console.log('🔷📱 processWhatsappDelivery: guest opted out', { index: i, name: guest.firstName });
                continue;
            }

            const phone = formatPhoneForWhatsapp(guest.phone);
            if (!phone) {
                console.warn('🔷📱 processWhatsappDelivery: no phone for guest', { index: i });
                skipped++;
                continue;
            }

            const result = await sendTicketFileToWhatsapp(phone, ticketsPdf, guest.firstName || '', orderNumber);
            if (result.success) {
                sent++;
                console.log(`🔷📱 processWhatsappDelivery: ✅ sent to guest ${i}`, { phone, name: guest.firstName });
            } else {
                console.error('🔷📱 processWhatsappDelivery: ❌ failed to send to guest', { index: i, phone, error: result.error });
            }
        }

        console.log('🔷📱 processWhatsappDelivery: done', { orderNumber, sent, skipped });
        return { sent, skipped };
    } catch (error) {
        console.error('🔷📱 processWhatsappDelivery: ❌ failed', error);
        return { sent: 0, skipped: 0, error: String(error) };
    }
}

// ── Payment Status Polling (called by iframe via Velo) ───────────────

/**
 * Checks the current payment status in the CMS by paymentId.
 * Used by the iframe for polling after a Pending payment result.
 * @param {string} paymentId - The Wix Pay payment ID
 * @returns {{ status: string, orderNumber?: string, ticketsPdf?: string }}
 */
export async function checkPaymentStatus(paymentId) {
    try {
        if (!paymentId) {
            return { status: 'not-found' };
        }

        const results = await wixData.query('aboundedcarts')
            .eq('paymentId', paymentId)
            .descending('_createdDate')
            .limit(1)
            .find({ suppressAuth: true, consistentRead: true });

        if (results.items.length === 0) {
            return { status: 'not-found' };
        }

        const record = results.items[0];
        return {
            status: record.status || 'unknown',
            orderNumber: record.orderNumber || '',
            ticketsPdf: record.ticketsPdf || '',
        };
    } catch (error) {
        console.error('checkPaymentStatus: failed', error);
        return { status: 'error' };
    }
}

/**
 * Sends a WhatsApp text message notifying the buyer that their payment is
 * being verified. Called after 60 seconds of polling with no result.
 * @param {string} phone - Buyer phone (Israeli format, e.g. 0551234567)
 * @param {string} firstName - Buyer first name
 * @param {string} orderNumber - The order number
 */
export async function sendPendingPaymentWhatsapp(phone, firstName, orderNumber) {
    try {
        const apiTokenInstance = await getSecret('greenApiToken');
        const formattedPhone = formatPhoneForWhatsapp(phone);

        if (!formattedPhone) {
            console.warn('sendPendingPaymentWhatsapp: no valid phone', { phone });
            return { success: false, error: 'No valid phone' };
        }

        const message = `היי ${firstName || ''},
ההזמנה שלך מספר ${orderNumber} נמצאת כרגע בבדיקה מול חברת האשראי.
נעדכן אותך ברגע שנקבל אישור. 🙏

⚠️ אם לא ביצעת תשלום בפועל, אין להתייחס להודעה זו.

צוות UPW REMOTE ישראל`;

        console.log('sendPendingPaymentWhatsapp: sending', { phone: formattedPhone, orderNumber });

        const response = await fetch(
            `https://api.green-api.com/waInstance${GREEN_API_INSTANCE_ID}/sendMessage/${apiTokenInstance}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: `${formattedPhone}@c.us`,
                    message,
                }),
            }
        );

        const responseText = await response.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('sendPendingPaymentWhatsapp: failed to parse response', { raw: responseText });
            return { success: false, error: 'Invalid JSON response' };
        }

        if (result.idMessage) {
            console.log('sendPendingPaymentWhatsapp: sent successfully', { idMessage: result.idMessage });
            return { success: true, idMessage: result.idMessage };
        }

        console.error('sendPendingPaymentWhatsapp: no idMessage', result);
        return { success: false, error: result.message || 'Unknown error' };
    } catch (error) {
        console.error('sendPendingPaymentWhatsapp: exception', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Cancels a pending payment manually (user clicked "skip waiting").
 * Updates the CMS record to 'cancelled' and cancels the Wix Events order.
 * @param {string} paymentId - The Wix Pay payment ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cancelPendingPayment(paymentId) {
    try {
        console.log('cancelPendingPayment: starting', { paymentId });

        if (!paymentId) {
            return { success: false, error: 'No paymentId provided' };
        }

        // Look up the cart record by paymentId
        const results = await wixData.query('aboundedcarts')
            .eq('paymentId', paymentId)
            .descending('_createdDate')
            .limit(1)
            .find({ suppressAuth: true, consistentRead: true });

        if (results.items.length === 0) {
            console.warn('cancelPendingPayment: no cart record found', { paymentId });
            return { success: false, error: 'Cart record not found' };
        }

        const record = results.items[0];
        const { orderNumber, eventId } = record;

        // Update CMS status to cancelled
        record.status = 'cancelled';
        await wixData.update('aboundedcarts', record, { suppressAuth: true });
        console.log('cancelPendingPayment: CMS updated to cancelled', { _id: record._id });

        // Cancel the Wix Events order (if exists and not already confirmed)
        if (orderNumber && eventId) {
            const cancelResult = await cancelEventOrder(eventId, orderNumber);
            console.log('cancelPendingPayment: order cancellation result', cancelResult);
        }

        return { success: true };
    } catch (error) {
        console.error('cancelPendingPayment: failed', error);
        return { success: false, error: String(error) };
    }
}