import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, X, Loader2, CheckCircle } from 'lucide-react';

export function DiscountCodeInput() {
  const { isEnglish } = useLanguage();
  const { appliedDiscount, isApplyingDiscount, applyDiscountCode, removeDiscountCode } = useCart();
  const [code, setCode] = useState('');

  const handleApply = async () => {
    if (!code.trim()) return;
    const success = await applyDiscountCode(code);
    if (success) setCode('');
  };

  return (
    <div className="space-y-2">
      {appliedDiscount && (
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
            <div>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">{appliedDiscount.code}</span>
              <span className="text-xs text-green-600 dark:text-green-500 ml-1.5">
                (-{appliedDiscount.discount_type === 'percentage' ? `${appliedDiscount.discount_value}%` : `৳${appliedDiscount.discount_value}`})
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={removeDiscountCode}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={
              appliedDiscount
                ? (isEnglish ? 'Replace with another code' : 'অন্য কোড দিয়ে প্রতিস্থাপন')
                : (isEnglish ? 'Discount code' : 'ডিসকাউন্ট কোড')
            }
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3"
          onClick={handleApply}
          disabled={!code.trim() || isApplyingDiscount}
        >
          {isApplyingDiscount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (isEnglish ? 'Apply' : 'প্রয়োগ')}
        </Button>
      </div>
    </div>
  );
}
