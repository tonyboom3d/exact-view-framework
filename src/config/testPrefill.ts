/**
 * מילוי אוטומטי לבדיקות בלבד.
 * הגדר TEST_PREFILL_ENABLED ל-false לפני מעבר לפרודקשן.
 */

export const TEST_PREFILL_ENABLED = true;

/** המייל שלך – משמש כרטיס ראשון ובמשלם (כשפרטי המשלם שונים) */
export const TEST_EMAIL = 'tonyboom3d@hotmail.com';

/** טלפון כרטיס ראשון */
export const TEST_FIRST_PHONE = '0523813929';

/** טלפון משלם (מסמנים "פרטי המשלם שונים מפרטי המשתתף") */
export const TEST_PAYER_PHONE = '0557040944';

/** שמות פרטיים בעברית – לכל כרטיס (עד 10) */
export const TEST_FIRST_NAMES = [
  'טוני',
  'מיכאל',
  'דוד',
  'יוסי',
  'רמי',
  'אריאל',
  'נועם',
  'גיא',
  'עומר',
  'איתי',
];

/** שמות משפחה בעברית */
export const TEST_LAST_NAMES = [
  'בדיקה',
  'כהן',
  'לוי',
  'ישראלי',
  'מזרחי',
  'אברהם',
  'דהן',
  'בן דוד',
  'שמעון',
  'רוזן',
];

export function getTestGuest(index: number): { firstName: string; lastName: string; email: string; phone: string } {
  const i = index % 10;
  return {
    firstName: TEST_FIRST_NAMES[i],
    lastName: TEST_LAST_NAMES[i],
    email: TEST_EMAIL,
    phone: TEST_FIRST_PHONE,
  };
}

export function getTestPayer(): { firstName: string; lastName: string; email: string; phone: string } {
  return {
    firstName: 'משלם',
    lastName: 'בדיקה',
    email: TEST_EMAIL,
    phone: TEST_PAYER_PHONE,
  };
}
