import { ok, badRequest, forbidden, serverError } from 'wix-http-functions';
import { getSecret } from 'wix-secrets-backend';
import { confirmPaymentFromGrow } from 'backend/eventLogics';

/**
 * Grow Payment Webhook Endpoint
 * 
 * Receives payment confirmation webhooks directly from Grow payment processor.
 * Acts as a backup mechanism when wixPay_onPaymentUpdate doesn't fire reliably.
 * 
 * URL: https://www.tonyrobbins.co.il/_functions/growPaymentWebhook
 * Method: POST
 * 
 * Expected payload from Grow:
 * {
 *   "webhookKey": "...",
 *   "transactionCode": "ABCD1234",
 *   "transactionType": "אשראי",
 *   "paymentSum": 2.00,
 *   "paymentsNum": 1,
 *   "allPaymentNum": 2,
 *   "firstPaymentSum": 1,
 *   "periodicalPaymentSum": 1,
 *   "paymentType": "רגיל",
 *   "paymentDate": "14/10/21",
 *   "asmachta": "123456789",
 *   "paymentDesc": "Description",
 *   "fullName": "Full Name",
 *   "payerPhone": "0500000000",
 *   "payerEmail": "test@test.com",
 *   "cardSuffix": "1234",
 *   "cardBrand": "Mastercard",
 *   "cardType": "Local",
 *   "paymentSource": "מערכת חיצונית"
 * }
 */
export async function post_growPaymentWebhook(request) {
    const logTag = '[growPaymentWebhook]';
    
    let payload;
    try {
        payload = await request.body.json();
    } catch (parseError) {
        console.error(`${logTag} Failed to parse request body`, parseError);
        return badRequest({ body: { success: false, error: 'Invalid JSON payload' } });
    }

    const { 
        webhookKey, 
        transactionCode, 
        payerPhone, 
        payerEmail, 
        paymentSum, 
        fullName,
        asmachta,
        transactionType,
        paymentDate
    } = payload;

    console.log(`${logTag} Received webhook`, {
        transactionCode,
        payerPhone,
        payerEmail,
        paymentSum,
        fullName,
        hasWebhookKey: !!webhookKey,
    });

    // 1. Validate webhook key from Wix Secrets
    let expectedWebhookKey;
    try {
        expectedWebhookKey = await getSecret('grow_webhook_key');
    } catch (secretError) {
        console.error(`${logTag} Failed to retrieve webhook key from secrets`, secretError);
        return serverError({ body: { success: false, error: 'Configuration error' } });
    }

    if (!webhookKey || webhookKey !== expectedWebhookKey) {
        console.warn(`${logTag} Invalid webhook key`, { 
            received: webhookKey ? webhookKey.substring(0, 8) + '...' : 'empty',
        });
        return forbidden({ body: { success: false, error: 'Invalid webhook key' } });
    }

    // 2. Validate required fields
    if (!transactionCode) {
        console.warn(`${logTag} Missing transactionCode`);
        return badRequest({ body: { success: false, error: 'Missing transactionCode' } });
    }

    // 3. Process payment with retry logic
    try {
        const result = await confirmPaymentFromGrow({
            transactionCode,
            payerPhone: payerPhone || '',
            payerEmail: payerEmail || '',
            paymentSum: paymentSum || 0,
            fullName: fullName || '',
            asmachta: asmachta || '',
            transactionType: transactionType || '',
            paymentDate: paymentDate || '',
            rawPayload: payload,
        });

        console.log(`${logTag} Processing result`, {
            transactionCode,
            success: result.success,
            matched: result.matched,
            orderNumber: result.orderNumber,
        });

        return ok({ 
            body: { 
                success: true, 
                ...result 
            } 
        });

    } catch (processError) {
        console.error(`${logTag} Processing failed`, {
            transactionCode,
            error: String(processError),
        });

        return serverError({ 
            body: { 
                success: false, 
                error: 'Processing failed',
                transactionCode,
            } 
        });
    }
}
