import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LivePlayer } from "@/components/live/LivePlayer";
import { LiveChat } from "@/components/live/LiveChat";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Radio, Lock, Users } from "lucide-react";
import { format } from "date-fns";

interface SessionData {
  id: string;
  title: string;
  title_bn: string | null;
  description: string | null;
  status: string;
  scheduled_start: string | null;
  is_free: boolean;
  viewer_count: number;
  subject_id: string | null;
}

export default function WatchSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const updateViewerCount = useCallback(async (delta: number) => {
    if (!sessionId) return;
    const { data: current } = await supabase
      .from("live_sessions")
      .select("viewer_count")
      .eq("id", sessionId)
      .single();
    if (current) {
      await supabase
        .from("live_sessions")
        .update({ viewer_count: Math.max(0, (current.viewer_count || 0) + delta) })
        .eq("id", sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (!data) {
        navigate("/live-sessions");
        return;
      }

      setSession(data as SessionData);

      if (data.is_free || isAdmin) {
        setHasAccess(true);
      } else if (user && data.subject_id) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("subject_id", data.subject_id)
          .eq("payment_status", "completed")
          .maybeSingle();
        setHasAccess(!!enrollment);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`watch-${sessionId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "live_sessions",
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        setSession(payload.new as SessionData);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, user, isAdmin, navigate]);

  useEffect(() => {
    if (!hasAccess || loading || !session) return;
    if (session.status !== "live") return;

    updateViewerCount(1);
    return () => { updateViewerCount(-1); };
  }, [hasAccess, loading, session?.status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const isLive = session.status === "live";

  if (!hasAccess && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Enrollment Required</h1>
          <p className="text-muted-foreground mb-6">
            You need to be enrolled in the subject to watch this session.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/live-sessions")}>
              Back to Sessions
            </Button>
            {session.subject_id && (
              <Button onClick={() => navigate("/subjects")}>
                Browse Subjects
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl mx-auto px-4 py-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2"
          onClick={() => navigate("/live-sessions")}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Player */}
          <div className="flex-1 min-w-0">
            {isLive ? (
              <LivePlayer
                sessionId={session.id}
                title={session.title}
                isLive={isLive}
              />
            ) : (
              <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">
                    {session.status === "scheduled"
                      ? "Stream hasn't started yet"
                      : "This session has ended"}
                  </p>
                  {session.scheduled_start && session.status === "scheduled" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Starts {format(new Date(session.scheduled_start), "MMM d · h:mm a")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Session info */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {isLive && (
                  <Badge className="bg-destructive text-destructive-foreground border-0 animate-pulse">🔴 LIVE</Badge>
                )}
                {session.is_free && (
                  <Badge className="bg-emerald-500 text-white border-0">FREE</Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {session.viewer_count} watching
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{session.title}</h1>
              {session.description && (
                <p className="text-muted-foreground mt-2">{session.description}</p>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="w-full lg:w-[380px] h-[500px] lg:h-[calc(56.25vw*0.5+200px)] lg:max-h-[700px] lg:min-h-[500px]">
            <LiveChat sessionId={session.id} isStaff={isAdmin} />
          </div>
        </div>
      </main>
    </div>
  );
}
