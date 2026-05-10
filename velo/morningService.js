import { getSecret } from 'wix-secrets-backend';
import { secrets } from "wix-secrets-backend.v2";
import { elevate } from "wix-auth";
import { fetch } from 'wix-fetch';
import wixData from 'wix-data';

// ==========================================
// הגדרות למצב בדיקה (TEST MODE)
// ==========================================
const IS_TEST_MODE = false; // שנה ל-false כשאתה רוצה לשלוח מיילים ללקוחות האמיתיים
const TEST_EMAIL = "tonyboom3d@gmail.com";
// אם true: תמיד נשתמש במייל הטסט שלך. אם false: נשתמש במייל של הלקוח (גם אם IS_TEST_MODE=true)
const USE_TEST_EMAIL = false;

// כתובת ההתחברות (OAuth) של מורנינג
// TEST: Sandbox / PROD: Production
const MORNING_AUTH_URL = IS_TEST_MODE ?
    'https://api.sandbox.morning.dev/idp/v1/oauth/token' :
    'https://api.morning.co/idp/v1/oauth/token';

// כתובת יצירת המסמכים (base URL; בהמשך מחברים /documents)
// TEST: Sandbox / PROD: Production
const MORNING_API_URL = IS_TEST_MODE ?
    'https://sandbox.d.greeninvoice.co.il/api/v1' :
    'https://api.greeninvoice.co.il/api/v1';

// מעדכנים תוכן של סיקרט בעזרת updateSecret והעברת אובייקט עם value
const elevatedUpdateSecretValue = elevate(secrets.updateSecret);
// ה-ID של ה-Secret בו נשמור את הטוקן (morning_oauth)
const OAUTH_SECRET_ID = "a6319f92-b8c2-46ad-9333-9da2c7ad18fe";

// ==========================================
// מיפוי מזהי כרטיסים לשמות כרטיסים
// ==========================================
const TICKET_NAMES_MAP = {
    "fc7e3aeb-acb7-41f7-ab40-d47b4efd1f40": "General Admission",
    "faa98535-2d51-48f7-b895-b4a94887b76f": "VIP",
    "ae73acb8-c1a2-4f32-8fa1-d0dfc30d39fc": "Premier",
    "8aaefbe9-2f9e-41f6-8937-094f81abb164": "כרטיס לבדיקות בלבד"
};

/**
 * פונקציה פנימית לקבלת טוקן התחברות ממורנינג (עם מנגנון Cache)
 */
