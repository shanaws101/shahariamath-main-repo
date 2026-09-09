import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Loader2, Download } from "lucide-react";
import { format } from "date-fns";

export function PaymentHistoryWidget() {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["payment-history", user?.id],
    queryFn: async () => {
      const { data: paymentData, error } = await supabase.from("payments").select("id, amount, status, created_at, gateway_response").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      const { data: enrollments } = await supabase.from("enrollments").select("payment_id, subject_id, subjects(name, name_bn)").eq("user_id", user!.id);
      const paymentSubjectMap = new Map<string, { name: string; name_bn: string }>();
      enrollments?.forEach((e: any) => { if (e.payment_id && e.subjects) paymentSubjectMap.set(e.payment_id, { name: e.subjects.name, name_bn: e.subjects.name_bn }); });
      return (paymentData || []).map((p) => ({ ...p, subject: paymentSubjectMap.get(p.id) || null }));
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed": return <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] rounded-md">{isEnglish ? "Completed" : "সম্পন্ন"}</Badge>;
      case "pending": return <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[10px] rounded-md">{isEnglish ? "Pending" : "অপেক্ষমাণ"}</Badge>;
      case "failed": return <Badge variant="destructive" className="text-[10px] rounded-md">{isEnglish ? "Failed" : "ব্যর্থ"}</Badge>;
      case "refunded": return <Badge variant="secondary" className="text-[10px] rounded-md">{isEnglish ? "Refunded" : "ফেরত"}</Badge>;
      default: return <Badge variant="outline" className="text-[10px] rounded-md">{status || "N/A"}</Badge>;
    }
  };

  const downloadReceipt = (payment: any) => {
    const subjectName = payment.subject ? (isEnglish ? payment.subject.name : payment.subject.name_bn) : "—";
    const studentName = (payment.gateway_response?.customer_name as string) || "Student";
    const canvas = document.createElement("canvas");
    const W = 720, H = 1000;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, W, H);
    // Card
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(40, 40, W - 80, H - 80);

    // Emerald header band
    const grad = ctx.createLinearGradient(40, 40, W - 40, 40);
    grad.addColorStop(0, "#059669");
    grad.addColorStop(1, "#10b981");
    ctx.fillStyle = grad;
    ctx.fillRect(40, 40, W - 80, 130);

    // Logo circle
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath(); ctx.arc(110, 105, 36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.fillText("SM", 90, 115);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.fillText("SHAHARIA MATH", 170, 95);
    ctx.font = "14px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("Payment Receipt / পেমেন্ট রসিদ", 170, 120);
    ctx.fillText("shahariamath.com", 170, 142);

    // Status pill (top right of header)
    if (payment.status === "completed") {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      const pillX = W - 200, pillY = 78, pillW = 140, pillH = 34;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 17);
      ctx.fill();
      ctx.fillStyle = "#059669";
      ctx.font = "bold 13px Arial, sans-serif";
      ctx.fillText("✓  PAID", pillX + 36, pillY + 22);
    }

    // Receipt # label
    ctx.fillStyle = "#64748b"; ctx.font = "12px Arial, sans-serif";
    ctx.fillText("RECEIPT NO.", 80, 210);
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 18px monospace";
    ctx.fillText(payment.id.slice(0, 8).toUpperCase(), 80, 232);

    // Date right-aligned
    ctx.fillStyle = "#64748b"; ctx.font = "12px Arial, sans-serif";
    const dateLabel = "DATE";
    ctx.textAlign = "right";
    ctx.fillText(dateLabel, W - 80, 210);
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText(format(new Date(payment.created_at), "dd MMM yyyy, hh:mm a"), W - 80, 232);
    ctx.textAlign = "left";

    // Divider
    ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, 260); ctx.lineTo(W - 80, 260); ctx.stroke();

    // Bill to
    ctx.fillStyle = "#64748b"; ctx.font = "11px Arial, sans-serif";
    ctx.fillText("BILLED TO", 80, 290);
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillText(studentName, 80, 314);
    if (user?.email) {
      ctx.fillStyle = "#64748b"; ctx.font = "12px Arial, sans-serif";
      ctx.fillText(user.email, 80, 334);
    }

    // Item table header
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(80, 380, W - 160, 40);
    ctx.fillStyle = "#475569"; ctx.font = "bold 12px Arial, sans-serif";
    ctx.fillText("DESCRIPTION", 100, 405);
    ctx.textAlign = "right";
    ctx.fillText("AMOUNT", W - 100, 405);
    ctx.textAlign = "left";

    // Item row
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText(subjectName.length > 50 ? subjectName.slice(0, 47) + "..." : subjectName, 100, 460);
    ctx.fillStyle = "#64748b"; ctx.font = "12px Arial, sans-serif";
    ctx.fillText("Course Enrollment", 100, 482);
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 15px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`BDT ${Number(payment.amount).toLocaleString()}`, W - 100, 460);
    ctx.textAlign = "left";

    // Total box
    ctx.fillStyle = "#ecfdf5";
    ctx.fillRect(80, 540, W - 160, 70);
    ctx.fillStyle = "#065f46"; ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText("TOTAL PAID", 100, 580);
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`৳ ${Number(payment.amount).toLocaleString()}`, W - 100, 588);
    ctx.textAlign = "left";

    // Transaction details
    ctx.fillStyle = "#64748b"; ctx.font = "11px Arial, sans-serif";
    ctx.fillText("TRANSACTION ID", 80, 660);
    ctx.fillText("PAYMENT STATUS", 80, 700);
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 13px monospace";
    ctx.fillText(payment.id.toUpperCase(), 80, 680);
    ctx.font = "bold 13px Arial, sans-serif";
    ctx.fillStyle = payment.status === "completed" ? "#059669" : "#d97706";
    ctx.fillText((payment.status || "—").toUpperCase(), 80, 720);

    // Thanks line
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath(); ctx.moveTo(80, 770); ctx.lineTo(W - 80, 770); ctx.stroke();
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillText(isEnglish ? "Thank you for learning with us!" : "আমাদের সাথে শেখার জন্য ধন্যবাদ!", 80, 805);
    ctx.fillStyle = "#64748b"; ctx.font = "12px Arial, sans-serif";
    ctx.fillText(
      isEnglish
        ? "Use your Student ID when joining the Facebook Group."
        : "ফেসবুক গ্রুপে জয়েন করার সময় Student ID ব্যবহার করুন।",
      80, 828
    );

    // Footer
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(40, H - 100, W - 80, 60);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("This is a computer-generated receipt and does not require a signature.", W / 2, H - 70);
    ctx.fillText("support@olisaharacademy.com  •  olisaharacademy.com", W / 2, H - 52);
    ctx.textAlign = "left";

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${payment.id.slice(0, 8)}.jpeg`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/jpeg", 0.95);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          {isEnglish ? "Payment History" : "পেমেন্ট ইতিহাস"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isEnglish ? "View your transaction records" : "আপনার লেনদেনের রেকর্ড দেখুন"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !payments?.length ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Receipt className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{isEnglish ? "No payment records found." : "কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।"}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p: any) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {p.subject ? (isEnglish ? p.subject.name : p.subject.name_bn) : <span className="text-muted-foreground">—</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {format(new Date(p.created_at), "dd MMM yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-sm">৳{Number(p.amount).toLocaleString()}</p>
                    <div className="mt-0.5">{getStatusBadge(p.status)}</div>
                  </div>
                  {p.status === "completed" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => downloadReceipt(p)} title={isEnglish ? "Download Receipt" : "রসিদ ডাউনলোড"}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
