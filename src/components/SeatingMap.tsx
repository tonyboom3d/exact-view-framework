import { type TicketType, type TicketInfo } from '@/types/order';

const SEATING_MAP_IMAGE =
  'https://static.wixstatic.com/media/977fa3_8feec6d9f02f4c86960936f527259820~mv2.png';

interface SeatingMapProps {
  hoveredTicket?: TicketType | null;
  activeTicket?: TicketType | null;
  onHoverZone?: (type: TicketType | null) => void;
  tickets?: TicketInfo[];
}

const SeatingMap = (_props: SeatingMapProps) => {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex flex-col md:flex-row rtl:md:flex-row-reverse gap-6 md:gap-8 items-stretch">
        {/* Text content - top on mobile, right on desktop */}
        <div className="flex-1 min-w-0 flex flex-col justify-center text-right space-y-4">
          <h3 className="text-[19px] font-bold text-foreground">מפת אזורי ישיבה</h3>

          <div className="space-y-4 text-foreground/90 text-[15px] leading-relaxed">
            <section>
              <h4 className="font-bold text-[16px] text-foreground mb-1">Premier</h4>
              <p>חוויית הפרימיום הקרובה ביותר לבמה - מושבים בגוש המרכזי.</p>
            </section>

            <section>
              <h4 className="font-bold text-[16px] text-foreground mb-1">VIP</h4>
              <p>חוויית צפייה משודרגת ומיקום אסטרטגי באולם.</p>
            </section>

            <section>
              <h4 className="font-bold text-[16px] text-foreground mb-1">General Admission</h4>
              <p>חוויית ההשתתפות המלאה עם אווירה אנרגטית של קהל גדול.</p>
            </section>

            <p className="text-[13px] text-muted-foreground pt-1 border-t border-border/60">
              המפה נועדה להמחשה בלבד ומציגה את חלוקת אזורי הישיבה לפי סוג כרטיס, ללא מספרי מושבים
              או מחירים.
            </p>
          </div>
        </div>

        {/* Map image - below text on mobile, left on desktop */}
        <div className="flex-shrink-0 md:max-w-[55%] flex justify-center md:justify-start">
          <img
            src={SEATING_MAP_IMAGE}
            alt="מפת אזורי ישיבה"
            className="w-full max-w-md md:max-w-none h-auto object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default SeatingMap;
