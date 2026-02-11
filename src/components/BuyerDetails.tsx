import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { BuyerInfo, GuestInfo } from '@/types/order';

interface BuyerDetailsProps {
  buyer: BuyerInfo;
  onBuyerChange: (buyer: BuyerInfo) => void;
  guests: GuestInfo[];
  onGuestsChange: (guests: GuestInfo[]) => void;
  useMyDetails: boolean;
  onUseMyDetailsChange: (v: boolean) => void;
  totalTickets: number;
  errors: Record<string, string>;
}

const BuyerDetails = ({
  buyer,
  onBuyerChange,
  guests,
  onGuestsChange,
  useMyDetails,
  onUseMyDetailsChange,
  totalTickets,
  errors,
}: BuyerDetailsProps) => {
  const additionalGuests = totalTickets > 1 ? totalTickets - 1 : 0;

  const updateGuest = (index: number, field: keyof GuestInfo, value: string) => {
    const updated = [...guests];
    updated[index] = { ...updated[index], [field]: value };
    onGuestsChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground">פרטי הרוכש</h2>
        <p className="text-sm text-muted-foreground mt-1">נא למלא את הפרטים לצורך ההזמנה</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-sm font-medium">אימייל *</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={buyer.email}
            onChange={(e) => onBuyerChange({ ...buyer, email: e.target.value })}
            className={`mt-1 ${errors.email ? 'border-destructive' : ''}`}
            dir="ltr"
          />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName" className="text-sm font-medium">שם פרטי *</Label>
            <Input
              id="firstName"
              placeholder="ישראל"
              value={buyer.firstName}
              onChange={(e) => onBuyerChange({ ...buyer, firstName: e.target.value })}
              className={`mt-1 ${errors.firstName ? 'border-destructive' : ''}`}
            />
            {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <Label htmlFor="lastName" className="text-sm font-medium">שם משפחה *</Label>
            <Input
              id="lastName"
              placeholder="ישראלי"
              value={buyer.lastName}
              onChange={(e) => onBuyerChange({ ...buyer, lastName: e.target.value })}
              className={`mt-1 ${errors.lastName ? 'border-destructive' : ''}`}
            />
            {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm font-medium">טלפון *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="050-1234567"
            value={buyer.phone}
            onChange={(e) => onBuyerChange({ ...buyer, phone: e.target.value })}
            className={`mt-1 ${errors.phone ? 'border-destructive' : ''}`}
            dir="ltr"
          />
          {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
        </div>
      </div>

      {additionalGuests > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="useMyDetails"
              checked={useMyDetails}
              onCheckedChange={(v) => onUseMyDetailsChange(v as boolean)}
            />
            <Label htmlFor="useMyDetails" className="text-sm cursor-pointer">
              השתמש בפרטים שלי עבור כרטיס 1
            </Label>
          </div>

          <Accordion type="multiple" className="w-full">
            {Array.from({ length: additionalGuests }, (_, i) => (
              <AccordionItem key={i} value={`guest-${i}`}>
                <AccordionTrigger className="text-sm font-medium">
                  פרטי אורח {i + 2}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">שם פרטי</Label>
                        <Input
                          placeholder="שם פרטי"
                          value={guests[i]?.firstName || ''}
                          onChange={(e) => updateGuest(i, 'firstName', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">שם משפחה</Label>
                        <Input
                          placeholder="שם משפחה"
                          value={guests[i]?.lastName || ''}
                          onChange={(e) => updateGuest(i, 'lastName', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">טלפון</Label>
                      <Input
                        type="tel"
                        placeholder="050-1234567"
                        value={guests[i]?.phone || ''}
                        onChange={(e) => updateGuest(i, 'phone', e.target.value)}
                        className="mt-1"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
};

export default BuyerDetails;
