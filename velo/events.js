import wixData from 'wix-data'
import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import { orders } from 'wix-events.v2';
import { elevate } from 'wix-auth';
import { confirmPendingPayment, updateCartByPaymentId, cancelEventOrder, convertPdfToPublicUrl } from 'backend/eventLogics';

export async function wixCrm_onContactCreated(event) {

    const entity = event.entity
    const info = entity.info
    const extendedFields = info.extendedFields || {}
    const labels = info.labelKeys || []

    if (!labels.includes("custom.affiliate")) {
        return
    }

    if (!info.name || !info.name.first) {
        return
    }

    if (!entity.primaryInfo || !entity.primaryInfo.email) {
        return
    }

    const affId = extendedFields["custom.affid"]

    if (!affId) {
        return
    }

    try {
        const existing = await wixData.query("affiliates")
            .eq("affId", affId)
            .find({ suppressAuth: true })

        if (existing.items.length > 0) {
            return
        }

        const firstName = info.name.first
        const lastName = info.name.last || ""
        const fullName = `${firstName} ${lastName}`.trim()

        let profit = extendedFields["custom.shortText-1"]

        if (!profit) {
            profit = "10%"
        }

        const toInsert = {
            affId: affId,
            userName: fullName,
            profit: profit,
            contactId: entity._id,
            personalUrl: `https://www.tonyrobbins.co.il/?affId=${affId}`,
            email: entity.primaryInfo.email
        }

        await wixData.insert("affiliates", toInsert, { suppressAuth: true })

    } catch (error) {
        console.error("[AffiliateDebug] ERROR:", error)
    }
}

const STATUS_CANCELED = "3c3964ea-e0ed-4423-9e43-3d8b875c0507"

export async function wixEventsGuests_onGuestDeleted(event) {
    const entity = event.entity
    const orderNumber = entity.orderNumber

    if (!orderNumber) return

    try {
        const sales = await wixData.query("affiliateSales")
            .eq("orderNumber", orderNumber)
            .find({ suppressAuth: true })

        if (sales.items.length > 0) {
            const itemToUpdate = sales.items[0]

            itemToUpdate.saleStatus = STATUS_CANCELED
            itemToUpdate.userProfit = 0

            await wixData.update("affiliateSales", itemToUpdate, { suppressAuth: true })
        }
    } catch (error) {
        console.error(error)
    }
}

// ── Payment status webhook ───────────────────────────────────────────
// Fires when a Wix Pay payment's transaction status changes.
// This is the mechanism that confirms orders whose initial status was "Pending"
// (common with Grow/Meshulam for larger amounts).

export async function wixPay_onPaymentUpdate(event) {
    const paymentId = event.payment && event.payment.id;
    const rawStatus = event.status || '';
    const normalizedStatus = rawStatus.toLowerCase();
    const transactionId = event.transactionId || '';

    console.log('[wixPay_onPaymentUpdate] received', {
        paymentId,
        rawStatus,
        normalizedStatus,
        transactionId,
        amount: event.payment && event.payment.amount,
        currency: event.payment && event.payment.currency,
    });

    if (!paymentId) {
        console.warn('[wixPay_onPaymentUpdate] no paymentId in event, ignoring');
        return;
    }

    try {
        if (normalizedStatus === 'successful') {
            // Payment approved by the card company → confirm the Wix Events order
            const result = await confirmPendingPayment(paymentId, transactionId);
            console.log('[wixPay_onPaymentUpdate] confirmPendingPayment result', result);
        } else if (normalizedStatus === 'cancelled' || normalizedStatus === 'failed' || normalizedStatus === 'declined') {
            // Payment was rejected or cancelled → update CMS record AND cancel the Wix Events order
            console.log('[wixPay_onPaymentUpdate] payment not approved, updating CMS and cancelling order', { normalizedStatus });
            await updateCartByPaymentId(paymentId, normalizedStatus);

            // Also cancel the Wix Events order to prevent orphaned orders/tickets
            try {
                const cartResults = await wixData.query('aboundedcarts')
                    .eq('paymentId', paymentId)
                    .descending('_createdDate')
                    .limit(1)
                    .find({ suppressAuth: true, consistentRead: true });

                if (cartResults.items.length > 0) {
                    const cart = cartResults.items[0];
                    if (cart.orderNumber && cart.eventId) {
                        console.log('[wixPay_onPaymentUpdate] cancelling Wix Events order', {
                            orderNumber: cart.orderNumber,
                            eventId: cart.eventId,
                        });
                        const cancelResult = await cancelEventOrder(cart.eventId, cart.orderNumber);
                        console.log('[wixPay_onPaymentUpdate] cancelEventOrder result', cancelResult);
                    }
                }
            } catch (cancelError) {
                console.error('[wixPay_onPaymentUpdate] failed to cancel order (non-blocking)', cancelError);
            }
        } else {
            // Other statuses (Pending, etc.) – log but take no action
            console.log('[wixPay_onPaymentUpdate] unhandled status, no action taken', { rawStatus });
        }
    } catch (error) {
        console.error('[wixPay_onPaymentUpdate] error handling payment update', error);
        // Re-throw so Wix retries the event handler
        throw error;
    }
}

