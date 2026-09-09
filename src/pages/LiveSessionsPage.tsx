import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SessionCard } from "@/components/live/SessionCard";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radio, Clock, PlayCircle } from "lucide-react";

interface LiveSession {
  id: string;
  title: string;
  title_bn: string | null;
  description: string | null;
  description_bn: string | null;
  status: string;
  scheduled_start: string | null;
  actual_start: string | null;
  viewer_count: number;
  is_free: boolean;
  thumbnail_url: string | null;
}

export default function LiveSessionsPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("*")
        .in("status", ["live", "scheduled", "ended"])
        .order("scheduled_start", { ascending: false });
      setSessions(data || []);
      setLoading(false);
    };
    load();

    // Realtime updates
    const channel = supabase
      .channel("live-sessions-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions" }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const liveSessions = sessions.filter((s) => s.status === "live");
  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const past = sessions.filter((s) => s.status === "ended");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <Radio className="h-4 w-4 animate-pulse" />
            Live Classes
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">
            Live Streaming Classes
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Watch live classes, interact with teachers in real-time, and never miss a session.
          </p>
        </div>

        {/* Live Now Banner */}
        {liveSessions.length > 0 && (
          <div className="mb-8 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
            <h2 className="text-lg font-bold text-red-500 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              Live Now ({liveSessions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveSessions.map((s) => <SessionCard key={s.id} session={s} />)}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 mb-6">
            <TabsTrigger value="upcoming" className="gap-2">
              <Clock className="h-4 w-4" /> Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <PlayCircle className="h-4 w-4" /> Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">Loading...</div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No upcoming sessions</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((s) => <SessionCard key={s.id} session={s} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {past.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No past sessions</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {past.map((s) => <SessionCard key={s.id} session={s} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
