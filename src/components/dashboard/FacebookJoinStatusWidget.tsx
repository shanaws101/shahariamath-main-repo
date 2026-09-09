import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, CheckCircle2, Clock, XCircle, ExternalLink, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubjectRow {
  id: string;
  name: string;
  name_bn: string;
  facebook_group_url: string | null;
}
interface RequestRow {
  subject_id: string;
  status: "pending" | "approved" | "rejected";
}

export function FacebookJoinStatusWidget({ refreshKey = 0 }: { refreshKey?: number }) {
  const { isEnglish } = useLanguage();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [requests, setRequests] = useState<Record<string, RequestRow["status"]>>({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: enr } = await supabase
      .from("enrollments")
      .select("subject:subjects(id, name, name_bn, facebook_group_url)")
      .eq("user_id", user.id)
      .eq("payment_status", "completed");

    const subs = ((enr || []) as any[])
      .map((e) => e.subject)
      .filter((s) => s && s.facebook_group_url) as SubjectRow[];
    setSubjects(subs);

    if (subs.length) {
      const { data: reqs } = await supabase
        .from("facebook_join_requests")
        .select("subject_id, status")
        .eq("user_id", user.id);
      const map: Record<string, RequestRow["status"]> = {};
      (reqs || []).forEach((r: any) => { map[r.subject_id] = r.status; });
      setRequests(map);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const markSent = async (subjectId: string) => {
    if (!user) return;
    setSubmittingId(subjectId);
    const { error } = await supabase.from("facebook_join_requests").upsert(
      { user_id: user.id, subject_id: subjectId, status: "pending" },
      { onConflict: "user_id,subject_id" }
    );
    setSubmittingId(null);
    if (error) {
      toast({ title: isEnglish ? "Error" : "ত্রুটি", description: error.message, variant: "destructive" });
      return;
    }
    setRequests((r) => ({ ...r, [subjectId]: "pending" }));
    toast({
      title: isEnglish ? "Marked as pending" : "অপেক্ষমাণ হিসেবে চিহ্নিত",
      description: isEnglish ? "Admin will verify shortly." : "অ্যাডমিন শীঘ্রই যাচাই করবেন।",
    });
  };

  const copyId = () => {
    if (!profile?.student_id) return;
    navigator.clipboard.writeText(profile.student_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!subjects.length) return null;

  const statusBadge = (s?: string) => {
    if (s === "approved") return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] rounded-md gap-1"><CheckCircle2 className="h-3 w-3" />{isEnglish ? "Approved" : "অনুমোদিত"}</Badge>;
    if (s === "pending") return <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] rounded-md gap-1"><Clock className="h-3 w-3" />{isEnglish ? "Pending" : "অপেক্ষমাণ"}</Badge>;
    if (s === "rejected") return <Badge className="bg-red-100 text-red-700 border-0 text-[10px] rounded-md gap-1"><XCircle className="h-3 w-3" />{isEnglish ? "Rejected" : "প্রত্যাখ্যাত"}</Badge>;
    return <Badge variant="outline" className="text-[10px] rounded-md">{isEnglish ? "Not Sent" : "পাঠানো হয়নি"}</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold flex items-center gap-2 tracking-tight">
          <Facebook className="h-4 w-4 text-blue-600" />
          {isEnglish ? "Facebook Group Status" : "ফেসবুক গ্রুপ স্ট্যাটাস"}
        </h2>
        {profile?.student_id && (
          <button
            onClick={copyId}
            className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg bg-muted hover:bg-muted/70"
          >
            {profile.student_id}
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 opacity-60" />}
          </button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground -mt-1">
        {isEnglish
          ? "Use your Student ID when sending the FB Group join request."
          : "ফেসবুক গ্রুপে জয়েন রিকোয়েস্ট পাঠানোর সময় আপনার Student ID ব্যবহার করুন।"}
      </p>

      <div className="space-y-2">
        {subjects.map((s) => {
          const status = requests[s.id];
          return (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-bold text-sm truncate">{isEnglish ? s.name : s.name_bn}</p>
                {statusBadge(status)}
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline" className="flex-1 h-10 rounded-xl text-xs gap-1">
                  <a href={s.facebook_group_url!} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    {isEnglish ? "Open Group" : "গ্রুপ খুলুন"}
                  </a>
                </Button>
                {status !== "approved" && (
                  <Button
                    size="sm"
                    onClick={() => markSent(s.id)}
                    disabled={submittingId === s.id || status === "pending"}
                    className="flex-1 h-10 rounded-xl text-xs gap-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {submittingId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : status === "pending" ? (
                      <>
                        <Clock className="h-3.5 w-3.5" />
                        {isEnglish ? "Awaiting" : "অপেক্ষমাণ"}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isEnglish ? "I Sent Request" : "রিকোয়েস্ট পাঠিয়েছি"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
