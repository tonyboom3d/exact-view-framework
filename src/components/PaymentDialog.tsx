import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock } from 'lucide-react';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  totalPrice: number;
}

const PaymentDialog = ({ open, onOpenChange, onConfirm, totalPrice }: PaymentDialogProps) => {
  const [cardNumber, setCardNumber] = useState('4580 1234 5678 9010');
  const [expiry, setExpiry] = useState('12/27');
  const [cvv, setCvv] = useState('123');
  const [cardName, setCardName] = useState('ישראל ישראלי');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5" />
            פרטי תשלום
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center font-medium">
            🔒 זהו דמו בלבד — לא מתבצע חיוב אמיתי
          </div>

          <div>
            <Label className="text-sm font-medium">מספר כרטיס</Label>
            <Input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="mt-1 text-right placeholder:text-right tracking-wider"
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
          </div>

          <div>
            <Label className="text-sm font-medium">שם בעל הכרטיס</Label>
            <Input
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="mt-1 text-right placeholder:text-right"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">תוקף</Label>
              <Input
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="mt-1 text-right"
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">CVV</Label>
              <Input
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                className="mt-1 text-right"
                dir="ltr"
                style={{ textAlign: 'right' }}
                type="password"
              />
            </div>
          </div>

          <div className="border-t border-border pt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">סה״כ לתשלום</span>
            <span className="text-lg font-extrabold text-foreground">₪{totalPrice.toLocaleString()}</span>
          </div>

          <Button
            onClick={onConfirm}
            className="w-full h-12 text-base font-bold bg-cta hover:bg-cta/90 text-cta-foreground rounded-xl shadow-lg"
          >
            <Lock className="w-4 h-4 ml-2" />
            אישור תשלום ₪{totalPrice.toLocaleString()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
