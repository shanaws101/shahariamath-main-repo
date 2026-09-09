import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useReferral } from "@/hooks/useReferral";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, CreditCard, Loader2, ExternalLink, Users, Tag, Lock, Ticket, X } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  name_bn: string;
  price: number;
  original_price?: number | null;
  facebook_group_url?: string | null;
}

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  preSelectedSubjectId?: string;
  onSuccess?: () => void;
}

type PaymentMethod = 'bkash';

export default function PurchaseDialog({
  open, onOpenChange, subjects, preSelectedSubjectId, onSuccess,
}: PurchaseDialogProps) {
  const { isEnglish } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { referral, calculateDiscount, getEarnedDiscounts, redeemEarnedDiscount, clearReferral } = useReferral();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(preSelectedSubjectId || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bkash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'payment' | 'processing' | 'success'>('select');
  const [enrolledSubject, setEnrolledSubject] = useState<Subject | null>(null);
  const [earnedDiscount, setEarnedDiscount] = useState<{ id: string; discount_percent: number } | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedCode, setAppliedCode] = useState<{ id: string; code: string; discount_value: number; discount_type: string } | null>(null);
  const [isApplyingCode, setIsApplyingCode] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedSubjectId(preSelectedSubjectId || '');
      setStep('select');
      setPaymentMethod('bkash');
      setEnrolledSubject(null);
      setEarnedDiscount(null);
      setDiscountCode('');
      setAppliedCode(null);
      setIsApplyingCode(false);
      // Load earned discounts for the user
      if (user) {
        getEarnedDiscounts(user.id).then(discounts => {
          if (discounts.length > 0) {
            setEarnedDiscount({ id: discounts[0].id, discount_percent: Number(discounts[0].discount_percent) });
          }
        });
      }
    }
  }, [open, preSelectedSubjectId, user, getEarnedDiscounts]);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  // Calculate total discount (referral + earned)
  const basePrice = selectedSubject ? (selectedSubject.original_price != null ? Math.min(selectedSubject.price, selectedSubject.original_price) : selectedSubject.price) : 0;
  const referralDiscount = selectedSubject ? calculateDiscount(basePrice, selectedSubject.id) : { discountPercent: 0, discountAmount: 0, finalPrice: 0 };
  const earnedDiscountAmount = selectedSubject && earnedDiscount ? Math.round((basePrice * earnedDiscount.discount_percent) / 100) : 0;
  // Calculate manual discount code amount
  const codeDiscountAmount = selectedSubject && appliedCode
    ? appliedCode.discount_type === 'percentage'
      ? Math.round((basePrice * appliedCode.discount_value) / 100)
      : Math.min(appliedCode.discount_value, basePrice)
    : 0;

  const totalDiscount = referralDiscount.discountAmount + earnedDiscountAmount + codeDiscountAmount;
  const finalPrice = Math.max(0, basePrice - totalDiscount);
  const hasAnyDiscount = totalDiscount > 0;

  const handleApplyDiscountCode = async () => {
    if (!discountCode.trim()) return;
    setIsApplyingCode(true);
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('id, code, short_code, discount_value, discount_type, is_active, is_referral, subject_id, valid_until, max_uses, current_uses')
        .or(`code.eq.${discountCode.trim()},short_code.eq.${discountCode.trim()}`)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        toast({ title: isEnglish ? "Invalid discount code" : "অবৈধ ডিসকাউন্ট কোড", variant: "destructive" });
        setIsApplyingCode(false);
        return;
      }

      // Check expiry
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        toast({ title: isEnglish ? "This code has expired" : "এই কোডটি মেয়াদোত্তীর্ণ", variant: "destructive" });
        setIsApplyingCode(false);
        return;
      }

      // Check max uses
      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast({ title: isEnglish ? "This code has reached its usage limit" : "এই কোডটি ব্যবহারের সীমায় পৌঁছেছে", variant: "destructive" });
        setIsApplyingCode(false);
        return;
      }

      // Check subject-specific
      if (data.subject_id && selectedSubjectId && data.subject_id !== selectedSubjectId) {
        toast({ title: isEnglish ? "This code is not valid for this subject" : "এই কোডটি এই বিষয়ের জন্য প্রযোজ্য নয়", variant: "destructive" });
        setIsApplyingCode(false);
        return;
      }

      setAppliedCode({
        id: data.id,
        code: data.short_code || data.code,
        discount_value: Number(data.discount_value),
        discount_type: data.discount_type,
      });
      toast({ title: isEnglish ? "Discount code applied!" : "ডিসকাউন্ট কোড প্রয়োগ হয়েছে!" });
    } catch (err) {
      toast({ title: isEnglish ? "Error applying code" : "কোড প্রয়োগে ত্রুটি", variant: "destructive" });
    }
    setIsApplyingCode(false);
  };

  const handleRemoveCode = () => {
    setAppliedCode(null);
    setDiscountCode('');
  };

  const handleProceedToPayment = () => {
    if (!selectedSubjectId) {
      toast({ title: isEnglish ? "Please select a subject" : "অনুগ্রহ করে একটি বিষয় নির্বাচন করুন", variant: "destructive" });
      return;
    }
    setStep('payment');
  };

  const handleBkashCheckoutPayment = async () => {
    if (!user || !selectedSubject) return;
    setIsProcessing(true);
    setStep('processing');

    try {
      const transactionId = `SMC-BKASH-${Date.now()}`;

      // Get user profile for customer info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('user_id', user.id)
        .single();

      // Create a pending payment record first
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: finalPrice,
          status: 'pending',
          gateway_response: {
            method: 'bkash',
            tran_id: transactionId,
            subject_id: selectedSubject.id,
            original_price: selectedSubject.price,
            discount_applied: totalDiscount,
            referral_code: referral?.code || null,
            discount_code: appliedCode?.code || null,
            discount_code_id: appliedCode?.id || null,
            earned_discount_id: earnedDiscount?.id || null,
          },
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create pending enrollment
      await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          subject_id: selectedSubject.id,
          payment_id: paymentData.id,
          payment_status: 'pending',
        });

      const { data: bkashData, error: bkashError } = await supabase.functions.invoke('bkash-payment', {
        body: {
          action: 'create',
          amount: finalPrice,
          orderID: transactionId,
          paymentRecordId: paymentData.id,
          payerReference: profile?.phone || user.email || user.id,
        },
      });

      if (bkashError) throw new Error(bkashError.message);

      if (bkashData?.bkashURL) {
        window.location.href = bkashData.bkashURL;
        return;
      }

      throw new Error(bkashData?.error || bkashData?.errorMessage || bkashData?.statusMessage || 'Failed to initialize bKash payment');
    } catch (error: any) {
      console.error('bKash payment error:', error);
      toast({
        title: isEnglish ? "Payment Failed" : "পেমেন্ট ব্যর্থ",
        description: error.message || (isEnglish ? "Please try again." : "অনুগ্রহ করে আবার চেষ্টা করুন।"),
        variant: "destructive",
      });
      setStep('payment');
      setIsProcessing(false);
    }
  };

  const handlePayment = () => {
    handleBkashCheckoutPayment();
  };

  const handleClose = () => { if (!isProcessing) onOpenChange(false); };
  const handleDone = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {/* Step: Select Subject */}
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle>{isEnglish ? "Select Subject" : "বিষয় নির্বাচন করুন"}</DialogTitle>
              <DialogDescription>{isEnglish ? "Choose a subject to enroll in" : "নথিভুক্ত হতে একটি বিষয় বেছে নিন"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <RadioGroup value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                  {subjects.length > 0 ? subjects.map(subject => (
                    <div
                      key={subject.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSubjectId === subject.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedSubjectId(subject.id)}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={subject.id} id={subject.id} />
                        <Label htmlFor={subject.id} className="cursor-pointer font-medium">
                          {isEnglish ? subject.name : subject.name_bn}
                        </Label>
                      </div>
                      <Badge variant="secondary" className="font-bold">৳{subject.price}</Badge>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {isEnglish ? "No subjects available" : "কোন বিষয় উপলব্ধ নেই"}
                    </p>
              )}
                </div>
              </RadioGroup>
              <Button className="w-full" onClick={handleProceedToPayment} disabled={!selectedSubjectId}>
                {isEnglish ? "Proceed to Payment" : "পেমেন্টে এগিয়ে যান"}
              </Button>
            </div>
          </>
        )}

        {/* Step: Payment */}
        {step === 'payment' && selectedSubject && (
          <>
            <DialogHeader>
              <DialogTitle>{isEnglish ? "Complete Payment" : "পেমেন্ট সম্পূর্ণ করুন"}</DialogTitle>
              <DialogDescription>{isEnglish ? "Select payment method and pay" : "পেমেন্ট পদ্ধতি নির্বাচন করুন এবং পে করুন"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{isEnglish ? selectedSubject.name : selectedSubject.name_bn}</p>
                    <p className="text-sm text-muted-foreground">{isEnglish ? "Course Enrollment" : "কোর্স নথিভুক্তি"}</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">৳{selectedSubject.price}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isEnglish ? "Payment Method" : "পেমেন্ট পদ্ধতি"}</Label>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <div className="grid grid-cols-1 gap-2">
                    <div
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-colors ${
                        paymentMethod === 'bkash' ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30' : 'hover:bg-muted'
                      }`}
                      onClick={() => setPaymentMethod('bkash')}
                    >
                      <RadioGroupItem value="bkash" id="bkash" className="sr-only" />
                      <div className="w-12 h-8 bg-pink-500 rounded flex items-center justify-center text-white font-bold text-xs">bKash</div>
                      <span className="text-xs">bKash</span>
                      <span className="text-[10px] text-emerald-600 font-medium">Checkout</span>
                    </div>
                  </div>
                </RadioGroup>
              </div>


              {/* Discount Code Input */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Ticket className="h-4 w-4" />
                  {isEnglish ? "Have a discount code?" : "ডিসকাউন্ট কোড আছে?"}
                </Label>
                {appliedCode ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                      <CheckCircle className="h-4 w-4" />
                      <code className="font-mono font-medium">{appliedCode.code}</code>
                      <span>
                        -{appliedCode.discount_type === 'percentage' ? `${appliedCode.discount_value}%` : `৳${appliedCode.discount_value}`}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemoveCode}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder={isEnglish ? "Enter code" : "কোড লিখুন"}
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscountCode()}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyDiscountCode}
                      disabled={isApplyingCode || !discountCode.trim()}
                      className="shrink-0"
                    >
                      {isApplyingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEnglish ? "Apply" : "প্রয়োগ")}
                    </Button>
                  </div>
                )}
              </div>

              {/* Auto-applied discount banner */}
              {hasAnyDiscount && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <Lock className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="flex-1 text-sm">
                    {referral && referralDiscount.discountAmount > 0 && (
                      <p className="text-green-700 dark:text-green-300">
                        <Tag className="h-3 w-3 inline mr-1" />
                        Referral <code className="font-mono bg-green-100 dark:bg-green-900 px-1 rounded text-xs">{referral.code}</code>: -{referralDiscount.discountPercent}% (৳{referralDiscount.discountAmount})
                      </p>
                    )}
                    {earnedDiscount && earnedDiscountAmount > 0 && (
                      <p className="text-green-700 dark:text-green-300">
                        🎁 Earned reward: -{earnedDiscount.discount_percent}% (৳{earnedDiscountAmount})
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>{isEnglish ? "Subtotal" : "সাবটোটাল"}</span>
                    <span>৳{selectedSubject.price}</span>
                  </div>
                  {hasAnyDiscount && (
                    <div className="flex justify-between items-center text-sm text-green-600">
                      <span>{isEnglish ? "Discount" : "ছাড়"}</span>
                      <span>-৳{totalDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t">
                    <span className="font-medium">{isEnglish ? "Total" : "মোট"}</span>
                    <span className="text-xl font-bold text-primary">৳{finalPrice}</span>
                  </div>
                </div>
                <Button className="w-full gap-2" size="lg" onClick={handlePayment}>
                  <CreditCard className="h-4 w-4" />
                  {isEnglish ? `Pay with bKash ৳${finalPrice}` : `বিকাশ দিয়ে পে করুন ৳${finalPrice}`}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep('select')}>
                  {isEnglish ? "Back" : "পিছনে"}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <>
            <DialogHeader>
              <DialogTitle>{isEnglish ? "Processing Payment" : "পেমেন্ট প্রক্রিয়াকরণ"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-center text-muted-foreground">
                {isEnglish ? "Redirecting to bKash..." : "বিকাশে রিডাইরেক্ট করা হচ্ছে..."}
              </p>
            </div>
          </>
        )}

        {/* Step: Success */}
        {step === 'success' && enrolledSubject && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-green-600">
                {isEnglish ? "🎉 Thank You!" : "🎉 ধন্যবাদ!"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-center">
                  {isEnglish ? "Payment Successful!" : "পেমেন্ট সফল হয়েছে!"}
                </h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {isEnglish 
                    ? `You are now enrolled in ${enrolledSubject.name}` 
                    : `আপনি এখন ${enrolledSubject.name_bn} এ নথিভুক্ত`}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Users className="h-5 w-5" />
                  <span className="font-semibold">{isEnglish ? "Join Facebook Group" : "ফেসবুক গ্রুপে যোগ দিন"}</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {isEnglish 
                    ? "Live classes happen on our Facebook Group. Join now to get access!"
                    : "লাইভ ক্লাস আমাদের ফেসবুক গ্রুপে হয়। অ্যাক্সেস পেতে এখনই যোগ দিন!"}
                </p>
                {enrolledSubject.facebook_group_url ? (
                  <Button asChild className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                    <a href={enrolledSubject.facebook_group_url} target="_blank" rel="noopener noreferrer">
                      <Users className="h-4 w-4" />
                      {isEnglish ? "Join Facebook Group" : "ফেসবুক গ্রুপে যোগ দিন"}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-blue-500 italic">
                    {isEnglish ? "Facebook group link will be available in your dashboard" : "ফেসবুক গ্রুপ লিঙ্ক আপনার ড্যাশবোর্ডে পাওয়া যাবে"}
                  </p>
                )}
              </div>

              <Button onClick={handleDone} variant="outline" className="w-full">
                {isEnglish ? "Go to Dashboard" : "ড্যাশবোর্ডে যান"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
