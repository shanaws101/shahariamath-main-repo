import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Globe, Eye, Zap, HardDrive, RefreshCw, AlertTriangle, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export function CloudflareMonitorPageContent() {
  const [period, setPeriod] = useState('24h');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['cloudflare-analytics', period],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('cloudflare-analytics', {
        body: { period },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 min
  });

  const summary = data?.summary;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-orange-500" />
              Cloudflare Monitor
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Traffic analytics & threat monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">Failed to load Cloudflare data: {(error as Error).message}</p>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><div className="h-16 animate-pulse bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : summary && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard icon={Globe} label="Total Requests" value={formatNumber(summary.totalRequests)} color="text-blue-500" />
              <StatCard icon={Eye} label="Page Views" value={formatNumber(summary.totalPageViews)} color="text-green-500" />
              <StatCard icon={Zap} label="Unique Visitors" value={formatNumber(summary.totalUniques)} color="text-purple-500" />
              <StatCard icon={AlertTriangle} label="Threats" value={formatNumber(summary.totalThreats)} color="text-red-500" />
              <StatCard icon={HardDrive} label="Bandwidth" value={formatBytes(summary.totalBandwidth)} color="text-cyan-500" />
              <StatCard icon={BarChart3} label="Cache Rate" value={`${summary.cacheRate}%`} color="text-amber-500" />
            </div>

            {/* Traffic Chart */}
            {data.dailyData?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Traffic Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="requests" stroke="#3b82f6" name="Requests" strokeWidth={2} />
                      <Line type="monotone" dataKey="pageViews" stroke="#22c55e" name="Page Views" strokeWidth={2} />
                      <Line type="monotone" dataKey="threats" stroke="#ef4444" name="Threats" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Countries */}
              {data.topCountries?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Countries</CardTitle>
                    <CardDescription>By request volume</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data.topCountries.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="country" type="category" width={80} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="requests" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Browsers */}
              {data.browsers?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Browsers</CardTitle>
                    <CardDescription>By page views</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={data.browsers}
                          dataKey="pageViews"
                          nameKey="browser"
                          cx="50%" cy="50%"
                          outerRadius={90}
                          label={({ browser, percent }) => `${browser} ${(percent * 100).toFixed(0)}%`}
                        >
                          {data.browsers.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Threats Section */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Threat Actions */}
              {Object.keys(data.threats?.actions || {}).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Firewall Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(data.threats.actions).map(([action, count]) => (
                        <div key={action} className="flex justify-between items-center">
                          <Badge variant={action === 'block' ? 'destructive' : 'secondary'} className="capitalize">
                            {action}
                          </Badge>
                          <span className="font-mono font-semibold">{formatNumber(count as number)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Threat IPs */}
              {data.threats?.topIPs?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Threat IPs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead className="text-right">Events</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.threats.topIPs.map((ip: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-sm">{ip.ip}</TableCell>
                            <TableCell>{ip.country}</TableCell>
                            <TableCell className="text-right font-semibold">{ip.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Status Codes */}
            {data.statusCodes?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">HTTP Status Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {data.statusCodes.map((s: any) => (
                      <div key={s.status} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                        <Badge variant={
                          s.status.startsWith('2') ? 'default' :
                          s.status.startsWith('3') ? 'secondary' :
                          s.status.startsWith('4') ? 'outline' : 'destructive'
                        }>
                          {s.status}
                        </Badge>
                        <span className="font-mono text-sm">{formatNumber(s.count)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function CloudflareMonitorPage() {
  return <AdminLayout><CloudflareMonitorPageContent /></AdminLayout>;
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
