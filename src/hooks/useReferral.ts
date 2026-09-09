import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReferralInfo {
  codeId: string;
  code: string;
  discountPercentReceiver: number;
  discountPercentOwner: number;
  ownerUserId: string | null;
  subjectId: string | null;
}

/**
 * Hook to manage referral state across signup and checkout flows.
 * Reads from localStorage/cookie set by /ref/:code redirect.
 */
export function useReferral() {
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReferral();
  }, []);

  const loadReferral = async () => {
    const codeId = localStorage.getItem("referral_code_id");
    if (!codeId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("discount_codes")
        .select("id, code, short_code, discount_percent_receiver, discount_percent_owner, owner_user_id, subject_id, is_active, is_referral")
        .eq("id", codeId)
        .eq("is_active", true)
        .eq("is_referral", true)
        .maybeSingle();

      if (data) {
        setReferral({
          codeId: data.id,
          code: data.short_code || data.code,
          discountPercentReceiver: Number(data.discount_percent_receiver) || 0,
          discountPercentOwner: Number(data.discount_percent_owner) || 0,
          ownerUserId: data.owner_user_id,
          subjectId: data.subject_id,
        });
      } else {
        // Invalid/expired code, clean up
        clearReferral();
      }
    } catch (err) {
      console.error("Error loading referral:", err);
    }

    setIsLoading(false);
  };

  const clearReferral = useCallback(() => {
    localStorage.removeItem("referral_code_id");
    localStorage.removeItem("referral_code");
    document.cookie = "referral_code_id=; path=/; max-age=0";
    setReferral(null);
  }, []);

  /**
   * Call after signup to create referral_conversions + earned_discounts for owner.
   * Includes anti-abuse: prevents self-referral.
   */
  const attributeSignup = useCallback(
    async (newUserId: string) => {
      if (!referral) return;

      // Anti-abuse: prevent self-referral
      if (referral.ownerUserId === newUserId) {
        console.warn("Self-referral blocked");
        clearReferral();
        return;
      }

      try {
        // Create conversion record
        await supabase.from("referral_conversions").insert({
          referral_code_id: referral.codeId,
          new_user_id: newUserId,
        });

        // Grant earned discount to referral owner
        if (referral.ownerUserId && referral.discountPercentOwner > 0) {
          await supabase.from("earned_discounts").insert({
            user_id: referral.ownerUserId,
            referral_code_id: referral.codeId,
            discount_percent: referral.discountPercentOwner,
          });
        }

        // Increment current_uses on the code
        const { data: currentCode } = await supabase
          .from("discount_codes")
          .select("current_uses")
          .eq("id", referral.codeId)
          .single();

        if (currentCode) {
          await supabase
            .from("discount_codes")
            .update({ current_uses: currentCode.current_uses + 1 })
            .eq("id", referral.codeId);
        }
      } catch (err) {
        console.error("Error attributing referral signup:", err);
      }
    },
    [referral, clearReferral]
  );

  /**
   * Calculate the discount amount for a given price.
   * Returns { discountPercent, discountAmount, finalPrice }
   */
  const calculateDiscount = useCallback(
    (price: number, subjectId?: string) => {
      if (!referral || referral.discountPercentReceiver <= 0) {
        return { discountPercent: 0, discountAmount: 0, finalPrice: price };
      }

      // If referral is subject-specific and doesn't match
      if (referral.subjectId && subjectId && referral.subjectId !== subjectId) {
        return { discountPercent: 0, discountAmount: 0, finalPrice: price };
      }

      const discountPercent = referral.discountPercentReceiver;
      const discountAmount = Math.round((price * discountPercent) / 100);
      const finalPrice = Math.max(0, price - discountAmount);

      return { discountPercent, discountAmount, finalPrice };
    },
    [referral]
  );

  /**
   * Get any earned (unredeemed) discounts for the current user.
   */
  const getEarnedDiscounts = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("earned_discounts")
      .select("*")
      .eq("user_id", userId)
      .eq("redeemed", false);
    return data || [];
  }, []);

  /**
   * Mark an earned discount as redeemed.
   */
  const redeemEarnedDiscount = useCallback(async (discountId: string) => {
    await supabase
      .from("earned_discounts")
      .update({ redeemed: true })
      .eq("id", discountId);
  }, []);

  return {
    referral,
    isLoading,
    clearReferral,
    attributeSignup,
    calculateDiscount,
    getEarnedDiscounts,
    redeemEarnedDiscount,
  };
}
