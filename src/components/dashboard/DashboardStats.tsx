import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Video, Bell, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  enrolledSubjects: number;
  freeVideosAvailable: number;
  unreadNotifications: number;
  upcomingClasses: number;
}

export function DashboardStats() {
  const { isEnglish } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    enrolledSubjects: 0,
    freeVideosAvailable: 0,
    unreadNotifications: 0,
    upcomingClasses: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const [enrollmentsRes, videosRes, notificationsRes, classesRes] = await Promise.all([
        supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('payment_status', 'completed'),
        supabase.from('free_videos').select('id', { count: 'exact', head: true }).eq('is_visible', true),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
        supabase.from('class_schedules').select('id', { count: 'exact', head: true }).gte('scheduled_date', today).in('status', ['upcoming', 'live']),
      ]);
      setStats({
        enrolledSubjects: enrollmentsRes.count || 0,
        freeVideosAvailable: videosRes.count || 0,
        unreadNotifications: notificationsRes.count || 0,
        upcomingClasses: classesRes.count || 0,
      });
      setIsLoading(false);
    };
    fetchStats();
  }, [user]);

  const statItems = [
    {
      label: isEnglish ? "Enrolled" : "ভর্তিকৃত",
      value: stats.enrolledSubjects,
      icon: BookOpen,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: isEnglish ? "Free Videos" : "ফ্রি ভিডিও",
      value: stats.freeVideosAvailable,
      icon: Video,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: isEnglish ? "Upcoming" : "আসন্ন",
      value: stats.upcomingClasses,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      label: isEnglish ? "Unread" : "অপঠিত",
      value: stats.unreadNotifications,
      icon: Bell,
      color: "text-violet-600",
      bg: "bg-violet-500/10",
      showDot: stats.unreadNotifications > 0,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl bg-card border border-border p-3 animate-pulse">
            <div className="h-12 bg-muted rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 md:gap-3">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border bg-card p-3 md:p-4 text-center transition-all hover:shadow-sm"
        >
          <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl ${item.bg} flex items-center justify-center mx-auto mb-1.5`}>
            <item.icon className={`h-4 w-4 md:h-5 md:w-5 ${item.color}`} />
          </div>
          <p className="text-lg md:text-xl font-extrabold text-foreground tracking-tight leading-none relative">
            {item.value}
            {item.showDot && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
            )}
          </p>
          <p className="text-[10px] md:text-xs text-muted-foreground font-medium mt-0.5 truncate">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