export async function getMorningToken() {
    try {
        console.log("בודק האם קיים טוקן בתוקף ב-Secrets...");

        // 1. ננסה לקרוא את הטוקן הקיים מתוך ה-Secret
        try {
            const existingOAuthStr = await getSecret('morning_oauth');
            if (existingOAuthStr) {
                const existingOAuth = JSON.parse(existingOAuthStr);
                const currentTimeSeconds = Math.floor(Date.now() / 1000);

                if (existingOAuth.expiresAt && existingOAuth.expiresAt > currentTimeSeconds + 60) {
                    console.log("נמצא טוקן קיים ובתוקף! משתמש בו.");
                    return existingOAuth.accessToken;
                } else {
                    console.log("הטוקן הקיים פג תוקף (או עומד לפוג). מפיק טוקן חדש...");
                }
            }
        } catch (readError) {
            console.log("לא נמצא טוקן קיים (או שהייתה שגיאה בקריאה), ממשיך להפקת טוקן חדש.");
        }

        // 2. משיכת המפתחות להפקת טוקן חדש
        const apiKeySecretName = IS_TEST_MODE ? 'morning_api_key' : 'morning_key_prod';
        const apiSecretSecretName = IS_TEST_MODE ? 'morning_secret_key' : 'morning_secret_prod';
        const apiKey = await getSecret(apiKeySecretName);
        const apiSecret = await getSecret(apiSecretSecretName);

        const response = await fetch(MORNING_AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                grant_type: "client_credentials",
                client_id: apiKey,
                client_secret: apiSecret
            })
        });

        if (!response.ok) {
            console.error(`שגיאה בקבלת טוקן ממורנינג. סטטוס HTTP: ${response.status}`);
            throw new Error(`שגיאה בקבלת טוקן: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("טוקן ממורנינג חדש התקבל בהצלחה.");

        // 3. שמירת הטוקן החדש
        try {
            const secretToUpdate = {
                value: JSON.stringify(data)
            };
            await elevatedUpdateSecretValue(OAUTH_SECRET_ID, secretToUpdate);
            console.log("הטוקן החדש נשמר בהצלחה ב-Secret.");
        } catch (updateError) {
            console.error("שגיאה בעדכון ה-Secret:", updateError);
        }

        return data.accessToken;
    } catch (error) {
        console.error("Morning Token Error:", error);
        throw error;
    }
}

/**
 * הפקת חשבונית מס/קבלה ממורנינג על סמך רשומת aboundedcarts.
 * נקראת אוטומטית לאחר תשלום מוצלח (מיידי או Pending שאושר).
 * אידמפוטנטית – אם כבר קיים invoiceUrl ברשומה, הפונקציה מדלגת.
 *
 * @param {string} orderNumber - מספר ההזמנה (orderNumber ב-aboundedcarts)
 * @returns {Promise<{success: boolean, orderNumber: string, invoiceUrl?: string, error?: string}>}
 */
export async function generateInvoiceFromCart(orderNumber) {
    console.log('[generateInvoiceFromCart] start', { orderNumber });

    if (!orderNumber) {
        console.error('[generateInvoiceFromCart] missing orderNumber');
        return { success: false, orderNumber: '', error: 'Missing orderNumber' };
    }

    let cartRecordId = null;

    try {
        // 1. שליפת רשומה מ-aboundedcarts לפי מספר הזמנה
        const cartQuery = await wixData.query('aboundedcarts')
            .eq('orderNumber', orderNumber)
            .descending('_createdDate')
            .limit(1)
            .find({ suppressAuth: true, consistentRead: true });

        if (cartQuery.items.length === 0) {
            throw new Error(`לא נמצאה רשומה ב-aboundedcarts עבור הזמנה ${orderNumber}`);
        }

        const cartRecord = cartQuery.items[0];
        cartRecordId = cartRecord._id;

        // 2. אידמפוטנטיות – אם כבר הופקה חשבונית, לא מפיקים שוב
        if (cartRecord.invoiceUrl) {
            console.log('[generateInvoiceFromCart] invoice already exists, skipping', {
                orderNumber,
                invoiceUrl: cartRecord.invoiceUrl,
            });
            return { success: true, orderNumber, invoiceUrl: cartRecord.invoiceUrl };
        }

        // 3. פריסת נתונים מהרשומה (payerDetails ו-selectedTickets עשויים להיות JSON string)
        let payerDetails = cartRecord.payerDetails || {};
        if (typeof payerDetails === 'string') {
            try { payerDetails = JSON.parse(payerDetails); } catch (e) { console.error('[generateInvoiceFromCart] Failed parsing payerDetails'); }
        }

        let selectedTickets = cartRecord.selectedTickets || [];
        if (typeof selectedTickets === 'string') {
            try { selectedTickets = JSON.parse(selectedTickets); } catch (e) { console.error('[generateInvoiceFromCart] Failed parsing selectedTickets'); }
        }

        // 4. ולידציות מחמירות
        let clientName = '';
        if (payerDetails.companyName && payerDetails.companyName.trim() !== '') {
            clientName = payerDetails.companyName.trim();
        } else {
            const fName = payerDetails.firstName || '';
            const lName = payerDetails.lastName || '';
            clientName = `${fName} ${lName}`.trim();
        }

        if (!clientName) {
            throw new Error('חסר שם לקוח (שם פרטי ומשפחה או שם חברה ריקים).');
        }

        if (!payerDetails.email && !USE_TEST_EMAIL) {
            throw new Error('חסרה כתובת אימייל ללקוח ב-payerDetails.');
        }

        if (!selectedTickets || selectedTickets.length === 0) {
            throw new Error('לא נמצאו כרטיסים להזמנה (selectedTickets ריק).');
        }

        const targetEmail = USE_TEST_EMAIL ? TEST_EMAIL : payerDetails.email;
        console.log(`[generateInvoiceFromCart] preparing invoice for: ${clientName}, email: ${targetEmail}`);

        // 5. בניית שורות החשבונית (income)
        let totalOrderPrice = 0;
        const incomeItems = selectedTickets.map((ticket, index) => {
            if (ticket.quantity === undefined || ticket.quantity === null) {
                throw new Error(`חסרה כמות (quantity) לכרטיס בשורה ${index + 1}.`);
            }
            if (ticket.price === undefined || ticket.price === null) {
                throw new Error(`חסר מחיר (price) לכרטיס בשורה ${index + 1}.`);
            }

            totalOrderPrice += (ticket.quantity * ticket.price);
            const resolvedTicketName = TICKET_NAMES_MAP[ticket.ticketId] || ticket.ticketName;

            if (!resolvedTicketName) {
                throw new Error(`חסר שם כרטיס (ticketName) ולא נמצא מיפוי ל-ID בשורה ${index + 1}.`);
            }

            const finalDescription = resolvedTicketName.trim().startsWith('כרטיס') ?
                resolvedTicketName.trim() :
                `כרטיס ${resolvedTicketName.trim()}`;

            return {
                description: finalDescription,
                quantity: ticket.quantity,
                price: ticket.price,
                currency: 'ILS',
                vatType: 1
            };
        });

        if (totalOrderPrice <= 0) {
            throw new Error('סכום ההזמנה הכולל קטן או שווה לאפס.');
        }

        // 6. קבלת טוקן ובניית הבקשה
        const token = await getMorningToken();
        const todayDateStr = new Date().toISOString().split('T')[0];

        const invoicePayload = {
            description: `הזמנה ${orderNumber}`,
            remarks: `מספר הזמנה: ${orderNumber}`,
            footer: "החשבונית מופקת על ידי מי מרקטינג אנד פרפורמנס עבור שירותי הפקה ותפעול מקומיים בישראל לאירוע Remote UPW. הכרטיס אישי ואינו ניתן להעברה ללא אישור מראש. ביטול והחזרים בהתאם למדיניות הביטולים בעת הרכישה.",
            type: 320,
            date: todayDateStr,
            lang: 'he',
            currency: 'ILS',
            vatType: 0,
            rounding: true,
            signed: true,
            attachment: true,
            client: {
                name: clientName,
                emails: targetEmail ? [targetEmail] : [],
                add: true,
                self: false
            },
            income: incomeItems,
            payment: [{
                date: todayDateStr,
                type: 3,
                price: totalOrderPrice,
                currency: 'ILS',
                currencyRate: 1,
                appType: 1,
                cardType: 0,
                dealType: 1,
                numPayments: 1
            }]
        };

        // 7. שליחה למורנינג
        const validToken = token.trim();
        const response = await fetch(`${MORNING_API_URL}/documents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${validToken}`
            },
            body: JSON.stringify(invoicePayload)
        });

        const responseData = await response.json();

        if (!response.ok || responseData.errorCode || responseData.error_code) {
            throw new Error(`שגיאה ממורנינג: ${JSON.stringify(responseData)}`);
        }

        const documentData = responseData.data || responseData;
        const invoiceUrl = documentData.url?.he || documentData.url?.origin || '';

        // 8. עדכון רשומת aboundedcarts עם נתוני החשבונית
        const latestRecord = await wixData.get('aboundedcarts', cartRecordId, { suppressAuth: true });
        latestRecord.invoiceUrl = invoiceUrl;
        latestRecord.invoiceStatus = IS_TEST_MODE ? 'DEMO' : 'DONE';
        latestRecord.invoiceData = JSON.stringify(responseData);
        latestRecord.invoiceError = '';

        await wixData.update('aboundedcarts', latestRecord, { suppressAuth: true });
        console.log(`[generateInvoiceFromCart] invoice created successfully`, { orderNumber, invoiceUrl });

        return { success: true, orderNumber, invoiceUrl };

    } catch (error) {
        console.error('[generateInvoiceFromCart] error', { orderNumber, error: error.message });

        if (cartRecordId) {
            try {
                const errorRecord = await wixData.get('aboundedcarts', cartRecordId, { suppressAuth: true });
                errorRecord.invoiceStatus = 'ERROR';
                errorRecord.invoiceError = error.message;
                await wixData.update('aboundedcarts', errorRecord, { suppressAuth: true });
            } catch (dbError) {
                console.error('[generateInvoiceFromCart] failed to update error status', dbError);
            }
        }

        return { success: false, orderNumber: orderNumber || '', error: error.message };
    }
}

/**
 * הפונקציה הראשית ליצירת חשבונית טסט ולוג ב-CMS
 * (מותאמת גם כן ללא השלמות אוטומטיות ועם הסטטוסים החדשים)
 * @param {Object} eventData - מידע על ההזמנה מ-Wix Events
 */
export async function createTestInvoice(eventData = {}) {
    let logEntry = {
        title: `ניסיון הפקת חשבונית טסט - ${new Date().toLocaleString()}`,
        status: '',
        orderId: eventData.orderId || 'missing-order-id',
        payload: "",
        response: ""
    };

    try {
        // ולידציות מחמירות - בלי || ובלי מידע פיקטיבי
        if (!eventData.orderId) throw new Error("חסר מספר הזמנה (orderId).");
        if (!eventData.clientName) throw new Error("חסר שם לקוח (clientName).");
        if (!eventData.clientEmail && !USE_TEST_EMAIL) throw new Error("חסר אימייל לקוח (clientEmail).");
        if (eventData.ticketsCount === undefined) throw new Error("חסרה כמות כרטיסים (ticketsCount).");
        if (eventData.totalPrice === undefined) throw new Error("חסר מחיר כולל (totalPrice).");

        const targetEmail = USE_TEST_EMAIL ? TEST_EMAIL : eventData.clientEmail;

        const token = await getMorningToken();
        const todayDateStr = new Date().toISOString().split('T')[0];

        const invoicePayload = {
            description: "כרטיסים לאירוע מ-Wix Events",
            remarks: `הזמנה מספר: ${eventData.orderId}`,
            footer: "החשבונית מופקת על ידי מי מרקטינג אנד פרפורמנס עבור שירותי הפקה ותפעול מקומיים בישראל לאירוע Remote UPW. הכרטיס אישי ואינו ניתן להעברה ללא אישור מראש. ביטול והחזרים בהתאם למדיניות הביטולים בעת הרכישה.",
            emailContent: "תודה רבה על רכישתך! מצורפת חשבונית המס והקבלה.",
            type: 320,
            date: todayDateStr,
            lang: "he",
            currency: "ILS",
            vatType: 0,
            rounding: true,
            signed: true,
            attachment: true,
            client: {
                name: eventData.clientName,
                emails: targetEmail ? [targetEmail] : [],
                add: true,
                self: false
            },
            income: [{
                description: "כרטיס כניסה לאירוע",
                quantity: eventData.ticketsCount,
                price: eventData.totalPrice,
                currency: "ILS",
                currencyRate: 1,
                vatType: 1
            }],
            payment: [{
                date: todayDateStr,
                type: 3,
                price: eventData.totalPrice,
                currency: "ILS",
                currencyRate: 1,
                appType: 1,
                cardType: 0,
                cardNum: "0000",
                dealType: 1,
                numPayments: 1
            }]
        };

        logEntry.payload = JSON.stringify(invoicePayload);
        const validToken = token.trim();

        const response = await fetch(`${MORNING_API_URL}/documents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${validToken}`
            },
            body: JSON.stringify(invoicePayload)
        });

        const responseData = await response.json();
        logEntry.response = JSON.stringify(responseData);

        // תיקון: בודקים רק את response.ok ומוודאים שאין errorCode
        if (response.ok && !responseData.errorCode && !responseData.error_code) {
            logEntry.status = IS_TEST_MODE ? 'DEMO' : 'DONE'; // עדכון הסטטוס הסופי
        } else {
            throw new Error(`שגיאה ממורנינג: ${JSON.stringify(responseData)}`);
        }

        await saveLogToCMS(logEntry);

        return {
            success: true,
            data: responseData
        };

    } catch (error) {
        logEntry.status = 'ERROR';
        logEntry.response = error.message; // נשמור בלוג את השגיאה המדויקת
        await saveLogToCMS(logEntry);

        return { success: false, error: error.message };
    }
}

/**
 * פונקציה פנימית לשמירת לוגים ב-CMS של Wix
 * @param {Object} logData - המידע לשמירה
 */
async function saveLogToCMS(logData) {
    try {
        await wixData.insert('InvoiceLogs', logData);
    } catch (error) {
        console.error("שגיאה בשמירת לוג ל-CMS:", error);
    }
}

/**
 * מעבד חשבונית בודדת לפי רשומה מקולקשן invoices.
 * מחזיר { success, orderNumber } ומעדכן את הרשומה ב-CMS בין אם הצליח ובין אם נכשל.
 * @param {Object} initialRecord - רשומה מקולקשן invoices
 */
async function _processSinglePendingInvoice(initialRecord) {
    const invoiceRecordId = initialRecord._id;
    const orderNumber = initialRecord.orderNumber;

    console.log(`[processPendingInvoice] מתחיל עיבוד הזמנה: ${orderNumber}`);

    try {
        if (!orderNumber) {
            throw new Error("רשומת ה-invoices שנמצאה אינה מכילה מספר הזמנה (orderNumber).");
        }

        // 1. חיפוש העגלה בקולקשן aboundedcarts לפי מספר ההזמנה
        const cartQuery = await wixData.query("aboundedcarts")
            .eq("orderNumber", orderNumber)
            .find({ omitTotalCount: true });

        if (cartQuery.items.length === 0) {
            throw new Error(`לא נמצאה רשומה תואמת ב-aboundedcarts עבור הזמנה ${orderNumber}`);
        }

        const cartRecord = cartQuery.items[0];

        // 2. המרה של טקסט לאובייקט
        let payerDetails = cartRecord.payerDetails || {};
        if (typeof payerDetails === 'string') {
            try { payerDetails = JSON.parse(payerDetails); } catch (e) { console.error("Failed parsing payerDetails"); }
        }

        let selectedTickets = cartRecord.selectedTickets || [];
        if (typeof selectedTickets === 'string') {
            try { selectedTickets = JSON.parse(selectedTickets); } catch (e) { console.error("Failed parsing selectedTickets"); }
        }

        // 3. ולידציות מחמירות
        let clientName = "";
        if (payerDetails.companyName && payerDetails.companyName.trim() !== "") {
            clientName = payerDetails.companyName.trim();
        } else {
            const fName = payerDetails.firstName || "";
            const lName = payerDetails.lastName || "";
            clientName = `${fName} ${lName}`.trim();
        }

        if (!clientName) {
            throw new Error("חסר שם לקוח (שם פרטי ומשפחה או שם חברה ריקים).");
        }

        if (!payerDetails.email && !USE_TEST_EMAIL) {
            throw new Error("חסרה כתובת אימייל ללקוח ב-payerDetails.");
        }

        if (!selectedTickets || selectedTickets.length === 0) {
            throw new Error("לא נמצאו כרטיסים להזמנה (selectedTickets ריק).");
        }

        const targetEmail = USE_TEST_EMAIL ? TEST_EMAIL : payerDetails.email;
        console.log(`[processPendingInvoice] מכין חשבונית עבור: ${clientName}, אימייל יעד: ${targetEmail}`);

        // 4. בניית שורות החשבונית (income)
        let totalOrderPrice = 0;
        const incomeItems = selectedTickets.map((ticket, index) => {
            if (ticket.quantity === undefined || ticket.quantity === null) {
                throw new Error(`חסרה כמות (quantity) לכרטיס בשורה ${index + 1}.`);
            }
            if (ticket.price === undefined || ticket.price === null) {
                throw new Error(`חסר מחיר (price) לכרטיס בשורה ${index + 1}.`);
            }

            totalOrderPrice += (ticket.quantity * ticket.price);
            const resolvedTicketName = TICKET_NAMES_MAP[ticket.ticketId] || ticket.ticketName;

            if (!resolvedTicketName) {
                throw new Error(`חסר שם כרטיס (ticketName) ולא נמצא מיפוי ל-ID בשורה ${index + 1}.`);
            }

            const finalDescription = resolvedTicketName.trim().startsWith("כרטיס") ?
                resolvedTicketName.trim() :
                `Tony Robbins UPW REMOTE- ${resolvedTicketName.trim()}`;

            return {
                description: finalDescription,
                quantity: ticket.quantity,
                price: ticket.price,
                currency: "ILS",
                vatType: 1
            };
        });

        if (totalOrderPrice <= 0) {
            throw new Error("סכום ההזמנה הכולל קטן או שווה לאפס.");
        }

        // 5. קבלת טוקן ובניית הבקשה
        const token = await getMorningToken();
        const todayDateStr = new Date().toISOString().split('T')[0];

        const invoicePayload = {
            description: `הזמנה ${orderNumber}`,
            remarks: `מספר הזמנה: ${orderNumber}`,
            footer: "החשבונית מופקת על ידי מי מרקטינג אנד פרפורמנס עבור שירותי הפקה ותפעול מקומיים בישראל לאירוע Remote UPW. הכרטיס אישי ואינו ניתן להעברה ללא אישור מראש. ביטול והחזרים בהתאם למדיניות הביטולים בעת הרכישה.",
            type: 320,
            date: todayDateStr,
            lang: "he",
            currency: "ILS",
            vatType: 0,
            rounding: true,
            signed: true,
            attachment: true,
            client: {
                name: clientName,
                emails: targetEmail ? [targetEmail] : [],
                add: true,
                self: false
            },
            income: incomeItems,
            payment: [{
                date: todayDateStr,
                type: 3,
                price: totalOrderPrice,
                currency: "ILS",
                currencyRate: 1,
                appType: 1,
                cardType: 0,
                dealType: 1,
                numPayments: 1
            }]
        };

        // 6. שליחה למורנינג
        const validToken = token.trim();
        const response = await fetch(`${MORNING_API_URL}/documents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${validToken}`
            },
            body: JSON.stringify(invoicePayload)
        });

        const responseData = await response.json();

        if (!response.ok || responseData.errorCode || responseData.error_code) {
            throw new Error(`שגיאה ממורנינג: ${JSON.stringify(responseData)}`);
        }

        const documentData = responseData.data || responseData;

        // 7. שליפה מלאה מחדש ועדכון ההצלחה
        const latestRecord = await wixData.get("invoices", invoiceRecordId);
        latestRecord.invoiceData = JSON.stringify(responseData);
        latestRecord.status = IS_TEST_MODE ? "DEMO" : "DONE";
        latestRecord.invoiceUrl = documentData.url?.he || documentData.url?.origin || "";
        latestRecord.errorMessage = "";

        await wixData.update("invoices", latestRecord);
        console.log(`[processPendingInvoice] ✅ הזמנה ${orderNumber} - חשבונית נוצרה. לינק: ${latestRecord.invoiceUrl}`);

        return { success: true, orderNumber };

    } catch (error) {
        console.error(`[processPendingInvoice] ❌ שגיאה בהזמנה ${orderNumber}:`, error.message);

        try {
            const errorRecord = await wixData.get("invoices", invoiceRecordId);
            errorRecord.status = "ERROR";
            errorRecord.errorMessage = error.message;
            await wixData.update("invoices", errorRecord);
        } catch (dbError) {
            console.error("[processPendingInvoice] נכשל בעדכון סטטוס שגיאה ל-CMS:", dbError);
        }

        return { success: false, orderNumber: orderNumber || '', error: error.message };
    }
}

/**
 * פונקציה לאוטומציה: שולפת עד 5 רשומות ממתינות לחשבונית ומעבדת כל אחת בנפרד.
 * כישלון בחשבונית אחת אינו עוצר את המשך העיבוד של השאר.
 * @returns {{ processed: number, succeeded: number, failed: number, results: Array }}
 */
export async function processPendingInvoice() {
    const BATCH_SIZE = 5;
    console.log(`[processPendingInvoice] מתחיל - מחפש עד ${BATCH_SIZE} רשומות ממתינות...`);

    // שליפת עד 5 רשומות בבת אחת
    const pendingQuery = await wixData.query("invoices")
        .isEmpty("invoiceUrl")
        .ne("status", "DONE")
        .ne("status", "DEMO")
        .ne("status", "ERROR")
        .ascending("_createdDate")
        .limit(BATCH_SIZE)
        .find({ omitTotalCount: true });

    if (pendingQuery.items.length === 0) {
        console.log("[processPendingInvoice] לא נמצאו רשומות ממתינות.");
        return { processed: 0, succeeded: 0, failed: 0, results: [] };
    }

    console.log(`[processPendingInvoice] נמצאו ${pendingQuery.items.length} רשומות לעיבוד.`);

    const results = [];

    // עיבוד סדרתי - כל חשבונית מסתיימת לפני שמתחילה הבאה
    for (const record of pendingQuery.items) {
        const result = await _processSinglePendingInvoice(record);
        results.push(result);
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[processPendingInvoice] סיום. עובדו: ${results.length} | הצליחו: ${succeeded} | נכשלו: ${failed}`);

    return {
        processed: results.length,
        succeeded,
        failed,
        results
    };
}