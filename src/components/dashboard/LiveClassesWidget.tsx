import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, Clock, ArrowRight, Users } from "lucide-react";
import { format } from "date-fns";

interface LiveSession {
  id: string;
  title: string;
  title_bn: string | null;
  status: string;
  scheduled_start: string | null;
  is_free: boolean;
  viewer_count: number;
  thumbnail_url: string | null;
}

export function LiveClassesWidget() {
  const { isEnglish } = useLanguage();
  const [sessions, setSessions] = useState<LiveSession[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("id, title, title_bn, status, scheduled_start, is_free, viewer_count, thumbnail_url")
        .in("status", ["live", "scheduled"])
        .order("scheduled_start", { ascending: true })
        .limit(5);
      setSessions(data || []);
    };
    load();

    const channel = supabase
      .channel("dashboard-live-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions" }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const liveSessions = sessions.filter((s) => s.status === "live");
  const upcoming = sessions.filter((s) => s.status === "scheduled");

  if (sessions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Radio className="h-3.5 w-3.5 text-destructive" />
          </div>
          <h3 className="font-bold text-sm text-foreground">
            {isEnglish ? "Live Classes" : "লাইভ ক্লাস"}
          </h3>
          {liveSessions.length > 0 && (
            <Badge className="bg-destructive text-destructive-foreground border-0 text-[10px] animate-pulse">
              {liveSessions.length} LIVE
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 rounded-lg" asChild>
          <Link to="/live-sessions">
            {isEnglish ? "All" : "সব"} <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="divide-y divide-border">
        {liveSessions.map((s) => (
          <Link
            key={s.id}
            to={`/watch/${s.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {isEnglish ? s.title : (s.title_bn || s.title)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="bg-destructive/10 text-destructive border-0 text-[10px]">🔴 LIVE</Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {s.viewer_count}
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        ))}

        {upcoming.slice(0, 3).map((s) => (
          <Link
            key={s.id}
            to={`/watch/${s.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {isEnglish ? s.title : (s.title_bn || s.title)}
              </p>
              {s.scheduled_start && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {format(new Date(s.scheduled_start), "MMM d · h:mm a")}
                </p>
              )}
            </div>
            {s.is_free && (
              <Badge variant="secondary" className="text-[10px] shrink-0">FREE</Badge>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
