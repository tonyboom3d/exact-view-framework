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
  // Step 1 has buy buttons on each ticket, step 4 has no bar, step 2 has inline button
  if (step === 1 || step === 2 || step === 4) return null;

  const labels: Record<number, string> = {
    2: 'המשך לסיכום הזמנה',
    3: 'המשך לתשלום מאובטח',
  };

  return (
    <div className="sticky bottom-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="max-w-4xl mx-auto w-[95%] py-3">
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
            className="flex-1 h-12 text-base font-bold bg-cta hover:bg-cta/90 text-cta-foreground rounded-xl shadow-lg"
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
