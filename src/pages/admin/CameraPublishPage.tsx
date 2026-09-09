import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Camera, ArrowLeft, Loader2, Video, VideoOff, Mic, MicOff, Radio } from "lucide-react";
import { Room, RoomEvent, Track } from "livekit-client";

interface LiveSession {
  id: string;
  title: string;
  status: string;
  room_name: string | null;
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

export default function CameraPublishPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameraPublished, setCameraPublished] = useState(false);
  const [micPublished, setMicPublished] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);

  // Load live sessions
  useEffect(() => {
    supabase
      .from("live_sessions")
      .select("id, title, status, room_name")
      .in("status", ["live", "scheduled"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSessions(data || []);
        const liveSession = data?.find((s) => s.status === "live");
        if (liveSession) setSelectedSession(liveSession.id);
        else if (data?.length) setSelectedSession(data[0].id);
      });
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: 30 },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => null);
      }
      setCameraReady(true);
      return stream;
    } catch (err) {
      setCameraReady(false);
      toast({ title: "Camera Error", description: err instanceof Error ? err.message : "Cannot access camera", variant: "destructive" });
      return null;
    }
  }, [toast]);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      micStreamRef.current = stream;
      setMicReady(true);
      return stream;
    } catch {
      setMicReady(false);
      toast({ title: "Mic Error", description: "Cannot access microphone", variant: "destructive" });
      return null;
    }
  }, [toast]);

  // Init camera preview
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      roomRef.current?.disconnect().catch(() => {});
    };
  }, []);

  const flipCamera = async () => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    const stream = await startCamera(newFacing);
    if (stream && roomRef.current) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Unpublish old, publish new
        const room = roomRef.current;
        for (const pub of room.localParticipant.videoTrackPublications.values()) {
          if (pub.source === Track.Source.Camera) {
            await room.localParticipant.unpublishTrack(pub.track!.mediaStreamTrack, false).catch(() => {});
          }
        }
        await room.localParticipant.publishTrack(videoTrack, {
          source: Track.Source.Camera,
          name: "phone-camera",
        });
      }
    }
  };

  const joinRoom = async () => {
    if (!selectedSession) return;
    setConnecting(true);

    try {
      const { ok, result } = await callEdgeFn("get_token", {
        session_id: selectedSession,
        is_publisher: true,
        device_role: "camera",
      });

      if (!ok) {
        toast({ title: "Failed", description: result.error, variant: "destructive" });
        return;
      }

      // Start mic
      await startMic();

      const room = new Room();
      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        roomRef.current = null;
      });

      roomRef.current = room;
      await room.connect(result.ws_url, result.token);

      // Publish camera
      const camStream = cameraStreamRef.current;
      const camTrack = camStream?.getVideoTracks()[0];
      if (camTrack) {
        await room.localParticipant.publishTrack(camTrack, {
          source: Track.Source.Camera,
          name: "phone-camera",
        });
        setCameraPublished(true);
      }

      // Publish mic
      const micTrack = micStreamRef.current?.getAudioTracks()[0];
      if (micTrack) {
        await room.localParticipant.publishTrack(micTrack, {
          source: Track.Source.Microphone,
          name: "phone-mic",
        });
        setMicPublished(true);
      }

      setConnected(true);
      toast({ title: "📹 Camera connected!", description: "Your camera feed is now live in the room." });
    } catch (err) {
      toast({ title: "Connection Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const leaveRoom = async () => {
    await roomRef.current?.disconnect().catch(() => {});
    roomRef.current = null;
    setConnected(false);
    setCameraPublished(false);
    setMicPublished(false);
    toast({ title: "Disconnected" });
  };

  const toggleCamera = () => {
    const tracks = cameraStreamRef.current?.getVideoTracks();
    if (tracks) {
      tracks.forEach((t) => { t.enabled = !t.enabled; });
      setCameraOn((prev) => !prev);
    }
  };

  const toggleMic = () => {
    const tracks = micStreamRef.current?.getAudioTracks();
    if (tracks) {
      tracks.forEach((t) => { t.enabled = !t.enabled; });
      setMicOn((prev) => !prev);
    }
  };

  const currentSession = sessions.find((s) => s.id === selectedSession);

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/80 backdrop-blur-sm z-10">
        <Button variant="ghost" size="sm" className="text-white gap-1" onClick={() => navigate("/admin/live-sessions")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          <span className="text-white text-sm font-bold">Phone Camera</span>
        </div>
        {connected && (
          <Badge className="bg-destructive text-destructive-foreground animate-pulse border-0">
            <Radio className="h-3 w-3 mr-1" /> LIVE
          </Badge>
        )}
        {!connected && <div className="w-16" />}
      </div>

      {/* Camera preview - takes most of the screen */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        />

        {connected && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-white text-xs font-bold">REC</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls at bottom */}
      <div className="bg-black/90 backdrop-blur-sm px-4 py-4 space-y-3 safe-area-bottom">
        {/* Live status indicators */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <StatusPill label="Camera" ready={cameraReady} live={cameraPublished} />
          <StatusPill label="Mic" ready={micReady} live={micPublished} />
          <StatusPill label="Room" ready={!!selectedSession} live={connected} />
        </div>
        {!connected && (
          <div className="space-y-2">
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-xl h-12">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title} {s.status === "live" ? "🔴" : "⏰"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={joinRoom}
              disabled={connecting || !selectedSession}
              className="w-full h-14 rounded-2xl font-bold text-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            >
              {connecting ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Connecting...</>
              ) : (
                <><Camera className="h-5 w-5 mr-2" /> Join as Camera</>
              )}
            </Button>
          </div>
        )}

        {connected && (
          <div className="space-y-3">
            <p className="text-white/60 text-xs text-center">
              Connected to: <span className="text-white font-medium">{currentSession?.title}</span>
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 p-0 border-white/20 ${!cameraOn ? 'bg-destructive/80 border-destructive' : 'bg-white/10'}`}
                onClick={toggleCamera}
              >
                {cameraOn ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
              </Button>

              <Button
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 p-0 border-white/20 ${!micOn ? 'bg-destructive/80 border-destructive' : 'bg-white/10'}`}
                onClick={toggleMic}
              >
                {micOn ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="rounded-full w-14 h-14 p-0 border-white/20 bg-white/10"
                onClick={flipCamera}
              >
                <span className="text-white text-lg">🔄</span>
              </Button>

              <Button
                size="lg"
                className="rounded-full w-14 h-14 p-0 bg-destructive hover:bg-destructive/90"
                onClick={leaveRoom}
              >
                <span className="text-white text-lg font-bold">✕</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ label, ready, live }: { label: string; ready: boolean; live: boolean }) {
  const state = live ? "live" : ready ? "ready" : "off";
  const styles = {
    live: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
    ready: "bg-amber-500/20 text-amber-200 border-amber-400/40",
    off: "bg-white/5 text-white/50 border-white/10",
  }[state];
  const dot = {
    live: "bg-emerald-400 animate-pulse",
    ready: "bg-amber-400",
    off: "bg-white/30",
  }[state];
  const text = live ? "Live" : ready ? "Ready" : "Off";
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold ${styles}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}: {text}
    </div>
  );
}
