import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Coins, Users, TrendingUp, Wallet, Copy, Check, Edit3, Share2,
  Loader2, Facebook, MessageCircle, RefreshCw,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { validateSlug, maskName, buildReferralUrl } from "@/lib/referral-slug";

interface SlugInfo {
  code_id: string;
  slug: string;
  code: string;
}
interface HistoryRow {
  id: string;
  converted_at: string;
  points_awarded: number;
  masked_name: string;
}

const REDEEM_INTENT_KEY = "referral_redeem_intent";

export default function ReferEarnPage() {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [slugInfo, setSlugInfo] = useState<SlugInfo | null>(null);
  const [balance, setBalance] = useState(0);
  const [stats, setStats] = useState({ referrals: 0, pointsEarned: 0 });
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const [editing, setEditing] = useState(false);
  const [draftSlug, setDraftSlug] = useState("");
  const [checkState, setCheckState] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [checkReason, setCheckReason] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [intentPoints, setIntentPoints] = useState<number>(() => {
    const v = Number(localStorage.getItem(REDEEM_INTENT_KEY) || 0);
    return Number.isFinite(v) && v >= 50 ? v : 0;
  });

  const refreshAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: slugData }, { data: bal }] = await Promise.all([
        supabase.rpc("get_or_create_referral_slug"),
        supabase.rpc("get_referral_balance", { _user_id: user.id }),
      ]);
      const row = Array.isArray(slugData) ? slugData[0] : slugData;
      if (row) setSlugInfo(row as SlugInfo);
      setBalance(Number(bal ?? 0));

      // Conversions for this owner via referral_code
      if (row) {
        const { data: convs } = await supabase
          .from("referral_conversions")
          .select("id, converted_at, points_awarded, new_user_id")
          .eq("referral_code_id", (row as any).code_id)
          .order("converted_at", { ascending: false })
          .limit(20);

        const ids = (convs ?? []).map((c) => c.new_user_id);
        let nameMap: Record<string, string> = {};
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", ids);
          (profs ?? []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });
        }
        setHistory(
          (convs ?? []).map((c) => ({
            id: c.id,
            converted_at: c.converted_at,
            points_awarded: c.points_awarded ?? 200,
            masked_name: maskName(nameMap[c.new_user_id]),
          })),
        );
        setStats({
          referrals: convs?.length ?? 0,
          pointsEarned: (convs ?? []).reduce((s, c) => s + (c.points_awarded ?? 200), 0),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Debounced slug availability check
  useEffect(() => {
    if (!editing) return;
    const v = validateSlug(draftSlug);
    if (!v.ok) { setCheckState("bad"); setCheckReason(v.reason ?? "invalid"); return; }
    if (slugInfo && draftSlug.toLowerCase() === slugInfo.slug?.toLowerCase()) {
      setCheckState("ok"); setCheckReason(null); return;
    }
    setCheckState("checking"); setCheckReason(null);
    const t = setTimeout(async () => {
      const { data } = await supabase.functions.invoke("referral-slug-check", {
        body: { slug: draftSlug.toLowerCase().trim() },
      });
      if (data?.available) { setCheckState("ok"); setCheckReason(null); }
      else { setCheckState("bad"); setCheckReason(data?.reason ?? "taken"); }
    }, 400);
    return () => clearTimeout(t);
  }, [draftSlug, editing, slugInfo]);

  const referralUrl = slugInfo ? buildReferralUrl(slugInfo.slug, window.location.origin) : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast({ title: isEnglish ? "Link copied" : "লিংক কপি হয়েছে" });
  };

  const startEdit = () => { setDraftSlug(slugInfo?.slug ?? ""); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setCheckState("idle"); };

  const saveSlug = async () => {
    if (checkState !== "ok") return;
    setSavingSlug(true);
    const { data, error } = await supabase.rpc("update_referral_slug", { _new_slug: draftSlug.toLowerCase().trim() });
    setSavingSlug(false);
    if (error || !(data as any)?.ok) {
      toast({ title: isEnglish ? "Could not save" : "সংরক্ষণ করা যায়নি", variant: "destructive" });
      return;
    }
    toast({ title: isEnglish ? "Custom link saved" : "লিংক সংরক্ষিত হয়েছে" });
    setEditing(false);
    refreshAll();
  };

  const regenerateSlug = async () => {
    setRegenerating(true);
    const { data, error } = await supabase.rpc("regenerate_referral_slug");
    setRegenerating(false);
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) {
      toast({ title: isEnglish ? "Could not regenerate" : "নতুন লিংক তৈরি করা যায়নি", variant: "destructive" });
      return;
    }
    setSlugInfo(row as SlugInfo);
    toast({ title: isEnglish ? "New referral link generated" : "নতুন রেফারাল লিংক তৈরি হয়েছে" });
  };

  const updateIntent = (n: number) => {
    const capped = Math.min(Math.max(0, Math.floor(n)), balance);
    setIntentPoints(capped);
    if (capped >= 50) localStorage.setItem(REDEEM_INTENT_KEY, String(capped));
    else localStorage.removeItem(REDEEM_INTENT_KEY);
  };

  const shareWA = `https://wa.me/?text=${encodeURIComponent(
    (isEnglish ? "Join Shaharia Math with my link: " : "আমার লিংক দিয়ে শাহরিয়া ম্যাথে যোগ দাও: ") + referralUrl,
  )}`;
  const shareFB = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`;

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {isEnglish ? "Refer & Earn" : "রেফার ও আয় করো"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEnglish
              ? "Invite friends, earn 200 points (৳200) per signup, and use them at checkout."
              : "বন্ধুদের আমন্ত্রণ জানাও, প্রতি সাইনআপে ২০০ পয়েন্ট (৳২০০) আয় করো এবং চেকআউটে ব্যবহার করো।"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Coins} label={isEnglish ? "Points balance" : "পয়েন্ট ব্যালেন্স"} value={loading ? null : balance} accent="emerald" />
          <StatCard icon={Wallet} label={isEnglish ? "BDT value" : "টাকার মূল্য"} value={loading ? null : `৳${balance}`} accent="amber" />
          <StatCard icon={Users} label={isEnglish ? "Referrals" : "রেফারাল"} value={loading ? null : stats.referrals} accent="blue" />
          <StatCard icon={TrendingUp} label={isEnglish ? "Points earned" : "মোট আয়"} value={loading ? null : stats.pointsEarned} accent="violet" />
        </div>

        {/* Link manager */}
        <Card>
          <CardHeader><CardTitle className="text-base">{isEnglish ? "Your referral link" : "তোমার রেফারাল লিংক"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                {!editing ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input readOnly value={referralUrl} placeholder={isEnglish ? "Generating your link…" : "লিংক তৈরি হচ্ছে…"} className="font-mono text-sm" />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={copyLink} variant="default" className="h-10" disabled={!referralUrl}>
                        {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        {isEnglish ? "Copy" : "কপি"}
                      </Button>
                      <Button onClick={startEdit} variant="outline" className="h-10" disabled={!slugInfo}>
                        <Edit3 className="h-4 w-4 mr-1" />
                        {isEnglish ? "Edit slug" : "এডিট"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="h-10" disabled={regenerating}>
                            {regenerating
                              ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              : <RefreshCw className="h-4 w-4 mr-1" />}
                            {isEnglish ? "Regenerate" : "নতুন লিংক"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {isEnglish ? "Generate a new referral link?" : "নতুন রেফারাল লিংক তৈরি করবে?"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {isEnglish
                                ? "Your old link will stop working immediately. Anyone you already shared it with won't be able to use it. Earned points stay safe."
                                : "তোমার পুরনো লিংক আর কাজ করবে না। ইতোমধ্যে শেয়ার করা থাকলে সেগুলো বাতিল হবে। অর্জিত পয়েন্ট নিরাপদ থাকবে।"}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{isEnglish ? "Cancel" : "বাতিল"}</AlertDialogCancel>
                            <AlertDialogAction onClick={regenerateSlug}>
                              {isEnglish ? "Yes, regenerate" : "হ্যাঁ, তৈরি করো"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-xs">{isEnglish ? "Custom slug (4-20, a-z 0-9 -)" : "কাস্টম স্ল্যাগ (৪-২০, a-z 0-9 -)"}</Label>
                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-muted-foreground hidden sm:inline">/join?ref=</span>
                      <Input
                        value={draftSlug}
                        onChange={(e) => setDraftSlug(e.target.value.toLowerCase())}
                        autoFocus
                        className={
                          checkState === "ok" ? "border-emerald-500" :
                          checkState === "bad" ? "border-red-500" : ""
                        }
                      />
                      {checkState === "checking" && <Loader2 className="h-4 w-4 animate-spin" />}
                      {checkState === "ok" && <Check className="h-4 w-4 text-emerald-600" />}
                    </div>
                    {checkState === "bad" && (
                      <p className="text-xs text-red-600">
                        {checkReason === "taken"
                          ? (isEnglish ? "This slug is taken" : "এই স্ল্যাগটি নেওয়া হয়েছে")
                          : (isEnglish ? "Use 4-20 lowercase letters, numbers, hyphens" : "৪-২০ অক্ষর: a-z, 0-9, -")}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={saveSlug} disabled={checkState !== "ok" || savingSlug}>
                        {savingSlug && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {isEnglish ? "Save" : "সংরক্ষণ"}
                      </Button>
                      <Button variant="ghost" onClick={cancelEdit}>{isEnglish ? "Cancel" : "বাতিল"}</Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild variant="secondary" size="sm">
                    <a href={shareWA} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-1" /> WhatsApp</a>
                  </Button>
                  <Button asChild variant="secondary" size="sm">
                    <a href={shareFB} target="_blank" rel="noreferrer"><Facebook className="h-4 w-4 mr-1" /> Facebook</a>
                  </Button>
                  <Button onClick={copyLink} variant="ghost" size="sm">
                    <Share2 className="h-4 w-4 mr-1" /> {isEnglish ? "More…" : "আরও…"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Redemption */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isEnglish ? "Redeem points at checkout" : "চেকআউটে পয়েন্ট ব্যবহার করো"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {isEnglish
                ? "1 point = ৳1. Minimum 50 points. Final amount is confirmed at checkout."
                : "১ পয়েন্ট = ৳১। ন্যূনতম ৫০ পয়েন্ট। চূড়ান্ত পরিমাণ চেকআউটে নিশ্চিত হবে।"}
            </p>
            {balance < 50 ? (
              <p className="text-sm">{isEnglish ? `You need ${50 - balance} more points to redeem.` : `আরও ${50 - balance} পয়েন্ট দরকার।`}</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>{isEnglish ? "Apply at next checkout" : "পরবর্তী চেকআউটে প্রয়োগ"}</span>
                  <Badge variant="secondary">{intentPoints} pts → ৳{intentPoints}</Badge>
                </div>
                <Slider
                  min={0} max={balance} step={10}
                  value={[intentPoints]}
                  onValueChange={(v) => updateIntent(v[0])}
                />
                <p className="text-xs text-muted-foreground">
                  {isEnglish
                    ? `Remaining after redemption: ${balance - intentPoints} pts`
                    : `প্রয়োগের পর বাকি: ${balance - intentPoints} পয়েন্ট`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader><CardTitle className="text-base">{isEnglish ? "Recent referrals" : "সাম্প্রতিক রেফারাল"}</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-24 w-full" /> :
              history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isEnglish ? "No referrals yet. Share your link to start earning." : "এখনও কোনো রেফারাল নেই। শেয়ার করো!"}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground border-b">
                      <tr>
                        <th className="py-2">{isEnglish ? "Friend" : "বন্ধু"}</th>
                        <th className="py-2">{isEnglish ? "Joined" : "যোগ দিয়েছে"}</th>
                        <th className="py-2 text-right">{isEnglish ? "Points" : "পয়েন্ট"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 10).map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 font-mono">{r.masked_name}</td>
                          <td className="py-2">{new Date(r.converted_at).toLocaleDateString()}</td>
                          <td className="py-2 text-right text-emerald-600 font-semibold">+{r.points_awarded}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, label, value, accent }: {
  icon: any; label: string; value: number | string | null; accent: "emerald" | "amber" | "blue" | "violet";
}) {
  const tint = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  }[accent];
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${tint}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold mt-0.5">{value === null ? <Skeleton className="h-6 w-12" /> : value}</p>
      </CardContent>
    </Card>
  );
}
