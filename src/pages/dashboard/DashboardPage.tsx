import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

import { Link, useSearchParams } from "react-router-dom";
import { EnrolledSubjectsWidget } from "@/components/dashboard/EnrolledSubjectsWidget";
import { FreeClassesWidget } from "@/components/dashboard/FreeClassesWidget";
import { PaidBatchesRow } from "@/components/dashboard/PaidBatchesRow";
import { FacebookJoinStatusWidget } from "@/components/dashboard/FacebookJoinStatusWidget";
import { LiveClassesWidget } from "@/components/dashboard/LiveClassesWidget";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { StudentOnboardingDialog } from "@/components/dashboard/StudentOnboardingDialog";
import { Copy, Check, Sparkles, BookOpen, GraduationCap, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function DashboardPage() {
  const { t, isEnglish } = useLanguage();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const paymentId = searchParams.get('payment_id');
    if (!paymentStatus) return;
    if (paymentStatus === 'success') {
      toast({
        title: isEnglish ? "🎉 Payment Successful!" : "🎉 পেমেন্ট সফল হয়েছে!",
        description: isEnglish ? "Your enrollment has been confirmed." : "আপনার নথিভুক্তি নিশ্চিত হয়েছে।",
      });

      // Fulfill PDF enrollments if this payment contained PDF suggestions
      if (user) {
        (async () => {
          try {
            const pid = paymentId || localStorage.getItem('checkout_payment_id');
            if (pid) {
              const { data: pmt } = await supabase
                .from('payments')
                .select('status, gateway_response')
                .eq('id', pid)
                .maybeSingle();

              if (pmt && pmt.status === 'completed') {
                const pdfIds = pmt.gateway_response?.pdf_suggestion_ids;
                if (Array.isArray(pdfIds) && pdfIds.length > 0) {
                  const pdfEnrollments = pdfIds.map((id: string) => ({
                    user_id: user.id,
                    pdf_suggestion_id: id,
                    access_type: 'paid',
                    payment_id: pid,
                    payment_status: 'completed',
                  }));
                  await (supabase as any)
                    .from('pdf_suggestion_enrollments')
                    .upsert(pdfEnrollments, { onConflict: 'user_id,pdf_suggestion_id,access_type' });
                }
              }
            }
          } catch {}
        })();
      }

      setTimeout(() => setRefreshKey(k => k + 1), 1500);
    }
    searchParams.delete('payment');
    searchParams.delete('payment_id');
    setSearchParams(searchParams, { replace: true });
  }, [user]);

  useEffect(() => {
    if (!user || profile?.onboarding_completed) {
      setShowOnboarding(false);
      return;
    }

    let isMounted = true;
    let timer: NodeJS.Timeout;

    const checkOnboardingAndEnrollments = async () => {
      // 1. Check if student already filled onboarding table
      const { data: onboardingData } = await supabase
        .from("student_onboarding")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (onboardingData) {
        setShowOnboarding(false);
        return;
      }

      // 2. Check if student has completed enrollments
      const { count } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("payment_status", "completed");

      if (!isMounted) return;

      if (count && count > 0) {
        timer = setTimeout(() => {
          if (isMounted) setShowOnboarding(true);
        }, 5000);
      }
    };

    checkOnboardingAndEnrollments();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [user, profile?.onboarding_completed, refreshKey]);

  const copyStudentId = () => {
    if (profile?.student_id) {
      navigator.clipboard.writeText(profile.student_id);
      setCopied(true);
      toast({ title: isEnglish ? "Copied!" : "কপি করা হয়েছে!", description: profile.student_id });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return isEnglish ? 'Good Morning' : 'শুভ সকাল';
    if (hour < 17) return isEnglish ? 'Good Afternoon' : 'শুভ অপরাহ্ন';
    return isEnglish ? 'Good Evening' : 'শুভ সন্ধ্যা';
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 md:space-y-6 max-w-3xl mx-auto">
        <StudentOnboardingDialog open={showOnboarding} onOpenChange={setShowOnboarding} />

        {/* Compact Welcome */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-brand p-5 md:p-6 text-white">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/70 mb-0.5">{getGreeting()} 👋</p>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight truncate">
                {firstName}
              </h1>
              {profile?.student_id && (
                <button
                  onClick={copyStudentId}
                  className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/90"
                >
                  <span className="text-[11px] font-medium opacity-70">ID:</span>
                  <span className="font-mono font-bold text-xs">{profile.student_id}</span>
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-300" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-60" />
                  )}
                </button>
              )}
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 backdrop-blur-sm">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <DashboardStats />

        {/* Live Classes */}
        <LiveClassesWidget />

        {/* Quick Action */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Button asChild className="h-12 rounded-2xl font-bold text-xs sm:text-sm gap-2 bg-primary hover:bg-primary/90">
            <Link to="/subjects">
              <BookOpen className="h-4 w-4 shrink-0" />
              <span className="truncate">{isEnglish ? "Browse Courses" : "কোর্স দেখুন"}</span>
            </Link>
          </Button>
          <Button asChild className="h-12 rounded-2xl font-bold text-xs sm:text-sm gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-sm">
            <Link to="/dashboard/pdf-reader">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{isEnglish ? "PDF Suggestions" : "পিডিএফ সাজেশন"}</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-2xl font-bold text-xs sm:text-sm gap-2 col-span-2 sm:col-span-1 border-border/70">
            <Link to="/dashboard/free-classes">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="truncate">{isEnglish ? "Free Classes" : "ফ্রি ক্লাস"}</span>
            </Link>
          </Button>
        </div>

        {/* Enrolled Subjects */}
        <EnrolledSubjectsWidget refreshKey={refreshKey} />

        {/* Facebook Group Join Status */}
        <FacebookJoinStatusWidget refreshKey={refreshKey} />

        {/* Free Classes */}
        <FreeClassesWidget />

        {/* Paid Batches */}
        <PaidBatchesRow />
      </div>
    </DashboardLayout>
  );
}
