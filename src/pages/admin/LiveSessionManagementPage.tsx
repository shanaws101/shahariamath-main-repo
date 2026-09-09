import { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Radio, Trash2, Play, Square, Eye, Camera, HelpCircle, Smartphone, Wifi, LogIn, Hand } from "lucide-react";
import { format } from "date-fns";

interface LiveSession {
  id: string;
  title: string;
  title_bn: string | null;
  description: string | null;
  status: string;
  scheduled_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  room_name: string | null; // reused as room_name
  is_free: boolean;
  viewer_count: number;
  subject_id: string | null;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
}

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livekit-token`;

async function callEdgeFn(action: string, params: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(EDGE_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });
  const result = await res.json();
  return { ok: res.ok, result };
}

export default function LiveSessionManagementPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [titleBn, setTitleBn] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [isFree, setIsFree] = useState(false);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("live_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    setSessions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
    supabase.from("subjects").select("id, name").then(({ data }) => {
      setSubjects(data || []);
    });
  }, []);

  const createSession = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setCreating(true);

    try {
      const { ok, result } = await callEdgeFn("create_session", {
        title: title.trim(),
        title_bn: titleBn.trim() || null,
        description: description.trim() || null,
        subject_id: subjectId === "none" ? null : subjectId || null,
        scheduled_start: scheduledStart || null,
        is_free: isFree,
      });

      if (!ok) {
        toast({ title: "Failed to create", description: result.error, variant: "destructive" });
        return;
      }

      toast({ title: "Session created!", description: `Room: ${result.room_name}` });
      setDialogOpen(false);
      resetForm();
      loadSessions();
    } catch (error) {
      toast({
        title: "Failed to create",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setTitleBn("");
    setDescription("");
    setSubjectId("");
    setScheduledStart("");
    setIsFree(false);
  };

  const goLive = async (sessionId: string) => {
    const { ok, result } = await callEdgeFn("go_live", { session_id: sessionId });
    if (ok) {
      toast({ title: "Session is now LIVE!" });
      loadSessions();
    } else {
      toast({ title: "Failed", description: result.error, variant: "destructive" });
    }
  };

  const endSession = async (sessionId: string) => {
    const { ok, result } = await callEdgeFn("end", { session_id: sessionId });
    if (ok) {
      toast({ title: "Session ended" });
      loadSessions();
    } else {
      toast({ title: "Failed", description: result.error, variant: "destructive" });
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm("Delete this session?")) return;
    const { ok } = await callEdgeFn("delete", { session_id: sessionId });
    toast({ title: ok ? "Session deleted" : "Delete failed" });
    loadSessions();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      live: "bg-destructive text-destructive-foreground",
      scheduled: "bg-amber-500/10 text-amber-600",
      ended: "bg-muted text-muted-foreground",
      cancelled: "bg-destructive/10 text-destructive",
    };
    return <Badge className={`${map[status] || map.scheduled} border-0`}>{status.toUpperCase()}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Radio className="h-6 w-6 text-primary" />
              Live Sessions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage live streaming sessions</p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 h-12 rounded-xl font-bold">
                  <HelpCircle className="h-4 w-4" /> How to Use Phone Camera
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <Smartphone className="h-5 w-5 text-primary" /> Join a Session from Your Phone Camera
                  </DialogTitle>
                  <DialogDescription>
                    Use your phone as an extra HD camera in the same live room as Broadcast Studio.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <Step n={1} icon={<Radio className="h-4 w-4" />} title="Create or pick a session">
                    On this page, create a Live Session (or pick an existing scheduled/live one).
                  </Step>
                  <Step n={2} icon={<Wifi className="h-4 w-4" />} title="Open Broadcast Studio on your laptop">
                    Click <strong>Broadcast Studio</strong> and start the session. This opens the LiveKit room and goes live for students.
                  </Step>
                  <Step n={3} icon={<LogIn className="h-4 w-4" />} title="Open this site on your phone">
                    On your phone's browser, log in with the same admin account and open <strong>Live Sessions → Phone Camera</strong>.
                  </Step>
                  <Step n={4} icon={<Camera className="h-4 w-4" />} title="Pick the same session & join">
                    Allow camera + mic, select the <strong>same session</strong>, and tap <strong>Join as Camera</strong>. Wait until all three pills show <span className="text-emerald-600 font-bold">Live</span>: Camera, Mic, Room.
                  </Step>
                  <Step n={5} icon={<Hand className="h-4 w-4" />} title="Stream as a second camera">
                    Your phone now publishes its camera + mic into the same room. Students see both feeds. Use 🔄 to flip front/back, mute camera/mic anytime.
                  </Step>
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                    💡 <strong>Tip:</strong> Keep your phone plugged in and on Wi-Fi. The phone is <em>not</em> recording locally — it streams live into the same session.
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Link to="/admin/camera-publish">
              <Button variant="outline" className="gap-2 h-12 rounded-xl font-bold">
                <Camera className="h-4 w-4" /> Phone Camera
              </Button>
            </Link>
            <Link to="/admin/go-live">
              <Button variant="outline" className="gap-2 h-12 rounded-xl font-bold">
                <Radio className="h-4 w-4" /> Broadcast Studio
              </Button>
            </Link>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-12 rounded-xl font-bold">
                  <Plus className="h-4 w-4" /> New Session
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-2xl border-0 bg-gradient-to-br from-card to-muted/30 shadow-xl p-0 overflow-hidden">
                <div className="bg-gradient-brand p-6 pb-4">
                  <DialogHeader>
                    <DialogTitle className="text-primary-foreground text-xl font-extrabold tracking-tight flex items-center gap-2">
                      <Radio className="h-5 w-5" /> Create Live Session
                    </DialogTitle>
                    <DialogDescription className="text-primary-foreground/70 text-sm">
                      Set up a new session. Go live from the Broadcast Studio when ready.
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="p-6 pt-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title (English)</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Live Class" className="rounded-xl h-11 border-border/60 focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title (Bangla)</Label>
                      <Input value={titleBn} onChange={(e) => setTitleBn(e.target.value)} placeholder="বাংলা শিরোনাম" className="rounded-xl h-11 border-border/60 focus:border-primary" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will you cover in this session?" className="rounded-xl border-border/60 focus:border-primary min-h-[80px]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</Label>
                      <Select value={subjectId} onValueChange={setSubjectId}>
                        <SelectTrigger className="rounded-xl h-11 border-border/60">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No subject</SelectItem>
                          {subjects.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scheduled Start</Label>
                      <Input
                        type="datetime-local"
                        value={scheduledStart}
                        onChange={(e) => setScheduledStart(e.target.value)}
                        className="rounded-xl h-11 border-border/60"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/40">
                    <Switch checked={isFree} onCheckedChange={setIsFree} />
                    <div>
                      <Label className="font-semibold text-sm">Free for everyone</Label>
                      <p className="text-xs text-muted-foreground">Anyone can watch without enrollment</p>
                    </div>
                  </div>
                  <Button
                    onClick={createSession}
                    disabled={creating}
                    className="w-full h-12 rounded-xl font-bold bg-gradient-brand hover:opacity-90 text-primary-foreground shadow-brand transition-all"
                  >
                    {creating ? "Creating..." : "Create Session"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No sessions yet. Create your first live session!
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <Card key={s.id} className="rounded-2xl">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {statusBadge(s.status)}
                      {s.is_free && <Badge variant="outline" className="text-emerald-600 border-emerald-300">Free</Badge>}
                    </div>
                    <h3 className="font-bold text-foreground truncate">{s.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Created {format(new Date(s.created_at), "MMM d, yyyy")}
                      {s.scheduled_start && ` · Scheduled ${format(new Date(s.scheduled_start), "MMM d, h:mm a")}`}
                    </p>
                    {s.room_name && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">Room: {s.room_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.status === "scheduled" && (
                      <Button size="sm" variant="default" className="gap-1 rounded-xl" onClick={() => goLive(s.id)}>
                        <Play className="h-3 w-3" /> Go Live
                      </Button>
                    )}
                    {s.status === "live" && (
                      <Button size="sm" variant="destructive" className="gap-1 rounded-xl" onClick={() => endSession(s.id)}>
                        <Square className="h-3 w-3" /> End
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-1 rounded-xl" onClick={() => window.open(`/watch/${s.id}`, "_blank")}>
                      <Eye className="h-3 w-3" /> View
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive rounded-xl" onClick={() => deleteSession(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Step({ n, icon, title, children }: { n: number; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
        {n}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
          {icon} {title}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{children}</p>
      </div>
    </div>
  );
}
