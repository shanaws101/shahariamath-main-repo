import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bell, Check, Calendar, CreditCard, BookOpen, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string; title: string; title_bn: string | null;
  message: string; message_bn: string | null;
  type: string; is_read: boolean; created_at: string;
}

export default function NotificationsPage() {
  const { t, isEnglish } = useLanguage();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (!error && data) setNotifications(data);
      setIsLoading(false);
    };
    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'class': return <Calendar className="h-4 w-4" />;
      case 'payment': return <CreditCard className="h-4 w-4" />;
      case 'enrollment': return <BookOpen className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">{t('dashboard.notifications')}</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {unreadCount} {isEnglish ? "unread" : "অপঠিত"}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="h-8 rounded-xl text-xs gap-1.5">
              <Check className="h-3.5 w-3.5" />
              {isEnglish ? "Mark all read" : "সব পঠিত"}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-border bg-card animate-pulse p-4">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                  !notification.is_read 
                    ? 'bg-primary/5 border-primary/20 hover:bg-primary/8' 
                    : 'bg-card border-border hover:bg-muted/50'
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex gap-3">
                  <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    !notification.is_read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    <img src="/logo.png" alt="Shaharia Math" className="h-6 w-6 object-contain" width={24} height={24} />
                    <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border border-card bg-card flex items-center justify-center">
                      {getIcon(notification.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-semibold text-sm ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {isEnglish ? notification.title : (notification.title_bn || notification.title)}
                      </h3>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {isEnglish ? notification.message : (notification.message_bn || notification.message)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Bell className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{isEnglish ? "No notifications yet" : "এখনো কোনো বিজ্ঞপ্তি নেই"}</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
