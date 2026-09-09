import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, DollarSign, Link2, MousePointerClick, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface SubjectRevenue {
  name: string;
  revenue: number;
  enrollments: number;
}

interface ReferralCodeStats {
  code: string;
  ownerName: string;
  ownerType: string;
  clicks: number;
  signups: number;
  enrollments: number;
  revenue: number;
  conversionRate: number;
}

interface OwnerRevenue {
  name: string;
  revenue: number;
  conversions: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 160 60% 45%))", "hsl(var(--chart-3, 30 80% 55%))", "hsl(var(--chart-4, 280 65% 60%))", "hsl(var(--chart-5, 340 75% 55%))"];

export function AnalyticsPageContent() {
  const [subjectRevenue, setSubjectRevenue] = useState<SubjectRevenue[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralCodeStats[]>([]);
  const [ownerRevenue, setOwnerRevenue] = useState<OwnerRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalConversions, setTotalConversions] = useState(0);
  const [totalLinks, setTotalLinks] = useState(0);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Fetch all data in parallel
      const [
        { data: subjects },
        { data: enrollments },
        { data: payments },
        { count: studentCount },
        { data: referralCodes },
        { data: clicks },
        { data: conversions },
        { data: profiles },
      ] = await Promise.all([
        supabase.from("subjects").select("id, name, price"),
        supabase.from("enrollments").select("subject_id, payment_status").eq("payment_status", "completed"),
        supabase.from("payments").select("amount").eq("status", "completed"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("discount_codes").select("id, code, short_code, owner_user_id, owner_type, is_referral").eq("is_referral", true),
        supabase.from("referral_clicks").select("referral_code_id"),
        supabase.from("referral_conversions").select("referral_code_id, new_user_id"),
        supabase.from("profiles").select("user_id, full_name"),
      ]);

      // Subject revenue calc
      if (subjects && enrollments) {
        const revenueMap = new Map<string, { name: string; count: number; price: number }>();
        subjects.forEach((s) => revenueMap.set(s.id, { name: s.name, count: 0, price: s.price }));
        enrollments.forEach((e) => {
          const subject = revenueMap.get(e.subject_id);
          if (subject) subject.count++;
        });
        setSubjectRevenue(
          Array.from(revenueMap.values())
            .map((s) => ({ name: s.name, revenue: s.count * s.price, enrollments: s.count }))
            .sort((a, b) => b.revenue - a.revenue)
        );
      }

      // Referral analytics
      if (referralCodes) {
        const clickMap = new Map<string, number>();
        const convMap = new Map<string, number>();
        clicks?.forEach((c) => clickMap.set(c.referral_code_id, (clickMap.get(c.referral_code_id) || 0) + 1));
        conversions?.forEach((c) => convMap.set(c.referral_code_id, (convMap.get(c.referral_code_id) || 0) + 1));

        const profileMap = new Map<string, string>();
        profiles?.forEach((p) => profileMap.set(p.user_id, p.full_name));

        const avgPayment = payments && payments.length > 0 ? payments.reduce((s, p) => s + Number(p.amount), 0) / payments.length : 0;

        const stats: ReferralCodeStats[] = referralCodes.map((rc) => {
          const cl = clickMap.get(rc.id) || 0;
          const cv = convMap.get(rc.id) || 0;
          const ownerName = rc.owner_user_id ? profileMap.get(rc.owner_user_id) || "Unknown" : rc.owner_type || "System";
          return {
            code: rc.short_code || rc.code,
            ownerName,
            ownerType: rc.owner_type || "system",
            clicks: cl,
            signups: cv,
            enrollments: 0,
            revenue: cv * avgPayment,
            conversionRate: cl > 0 ? Math.round((cv / cl) * 100) : 0,
          };
        });
        setReferralStats(stats.sort((a, b) => b.signups - a.signups));
        setTotalClicks(stats.reduce((s, r) => s + r.clicks, 0));
        setTotalConversions(stats.reduce((s, r) => s + r.signups, 0));
        setTotalLinks(referralCodes.length);

        // Revenue by owner
        const ownerMap = new Map<string, { name: string; revenue: number; conversions: number }>();
        referralCodes.forEach((rc) => {
          const ownerName = rc.owner_user_id ? profileMap.get(rc.owner_user_id) || rc.owner_type || "Unknown" : rc.owner_type || "System";
          const key = rc.owner_user_id || rc.owner_type || "system";
          if (!ownerMap.has(key)) {
            ownerMap.set(key, { name: ownerName, revenue: 0, conversions: 0 });
          }
          const entry = ownerMap.get(key)!;
          entry.conversions += convMap.get(rc.id) || 0;
          // Estimate revenue from conversions * avg payment
          const avgPayment = payments && payments.length > 0 ? payments.reduce((s, p) => s + Number(p.amount), 0) / payments.length : 0;
          entry.revenue += (convMap.get(rc.id) || 0) * avgPayment;
        });
        setOwnerRevenue(Array.from(ownerMap.values()).sort((a, b) => b.revenue - a.revenue));
      }

      const total = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      setTotalRevenue(total);
      setTotalStudents(studentCount || 0);
      setTotalEnrollments(enrollments?.length || 0);
      setIsLoading(false);
    };

    fetchAnalytics();
  }, []);

  const maxRevenue = Math.max(...subjectRevenue.map((s) => s.revenue), 1);
  const overallConvRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0";

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Platform performance overview</p>
        </div>

        {/* Global Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Links</p>
                  <p className="text-xl font-bold">{totalLinks}</p>
                </div>
                <Link2 className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-xl font-bold">৳{totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Students</p>
                  <p className="text-xl font-bold">{totalStudents}</p>
                </div>
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Enrollments</p>
                  <p className="text-xl font-bold">{totalEnrollments}</p>
                </div>
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Ref Clicks</p>
                  <p className="text-xl font-bold">{totalClicks}</p>
                </div>
                <MousePointerClick className="h-6 w-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Signups</p>
                  <p className="text-xl font-bold">{totalConversions}</p>
                </div>
                <UserPlus className="h-6 w-6 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Conv. Rate</p>
                  <p className="text-xl font-bold">{overallConvRate}%</p>
                </div>
                <BarChart3 className="h-6 w-6 text-rose-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="referrals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="referrals">Referral Analytics</TabsTrigger>
            <TabsTrigger value="subjects">Subject Revenue</TabsTrigger>
          </TabsList>

          {/* Referral Analytics Tab */}
          <TabsContent value="referrals" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Clicks vs Conversions Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Clicks vs Conversions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-64 bg-muted rounded animate-pulse" />
                  ) : referralStats.length === 0 ? (
                    <p className="text-muted-foreground text-center py-16">No referral data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={referralStats.slice(0, 10)} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="code" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <YAxis className="fill-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="clicks" fill="hsl(var(--primary))" name="Clicks" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="signups" fill="hsl(var(--chart-2, 160 60% 45%))" name="Signups" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Revenue by Owner Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue by Owner
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-64 bg-muted rounded animate-pulse" />
                  ) : ownerRevenue.length === 0 ? (
                    <p className="text-muted-foreground text-center py-16">No referral revenue yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={ownerRevenue}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="revenue"
                          nameKey="name"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {ownerRevenue.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `৳${value.toLocaleString()}`}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: 12,
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Referral Leaderboard Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Referral Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : referralStats.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No referral codes yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 font-medium text-muted-foreground">#</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">Owner</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">Link</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Clicks</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Signups</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Revenue</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Conv. %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referralStats.map((r, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-2 text-muted-foreground">{i + 1}</td>
                            <td className="py-2">
                              <span className="font-medium">{r.ownerName}</span>
                              <span className="text-xs text-muted-foreground ml-1 capitalize">({r.ownerType})</span>
                            </td>
                            <td className="py-2 font-mono text-xs">/ref/{r.code}</td>
                            <td className="py-2 text-right">{r.clicks}</td>
                            <td className="py-2 text-right">{r.signups}</td>
                            <td className="py-2 text-right">৳{Math.round(r.revenue).toLocaleString()}</td>
                            <td className="py-2 text-right font-medium">{r.conversionRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subject Revenue Tab */}
          <TabsContent value="subjects">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue by Subject
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 bg-muted rounded w-1/4" />
                        <div className="h-8 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : subjectRevenue.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No data yet</p>
                ) : (
                  <div className="space-y-4">
                    {subjectRevenue.map((subject, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{subject.name}</span>
                          <span className="text-muted-foreground">
                            ৳{subject.revenue.toLocaleString()} ({subject.enrollments} enrollments)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(subject.revenue / maxRevenue) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default function AnalyticsPage() {
  return <AdminLayout requiredPermission="can_manage_analytics"><AnalyticsPageContent /></AdminLayout>;
}
