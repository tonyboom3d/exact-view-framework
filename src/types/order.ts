export type TicketType = string;

export interface TicketInfo {
  wixId: string;
  type: TicketType;
  name: string;
  price: number;
  description: string;
  fomoText: string;
  fomoPercent: number;
  soldOut: boolean;
  color: string;
  progressColor: string;
  colorClass: string;
  mapLabel: string;
}

export interface GuestInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  sendToWhatsapp?: boolean;
}

export interface BuyerInfo {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface TicketSelection {
  type: TicketType;
  quantity: number;
}

export interface OrderState {
  step: number;
  tickets: TicketSelection[];
  buyer: BuyerInfo;
  guests: GuestInfo[];
  useMyDetailsForFirst: boolean;
  orderNumber: string;
  referralCode: string;
}

// Fallback tickets for development / preview outside Wix
export const FALLBACK_TICKETS: TicketInfo[] = [
  {
    wixId: 'dev-general',
    type: 'general',
    name: 'General Admission',
    price: 2900,
    description: 'חוויית ההשתתפות המלאה עם אווירה אנרגטית של קהל גדול.',
    fomoText: '73% כרטיסים נרכשו',
    fomoPercent: 73,
    soldOut: false,
    color: 'linear-gradient(135deg, #1e3a5f, #2980b9)',
    progressColor: '#2980b9',
    colorClass: 'bg-blue-600',
    mapLabel: 'אזור כללי',
  },
  {
    wixId: 'dev-vip',
    type: 'vip',
    name: 'VIP',
    price: 3450,
    description: 'חוויית צפייה משודרגת ומיקום אסטרטגי באולם.',
    fomoText: '62% כרטיסים נרכשו',
    fomoPercent: 62,
    soldOut: false,
    color: 'linear-gradient(135deg, #4a148c, #7b1fa2)',
    progressColor: '#7b1fa2',
    colorClass: 'bg-purple-700',
    mapLabel: 'VIP',
  },
  {
    wixId: 'dev-premier',
    type: 'premier',
    name: 'Premier',
    price: 4500,
    description: 'חוויית הפרימיום הקרובה ביותר לבמה. מושבים בשתי השורות הראשונות בגוש המרכזי.',
    fomoText: '100% כרטיסים נרכשו',
    fomoPercent: 100,
    soldOut: true,
    color: 'linear-gradient(135deg, #7a5c00, #c8a951)',
    progressColor: '#c8a951',
    colorClass: 'bg-amber-600',
    mapLabel: 'אזור פרמייר',
  },
];
