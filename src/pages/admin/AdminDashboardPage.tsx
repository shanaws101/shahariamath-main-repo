import { useEffect, useState, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  BookOpen,
  CreditCard,
  TrendingUp,
  DollarSign,
  FileText,
  UserPlus,
  Activity,
  RefreshCw,
  ShoppingBag,
  Award,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

type TimeFilter = 'today' | 'yesterday' | '7days' | '30days' | 'all';

interface MetricStats {
  activeStudentsNow: number;
  admittedStudents: number;
  courseEnrollmentsCount: number;
  courseRevenue: number;
  pdfSoldCount: number;
  pdfRevenue: number;
  totalRevenue: number;
  uniquePayingStudents: number;
}

interface ActivityItem {
  id: string;
  type: 'course' | 'pdf' | 'admission';
  title: string;
  studentName: string;
  studentId: string;
  amount: number;
  timestamp: string;
  department?: string;
}

interface TopItem {
  id: string;
  title: string;
  count: number;
  revenue: number;
  department?: string;
}

export default function AdminDashboardPage() {
  const [filter, setFilter] = useState<TimeFilter>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const [stats, setStats] = useState<MetricStats>({
    activeStudentsNow: 0,
    admittedStudents: 0,
    courseEnrollmentsCount: 0,
    courseRevenue: 0,
    pdfSoldCount: 0,
    pdfRevenue: 0,
    totalRevenue: 0,
    uniquePayingStudents: 0,
  });

  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [topCourses, setTopCourses] = useState<TopItem[]>([]);
  const [topPdfs, setTopPdfs] = useState<TopItem[]>([]);

  // Calculate start and end ISO strings based on local timezone
  const getDateRange = useCallback((currentFilter: TimeFilter) => {
    const now = new Date();
    
    if (currentFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { start: start.toISOString(), end: now.toISOString(), label: 'Today' };
    }
    
    if (currentFilter === 'yesterday') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString(), label: 'Yesterday' };
    }
    
    if (currentFilter === '7days') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: start.toISOString(), end: now.toISOString(), label: 'Last 7 Days' };
    }
    
    if (currentFilter === '30days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start: start.toISOString(), end: now.toISOString(), label: 'Last 30 Days' };
    }
    
    return { start: null, end: null, label: 'All Time' };
  }, []);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { start, end } = getDateRange(filter);

      // 1. Fetch live active sessions (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: activeSessions } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('is_active', true)
        .gte('last_active_at', fiveMinutesAgo);

      const uniqueActive = new Set(activeSessions?.map(s => s.user_id) || []);
      const activeStudentsNow = uniqueActive.size;

      // 2. Fetch all profiles for student info mapping & admissions count
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, student_id, phone, created_at');

      const profileMap = new Map<string, { full_name: string; student_id: string; phone: string }>();
      let admittedCount = 0;
      const recentSignups: ActivityItem[] = [];

      allProfiles?.forEach(p => {
        profileMap.set(p.user_id, {
          full_name: p.full_name || 'Student',
          student_id: p.student_id || 'N/A',
          phone: p.phone || '',
        });

        if (p.created_at) {
          const createdAt = new Date(p.created_at).getTime();
          const matchesFilter =
            (!start || createdAt >= new Date(start).getTime()) &&
            (!end || createdAt <= new Date(end).getTime());

          if (matchesFilter) {
            admittedCount++;
            recentSignups.push({
              id: `adm-${p.user_id}`,
              type: 'admission',
              title: 'Student Registration',
              studentName: p.full_name || 'New Student',
              studentId: p.student_id || 'OSA',
              amount: 0,
              timestamp: p.created_at,
            });
          }
        }
      });

      // 3. Fetch all subjects (courses) for metadata
      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('id, name, price, department');

      const subjectMap = new Map<string, { name: string; price: number; department?: string }>();
      allSubjects?.forEach(s => {
        subjectMap.set(s.id, {
          name: s.name,
          price: Number(s.price) || 0,
          department: s.department || '',
        });
      });

      // 4. Fetch all PDF suggestions for metadata
      const { data: allPdfs } = await (supabase as any)
        .from('pdf_suggestions')
        .select('id, title, price, department');

      const pdfMap = new Map<string, { title: string; price: number; department?: string }>();
      allPdfs?.forEach((p: any) => {
        pdfMap.set(p.id, {
          title: p.title,
          price: Number(p.price) || 20,
          department: p.department || '',
        });
      });

      // 5. Query Completed Payments (The Source of Truth for bKash transactions)
      let paymentsQuery = supabase
        .from('payments')
        .select('id, user_id, amount, created_at, status, gateway_response')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (start) paymentsQuery = paymentsQuery.gte('created_at', start);
      if (end) paymentsQuery = paymentsQuery.lte('created_at', end);

      const { data: paymentsData } = await paymentsQuery;

      const verifiedPaymentsTotal = paymentsData?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
      const payingUserIds = new Set<string>();
      const pdfActivities: ActivityItem[] = [];
      const courseActivities: ActivityItem[] = [];
      const courseCountMap = new Map<string, { title: string; count: number; revenue: number; department?: string }>();
      const pdfCountMap = new Map<string, { title: string; count: number; revenue: number; department?: string }>();

      let calculatedCourseRevenue = 0;
      let calculatedCourseCount = 0;
      let calculatedPdfRevenue = 0;
      let calculatedPdfCount = 0;

      // Track processed payment-item pairs so we never double count
      const processedPdfKeys = new Set<string>();
      const processedCourseKeys = new Set<string>();

      // Parse all completed payments
      paymentsData?.forEach(p => {
        if (p.user_id) payingUserIds.add(p.user_id);
        const profile = profileMap.get(p.user_id);
        const gw = p.gateway_response as any;
        const pdfIds = gw?.pdf_suggestion_ids;
        const subjectIds = gw?.subject_ids;

        // A. PDF Purchases in this payment
        if (Array.isArray(pdfIds) && pdfIds.length > 0) {
          const pdfTotalInPayment = Number(gw?.pdf_total) || (pdfIds.length * 20);
          calculatedPdfRevenue += pdfTotalInPayment;
          calculatedPdfCount += pdfIds.length;

          pdfIds.forEach((pid: string) => {
            processedPdfKeys.add(`${p.user_id}-${pid}`);
            const pdf = pdfMap.get(pid);
            const price = pdf?.price || (pdfTotalInPayment / pdfIds.length) || 20;

            const current = pdfCountMap.get(pid) || {
              title: pdf?.title || 'PDF Suggestion',
              count: 0,
              revenue: 0,
              department: pdf?.department,
            };
            current.count += 1;
            current.revenue += price;
            pdfCountMap.set(pid, current);

            pdfActivities.push({
              id: `pay-pdf-${p.id}-${pid}`,
              type: 'pdf',
              title: pdf?.title || 'PDF Suggestion',
              studentName: profile?.full_name || 'Student',
              studentId: profile?.student_id || 'OSA',
              amount: price,
              timestamp: p.created_at,
              department: pdf?.department,
            });
          });
        }

        // B. Course Purchases in this payment
        if (Array.isArray(subjectIds) && subjectIds.length > 0) {
          subjectIds.forEach((sid: string) => {
            processedCourseKeys.add(`${p.user_id}-${sid}`);
            const sub = subjectMap.get(sid);
            const price = sub?.price || 0;
            calculatedCourseCount += 1;
            calculatedCourseRevenue += price;

            const current = courseCountMap.get(sid) || {
              title: sub?.name || 'Course',
              count: 0,
              revenue: 0,
              department: sub?.department,
            };
            current.count += 1;
            current.revenue += price;
            courseCountMap.set(sid, current);

            courseActivities.push({
              id: `pay-crs-${p.id}-${sid}`,
              type: 'course',
              title: sub?.name || 'Course Enrollment',
              studentName: profile?.full_name || 'Student',
              studentId: profile?.student_id || 'OSA',
              amount: price,
              timestamp: p.created_at,
              department: sub?.department,
            });
          });
        }
      });

      // 6. Direct Course Enrollments check (for manual or legacy uploads)
      let enrollmentsQuery = supabase
        .from('enrollments')
        .select('id, user_id, subject_id, enrolled_at, payment_status')
        .eq('payment_status', 'completed');

      if (start) enrollmentsQuery = enrollmentsQuery.gte('enrolled_at', start);
      if (end) enrollmentsQuery = enrollmentsQuery.lte('enrolled_at', end);

      const { data: directEnrollments } = await enrollmentsQuery;

      directEnrollments?.forEach(e => {
        const key = `${e.user_id}-${e.subject_id}`;
        if (!processedCourseKeys.has(key)) {
          processedCourseKeys.add(key);
          if (e.user_id) payingUserIds.add(e.user_id);
          const sub = subjectMap.get(e.subject_id);
          const profile = profileMap.get(e.user_id);
          const price = sub?.price || 0;
          calculatedCourseCount += 1;
          calculatedCourseRevenue += price;

          const current = courseCountMap.get(e.subject_id) || {
            title: sub?.name || 'Course',
            count: 0,
            revenue: 0,
            department: sub?.department,
          };
          current.count += 1;
          current.revenue += price;
          courseCountMap.set(e.subject_id, current);

          courseActivities.push({
            id: `crs-${e.id}`,
            type: 'course',
            title: sub?.name || 'Course Enrollment',
            studentName: profile?.full_name || 'Student',
            studentId: profile?.student_id || 'OSA',
            amount: price,
            timestamp: e.enrolled_at,
            department: sub?.department,
          });
        }
      });

      // 7. Direct PDF Suggestion Enrollments check (for manual grants)
      let pdfQuery = (supabase as any)
        .from('pdf_suggestion_enrollments')
        .select('id, user_id, pdf_suggestion_id, created_at, payment_status, access_type')
        .eq('payment_status', 'completed')
        .eq('access_type', 'paid');

      if (start) pdfQuery = pdfQuery.gte('created_at', start);
      if (end) pdfQuery = pdfQuery.lte('created_at', end);

      const { data: directPdfEnrollments } = await pdfQuery;

      directPdfEnrollments?.forEach((p: any) => {
        const key = `${p.user_id}-${p.pdf_suggestion_id}`;
        if (!processedPdfKeys.has(key)) {
          processedPdfKeys.add(key);
          if (p.user_id) payingUserIds.add(p.user_id);
          const pdf = pdfMap.get(p.pdf_suggestion_id);
          const profile = profileMap.get(p.user_id);
          const price = pdf?.price || 20;
          calculatedPdfCount += 1;
          calculatedPdfRevenue += price;

          const current = pdfCountMap.get(p.pdf_suggestion_id) || {
            title: pdf?.title || 'PDF Suggestion',
            count: 0,
            revenue: 0,
            department: pdf?.department,
          };
          current.count += 1;
          current.revenue += price;
          pdfCountMap.set(p.pdf_suggestion_id, current);

          pdfActivities.push({
            id: `pdf-${p.id}`,
            type: 'pdf',
            title: pdf?.title || 'PDF Suggestion',
            studentName: profile?.full_name || 'Student',
            studentId: profile?.student_id || 'OSA',
            amount: price,
            timestamp: p.created_at,
            department: pdf?.department,
          });
        }
      });

      // Calculate total revenue (verified payments total or item sum)
      const calculatedTotalRevenue = verifiedPaymentsTotal > 0 ? verifiedPaymentsTotal : (calculatedCourseRevenue + calculatedPdfRevenue);

      // Rank top courses & PDFs
      const sortedCourses: TopItem[] = Array.from(courseCountMap.entries())
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const sortedPdfs: TopItem[] = Array.from(pdfCountMap.entries())
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Combine recent activities sorted by timestamp descending
      const combinedActivities = [...courseActivities, ...pdfActivities, ...recentSignups]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 12);

      setStats({
        activeStudentsNow,
        admittedStudents: admittedCount,
        courseEnrollmentsCount: calculatedCourseCount,
        courseRevenue: calculatedCourseRevenue,
        pdfSoldCount: calculatedPdfCount,
        pdfRevenue: calculatedPdfRevenue,
        totalRevenue: calculatedTotalRevenue,
        uniquePayingStudents: payingUserIds.size,
      });

      setTopCourses(sortedCourses);
      setTopPdfs(sortedPdfs);
      setRecentActivities(combinedActivities);
      setLastRefreshedAt(new Date());
    } catch (error) {
      console.error("Error fetching admin dashboard statistics:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter, getDateRange]);

  // Initial fetch and on filter change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time polling for active online student count every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: activeSessions } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('is_active', true)
          .gte('last_active_at', fiveMinutesAgo);

        const uniqueActive = new Set(activeSessions?.map(s => s.user_id) || []);
        setStats(prev => ({ ...prev, activeStudentsNow: uniqueActive.size }));
      } catch (err) {
        console.error("Active session heartbeat check failed:", err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Filter display label
  const filterLabel = useMemo(() => {
    switch (filter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case '7days': return 'Last 7 Days';
      case '30days': return 'Last 30 Days';
      case 'all': return 'All Time';
    }
  }, [filter]);

  // Revenue & Volume shares
  const totalVolume = stats.courseEnrollmentsCount + stats.pdfSoldCount;
  const courseVolPercent = totalVolume > 0 ? Math.round((stats.courseEnrollmentsCount / totalVolume) * 100) : 50;
  const pdfVolPercent = totalVolume > 0 ? 100 - courseVolPercent : 50;

  const totalItemRev = stats.courseRevenue + stats.pdfRevenue;
  const courseRevPercent = totalItemRev > 0 ? Math.round((stats.courseRevenue / totalItemRev) * 100) : 50;
  const pdfRevPercent = totalItemRev > 0 ? 100 - courseRevPercent : 50;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Header with Title, Live Badge, and Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                Dashboard Overview
              </h1>
              {/* Pulsing Live Student Indicator */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{isLoading ? '...' : stats.activeStudentsNow} Online Now</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Live statistics and sales breakdown for <span className="font-medium text-foreground">{filterLabel}</span>
            </p>
          </div>

          {/* Time Filter Controls & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center p-1 bg-muted rounded-xl border border-border/60 text-xs">
              {(['today', 'yesterday', '7days', '30days', 'all'] as TimeFilter[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filter === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'today' && 'Today'}
                  {tab === 'yesterday' && 'Yesterday'}
                  {tab === '7days' && '7 Days'}
                  {tab === '30days' && '30 Days'}
                  {tab === 'all' && 'All Time'}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="rounded-xl border-border/60 h-9 gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* 5 High-Impact Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Live Active Students */}
          <Card className="rounded-2xl border-border/60 overflow-hidden relative shadow-sm hover:border-border transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Active Online</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  {isLoading ? '...' : stats.activeStudentsNow}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active in last 5m
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 2. Admitted Students (Joined in Period) */}
          <Card className="rounded-2xl border-border/60 overflow-hidden relative shadow-sm hover:border-border transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Admissions / Signups</p>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <UserPlus className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  {isLoading ? '...' : stats.admittedStudents}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  New student accounts
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Course Enrollments & Revenue */}
          <Card className="rounded-2xl border-border/60 overflow-hidden relative shadow-sm hover:border-border transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Courses Sold</p>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <BookOpen className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  {isLoading ? '...' : stats.courseEnrollmentsCount}
                </p>
                <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  ৳{isLoading ? '...' : stats.courseRevenue.toLocaleString()} earned
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 4. PDF Suggestions Sold & Revenue */}
          <Card className="rounded-2xl border-border/60 overflow-hidden relative shadow-sm hover:border-border transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">PDFs Sold</p>
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-600 dark:text-pink-400">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  {isLoading ? '...' : stats.pdfSoldCount}
                </p>
                <p className="text-[11px] font-semibold text-pink-600 dark:text-pink-400 mt-0.5">
                  ৳{isLoading ? '...' : stats.pdfRevenue.toLocaleString()} earned
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 5. Total Verified Revenue */}
          <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden relative shadow-sm hover:border-primary/40 transition-all col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-primary">Total Revenue</p>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                  ৳{isLoading ? '...' : stats.totalRevenue.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {stats.uniquePayingStudents} paying students
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Breakdown: Product Share & Top Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card: Course vs PDF Suggestion Comparison */}
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Sales & Revenue Distribution
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Comparison between Course enrollments and PDF suggestion purchases
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  {filterLabel}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Revenue Split */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Courses: ৳{stats.courseRevenue.toLocaleString()} ({courseRevPercent}%)
                  </span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                    PDFs: ৳{stats.pdfRevenue.toLocaleString()} ({pdfRevPercent}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
                  <div
                    style={{ width: `${courseRevPercent}%` }}
                    className="h-full bg-indigo-500 transition-all duration-500"
                    title={`Courses: ${courseRevPercent}%`}
                  />
                  <div
                    style={{ width: `${pdfRevPercent}%` }}
                    className="h-full bg-pink-500 transition-all duration-500"
                    title={`PDFs: ${pdfRevPercent}%`}
                  />
                </div>
              </div>

              {/* Volume (Units Sold) Split */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                    Courses: <strong className="text-foreground">{stats.courseEnrollmentsCount} enrolled</strong>
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-pink-500" />
                    PDFs: <strong className="text-foreground">{stats.pdfSoldCount} unlocked</strong>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                  <div
                    style={{ width: `${courseVolPercent}%` }}
                    className="h-full bg-indigo-400 transition-all duration-500"
                  />
                  <div
                    style={{ width: `${pdfVolPercent}%` }}
                    className="h-full bg-pink-400 transition-all duration-500"
                  />
                </div>
              </div>

              {/* Summary Stats Pill Box */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40">
                <div className="p-2.5 rounded-xl bg-muted/40 text-center">
                  <p className="text-[11px] text-muted-foreground">Total Units</p>
                  <p className="text-base font-bold text-foreground mt-0.5">{totalVolume}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 text-center">
                  <p className="text-[11px] text-muted-foreground">Paying Students</p>
                  <p className="text-base font-bold text-foreground mt-0.5">{stats.uniquePayingStudents}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 text-center">
                  <p className="text-[11px] text-muted-foreground">Avg Value / Order</p>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    ৳{totalVolume > 0 ? Math.round(stats.totalRevenue / totalVolume) : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Top Performing Content in Period */}
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    Top Purchased Content
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Highest selling subjects and PDF suggestions for {filterLabel.toLowerCase()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (topCourses.length > 0 || topPdfs.length > 0) ? (
                <div className="space-y-2">
                  {/* Top Courses */}
                  {topCourses.map((c, idx) => (
                    <div
                      key={`top-c-${c.id}`}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-card hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{c.title}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className="text-indigo-600 font-medium">Course</span>
                            {c.department && <span>• {c.department}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-foreground">{c.count} sold</span>
                        <p className="text-[10px] text-muted-foreground">৳{c.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}

                  {/* Top PDFs */}
                  {topPdfs.map((p, idx) => (
                    <div
                      key={`top-p-${p.id}`}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-card hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-pink-500/10 text-pink-600 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className="text-pink-600 font-medium">PDF Suggestion</span>
                            {p.department && <span>• {p.department}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-foreground">{p.count} sold</span>
                        <p className="text-[10px] text-muted-foreground">৳{p.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No sales recorded for this timeframe
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Recent Activity Feed */}
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Live Platform Activity Stream
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Chronological feed of student admissions, course enrollments, and PDF unlocks
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {recentActivities.length} recent events
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="divide-y divide-border/40">
                {recentActivities.map(activity => (
                  <div
                    key={activity.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-muted/20 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Event Type Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          activity.type === 'course'
                            ? 'bg-indigo-500/10 text-indigo-600'
                            : activity.type === 'pdf'
                            ? 'bg-pink-500/10 text-pink-600'
                            : 'bg-blue-500/10 text-blue-600'
                        }`}
                      >
                        {activity.type === 'course' && <BookOpen className="h-4 w-4" />}
                        {activity.type === 'pdf' && <FileText className="h-4 w-4" />}
                        {activity.type === 'admission' && <UserPlus className="h-4 w-4" />}
                      </div>

                      {/* Student & Item Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-foreground truncate">
                            {activity.studentName}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 font-mono font-medium border-border/60"
                          >
                            {activity.studentId}
                          </Badge>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              activity.type === 'course'
                                ? 'bg-indigo-500/10 text-indigo-600'
                                : activity.type === 'pdf'
                                ? 'bg-pink-500/10 text-pink-600'
                                : 'bg-blue-500/10 text-blue-600'
                            }`}
                          >
                            {activity.type === 'course' ? 'Course Enrollment' : activity.type === 'pdf' ? 'PDF Suggestion' : 'New Admission'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {activity.title}
                          {activity.department ? ` • ${activity.department}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Price & Time */}
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground">
                        {activity.amount > 0 ? `৳${activity.amount}` : activity.type === 'admission' ? 'Signed Up' : 'Free'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No recent activity recorded for {filterLabel.toLowerCase()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
