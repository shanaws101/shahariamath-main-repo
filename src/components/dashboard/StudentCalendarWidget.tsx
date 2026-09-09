import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface ScheduleEvent {
  id: string; title: string; title_bn: string | null;
  description: string | null; scheduled_date: string;
  start_time: string; end_time: string;
  is_free: boolean | null; status: string | null;
  department: string | null; target_years: number[] | null;
  subjects?: { name: string; name_bn: string };
}

export function StudentCalendarWidget() {
  const { user, profile } = useAuth();
  const { isEnglish } = useLanguage();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];
      const { data } = await supabase.from("class_schedules")
        .select("id, title, title_bn, description, scheduled_date, start_time, end_time, is_free, status, department, target_years, subjects(name, name_bn)")
        .gte("scheduled_date", startDate).lte("scheduled_date", endDate)
        .neq("status", "cancelled").order("scheduled_date", { ascending: true });
      const filtered = (data || []).filter((e: any) => {
        const deptMatch = !e.department || e.department === profile?.department;
        const yearMatch = !e.target_years || !profile?.year || (e.target_years as number[]).includes(profile.year);
        return deptMatch && yearMatch;
      });
      setEvents(filtered as ScheduleEvent[]);
      setIsLoading(false);
    };
    load();
  }, [user, profile, selectedMonth]);

  const handleMonthChange = (direction: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year, month - 1 + direction, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return new Date(y, m - 1).toLocaleDateString(isEnglish ? "en-US" : "bn-BD", { month: "long", year: "numeric" });
  })();

  const grouped = events.reduce((acc, ev) => {
    if (!acc[ev.scheduled_date]) acc[ev.scheduled_date] = [];
    acc[ev.scheduled_date].push(ev);
    return acc;
  }, {} as Record<string, ScheduleEvent[]>);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {isEnglish ? "My Calendar" : "আমার ক্যালেন্ডার"}
        </h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handleMonthChange(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold px-2 min-w-[120px] text-center">{monthLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handleMonthChange(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Calendar className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{isEnglish ? "No events this month" : "এই মাসে কোনো ইভেন্ট নেই"}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, evts]) => (
            <div key={date}>
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                {new Date(date).toLocaleDateString(isEnglish ? "en-US" : "bn-BD", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <div className="space-y-1.5">
                {evts.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{isEnglish ? ev.title : ev.title_bn || ev.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {ev.start_time} - {ev.end_time}
                        {ev.subjects && ` · ${isEnglish ? ev.subjects.name : ev.subjects.name_bn}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ev.is_free && <Badge variant="outline" className="text-[10px] rounded-md">Free</Badge>}
                      {ev.status === "live" && <Badge className="bg-red-500 text-[10px] rounded-md">Live</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
