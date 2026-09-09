import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, MousePointerClick, UserPlus, CreditCard, TrendingUp, Link2, LogOut, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Permissions {
  can_view_clicks: boolean;
  can_view_signups: boolean;
  can_view_enrollments: boolean;
  can_view_revenue: boolean;
}

export default function EmployeeDashboardPage() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [stats, setStats] = useState({ clicks: 0, signups: 0, enrollments: 0, revenue: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isEmployee, setIsEmployee] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: emp } = await supabase
        .from("employees")
        .select("id, employee_permissions(*)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!emp) { setIsEmployee(false); setIsLoading(false); return; }
      setIsEmployee(true);
      const perms = (emp as any).employee_permissions?.[0] as Permissions | undefined;
      setPermissions(perms || null);

      const { data: code } = await supabase
        .from("discount_codes")
        .select("id, short_code, code")
        .eq("owner_user_id", user.id)
        .eq("is_referral", true)
        .maybeSingle();

      if (code) {
        setReferralLink(`https://olisaharacademy.com/ref/${code.short_code || code.code}`);
        const [clicksRes, conversionsRes] = await Promise.all([
          supabase.from("referral_clicks").select("id", { count: "exact", head: true }).eq("referral_code_id", code.id),
          supabase.from("referral_conversions").select("new_user_id").eq("referral_code_id", code.id),
        ]);
        const signupCount = conversionsRes.data?.length || 0;
        const newUserIds = conversionsRes.data?.map((c) => c.new_user_id) || [];
        let enrollmentCount = 0;
        let totalRevenue = 0;
        if (newUserIds.length > 0) {
          const [enrollRes, payRes] = await Promise.all([
            supabase.from("enrollments").select("id", { count: "exact", head: true }).in("user_id", newUserIds).eq("payment_status", "completed"),
            supabase.from("payments").select("amount").in("user_id", newUserIds).eq("status", "completed"),
          ]);
          enrollmentCount = enrollRes.count || 0;
          totalRevenue = payRes.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
        }
        setStats({ clicks: clicksRes.count || 0, signups: signupCount, enrollments: enrollmentCount, revenue: totalRevenue });
      }
      setIsLoading(false);
    };
    load();
  }, [user]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const loginMethod = typeof window !== 'undefined' ? sessionStorage.getItem('login_method') : null;
  if (!user) return <Navigate to={loginMethod === 'email' ? '/admin/login' : '/login'} replace />;
  if (isEmployee === false) return <Navigate to="/dashboard" replace />;

  if (permissions) {
    const hasAdminAccess = Object.entries(permissions).some(
      ([key, val]) => key.startsWith('can_manage_') && val === true
    );
    if (hasAdminAccess) return <Navigate to="/admin" replace />;
  }

  const copyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: "Copied!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const convRate = stats.clicks > 0 ? ((stats.signups / stats.clicks) * 100).toFixed(1) : "0";

  const statCards = [
    { show: permissions?.can_view_clicks, label: 'Clicks', value: stats.clicks, icon: MousePointerClick, gradient: 'from-orange-500/10 to-orange-600/5', color: 'text-orange-500' },
    { show: permissions?.can_view_signups, label: 'Signups', value: stats.signups, icon: UserPlus, gradient: 'from-emerald-500/10 to-emerald-600/5', color: 'text-emerald-500' },
    { show: permissions?.can_view_enrollments, label: 'Enrollments', value: stats.enrollments, icon: CreditCard, gradient: 'from-blue-500/10 to-blue-600/5', color: 'text-blue-500' },
    { show: permissions?.can_view_revenue, label: 'Revenue', value: `৳${stats.revenue.toLocaleString()}`, icon: DollarSign, gradient: 'from-primary/10 to-primary/5', color: 'text-primary' },
    { show: permissions?.can_view_clicks, label: 'Conv. Rate', value: `${convRate}%`, icon: TrendingUp, gradient: 'from-purple-500/10 to-purple-600/5', color: 'text-purple-500' },
  ].filter(s => s.show);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Shaharia Math" className="w-8 h-8 rounded-xl object-contain shadow-sm" width={32} height={32} />
          <span className="font-bold text-sm text-foreground tracking-tight">Employee Dashboard</span>
        </div>
        <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }} className="gap-2 rounded-xl h-8 text-xs">
          <LogOut className="h-3.5 w-3.5" /> Logout
        </Button>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
        {/* Referral Link */}
        {referralLink ? (
          <Card className="rounded-2xl border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                Your Referral Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2.5 bg-muted rounded-xl text-xs font-mono truncate">
                  {referralLink}
                </code>
                <Button variant="outline" size="icon" onClick={copyLink} className="rounded-xl h-10 w-10 shrink-0">
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-dashed border-border/60">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No referral link assigned yet. Contact admin.
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        {statCards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {statCards.map((stat, i) => (
              <Card key={i} className="rounded-2xl border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-xl font-bold mt-1 tracking-tight">{stat.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shrink-0 ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
