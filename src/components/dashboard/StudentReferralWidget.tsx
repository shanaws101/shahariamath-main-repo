import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2, Gift, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export function StudentReferralWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isEnglish } = useLanguage();
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [totalInvites, setTotalInvites] = useState(0);
  const [earnedDiscounts, setEarnedDiscounts] = useState<{ discount_percent: number; redeemed: boolean }[]>([]);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: code } = await supabase.from("discount_codes").select("id, short_code, code").eq("owner_user_id", user.id).eq("is_referral", true).eq("owner_type", "student").maybeSingle();
      if (code) {
        setReferralLink(`https://olisaharacademy.com/ref/${code.short_code || code.code}`);
        const { count } = await supabase.from("referral_conversions").select("id", { count: "exact", head: true }).eq("referral_code_id", code.id);
        setTotalInvites(count || 0);
      }
      const { data: discounts } = await supabase.from("earned_discounts").select("discount_percent, redeemed").eq("user_id", user.id);
      if (discounts) setEarnedDiscounts(discounts);
    };
    load();
  }, [user]);

  const generateLink = async () => {
    if (!user) return;
    setIsGenerating(true);
    const shortCode = `stu-${Math.random().toString(36).substring(2, 8)}`;
    const { error } = await supabase.from("discount_codes").insert({ code: shortCode, short_code: shortCode, is_referral: true, owner_user_id: user.id, owner_type: "student", discount_type: "percentage", discount_value: 0, discount_percent_receiver: 5, discount_percent_owner: 5, is_active: true });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setReferralLink(`https://olisaharacademy.com/ref/${shortCode}`); toast({ title: isEnglish ? "Link generated!" : "লিংক তৈরি হয়েছে!" }); }
    setIsGenerating(false);
  };

  const copyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: isEnglish ? "Copied!" : "কপি হয়েছে!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const unredeemed = earnedDiscounts.filter((d) => !d.redeemed);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          {isEnglish ? "Refer & Earn" : "রেফার করুন ও আয় করুন"}
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {referralLink ? (
          <>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2.5 py-1.5 bg-muted rounded-xl text-[11px] font-mono truncate">{referralLink}</code>
              <Button variant="outline" size="icon" className="shrink-0 h-8 w-8 rounded-xl" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">{totalInvites} {isEnglish ? "invites" : "আমন্ত্রণ"}</span>
              </div>
              {unredeemed.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-green-600 font-semibold text-xs">{unredeemed.reduce((s, d) => s + d.discount_percent, 0)}% {isEnglish ? "earned" : "অর্জিত"}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <Button onClick={generateLink} disabled={isGenerating} variant="outline" className="w-full h-10 rounded-xl gap-2">
            <Link2 className="h-4 w-4" />
            {isGenerating ? (isEnglish ? "Generating..." : "তৈরি হচ্ছে...") : (isEnglish ? "Generate Referral Link" : "রেফারাল লিংক তৈরি করুন")}
          </Button>
        )}
      </div>
    </div>
  );
}
