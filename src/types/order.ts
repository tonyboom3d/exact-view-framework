export type TicketType = 'general' | 'premier' | 'vip';

export interface TicketInfo {
  type: TicketType;
  name: string;
  price: number;
  description: string;
  fomoText: string;
  fomoPercent: number;
  soldOut: boolean;
  color: string;
  colorClass: string;
  mapLabel: string;
}

export interface GuestInfo {
  firstName: string;
  lastName: string;
  phone: string;
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

export const TICKETS: TicketInfo[] = [
  {
    type: 'general',
    name: 'General Admission',
    price: 2900,
    description: 'כניסה לאירוע, ישיבה באזור הכללי',
    fomoText: '85% כרטיסים נרכשו',
    fomoPercent: 85,
    soldOut: false,
    color: 'linear-gradient(135deg, #1e3a5f, #2980b9)',
    colorClass: 'bg-blue-600',
    mapLabel: 'אזור כללי',
  },
  {
    type: 'premier',
    name: 'Premier',
    price: 3450,
    description: 'ישיבה באזור מועדף, קרוב לבמה',
    fomoText: '72% כרטיסים נרכשו',
    fomoPercent: 72,
    soldOut: false,
    color: 'linear-gradient(135deg, #1a237e, #5c6bc0)',
    colorClass: 'bg-indigo-600',
    mapLabel: 'אזור פרמייר',
  },
  {
    type: 'vip',
    name: 'VIP Experience',
    price: 4500,
    description: 'חוויית VIP מלאה, שורות ראשונות, מפגש אישי',
    fomoText: '100% כרטיסים נרכשו',
    fomoPercent: 100,
    soldOut: true,
    color: 'linear-gradient(135deg, #0d1b2a, #1b4965)',
    colorClass: 'bg-slate-800',
    mapLabel: 'VIP',
  },
];