// --- הגדרות קבועות ---
const INSTANCE_ID = "7105503780";
const LOG_COLLECTION = "SentNotifications";
const PDF_LOG_COLLECTION = "SentNotifications"; // Same collection, prefix with "pdf_" to distinguish

// --- מצב בדיקה ---
const IS_TEST_MODE = false;
const TEST_PHONE_NUMBER = "972523813929";

// --- אירוע UPW REMOTE (Tony Robbins) ---
const UPW_EVENT_ID = "86ac2d0f-e2dc-4c86-9c10-efeb710aa570";

// Elevated function for fetching order details (needed for PDF link)
const elevatedGetOrder = elevate(orders.getOrder);

/**
 * Fires when an Order is confirmed (status changes to PAID).
 * This is the correct place to send WhatsApp messages with PDF tickets,
 * as the PDF is generated only after the order is confirmed.
 */
export async function wixEventsOrders_onOrderConfirmed(event) {
    const orderEntity = event.entity;
    const orderNumber = orderEntity.orderNumber;
    const eventId = orderEntity.eventId;

    console.log("🔷 [onOrderConfirmed] Order confirmed.", { orderNumber, eventId });

    try {
        // --- Check for duplicates by orderNumber ---
        const logKey = `order_${orderNumber}`;
        const alreadySent = await wixData.query(LOG_COLLECTION)
            .eq("title", logKey)
            .find({ suppressAuth: true });

        if (alreadySent.items.length > 0) {
            console.log(`🔷 [onOrderConfirmed] Message already sent for order ${orderNumber}. Skipping.`);
            return;
        }

        // --- Get buyer info from order ---
        const buyerFirstName = orderEntity.buyer?.firstName || orderEntity.checkoutForm?.inputValues?.find(v => v.inputName === 'firstName')?.value || '';
        const buyerPhone = orderEntity.buyer?.phone || orderEntity.checkoutForm?.inputValues?.find(v => v.inputName?.toLowerCase().includes('phone'))?.value || '';

        if (!buyerPhone) {
            console.warn("🔷📱 [onOrderConfirmed] No phone number found for order", { orderNumber });
            return;
        }

        const targetPhone = IS_TEST_MODE ? TEST_PHONE_NUMBER : formatPhoneForWhatsapp(buyerPhone);
        const apiTokenInstance = await getSecret("greenApiToken");

        // --- Log before sending to prevent duplicates ---
        await wixData.insert(LOG_COLLECTION, {
            title: logKey,
            sendDate: new Date()
        });

        // --- Send text-only welcome message via Green API ---
        const message = `היי ${buyerFirstName || ''},
נרשמת בהצלחה ל-UPW REMOTE סדנת הדגל של Tony Robbins בישראל.

🎫 הכרטיס שלך לאירוע נשלח אליך במייל
מספר הזמנה: ${orderNumber}

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

        console.log("🔷📱 [onOrderConfirmed] Sending text message via WhatsApp", {
            orderNumber,
            phone: targetPhone,
        });

        const response = await fetch(
            `https://api.green-api.com/waInstance${INSTANCE_ID}/sendMessage/${apiTokenInstance}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: `${targetPhone}@c.us`,
                    message,
                    linkPreview: true,
                }),
            }
        );

        const responseText = await response.text();
        console.log("🔷📱 [onOrderConfirmed] Green API raw response", {
            status: response.status,
            body: responseText,
        });

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseErr) {
            console.error("🔷📱 [onOrderConfirmed] Failed to parse Green API response", { raw: responseText });
            return;
        }

        if (result.idMessage) {
            console.log("🔷📱 [onOrderConfirmed] ✅ WhatsApp message sent successfully!", { orderNumber, idMessage: result.idMessage });
        } else {
            console.error("🔷📱 [onOrderConfirmed] ❌ Green API error", {
                orderNumber,
                error: result.error || result.message || 'Unknown error',
                rawResult: result,
            });
        }

        /* ── PDF fetch + send via SendFileByUrl (commented out for future use) ──
        let ticketsPdf = '';
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            try {
                const orderResult = await elevatedGetOrder(
                    { eventId: eventId || UPW_EVENT_ID, orderNumber },
                    { fieldset: ['DETAILS', 'TICKETS'] }
                );
                const orderObj = orderResult?.order || orderResult || {};
                ticketsPdf = orderObj.ticketsPdf || '';
                if (!ticketsPdf && Array.isArray(orderObj.tickets) && orderObj.tickets.length > 0) {
                    ticketsPdf = orderObj.tickets[0]?.ticketPdfUrl || '';
                }
                if (ticketsPdf) break;
            } catch (fetchErr) {
                console.error(`PDF fetch attempt ${attempt} failed`, fetchErr);
            }
        }
        if (!ticketsPdf) return;

        const publicPdfUrl = await convertPdfToPublicUrl(ticketsPdf, orderNumber);
        if (publicPdfUrl) ticketsPdf = publicPdfUrl;

        const pdfMessageBody = {
            chatId: `${targetPhone}@c.us`,
            urlFile: ticketsPdf,
            fileName: `ticket-${orderNumber}.pdf`,
            caption: message,
        };
        const pdfResponse = await fetch(
            `https://api.green-api.com/waInstance${INSTANCE_ID}/sendFileByUrl/${apiTokenInstance}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pdfMessageBody) }
        );
        ── End PDF sending ── */

    } catch (error) {
        console.error("🔷 [onOrderConfirmed] ❌ Failed to process order", error);
    }
}

/* ── sendTicketPdfIfOptedIn (commented out – PDF sending disabled for now) ──
 * This function checked CMS for WhatsApp opt-in and sent the PDF via Green API.
 * Kept for future use when PDF delivery is re-enabled.
 *
async function sendTicketPdfIfOptedIn(orderNumber, eventId, guestDetails, targetPhone, apiTokenInstance) {
    ... (full function body preserved in git history)
}
── End sendTicketPdfIfOptedIn ── */

// --- פונקציות עזר (ללא שינוי) ---
function extractPhoneNumber(guestDetails) {
    if (guestDetails.phone) return guestDetails.phone;
    if (guestDetails.formResponse && guestDetails.formResponse.inputValues) {
        const inputs = guestDetails.formResponse.inputValues;
        const phoneField = inputs.find(field =>
            field.inputName.toLowerCase().includes('phone') ||
            field.inputName.toLowerCase().includes('mobile') ||
            field.inputName.includes('טלפון')
        );
        return phoneField ? phoneField.value : null;
    }
    return null;
}

function formatPhoneForWhatsapp(phone) {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('05')) {
        cleanPhone = '972' + cleanPhone.substring(1);
    }
    return cleanPhone;
}