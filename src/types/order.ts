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
  progressColor: string;
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
    description: 'כל שאר המושבים באולם, מסומנים בצבע כחול. כולל את יתר השורות בגוש המרכזי והצדדי, חוויית ישיבה נוחה עם שדה ראייה מצוין לבמה.',
    fomoText: '85% כרטיסים נרכשו',
    fomoPercent: 85,
    soldOut: false,
    color: 'linear-gradient(135deg, #1e3a5f, #2980b9)',
    progressColor: '#2980b9',
    colorClass: 'bg-blue-600',
    mapLabel: 'אזור כללי',
  },
  {
    type: 'premier',
    name: 'Premier',
    price: 3450,
    description: 'המושבים הקרובים ביותר לבמה, בשתי השורות הראשונות של הגוש המרכזי. אזור זה מסומן בצבע זהב במפת ההושבה ומציע קרבה מרבית.',
    fomoText: '100% כרטיסים נרכשו',
    fomoPercent: 100,
    soldOut: false,
    color: 'linear-gradient(135deg, #1a237e, #5c6bc0)',
    progressColor: '#5c6bc0',
    colorClass: 'bg-indigo-600',
    mapLabel: 'אזור פרמייר',
  },
  {
    type: 'vip',
    name: 'VIP Experience',
    price: 4500,
    description: 'מושבי פרימיום בגוש המרכזי בשורות 3 עד 6 ובשתי השורות הראשונות של הגושים הצדדיים. האזור מסומן בסגול עם חוויית צפייה משודרגת.',
    fomoText: '100% כרטיסים נרכשו',
    fomoPercent: 100,
    soldOut: true,
    color: 'linear-gradient(135deg, #0d1b2a, #1b4965)',
    progressColor: '#1b4965',
    colorClass: 'bg-slate-800',
    mapLabel: 'VIP',
  },
];
