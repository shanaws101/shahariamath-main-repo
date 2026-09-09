import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ShoppingCart, ArrowLeft, Calculator, BookOpen, CreditCard, Loader2,
  CheckCircle, Tag, Package, ChevronDown, Smartphone, Facebook,
  Copy, LayoutDashboard, FileText,
} from 'lucide-react';
import { DiscountCodeInput } from '@/components/cart/DiscountCodeInput';
import { getInitialCheckoutStep, getMismatchedSubjects } from '@/lib/checkout-logic';

type PaymentMethod = 'bkash';

const departments = [
  { value: 'management', label: 'Management', label_bn: 'ম্যানেজমেন্ট' },
  { value: 'marketing', label: 'Marketing', label_bn: 'মার্কেটিং' },
  { value: 'accounting', label: 'Accounting', label_bn: 'একাউন্টিং' },
  { value: 'finance', label: 'Finance', label_bn: 'ফাইন্যান্স' },
  { value: 'economics', label: 'Economics', label_bn: 'ইকোনমিক্স' },
];

export default function CheckoutPage() {
  const { isEnglish } = useLanguage();
  const { user, profile, isAdmin, isEmployee } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const {
    items, bundles, pdfItems, mathSubjects, theorySubjects,
    mathDiscount, bundlesTotal, pdfTotal,
    grandTotal, originalTotal, clearCart, appliedDiscount,
    originalSubtotal, onlineDiscount, onlineDiscountPercent, codeDiscount,
    removeFromCart, removePdfFromCart,
  } = useCart();

  const paymentParam = searchParams.get('payment');

  const profileComplete = !!(profile?.department && profile?.year);

  const [step, setStep] = useState<'info' | 'review' | 'payment' | 'processing' | 'success'>(
    () => getInitialCheckoutStep(profile, paymentParam),
  );

  useEffect(() => {
    if (paymentParam === 'success') {
      setStep('success');
      clearCart();
    } else if (paymentParam === 'failed') {
      setStep('payment');
      toast({
        title: isEnglish ? 'Payment Failed or Cancelled' : 'পেমেন্ট সম্পন্ন হয়নি বা বাতিল হয়েছে',
        description: isEnglish ? 'Your selected items are still in your cart. You can try again.' : 'আপনার নির্বাচিত আইটেমগুলো কার্টেই আছে। আপনি আবার চেষ্টা করতে পারেন।',
        variant: 'destructive',
      });
    }
  }, [paymentParam]);

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    department: profile?.department || '',
    year: profile?.year?.toString() || '',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bkash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [enrolledSubjectIds, setEnrolledSubjectIds] = useState<string[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        department: profile.department || '',
        year: profile.year?.toString() || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) {
      toast({ title: isEnglish ? 'Please login to checkout' : 'চেকআউটের জন্য লগইন করুন', variant: 'destructive' });
      navigate('/login');
    }
    if (isAdmin || isEmployee) {
      toast({ title: isEnglish ? 'Admins cannot purchase courses' : 'অ্যাডমিনরা কোর্স কিনতে পারবেন না', variant: 'destructive' });
      navigate('/admin');
    }
  }, [user, isAdmin, isEmployee, navigate, isEnglish, toast]);

  if (!user || isAdmin || isEmployee) return null;

  if (items.length === 0 && bundles.length === 0 && pdfItems.length === 0 && step !== 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8 rounded-2xl border-border/60">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {isEnglish ? 'Your cart is empty' : 'আপনার কার্ট খালি'}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {isEnglish ? 'Add some courses or PDF suggestions to get started.' : 'শুরু করতে কিছু কোর্স অথবা পিডিএফ সাজেশন যোগ করুন।'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => navigate('/subjects')} className="btn-brand rounded-xl">
                {isEnglish ? 'Browse Courses' : 'কোর্সসমূহ দেখুন'}
              </Button>
              <Button onClick={() => navigate('/pdf-suggestions')} variant="outline" className="rounded-xl">
                {isEnglish ? 'PDF Suggestions' : 'পিডিএফ সাজেশন'}
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const handleInfoSubmit = async () => {
    if (!formData.department || !formData.year) {
      toast({ title: isEnglish ? 'Please fill all fields' : 'সব তথ্য পূরণ করুন', variant: 'destructive' });
      return;
    }
    if (!profile?.department || !profile?.year) {
      await supabase
        .from('profiles')
        .update({ department: formData.department as any, year: parseInt(formData.year) })
        .eq('user_id', user.id);
    }
    setStep('payment');
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setStep('processing');

    try {
      const transactionId = `SMC-CART-${Date.now()}`;
      const individualSubjectIds = items.map(i => i.id);
      const bundleSubjectIds = bundles.flatMap(b => b.subject_ids);
      const allSubjectIds = [...new Set([...individualSubjectIds, ...bundleSubjectIds])];
      const pdfSuggestionIds = pdfItems.map(p => p.pdf_suggestion_id);

      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: grandTotal,
          status: 'pending',
          gateway_response: {
            method: paymentMethod,
            tran_id: transactionId,
            subject_ids: allSubjectIds,
            bundle_ids: bundles.map(b => b.bundle_id),
            pdf_suggestion_ids: pdfSuggestionIds,
            original_total: originalTotal,
            math_discount: mathDiscount,
            bundles_total: bundlesTotal,
            pdf_total: pdfTotal,
            is_cart_purchase: true,
            ...(appliedDiscount && {
              discount_code: appliedDiscount.code,
              discount_type: appliedDiscount.discount_type,
              discount_value: appliedDiscount.discount_value,
              discount_amount: appliedDiscount.discount_amount,
            }),
          },
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      if (allSubjectIds.length > 0) {
        const enrollments = allSubjectIds.map(sid => ({
          user_id: user.id,
          subject_id: sid,
          payment_id: paymentData.id,
          payment_status: 'pending' as const,
        }));
        await supabase.from('enrollments').upsert(enrollments, { onConflict: 'user_id,subject_id', ignoreDuplicates: true });
        setEnrolledSubjectIds(allSubjectIds);
      }

      if (pdfSuggestionIds.length > 0) {
        try {
          const pdfEnrollments = pdfSuggestionIds.map(pid => ({
            user_id: user.id,
            pdf_suggestion_id: pid,
            access_type: 'paid' as const,
            payment_id: paymentData.id,
            payment_status: 'pending' as const,
          }));
          await (supabase as any)
            .from('pdf_suggestion_enrollments')
            .upsert(pdfEnrollments, { onConflict: 'user_id,pdf_suggestion_id,access_type', ignoreDuplicates: true });
        } catch (e) {
          console.warn('PDF enrollment recording notice:', e);
        }
      }

      let chargeAmount = Number(grandTotal);
      const intent = Math.floor(Number(localStorage.getItem('referral_redeem_intent') || 0));
      if (intent >= 50) {
        const { data: redeem } = await supabase.functions.invoke('request-redemption', {
          body: { payment_id: paymentData.id, requested_points: intent },
        });
        if (redeem?.applied_bdt > 0) {
          chargeAmount = Math.max(0, chargeAmount - Number(redeem.applied_bdt));
          toast({
            title: isEnglish ? 'Points applied' : 'পয়েন্ট প্রয়োগ হয়েছে',
            description: `−৳${redeem.applied_bdt} (${redeem.applied_points} pts)`,
          });
        }
      }
      localStorage.setItem('checkout_payment_id', paymentData.id);

      const { data: bkashData, error: bkashError } = await supabase.functions.invoke('bkash-payment', {
        body: {
          action: 'create',
          amount: chargeAmount,
          orderID: transactionId,
          paymentRecordId: paymentData.id,
          payerReference: formData.phone || profile?.phone || user.email || user.id,
        },
      });

      if (bkashError) throw new Error(bkashError.message);
      if (bkashData?.bkashURL) {
        window.location.href = bkashData.bkashURL;
        return;
      }

      throw new Error(bkashData?.error || bkashData?.errorMessage || bkashData?.statusMessage || 'Payment initialization failed');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({ title: isEnglish ? 'Payment Failed' : 'পেমেন্ট ব্যর্থ', description: error.message, variant: 'destructive' });
      setStep('payment');
      setIsProcessing(false);
    }
  };

  // ---------- SUCCESS SCREEN ----------
  if (step === 'success') {
    return <SuccessScreen
      isEnglish={isEnglish}
      studentId={profile?.student_id || null}
      subjectIds={enrolledSubjectIds}
      onDashboard={() => navigate('/dashboard')}
    />;
  }

  // ---------- ORDER SUMMARY (shared) ----------
  const OrderSummary = (
    <div className="space-y-3">
      {bundles.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Package className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">
              {isEnglish ? `Bundles (${bundles.length})` : `বান্ডেল (${bundles.length})`}
            </span>
          </div>
          {bundles.map(b => (
            <div key={b.bundle_id} className="flex justify-between text-xs py-0.5 items-center">
              <span className="text-muted-foreground truncate pr-2 flex items-center gap-1">
                {isEnglish ? b.title : b.title_bn || b.title}
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">
                  {b.subject_ids.length} {isEnglish ? 'subjects' : 'বিষয়'}
                </Badge>
              </span>
              <span className="font-medium">৳{b.price}</span>
            </div>
          ))}
        </div>
      )}

      {pdfItems.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
              {isEnglish ? `PDF Suggestions (${pdfItems.length})` : `পিডিএফ সাজেশন (${pdfItems.length})`}
            </span>
          </div>
          {pdfItems.map(p => (
            <div key={p.pdf_suggestion_id} className="flex justify-between text-xs py-0.5 items-center">
              <span className="text-muted-foreground truncate pr-2 flex items-center gap-1">
                {isEnglish ? p.title : p.title_bn || p.title}
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 shrink-0 bg-purple-50 text-purple-700 border-purple-200">
                  PDF
                </Badge>
              </span>
              <span className="font-medium">৳{p.price}</span>
            </div>
          ))}
        </div>
      )}

      {mathSubjects.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Calculator className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-bold text-blue-700">
              {isEnglish ? `Math (${mathSubjects.length})` : `গণিত (${mathSubjects.length})`}
            </span>
          </div>
          {mathSubjects.map(s => (
            <div key={s.id} className="flex justify-between text-xs py-0.5">
              <span className="text-muted-foreground truncate pr-2">{isEnglish ? s.name : s.name_bn}</span>
              <span>৳{s.price}</span>
            </div>
          ))}
        </div>
      )}

      {theorySubjects.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">
              {isEnglish ? `Theory (${theorySubjects.length})` : `থিওরি (${theorySubjects.length})`}
            </span>
          </div>
          {theorySubjects.map(s => (
            <div key={s.id} className="flex justify-between text-xs py-0.5">
              <span className="text-muted-foreground truncate pr-2">{isEnglish ? s.name : s.name_bn}</span>
              <span>৳{s.price}</span>
            </div>
          ))}
        </div>
      )}

      <Separator />
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">
          {isEnglish ? 'Original price' : 'মূল মূল্য'}
        </span>
        <span className="line-through text-muted-foreground">৳{originalSubtotal}</span>
      </div>
      {onlineDiscount > 0 && (
        <div className="flex justify-between text-xs text-emerald-600">
          <span className="flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {isEnglish
              ? `Online discount (${onlineDiscountPercent}%)`
              : `অনলাইন ছাড় (${onlineDiscountPercent}%)`}
          </span>
          <span>-৳{onlineDiscount}</span>
        </div>
      )}
      <DiscountCodeInput />
      {appliedDiscount && codeDiscount > 0 && (
        <div className="flex justify-between text-xs text-emerald-600">
          <span className="flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {isEnglish ? 'Code discount' : 'কোড ছাড়'}
          </span>
          <span>-৳{codeDiscount}</span>
        </div>
      )}
      <Separator />
      <div className="flex justify-between font-extrabold text-base pt-1">
        <span>{isEnglish ? 'You pay' : 'আপনি দিচ্ছেন'}</span>
        <span>৳{grandTotal}</span>
      </div>
      {originalSubtotal > grandTotal && (
        <p className="text-xs text-emerald-600 font-medium">
          {isEnglish ? `You save ৳${originalSubtotal - grandTotal}!` : `৳${originalSubtotal - grandTotal} সাশ্রয়!`}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-4 md:py-10 max-w-4xl pb-32 lg:pb-10">
          <Button
            variant="ghost"
            className="mb-3 gap-2 rounded-xl h-11 text-sm -ml-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            {isEnglish ? 'Back' : 'ফিরে যান'}
          </Button>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">
            {isEnglish ? 'Checkout' : 'চেকআউট'}
          </h1>
          <p className="text-sm text-muted-foreground mb-5">
            {step === 'info' && (isEnglish ? 'Step 1 of 2 — Your information' : 'ধাপ ১/২ — আপনার তথ্য')}
            {step === 'review' && (isEnglish ? 'Step 1 of 2 — Confirm your details' : 'ধাপ ১/২ — আপনার তথ্য নিশ্চিত করুন')}
            {step === 'payment' && (isEnglish ? 'Step 2 of 2 — Choose payment method' : 'ধাপ ২/২ — পেমেন্ট পদ্ধতি বেছে নিন')}
            {step === 'processing' && (isEnglish ? 'Processing your payment...' : 'পেমেন্ট প্রক্রিয়াকরণ হচ্ছে...')}
          </p>

          {/* Mobile-only collapsible order summary */}
          <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen} className="lg:hidden mb-5">
            <Card className="rounded-2xl border-border/60 overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm">
                      {isEnglish ? 'Order Summary' : 'অর্ডার সারসংক্ষেপ'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base">৳{grandTotal}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${summaryOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-0 border-t border-border/60">
                  {OrderSummary}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* Info Form */}
              {step === 'info' && (
                <Card className="rounded-2xl border-border/60">
                  <CardContent className="p-5 space-y-4">
                    <h2 className="font-bold text-base">
                      {isEnglish ? 'Your Information' : 'আপনার তথ্য'}
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{isEnglish ? 'Full Name' : 'পূর্ণ নাম'}</Label>
                        <Input value={formData.full_name} disabled className="bg-muted h-12 rounded-xl text-base" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{isEnglish ? 'Phone' : 'ফোন'}</Label>
                        <Input value={formData.phone} disabled className="bg-muted h-12 rounded-xl text-base" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{isEnglish ? 'Department' : 'বিভাগ'} *</Label>
                        <Select value={formData.department} onValueChange={v => setFormData(p => ({ ...p, department: v }))}>
                          <SelectTrigger className="h-12 rounded-xl text-base">
                            <SelectValue placeholder={isEnglish ? 'Select department' : 'বিভাগ নির্বাচন করুন'} />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(d => (
                              <SelectItem key={d.value} value={d.value}>
                                {isEnglish ? d.label : d.label_bn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{isEnglish ? 'Academic Year' : 'শিক্ষাবর্ষ'} *</Label>
                        <Select value={formData.year} onValueChange={v => setFormData(p => ({ ...p, year: v }))}>
                          <SelectTrigger className="h-12 rounded-xl text-base">
                            <SelectValue placeholder={isEnglish ? 'Select year' : 'বর্ষ নির্বাচন করুন'} />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4].map(y => (
                              <SelectItem key={y} value={y.toString()}>
                                {isEnglish ? `Year ${y}` : `${y}ম বর্ষ`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleInfoSubmit} className="w-full h-12 rounded-xl font-bold btn-brand mt-2 text-base">
                      {isEnglish ? 'Continue to Payment' : 'পেমেন্টে এগিয়ে যান'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Review Step */}
              {step === 'review' && (
                <Card className="rounded-2xl border-border/60">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-base">
                        {isEnglish ? 'Confirm Your Information' : 'তথ্য নিশ্চিত করুন'}
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep('info')}
                        className="text-primary text-xs h-8 px-2"
                      >
                        {isEnglish ? 'Edit' : 'পরিবর্তন'}
                      </Button>
                    </div>

                    <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm border border-border/40">
                      <div className="flex justify-between py-1 border-b border-border/30">
                        <span className="text-muted-foreground">{isEnglish ? 'Name' : 'নাম'}</span>
                        <span className="font-semibold">{formData.full_name}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/30">
                        <span className="text-muted-foreground">{isEnglish ? 'Phone' : 'ফোন'}</span>
                        <span className="font-semibold">{formData.phone}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/30">
                        <span className="text-muted-foreground">{isEnglish ? 'Department' : 'বিভাগ'}</span>
                        <span className="font-semibold capitalize">{formData.department}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">{isEnglish ? 'Year' : 'বর্ষ'}</span>
                        <span className="font-semibold">{isEnglish ? `Year ${formData.year}` : `${formData.year}ম বর্ষ`}</span>
                      </div>
                    </div>

                    <Button onClick={() => setStep('payment')} className="w-full h-12 rounded-xl font-bold btn-brand text-base">
                      {isEnglish ? 'Proceed to Payment' : 'পেমেন্টে এগিয়ে যান'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Payment Method Selector */}
              {step === 'payment' && (
                <Card className="rounded-2xl border-border/60">
                  <CardContent className="p-5 space-y-4">
                    <h2 className="font-bold text-base">
                      {isEnglish ? 'Select Payment Method' : 'পেমেন্ট পদ্ধতি বেছে নিন'}
                    </h2>
                    <div className="space-y-3">
                      <PaymentOption
                        id="bkash"
                        name="bKash"
                        subtitle={isEnglish ? 'Pay automatically via bKash gateway' : 'বিকাশ গেটওয়ের মাধ্যমে সরাসরি পেমেন্ট'}
                        icon="/bkash-logo.png"
                        active={paymentMethod === 'bkash'}
                        onClick={() => setPaymentMethod('bkash')}
                        badge={isEnglish ? 'Instant Access' : 'তাৎক্ষণিক সক্রিয়'}
                      />
                    </div>

                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                      <p className="font-semibold mb-1">
                        {isEnglish ? '⚡ Instant Activation:' : '⚡ তাৎক্ষণিক অ্যাক্টিভেশন:'}
                      </p>
                      <p className="leading-relaxed">
                        {isEnglish
                          ? 'After completing bKash payment, your enrolled courses and PDF suggestions will be available immediately in your dashboard.'
                          : 'বিকাশ পেমেন্ট সম্পন্ন হওয়ার সাথে সাথে আপনার এনরোল করা কোর্স ও পিডিএফ সাজেশন ড্যাশবোর্ডে খুলে যাবে।'}
                      </p>
                    </div>

                    <Button
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className="w-full h-14 rounded-2xl font-bold btn-brand text-base shadow-lg shadow-primary/20"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>{isEnglish ? 'Connecting to bKash...' : 'বিকাশে সংযুক্ত হচ্ছে...'}</span>
                        </div>
                      ) : (
                        <span>
                          {isEnglish ? `Pay ৳${grandTotal} with bKash` : `বিকাশে ৳${grandTotal} পেমেন্ট করুন`}
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Processing */}
              {step === 'processing' && (
                <Card className="rounded-2xl border-border/60">
                  <CardContent className="p-10 text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <h2 className="text-xl font-bold">
                      {isEnglish ? 'Connecting to Payment Gateway...' : 'পেমেন্ট গেটওয়েতে সংযোগ করা হচ্ছে...'}
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      {isEnglish
                        ? 'Please do not close this window or press back.'
                        : 'দয়া করে এই উইন্ডো বন্ধ করবেন না বা ব্যাক বাটন চাপবেন না।'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Desktop Order Summary sidebar */}
            <div className="hidden lg:block">
              <Card className="rounded-2xl border-border/60 sticky top-24">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                      {isEnglish ? 'Order Summary' : 'অর্ডার সারসংক্ষেপ'}
                    </h3>
                  </div>
                  {OrderSummary}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PaymentOption({
  name, subtitle, icon, active, onClick, badge,
}: {
  id: string;
  name: string;
  subtitle: string;
  icon?: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-3.5 transition-all ${
        active
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border/60 hover:border-border hover:bg-muted/30'
      }`}
    >
      <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0 p-1.5">
        {icon ? (
          <img src={icon} alt={name} className="w-full h-full object-contain" />
        ) : (
          <Smartphone className="h-6 w-6 text-pink-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-foreground">{name}</span>
          {badge && (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] px-1.5 py-0 h-4 shrink-0">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <div className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
        active ? 'border-primary bg-primary' : 'border-muted-foreground/30'
      }`}>
        {active && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
      </div>
    </button>
  );
}

interface SuccessScreenProps {
  isEnglish: boolean;
  studentId: string | null;
  subjectIds: string[];
  onDashboard: () => void;
}

function SuccessScreen({ isEnglish, studentId, onDashboard }: SuccessScreenProps) {
  const { toast } = useToast();
  const [showSteps, setShowSteps] = useState(false);

  const copyStudentId = async () => {
    if (!studentId) return;
    try {
      await navigator.clipboard.writeText(studentId);
      toast({ title: isEnglish ? 'Student ID copied' : 'Student ID কপি হয়েছে' });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 md:py-12 max-w-xl">
          {/* Hero card */}
          <div className="relative rounded-3xl bg-gradient-to-br from-orange-600 via-primary to-orange-700 p-6 md:p-8 text-white text-center mb-5 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_60%)]" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 ring-4 ring-white/15">
                <CheckCircle className="h-9 w-9 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
                {isEnglish ? 'Payment Successful!' : 'পেমেন্ট সফল হয়েছে!'}
              </h1>
              <p className="text-white/85 text-sm md:text-base leading-relaxed">
                {isEnglish
                  ? 'Welcome to Shaharia Math. Your courses and PDF suggestions are unlocked.'
                  : 'শাহরিয়া ম্যাথে স্বাগতম। আপনার কোর্স ও পিডিএফ সাজেশন আনলক হয়েছে।'}
              </p>
            </div>
          </div>

          {/* Student ID card */}
          {studentId && (
            <Card className="rounded-2xl border-border/60 mb-5">
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
                  {isEnglish ? 'Your Student ID' : 'আপনার Student ID'}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight font-mono">
                    {studentId}
                  </span>
                  <Button
                    onClick={copyStudentId}
                    variant="outline"
                    size="sm"
                    className="h-11 rounded-xl gap-1.5 font-semibold"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {isEnglish ? 'Copy' : 'কপি'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {isEnglish
                    ? "Save this ID — you'll need it for your profile and academic support."
                    : 'এই ID সংরক্ষণ করুন — আপনার প্রোফাইল ও সাপোর্টের জন্য এটি প্রয়োজন।'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="space-y-3 mb-5">
            <Button
              onClick={() => navigate('/dashboard/pdf-reader')}
              className="w-full h-14 rounded-2xl text-base font-bold gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
            >
              <FileText className="h-5 w-5" />
              {isEnglish ? 'Read PDF Suggestions' : 'পিডিএফ সাজেশন পড়ুন'}
            </Button>
            <Button
              onClick={onDashboard}
              variant="outline"
              className="w-full h-14 rounded-2xl text-base font-bold gap-2 border-2"
            >
              <LayoutDashboard className="h-5 w-5" />
              {isEnglish ? 'Go to My Dashboard' : 'আমার ড্যাশবোর্ডে যান'}
            </Button>
            <Button
              onClick={() => setShowSteps(s => !s)}
              variant="ghost"
              className="w-full h-12 rounded-2xl text-sm font-semibold gap-2"
            >
              <Facebook className="h-4 w-4 text-blue-600" />
              {isEnglish ? 'Facebook Group Join Steps' : 'ফেসবুক গ্রুপে যোগ দিন'}
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showSteps ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {showSteps && (
            <Card className="rounded-2xl border-border/60 mb-5 animate-in fade-in slide-in-from-top-2 duration-200">
              <CardContent className="p-5">
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  {isEnglish ? 'How to join the Facebook Group' : 'ফেসবুক গ্রুপে যেভাবে যোগ দিবেন'}
                </h3>
                <ol className="space-y-3">
                  {[
                    {
                      en: 'Go to your enrolled subject page from the dashboard.',
                      bn: 'ড্যাশবোর্ড থেকে এনরোল করা বিষয়ের পেজে যান।',
                    },
                    {
                      en: 'Tap "Open Facebook Group" — you\'ll be taken to the private group.',
                      bn: '"ফেসবুক গ্রুপ খুলুন" বাটনে ট্যাপ করুন — আপনি প্রাইভেট গ্রুপে যাবেন।',
                    },
                    {
                      en: 'Tap "Join Group" and answer the membership questions.',
                      bn: '"Join Group" ট্যাপ করুন এবং মেম্বারশিপ প্রশ্নের উত্তর দিন।',
                    },
                    {
                      en: `Enter your full name and Student ID${studentId ? ` (${studentId})` : ''}.`,
                      bn: `আপনার পূর্ণ নাম ও Student ID${studentId ? ` (${studentId})` : ''} লিখুন।`,
                    },
                    {
                      en: 'Admin will approve your request within 24 hours.',
                      bn: 'অ্যাডমিন ২৪ ঘন্টার মধ্যে আপনার রিকোয়েস্ট অ্যাপ্রুভ করবেন।',
                    },
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed flex-1">
                        {isEnglish ? s.en : s.bn}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-xs text-muted-foreground">
            {isEnglish
              ? 'A confirmation has been recorded in your account.'
              : 'আপনার অ্যাকাউন্টে নিশ্চিতকরণ সংরক্ষিত হয়েছে।'}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
