/** Set to true when ticket sales should be closed (event has started). */
export const TICKET_SALES_CLOSED = true;

export function isTicketSalesClosed(): boolean {
  return TICKET_SALES_CLOSED;
}

export interface EventUIConfig {
  title: string;
  subtitle: string;
  showLiveBadge: boolean;
  datesText: string;
  locationText: string;
  showHeaderPriceTimer: boolean;
  priceTimerDeadlineISO?: string;
  calendarStartUTC: string;
  calendarEndUTC: string;
  calendarStartLocal: string;
  calendarEndLocal: string;
  shareText: string;
  shareLink: string;
  promo?: {
    title: string;
    description: string;
    deadlineISO: string;
  };
  couponRedeemBaseUrl?: string;
}

export const EVENT1_CONFIG: EventUIConfig = {
  title: 'Tony Robbins',
  subtitle: 'Unleash the Power Within REMOTE',
  showLiveBadge: false,
  datesText: '4 ימים, 16-19 ביוני 2026',
  locationText: 'אולם התיאטרון סינמה סיטי גלילות',
  showHeaderPriceTimer: true,
  priceTimerDeadlineISO: '2026-06-12T00:00:00+03:00',
  calendarStartUTC: '20260616T130000Z',
  calendarEndUTC: '20260619T230000Z',
  calendarStartLocal: '2026-06-16T16:00:00',
  calendarEndLocal: '2026-06-20T02:00:00',
  shareLink: 'https://www.tonyrobbins.co.il/',
  shareText: 'נרשמתי לסדנת UPW REMOTE של טוני רובינס בישראל 🔥\n\n4 ימים של כלים, אסטרטגיות ושינוי אמיתי – 4 ימים, 16-19 ביוני 2026.\n\nhttps://www.tonyrobbins.co.il/\n\nמי שבעניין – זה הזמן.',
};

export const EVENT2_CONFIG: EventUIConfig = {
  title: 'UPW Remote',
  subtitle: 'Tony Robbins',
  showLiveBadge: true,
  datesText: '4 ימים, 3-6 בספטמבר 2026',
  locationText: 'אולם התיאטרון סינמה סיטי גלילות',
  showHeaderPriceTimer: false,
  calendarStartUTC: '20260903T130000Z',
  calendarEndUTC: '20260906T230000Z',
  calendarStartLocal: '2026-09-03T16:00:00',
  calendarEndLocal: '2026-09-07T02:00:00',
  shareLink: 'https://www.tonyrobbins.co.il/',
  shareText: 'נרשמתי לסדנת UPW REMOTE של טוני רובינס בישראל 🔥\n\n4 ימים של כלים, אסטרטגיות ושינוי אמיתי – 4 ימים, 3-6 בספטמבר 2026.\n\nhttps://www.tonyrobbins.co.il/\n\nמי שבעניין – זה הזמן.',
  promo: {
    title: '1+1 על כל סוגי הכרטיסים',
    description: 'רוכשים כרטיס מכל סוג ובסוף תהליך ההזמנה מקבלים קישור לרכישת כרטיס נוסף במתנה.',
    deadlineISO: '2026-06-25T00:00:00+03:00',
  },
  couponRedeemBaseUrl: 'https://www.tonyrobbins.co.il/event-details/tony-robbins-live',
};
