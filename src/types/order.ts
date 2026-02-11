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
    fomoText: '85% נמכר!',
    fomoPercent: 85,
    soldOut: false,
    color: '#3B82F6',
    colorClass: 'bg-blue-400',
    mapLabel: 'אזור כללי',
  },
  {
    type: 'premier',
    name: 'Premier',
    price: 3450,
    description: 'ישיבה באזור מועדף, קרוב לבמה',
    fomoText: '72% נמכר!',
    fomoPercent: 72,
    soldOut: false,
    color: '#2563EB',
    colorClass: 'bg-blue-600',
    mapLabel: 'אזור פרמייר',
  },
  {
    type: 'vip',
    name: 'VIP Experience',
    price: 4500,
    description: 'חוויית VIP מלאה, שורות ראשונות, מפגש אישי',
    fomoText: '100% נמכר!',
    fomoPercent: 100,
    soldOut: true,
    color: '#1D4ED8',
    colorClass: 'bg-blue-800',
    mapLabel: 'VIP',
  },
];
