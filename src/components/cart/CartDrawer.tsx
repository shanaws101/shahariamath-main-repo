import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ShoppingCart, Trash2, ArrowRight, Calculator, BookOpen, Tag, Package, FileText } from 'lucide-react';
import { DiscountCodeInput } from './DiscountCodeInput';

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const {
    items, bundles, pdfItems, cartCount, removeFromCart, removeBundleFromCart, removePdfFromCart,
    mathSubjects, theorySubjects,
    grandTotal, originalSubtotal, onlineDiscount, onlineDiscountPercent, codeDiscount,
    pricingTiers, appliedDiscount,
  } = useCart();
  const { isEnglish } = useLanguage();
  const navigate = useNavigate();

  const mathCount = mathSubjects.length;
  const currentTier = pricingTiers
    .filter(t => t.quantity <= mathCount)
    .sort((a, b) => b.quantity - a.quantity)[0];
  const discountPercent = currentTier?.discount_percent || 0;

  const nextTier = pricingTiers
    .filter(t => t.quantity > mathCount)
    .sort((a, b) => a.quantity - b.quantity)[0];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-2">
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">{isEnglish ? 'Cart' : 'কার্ট'}</span>
          {cartCount > 0 && (
            <Badge className="h-5 min-w-5 px-1 bg-primary text-primary-foreground text-xs flex items-center justify-center rounded-full">
              {cartCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {isEnglish ? 'Shopping Cart' : 'শপিং কার্ট'}
            {cartCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {cartCount} {isEnglish ? (cartCount === 1 ? 'item' : 'items') : 'টি আইটেম'}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {cartCount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm font-medium">
              {isEnglish ? 'Your cart is empty' : 'আপনার কার্ট খালি'}
            </p>
            <Button
              variant="link"
              className="mt-2 text-primary"
              onClick={() => { setOpen(false); navigate('/subjects'); }}
            >
              {isEnglish ? 'Browse Courses' : 'কোর্সসমূহ দেখুন'}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {/* Bundles */}
              {bundles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">
                      {isEnglish ? 'Bundles' : 'বান্ডেল'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {bundles.map(b => (
                      <div key={b.bundle_id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{isEnglish ? b.title : b.title_bn || b.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {b.subject_ids.length} {isEnglish ? 'subjects' : 'বিষয়'}
                            {b.department && ` · ${b.department}`}
                            {b.year && ` · Year ${b.year}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            {b.original_price != null && Math.max(b.price, b.original_price) > Math.min(b.price, b.original_price) && (
                              <span className="line-through text-muted-foreground text-xs block">
                                ৳{Math.max(b.price, b.original_price)}
                              </span>
                            )}
                            <span className="text-sm font-bold">
                              ৳{b.original_price != null ? Math.min(b.price, b.original_price) : b.price}
                            </span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeBundleFromCart(b.bundle_id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Suggestions */}
              {pdfItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                      {isEnglish ? 'PDF Suggestions' : 'পিডিএফ সাজেশন'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {pdfItems.map(p => (
                      <div key={p.pdf_suggestion_id} className="flex items-center justify-between p-3 rounded-lg border bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/50">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-sm font-medium truncate">{isEnglish ? p.title : p.title_bn || p.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] bg-purple-100/60 dark:bg-purple-900/40 border-0 px-1 py-0">PDF Suggestion</Badge>
                            {p.department && <span className="text-xs text-muted-foreground capitalize">· {p.department}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            {p.original_price && p.original_price > p.price && (
                              <span className="line-through text-muted-foreground text-xs block">৳{p.original_price}</span>
                            )}
                            <span className="text-sm font-bold text-foreground">৳{p.price}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePdfFromCart(p.pdf_suggestion_id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Math Subjects */}
              {mathSubjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">
                      {isEnglish ? 'Math Subjects' : 'গণিত বিষয়'}
                    </span>
                    {discountPercent > 0 && (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        {discountPercent}% {isEnglish ? 'off' : 'ছাড়'}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {mathSubjects.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{isEnglish ? s.name : s.name_bn}</p>
                          <p className="text-xs text-muted-foreground capitalize">{s.department}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">৳{s.price}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Theory Subjects */}
              {theorySubjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">
                      {isEnglish ? 'Theory Subjects' : 'থিওরি বিষয়'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({isEnglish ? 'flat price' : 'নির্ধারিত মূল্য'})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {theorySubjects.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{isEnglish ? s.name : s.name_bn}</p>
                          <p className="text-xs text-muted-foreground capitalize">{s.department}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">৳{s.price}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next tier nudge */}
              {nextTier && mathCount > 0 && (
                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <p className="text-xs text-primary font-medium">
                      {isEnglish 
                        ? `Add ${nextTier.quantity - mathCount} more math subject${nextTier.quantity - mathCount > 1 ? 's' : ''} to get ${nextTier.discount_percent}% discount!`
                        : `আরো ${nextTier.quantity - mathCount}টি গণিত বিষয় যোগ করলে ${nextTier.discount_percent}% ছাড় পাবেন!`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Price Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {isEnglish ? 'Original price' : 'মূল মূল্য'}
                </span>
                <span className="line-through text-muted-foreground">৳{originalSubtotal}</span>
              </div>
              {onlineDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>
                    {isEnglish
                      ? `Online discount (${onlineDiscountPercent}%)`
                      : `অনলাইন ছাড় (${onlineDiscountPercent}%)`}
                  </span>
                  <span>-৳{onlineDiscount}</span>
                </div>
              )}
              <DiscountCodeInput />
              {appliedDiscount && codeDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{isEnglish ? 'Code discount' : 'কোড ছাড়'}</span>
                  <span>-৳{codeDiscount}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>{isEnglish ? 'You pay' : 'আপনি দিচ্ছেন'}</span>
                <span>৳{grandTotal}</span>
              </div>
              <Button 
                className="w-full btn-brand mt-2" 
                onClick={() => { setOpen(false); navigate('/checkout'); }}
              >
                {isEnglish ? 'Proceed to Checkout' : 'চেকআউটে যান'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
