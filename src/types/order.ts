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
    color: '#C0C0C0',
    colorClass: 'bg-gray-400',
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
    color: '#D4A373',
    colorClass: 'bg-amber-400',
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
    color: '#C5A355',
    colorClass: 'bg-yellow-600',
    mapLabel: 'VIP',
  },
];
