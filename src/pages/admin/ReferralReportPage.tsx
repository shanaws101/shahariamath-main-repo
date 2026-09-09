import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, Users, TrendingUp, Wallet } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";

interface Report {
  total_links: number;
  total_referrals: number;
  total_points_issued: number;
  total_bdt_discounted: number;
  top_referrers: Array<{
    full_name: string;
    student_id: string | null;
    short_code: string | null;
    referrals: number;
    points: number;
  }>;
}

export default function ReferralReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();
      const { data, error } = await supabase.rpc("get_admin_referral_report", { _from: from, _to: to });
      if (!error && data) setReport(data as unknown as Report);
      setLoading(false);
    })();
  }, []);

  const stats = [
    { icon: Users, label: "Referral links", value: report?.total_links ?? 0 },
    { icon: TrendingUp, label: "Successful referrals (30d)", value: report?.total_referrals ?? 0 },
    { icon: Coins, label: "Points issued (30d)", value: report?.total_points_issued ?? 0 },
    { icon: Wallet, label: "BDT discounted (30d)", value: `৳${report?.total_bdt_discounted ?? 0}` },
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Referral Report</h1>
          <p className="text-sm text-muted-foreground">Last 30 days</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <s.icon className="h-4 w-4 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold mt-0.5">
                  {loading ? <Skeleton className="h-6 w-12" /> : s.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Top 10 referrers</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-32 w-full" /> :
              !report?.top_referrers?.length ? (
                <p className="text-sm text-muted-foreground">No referrers yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground border-b">
                      <tr>
                        <th className="py-2">#</th>
                        <th className="py-2">Name</th>
                        <th className="py-2">Student ID</th>
                        <th className="py-2">Slug</th>
                        <th className="py-2 text-right">Referrals</th>
                        <th className="py-2 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.top_referrers.map((r, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 text-muted-foreground">{i + 1}</td>
                          <td className="py-2 font-medium">{r.full_name}</td>
                          <td className="py-2 font-mono text-xs">{r.student_id ?? "—"}</td>
                          <td className="py-2 font-mono text-xs">{r.short_code ?? "—"}</td>
                          <td className="py-2 text-right">{r.referrals}</td>
                          <td className="py-2 text-right font-semibold text-emerald-600">{r.points}</td>
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
    </AdminLayout>
  );
}
