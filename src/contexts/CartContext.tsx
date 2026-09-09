import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CartSubject {
  id: string;
  name: string;
  name_bn: string;
  price: number;
  original_price?: number | null;
  subject_type: string | null;
  department: string | null;
  course_type: string | null;
  compatible_years: number[] | null;
}

export interface CartBundle {
  id: string;
  bundle_id: string;
  title: string;
  title_bn: string | null;
  price: number;
  original_price: number | null;
  department: string | null;
  year: number | null;
  subject_ids: string[];
  cover_image_url: string | null;
}

export interface CartPdfItem {
  id: string;
  pdf_suggestion_id: string;
  title: string;
  title_bn: string | null;
  price: number;
  original_price: number | null;
  department: string | null;
  course_type: string | null;
  compatible_years: number[] | null;
  slug: string;
}

// Pricing rules (per subject)
const DEFAULT_ORIGINAL_PRICE = 1500; // offline
const DEFAULT_ONLINE_PRICE = 1200;   // 20% off online
const DEFAULT_CODE_FLAT_DISCOUNT = 100; // fallback only when an older code has no value

function getCodeDiscountAmount(total: number, type: string | null | undefined, value: number): number {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeValue = Math.max(0, Number(value) || 0);
  if (safeTotal <= 0 || safeValue <= 0) return 0;
  if (type === 'percentage') return Math.min(safeTotal, Math.round((safeTotal * safeValue) / 100));
  return Math.min(safeTotal, safeValue);
}

interface PricingTier {
  quantity: number;
  discount_percent: number;
}

interface AppliedDiscount {
  code: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
}

interface CartContextType {
  items: CartSubject[];
  bundles: CartBundle[];
  pdfItems: CartPdfItem[];
  isLoading: boolean;
  pricingTiers: PricingTier[];
  addToCart: (subject: CartSubject) => Promise<void>;
  removeFromCart: (subjectId: string) => Promise<void>;
  addBundleToCart: (bundle: CartBundle) => Promise<void>;
  removeBundleFromCart: (bundleId: string) => Promise<void>;
  addPdfToCart: (pdf: CartPdfItem) => Promise<void>;
  removePdfFromCart: (pdfSuggestionId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (subjectId: string) => boolean;
  isBundleInCart: (bundleId: string) => boolean;
  isPdfInCart: (pdfSuggestionId: string) => boolean;
  mathSubjects: CartSubject[];
  theorySubjects: CartSubject[];
  mathTotal: number;
  theoryTotal: number;
  mathDiscount: number;
  bundlesTotal: number;
  pdfTotal: number;
  grandTotal: number;
  originalTotal: number;
  originalSubtotal: number;
  onlineSubtotal: number;
  onlineDiscount: number;
  onlineDiscountPercent: number;
  codeDiscount: number;
  cartCount: number;
  appliedDiscount: AppliedDiscount | null;
  isApplyingDiscount: boolean;
  applyDiscountCode: (code: string, silent?: boolean) => Promise<boolean>;
  removeDiscountCode: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, isEmployee } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartSubject[]>([]);
  const [bundles, setBundles] = useState<CartBundle[]>([]);
  const [pdfItems, setPdfItems] = useState<CartPdfItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  useEffect(() => {
    const fetchTiers = async () => {
      const { data } = await supabase
        .from('pricing_tiers')
        .select('*')
        .order('quantity');
      if (data) setPricingTiers(data);
    };
    fetchTiers();
  }, []);

