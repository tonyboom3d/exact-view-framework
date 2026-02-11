import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock } from 'lucide-react';

interface StickyBottomBarProps {
  step: number;
  totalPrice: number;
  ticketCount: number;
  onNext: () => void;
  onBack: () => void;
  disabled?: boolean;
}

const StickyBottomBar = ({ step, totalPrice, ticketCount, onNext, onBack, disabled }: StickyBottomBarProps) => {
  if (step === 4) return null;

  const labels: Record<number, string> = {
    1: 'המשך לפרטי הרוכש',
    2: 'המשך לסיכום הזמנה',
    3: 'המשך לתשלום מאובטח',
  };

  return (
    <div className="sticky bottom-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="max-w-2xl mx-auto px-4 py-3">
        {ticketCount > 0 && step === 1 && (
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">{ticketCount} כרטיסים</span>
            <span className="font-bold text-foreground">₪{totalPrice.toLocaleString()}</span>
          </div>
        )}
        <div className="flex gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={onBack}
              className="px-4"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={disabled}
            className="flex-1 h-12 text-base font-bold bg-[hsl(var(--cta))] hover:bg-[hsl(var(--cta))]/90 text-[hsl(var(--cta-foreground))] rounded-xl shadow-lg"
          >
            {step === 3 && <Lock className="w-4 h-4 ml-2" />}
            {labels[step]}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StickyBottomBar;
