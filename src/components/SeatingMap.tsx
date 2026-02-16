import { type TicketType, type TicketInfo } from '@/types/order';

const SEATING_MAP_IMAGE =
  'https://static.wixstatic.com/media/977fa3_a97cf645c2574a4a8df3fa928c107706~mv2.png';

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
        {/* Map image - left on desktop, top on mobile */}
        <div className="flex-shrink-0 md:max-w-[55%] flex justify-center md:justify-start">
          <img
            src={SEATING_MAP_IMAGE}
            alt="מפת אזורי ישיבה"
            className="w-full max-w-md md:max-w-none h-auto object-contain rounded-lg"
          />
        </div>

        {/* Text content - right on desktop, below on mobile */}
        <div className="flex-1 min-w-0 flex flex-col justify-center text-right space-y-4">
          <h3 className="text-[19px] font-bold text-foreground">מפת אזורי ישיבה</h3>

          <div className="space-y-4 text-foreground/90 text-[15px] leading-relaxed">
            <section>
              <h4 className="font-bold text-[16px] text-foreground mb-1">Premier</h4>
              <p>
                המושבים הקרובים ביותר לבמה, בשתי השורות הראשונות של הגוש המרכזי. אזור זה מסומן
                בצבע זהב. הכרטיסים הללו הם Sold Out ואינם זמינים למכירה.
              </p>
            </section>

            <section>
              <h4 className="font-bold text-[16px] text-foreground mb-1">VIP</h4>
              <p>
                מושבי פרימיום הממוקמים בגוש המרכזי בשורות 3 עד 6, וכן בשתי השורות הראשונות של
                הגושים הצדדיים. האזור מסומן בצבע סגול ומציע חוויית צפייה משודרגת.
              </p>
            </section>

            <section>
              <h4 className="font-bold text-[16px] text-foreground mb-1">General Admission</h4>
              <p>
                כל שאר המושבים באולם, מסומנים בצבע כחול. כולל את יתר השורות בגוש המרכזי והצדדי,
                ומציעים חוויית ישיבה נוחה עם שדה ראייה מצוין.
              </p>
            </section>

            <p className="text-[13px] text-muted-foreground pt-1 border-t border-border/60">
              המפה נועדה להמחשה בלבד ומציגה את חלוקת אזורי הישיבה לפי סוג כרטיס, ללא מספרי מושבים
              או מחירים.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatingMap;