  useEffect(() => {
    // Initial load from localStorage for guests and quick UI hydration
    try {
      const localPdfData = localStorage.getItem('oli_local_cart_pdf');
      if (localPdfData) {
        const parsed = JSON.parse(localPdfData);
        if (Array.isArray(parsed)) {
          setPdfItems(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setBundles([]);
      // keep guest pdf items if any
      try {
        const localPdfData = localStorage.getItem('oli_local_cart_pdf');
        if (localPdfData) {
          const parsed = JSON.parse(localPdfData);
          if (Array.isArray(parsed)) setPdfItems(parsed);
        }
      } catch {}
      return;
    }

    const fetchCart = async () => {
      setIsLoading(true);

      // 1. Fetch Subject Cart Items
      const { data: cartData } = await supabase
        .from('cart_items')
        .select('subject_id')
        .eq('user_id', user.id);

      if (cartData && cartData.length > 0) {
        // Query user's completed enrollments to filter out already enrolled subjects
        const { data: userEnrollments } = await supabase
          .from('enrollments')
          .select('subject_id')
          .eq('user_id', user.id)
          .eq('payment_status', 'completed');

        const enrolledIds = new Set((userEnrollments || []).map(e => e.subject_id));
        const unpurchasedSubjectIds = cartData
          .map(c => c.subject_id)
          .filter(id => !enrolledIds.has(id));

        // Purge already-enrolled subjects from remote DB cart
        const staleSubjectIds = cartData
          .map(c => c.subject_id)
          .filter(id => enrolledIds.has(id));
        if (staleSubjectIds.length > 0) {
          supabase
            .from('cart_items')
            .delete()
            .eq('user_id', user.id)
            .in('subject_id', staleSubjectIds)
            .then(() => {});
        }

        if (unpurchasedSubjectIds.length > 0) {
          const { data: subjectsData } = await supabase
            .from('subjects')
            .select('*')
            .in('id', unpurchasedSubjectIds);

          if (subjectsData) {
            setItems(subjectsData.map(s => ({
              id: s.id,
              name: s.name,
              name_bn: s.name_bn,
              price: s.price,
              original_price: s.original_price,
              subject_type: s.subject_type,
              department: s.department,
              course_type: s.course_type,
              compatible_years: s.compatible_years,
            })));
          } else {
            setItems([]);
          }
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }

      // 2. Fetch Bundle Cart Items
      const { data: bundleCartData } = await supabase
        .from('cart_bundles')
        .select('id, bundle_id')
        .eq('user_id', user.id);

      if (bundleCartData && bundleCartData.length > 0) {
        const bundleIds = bundleCartData.map(b => b.bundle_id);
        const { data: bundlesData } = await supabase
          .from('bundles')
          .select('*')
          .in('id', bundleIds);

        if (bundlesData) {
          const bundlesWithSubjects = await Promise.all(
            bundlesData.map(async (b) => {
              const { data: bSubjects } = await supabase
                .from('bundle_subjects')
                .select('subject_id')
                .eq('bundle_id', b.id);
              const cartBundleRecord = bundleCartData.find(cb => cb.bundle_id === b.id);
              return {
                id: cartBundleRecord?.id || b.id,
                bundle_id: b.id,
                title: b.title,
                title_bn: b.title_bn,
                price: b.price,
                original_price: b.original_price,
                department: b.department,
                year: b.year,
                subject_ids: (bSubjects || []).map(bs => bs.subject_id),
                cover_image_url: b.cover_image_url,
              };
            })
          );
          setBundles(bundlesWithSubjects);
        }
      } else {
        setBundles([]);
      }

      // 3. Fetch PDF Suggestion Cart Items
      let combinedPdfs: CartPdfItem[] = [];
      try {
        const localData = localStorage.getItem('oli_local_cart_pdf');
        if (localData) {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) combinedPdfs = parsed;
        }
      } catch {}

      // Get user's verified purchased PDF suggestions
      const purchasedPdfIds = new Set<string>();
      try {
        const { data: pdfEnrollments } = await (supabase as any)
          .from('pdf_suggestion_enrollments')
          .select('pdf_suggestion_id, access_type, payment_status')
          .eq('user_id', user.id)
          .eq('access_type', 'paid')
          .eq('payment_status', 'completed');

        if (pdfEnrollments && pdfEnrollments.length > 0) {
          pdfEnrollments.forEach((e: any) => {
            if (e.pdf_suggestion_id) {
              purchasedPdfIds.add(e.pdf_suggestion_id);
            }
          });
        }

        const { data: userPmts } = await supabase
          .from('payments')
          .select('gateway_response')
          .eq('user_id', user.id)
          .eq('status', 'completed');

        (userPmts || []).forEach((p: any) => {
          const ids = p.gateway_response?.pdf_suggestion_ids;
          if (Array.isArray(ids)) {
            ids.forEach((id: string) => purchasedPdfIds.add(id));
          }
        });
      } catch (e) {
        console.warn('PDF enrollment check error:', e);
      }

      try {
        const { data: pdfCartData, error: pdfCartError } = await (supabase as any)
          .from('cart_pdf_items')
          .select('id, pdf_suggestion_id')
          .eq('user_id', user.id);

        if (!pdfCartError && pdfCartData && pdfCartData.length > 0) {
          const pdfIds = pdfCartData.map((p: any) => p.pdf_suggestion_id);
          const { data: pdfsData } = await (supabase as any)
            .from('pdf_suggestions')
            .select('*')
            .in('id', pdfIds);

          if (pdfsData) {
            const dbPdfs: CartPdfItem[] = pdfsData.map((p: any) => ({
              id: p.id,
              pdf_suggestion_id: p.id,
              title: p.title,
              title_bn: p.title_bn,
              price: Number(p.price) || 0,
              original_price: Number(p.original_price) || 0,
              department: p.department,
              course_type: p.course_type,
              compatible_years: p.compatible_years,
              slug: p.slug,
            }));

            // merge with local
            const existingIds = new Set(combinedPdfs.map(c => c.pdf_suggestion_id));
            dbPdfs.forEach(d => {
              if (!existingIds.has(d.pdf_suggestion_id)) {
                combinedPdfs.push(d);
              }
            });
          }
        }
      } catch (err) {
        console.warn('PDF cart remote check:', err);
      }

      // Automatically filter out any already-purchased PDF suggestions
      const stalePdfIds = combinedPdfs
        .filter(p => purchasedPdfIds.has(p.pdf_suggestion_id))
        .map(p => p.pdf_suggestion_id);

      combinedPdfs = combinedPdfs.filter(p => !purchasedPdfIds.has(p.pdf_suggestion_id));

      // Purge stale items from remote DB
      if (stalePdfIds.length > 0) {
        (supabase as any)
          .from('cart_pdf_items')
          .delete()
          .eq('user_id', user.id)
          .in('pdf_suggestion_id', stalePdfIds)
          .then(() => {});
      }

      setPdfItems(combinedPdfs);
      try {
        localStorage.setItem('oli_local_cart_pdf', JSON.stringify(combinedPdfs));
      } catch {}

      setIsLoading(false);
    };
    fetchCart();

    const refSlug = localStorage.getItem('referral_code') || localStorage.getItem('referral_code_id');
    if (user && refSlug) {
      supabase.functions.invoke('claim-referral', { body: { ref_slug: refSlug } }).catch(() => {});
    }
  }, [user]);

  const addToCart = useCallback(async (subject: CartSubject) => {
    if (!user) {
      toast({ title: 'Please login first', variant: 'destructive' });
      return;
    }
    if (isAdmin || isEmployee) {
      toast({ title: 'Admins and employees cannot purchase courses', variant: 'destructive' });
      return;
    }
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('subject_id', subject.id)
      .eq('payment_status', 'completed')
      .maybeSingle();
    if (existing) {
      toast({ title: 'Already enrolled in this subject', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .upsert({ user_id: user.id, subject_id: subject.id }, { onConflict: 'user_id,subject_id' });
    if (!error) {
      setItems(prev => prev.some(i => i.id === subject.id) ? prev : [...prev, subject]);
      toast({ title: 'Added to cart' });
    }
  }, [user, toast, isAdmin, isEmployee]);

  const removeFromCart = useCallback(async (subjectId: string) => {
    if (!user) return;
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('subject_id', subjectId);
    setItems(prev => prev.filter(i => i.id !== subjectId));
  }, [user]);

  const addBundleToCart = useCallback(async (bundle: CartBundle) => {
    if (!user) {
      toast({ title: 'Please login first', variant: 'destructive' });
      return;
    }
    if (isAdmin || isEmployee) {
      toast({ title: 'Admins and employees cannot purchase bundles', variant: 'destructive' });
      return;
    }
    if (bundles.some(b => b.bundle_id === bundle.bundle_id)) {
      toast({ title: 'Bundle already in cart' });
      return;
    }

    const { data, error } = await supabase
      .from('cart_bundles')
      .upsert({ user_id: user.id, bundle_id: bundle.bundle_id }, { onConflict: 'user_id,bundle_id' })
      .select()
      .single();
    if (!error && data) {
      setBundles(prev => [...prev, { ...bundle, id: data.id }]);
      toast({ title: 'Bundle added to cart' });
    }
  }, [user, bundles, toast, isAdmin, isEmployee]);

  const removeBundleFromCart = useCallback(async (bundleId: string) => {
    if (!user) return;
    await supabase
      .from('cart_bundles')
      .delete()
      .eq('user_id', user.id)
      .eq('bundle_id', bundleId);
    setBundles(prev => prev.filter(b => b.bundle_id !== bundleId));
  }, [user]);

  const addPdfToCart = useCallback(async (pdf: CartPdfItem) => {
    if (isAdmin || isEmployee) {
      toast({ title: 'Admins and staff cannot purchase suggestions', variant: 'destructive' });
      return;
    }

    // Check if user already owns this PDF suggestion (strictly completed payment)
    if (user) {
      try {
        const { data: existingEnrollment } = await (supabase as any)
          .from('pdf_suggestion_enrollments')
          .select('id, access_type, payment_status')
          .eq('user_id', user.id)
          .eq('pdf_suggestion_id', pdf.pdf_suggestion_id)
          .eq('access_type', 'paid')
          .eq('payment_status', 'completed');

        if (existingEnrollment && existingEnrollment.length > 0) {
          toast({
            title: 'Already Purchased',
            description: 'You already own this PDF suggestion. Access it in your Student Dashboard.',
          });
          return;
        }

        const { data: userPmts } = await supabase
          .from('payments')
          .select('gateway_response')
          .eq('user_id', user.id)
          .eq('status', 'completed');

        const alreadyPaid = (userPmts || []).some((p: any) => {
          const ids = p.gateway_response?.pdf_suggestion_ids;
          return Array.isArray(ids) && ids.includes(pdf.pdf_suggestion_id);
        });

        if (alreadyPaid) {
          toast({
            title: 'Already Purchased',
            description: 'You already own this PDF suggestion. Access it in your Student Dashboard.',
          });
          return;
        }
      } catch {}
    }

    if (pdfItems.some(p => p.pdf_suggestion_id === pdf.pdf_suggestion_id)) {
      toast({ title: 'PDF Suggestion is already in your cart' });
      return;
    }

    const updated = [...pdfItems, pdf];
    setPdfItems(updated);
    try {
      localStorage.setItem('oli_local_cart_pdf', JSON.stringify(updated));
    } catch {}

    toast({ title: 'Added to cart' });

    // Sync with remote DB if user is logged in
    if (user) {
      try {
        await (supabase as any)
          .from('cart_pdf_items')
          .upsert(
            { user_id: user.id, pdf_suggestion_id: pdf.pdf_suggestion_id },
            { onConflict: 'user_id,pdf_suggestion_id' }
          );
      } catch {}
    }
  }, [user, pdfItems, toast, isAdmin, isEmployee]);

  const removePdfFromCart = useCallback(async (pdfSuggestionId: string) => {
    const updated = pdfItems.filter(p => p.pdf_suggestion_id !== pdfSuggestionId);
    setPdfItems(updated);
    try {
      localStorage.setItem('oli_local_cart_pdf', JSON.stringify(updated));
    } catch {}

    if (user) {
      try {
        await (supabase as any)
          .from('cart_pdf_items')
          .delete()
          .eq('user_id', user.id)
          .eq('pdf_suggestion_id', pdfSuggestionId);
      } catch {}
    }
  }, [user, pdfItems]);

  const clearCart = useCallback(async () => {
    setItems([]);
    setBundles([]);
    setPdfItems([]);
    try {
      localStorage.removeItem('oli_local_cart_pdf');
    } catch {}

    if (user) {
      await Promise.all([
        supabase.from('cart_items').delete().eq('user_id', user.id).catch(() => {}),
        supabase.from('cart_bundles').delete().eq('user_id', user.id).catch(() => {}),
        (supabase as any).from('cart_pdf_items').delete().eq('user_id', user.id).catch(() => {}),
      ]);
    }
  }, [user]);

  const isInCart = useCallback((subjectId: string) => {
    return items.some(i => i.id === subjectId);
  }, [items]);

  const isBundleInCart = useCallback((bundleId: string) => {
    return bundles.some(b => b.bundle_id === bundleId);
  }, [bundles]);

  const isPdfInCart = useCallback((pdfSuggestionId: string) => {
    return pdfItems.some(p => p.pdf_suggestion_id === pdfSuggestionId);
  }, [pdfItems]);

  const mathSubjects = items.filter(i => i.subject_type === 'Math');
  const theorySubjects = items.filter(i => i.subject_type !== 'Math');

  const itemOriginal = (s: CartSubject) =>
    Number(s.original_price) > 0 ? Number(s.original_price) : DEFAULT_ORIGINAL_PRICE;
  const itemOnline = (s: CartSubject) =>
    Number(s.price) > 0 ? Number(s.price) : DEFAULT_ONLINE_PRICE;

  const itemsOriginal = items.reduce((sum, s) => sum + itemOriginal(s), 0);
  const itemsOnline = items.reduce((sum, s) => sum + itemOnline(s), 0);
  const bundlesOriginal = bundles.reduce((sum, b) => sum + (b.original_price || b.price), 0);
  const bundlesTotal = bundles.reduce((sum, b) => sum + b.price, 0);
  const pdfsOriginal = pdfItems.reduce((sum, p) => sum + (Number(p.original_price) || Number(p.price) || 0), 0);
  const pdfTotal = pdfItems.reduce((sum, p) => sum + Number(p.price || 0), 0);

  const originalSubtotal = itemsOriginal + bundlesOriginal + pdfsOriginal;
  const onlineSubtotal = itemsOnline + bundlesTotal + pdfTotal;
  const onlineDiscount = Math.max(0, originalSubtotal - onlineSubtotal);
  const onlineDiscountPercent = originalSubtotal > 0
    ? Math.round((onlineDiscount / originalSubtotal) * 100)
    : 0;

  const mathTotal = mathSubjects.reduce((sum, s) => sum + itemOnline(s), 0);
  const theoryTotal = theorySubjects.reduce((sum, s) => sum + itemOnline(s), 0);
  const mathDiscount = 0;
  const originalTotal = originalSubtotal;

  const applyDiscountCode = useCallback(async (code: string, silent = false): Promise<boolean> => {
    setIsApplyingDiscount(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_checkout_discount', {
        _code: code.trim(),
      });
      const discount = Array.isArray(data) ? data[0] : data;

      if (error || !discount) {
        if (!silent) toast({ title: 'Invalid discount code', variant: 'destructive' });
        return false;
      }

      const discountType = discount.discount_type === 'percentage' ? 'percentage' : 'fixed';
      const discountValue = Number(discount.discount_value) || DEFAULT_CODE_FLAT_DISCOUNT;
      const discountAmount = getCodeDiscountAmount(onlineSubtotal, discountType, discountValue);

      if (discountAmount <= 0) {
        if (!silent) toast({ title: 'Invalid discount code', variant: 'destructive' });
        return false;
      }

      setAppliedDiscount({
        code: discount.short_code || discount.code,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
      });

      if (!silent) toast({ title: 'Discount applied!' });
      return true;
    } finally {
      setIsApplyingDiscount(false);
    }
  }, [onlineSubtotal, toast]);

  const triedReferralRef = useRef(false);
  useEffect(() => {
    if (triedReferralRef.current) return;
    const referralCode = localStorage.getItem('referral_code');
    const hasCartContent = items.length > 0 || bundles.length > 0 || pdfItems.length > 0;
    if (!referralCode || appliedDiscount || isApplyingDiscount || !hasCartContent) return;
    triedReferralRef.current = true;
    applyDiscountCode(referralCode, true).catch(() => {});
  }, [items.length, bundles.length, pdfItems.length]);

  const removeDiscountCode = useCallback(() => {
    setAppliedDiscount(null);
  }, []);

  const codeDiscount = appliedDiscount
    ? getCodeDiscountAmount(onlineSubtotal, appliedDiscount.discount_type, appliedDiscount.discount_value)
    : 0;
  const grandTotal = Math.max(0, onlineSubtotal - codeDiscount);

  return (
    <CartContext.Provider value={{
      items, bundles, pdfItems, isLoading, pricingTiers,
      addToCart, removeFromCart, addBundleToCart, removeBundleFromCart,
      addPdfToCart, removePdfFromCart,
      clearCart, isInCart, isBundleInCart, isPdfInCart,
      mathSubjects, theorySubjects,
      mathTotal, theoryTotal, mathDiscount, bundlesTotal, pdfTotal,
      grandTotal, originalTotal,
      originalSubtotal, onlineSubtotal, onlineDiscount, onlineDiscountPercent, codeDiscount,
      cartCount: items.length + bundles.length + pdfItems.length,
      appliedDiscount, isApplyingDiscount, applyDiscountCode, removeDiscountCode,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
