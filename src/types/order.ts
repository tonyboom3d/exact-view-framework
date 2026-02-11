export type TicketType = 'general' | 'premier' | 'vip';

export interface TicketInfo {
  type: TicketType;
  name: string;
  price: number;
  description: string;
  fomoText: string;
  fomoPercent: number;
  soldOut: boolean;
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
    fomoText: '85% נמכר!',
    fomoPercent: 85,
    soldOut: false,
  },
  {
    type: 'premier',
    name: 'Premier',
    price: 3450,
    description: 'ישיבה באזור מועדף, קרוב לבמה',
    fomoText: '72% נמכר!',
    fomoPercent: 72,
    soldOut: false,
  },
  {
    type: 'vip',
    name: 'VIP Experience',
    price: 4500,
    description: 'חוויית VIP מלאה, שורות ראשונות, מפגש אישי',
    fomoText: '100% נמכר!',
    fomoPercent: 100,
    soldOut: true,
  },
];
