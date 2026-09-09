import { useState, useRef, useCallback, useEffect } from "react";
import { FacebookSimulcast } from "@/components/live/FacebookSimulcast";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Monitor,
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Radio,
  Square,
  ArrowLeft,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Tv,
  Headphones,
} from "lucide-react";
import { Room, RoomEvent, Track } from "livekit-client";

interface ActiveSession {
  id: string;
  title: string;
  status: string;
  room_name: string | null;
}

type SourceMode = "screen" | "camera" | "both";
// SwapState removed, using pipSwapped boolean instead

interface PublishedTrackConfig {
  key: string;
  track: MediaStreamTrack;
  source: Track.Source;
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

export default function GoLivePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const publishedTracksRef = useRef<Map<string, MediaStreamTrack>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [tokenReady, setTokenReady] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [loadingToken, setLoadingToken] = useState(false);
  const [publisherToken, setPublisherToken] = useState("");
  const [publisherWsUrl, setPublisherWsUrl] = useState("");

  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [goingLive, setGoingLive] = useState(false);
  const [micError, setMicError] = useState("");
  const [pipSwapped, setPipSwapped] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micTesting, setMicTesting] = useState(false);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const liveStartRef = useRef<number | null>(null);
  const micTestAudioRef = useRef<{ ctx: AudioContext; dest: MediaStreamAudioDestinationNode; source: MediaStreamAudioSourceNode; el: HTMLAudioElement } | null>(null);

  const currentSession = sessions.find((s) => s.id === selectedSession);
  const isLive = currentSession?.status === "live";
  const isPreviewing = sourceMode !== null;

  // Live timer
  useEffect(() => {
    if (isLive) {
      if (!liveStartRef.current) liveStartRef.current = Date.now();
      const interval = setInterval(() => {
        setLiveElapsed(Math.floor((Date.now() - liveStartRef.current!) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      liveStartRef.current = null;
      setLiveElapsed(0);
    }
  }, [isLive]);

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  // ─── Track Publishing Logic ─────────────────────────────────────────────
  const getDesiredPublishedTracks = useCallback((): PublishedTrackConfig[] => {
    const nextTracks: PublishedTrackConfig[] = [];
    const screenVideo = screenStream?.getVideoTracks()[0];
    const cameraVideo = cameraStream?.getVideoTracks()[0];

    // Use dedicated mic stream for audio (works for all modes)
    const micAudio = micStream?.getAudioTracks()[0];
    // Fallback: screen system audio
    const screenAudio = screenStream?.getAudioTracks()[0];

    if (sourceMode === "screen" || sourceMode === "both") {
      if (screenVideo) {
        nextTracks.push({
          key: "screen-video",
          track: screenVideo,
          source: Track.Source.ScreenShare,
          name: "screen-share",
        });
      }
      if (screenAudio) {
        nextTracks.push({
          key: "screen-audio",
          track: screenAudio,
          source: Track.Source.ScreenShareAudio,
          name: "screen-audio",
        });
      }
    }

    if (sourceMode === "camera" || sourceMode === "both") {
      if (cameraVideo) {
        nextTracks.push({
          key: "camera-video",
          track: cameraVideo,
          source: Track.Source.Camera,
          name: "camera",
        });
      }
    }

    // Always publish mic as a separate track
    if (micAudio) {
      nextTracks.push({
        key: "mic-audio",
        track: micAudio,
        source: Track.Source.Microphone,
        name: "microphone",
      });
    }

    return nextTracks;
  }, [cameraStream, screenStream, micStream, sourceMode]);

  const syncPublishedTracks = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    const desiredTracks = getDesiredPublishedTracks();
    const desiredTrackMap = new Map(desiredTracks.map((item) => [item.key, item]));

    for (const [key, currentTrack] of publishedTracksRef.current.entries()) {
      const nextTrack = desiredTrackMap.get(key);
      if (!nextTrack || nextTrack.track.id !== currentTrack.id) {
        await room.localParticipant.unpublishTrack(currentTrack, false).catch(() => undefined);
        publishedTracksRef.current.delete(key);
      }
    }

    for (const item of desiredTracks) {
      const currentTrack = publishedTracksRef.current.get(item.key);
      if (currentTrack?.id === item.track.id) continue;
      await room.localParticipant.publishTrack(item.track, {
        source: item.source,
        name: item.name,
      });
      publishedTracksRef.current.set(item.key, item.track);
    }
  }, [getDesiredPublishedTracks]);

  const disconnectPublisherRoom = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    publishedTracksRef.current.clear();
    if (room) {
      await room.disconnect(false).catch(() => undefined);
    }
  }, []);

  const connectPublisherRoom = useCallback(async () => {
    if (!publisherToken || !publisherWsUrl) {
      throw new Error("Stream access is not ready yet");
    }
    if (roomRef.current) return roomRef.current;

    const room = new Room();
    room.on(RoomEvent.Disconnected, () => {
      if (roomRef.current === room) {
        roomRef.current = null;
        publishedTracksRef.current.clear();
      }
    });
    room.on(RoomEvent.Reconnecting, () => {
      toast({ title: "Reconnecting stream", description: "Broadcast connection is trying to recover." });
    });

    roomRef.current = room;
    await room.connect(publisherWsUrl, publisherToken);
    await syncPublishedTracks();
    return room;
  }, [publisherToken, publisherWsUrl, syncPublishedTracks, toast]);

  // ─── Video Preview Sync ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isPreviewing) return;

    // Use refs for most up-to-date stream values (avoids stale state from batched updates)
    const currentScreen = screenStreamRef.current;
    const currentCamera = cameraStreamRef.current;

    let mainStream: MediaStream | null = null;
    let pipStream: MediaStream | null = null;

    if (sourceMode === "camera") {
      mainStream = currentCamera;
    } else if (sourceMode === "screen") {
      mainStream = currentScreen;
    } else if (sourceMode === "both") {
      if (pipSwapped) {
        mainStream = currentCamera;
        pipStream = currentScreen;
      } else {
        mainStream = currentScreen;
        pipStream = currentCamera;
      }
    }

    if (mainVideoRef.current) {
      if (mainStream && mainVideoRef.current.srcObject !== mainStream) {
        mainVideoRef.current.srcObject = mainStream;
        void mainVideoRef.current.play().catch(() => null);
      } else if (!mainStream) {
        mainVideoRef.current.srcObject = null;
      }
    }
    if (pipVideoRef.current) {
      if (pipStream && pipVideoRef.current.srcObject !== pipStream) {
        pipVideoRef.current.srcObject = pipStream;
        void pipVideoRef.current.play().catch(() => null);
      } else if (!pipStream) {
        pipVideoRef.current.srcObject = null;
      }
    }
  }, [cameraStream, screenStream, sourceMode, isPreviewing, pipSwapped]);

  // ─── Audio Level Monitoring ─────────────────────────────────────────────
  useEffect(() => {
    if (!micStream) { setMicLevel(0); return; }
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const source = audioCtx.createMediaStreamSource(micStream);
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let raf: number;
    const poll = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
      raf = requestAnimationFrame(poll);
    };
    poll();
    return () => { cancelAnimationFrame(raf); source.disconnect(); audioCtx.close().catch(() => {}); };
  }, [micStream]);

  // ─── Load Sessions ──────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("id, title, status, room_name")
        .in("status", ["scheduled", "live"])
        .order("created_at", { ascending: false });
      setSessions(data || []);
      if (data?.length) setSelectedSession(data[0].id);
    };
    load();
  }, []);

  // ─── Token Verification ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSession) return;
    setTokenReady(false);
    setTokenError("");
    setPublisherToken("");
    setPublisherWsUrl("");
    setLoadingToken(true);
    const check = async () => {
      try {
        await disconnectPublisherRoom();
        const { ok, result } = await callEdgeFn("get_token", {
          session_id: selectedSession,
          is_publisher: true,
        });
        if (ok) {
          setPublisherToken(result.token || "");
          setPublisherWsUrl(result.ws_url || "");
          setTokenReady(true);
        } else {
          setTokenError(result.error || "Could not verify stream access");
        }
      } catch {
        setTokenError("Could not reach the streaming backend");
      } finally {
        setLoadingToken(false);
      }
    };
    void check();
  }, [disconnectPublisherRoom, selectedSession]);

  // ─── Cleanup (unmount only) ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close().catch(() => undefined);
      void disconnectPublisherRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!roomRef.current) return;
    void syncPublishedTracks();
  }, [syncPublishedTracks]);

  // ─── Media Helpers ──────────────────────────────────────────────────────

  const stopAllStreams = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    screenStreamRef.current = null;
    cameraStreamRef.current = null;
    micStreamRef.current = null;
    if (mainVideoRef.current) mainVideoRef.current.srcObject = null;
    if (pipVideoRef.current) pipVideoRef.current.srcObject = null;
    setScreenStream(null);
    setCameraStream(null);
    setMicStream(null);
    setSourceMode(null);
    setPipSwapped(false);
    setIsMuted(false);
    setIsVideoOn(true);
    setMicError("");
  }, []);

  const acquireMicrophone = useCallback(async (): Promise<MediaStream | null> => {
    setMicError("");
    try {
      // Check permission status first
      if (navigator.permissions) {
        try {
          const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
          if (status.state === "denied") {
            setMicError("Microphone is blocked. Please allow microphone access in your browser settings, then try again.");
            toast({ title: "🎤 Microphone Blocked", description: "Go to browser settings and allow microphone access for this site.", variant: "destructive" });
            return null;
          }
        } catch {
          // permissions API not available, continue
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;
      setMicStream(stream);
      return stream;
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        setMicError("Microphone permission denied. Click the lock icon in your browser's address bar → Allow Microphone.");
        toast({ title: "🎤 Microphone Denied", description: "Allow microphone in browser settings and try again.", variant: "destructive" });
      } else if (name === "NotFoundError") {
        setMicError("No microphone found. Please connect a microphone and try again.");
        toast({ title: "🎤 No Microphone", description: "Connect a microphone to your device.", variant: "destructive" });
      } else if (name === "NotReadableError") {
        setMicError("Microphone is being used by another app. Close other apps using the mic, then try again.");
        toast({ title: "🎤 Microphone Busy", description: "Close other apps using the microphone.", variant: "destructive" });
      } else {
        setMicError("Could not access microphone. Check your browser settings.");
        toast({ title: "🎤 Microphone Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
      }
      return null;
    }
  }, [toast]);

  const startScreen = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080, frameRate: 30 },
        audio: true,
      });
      screenStreamRef.current = stream;
      setScreenStream(stream);
      stream.getVideoTracks()[0].onended = () => {
        screenStreamRef.current = null;
        setScreenStream(null);
        setSourceMode((prev) => (prev === "both" ? "camera" : null));
      };
      return stream;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (!msg.includes("aborted")) {
        toast({ title: "Screen access denied", description: msg, variant: "destructive" });
      }
      return null;
    }
  }, [toast]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: 30, facingMode: "user" },
        audio: false, // mic is handled separately
      });
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      return stream;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Camera access denied", description: msg, variant: "destructive" });
      return null;
    }
  }, [toast]);

  const selectSource = useCallback(async (mode: SourceMode) => {
    stopAllStreams();
    setPipSwapped(false);

    // Always acquire microphone first
    const mic = await acquireMicrophone();

    if (mode === "screen") {
      const s = await startScreen();
      if (s) setSourceMode("screen");
      else if (!mic) return;
    } else if (mode === "camera") {
      const c = await startCamera();
      if (c) setSourceMode("camera");
    } else if (mode === "both") {
      const s = await startScreen();
      if (!s) {
        const c = await startCamera();
        if (c) setSourceMode("camera");
        if (!mic) toast({ title: "⚠️ No Microphone", description: "Your students won't hear you!", variant: "destructive" });
        return;
      }
      const c = await startCamera();
      if (!c) {
        setSourceMode("screen");
        if (!mic) toast({ title: "⚠️ No Microphone", description: "Your students won't hear you!", variant: "destructive" });
        return;
      }
      // Set mode — the useEffect will attach streams to the always-mounted video elements
      setSourceMode("both");
    }

    if (!mic) {
      toast({ title: "⚠️ No Microphone", description: "Your students won't hear you! Fix microphone access above.", variant: "destructive" });
    }
  }, [stopAllStreams, acquireMicrophone, startScreen, startCamera, toast]);

  const toggleMute = () => {
    const allAudio = micStream?.getAudioTracks() || [];
    allAudio.forEach((t) => (t.enabled = !t.enabled));
    setIsMuted(!isMuted);
  };

  const toggleMicTest = useCallback(() => {
    if (micTestAudioRef.current) {
      // Stop test
      micTestAudioRef.current.el.pause();
      micTestAudioRef.current.source.disconnect();
      micTestAudioRef.current.ctx.close().catch(() => {});
      micTestAudioRef.current = null;
      setMicTesting(false);
      return;
    }
    if (!micStream) {
      toast({ title: "🎤 No Microphone", description: "Select a source first to enable the mic.", variant: "destructive" });
      return;
    }
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(micStream);
      const dest = ctx.createMediaStreamDestination();
      source.connect(dest);
      const el = new Audio();
      el.srcObject = dest.stream;
      el.play().catch(() => {});
      micTestAudioRef.current = { ctx, dest, source, el };
      setMicTesting(true);
      toast({ title: "🎧 Mic Test Active", description: "You should hear yourself. Click again to stop." });
    } catch {
      toast({ title: "Mic test failed", variant: "destructive" });
    }
  }, [micStream, toast]);

  // Stop mic test when streams change
  useEffect(() => {
    if (!micStream && micTestAudioRef.current) {
      micTestAudioRef.current.el.pause();
      micTestAudioRef.current.source.disconnect();
      micTestAudioRef.current.ctx.close().catch(() => {});
      micTestAudioRef.current = null;
      setMicTesting(false);
    }
  }, [micStream]);

  const toggleVideo = () => {
    const allTracks = [
      ...(screenStream?.getVideoTracks() || []),
      ...(cameraStream?.getVideoTracks() || []),
    ];
    allTracks.forEach((t) => (t.enabled = !t.enabled));
    setIsVideoOn(!isVideoOn);
  };

  const goLive = async () => {
    if (!selectedSession) return;
    setGoingLive(true);
    try {
      await connectPublisherRoom();
      await syncPublishedTracks();

      if (publishedTracksRef.current.size === 0) {
        throw new Error("Choose screen or camera before going live");
      }

      const { ok, result } = await callEdgeFn("go_live", { session_id: selectedSession });
      if (ok) {
        toast({ title: "🔴 You are now LIVE!", description: "Your stream is visible to students" });
        const { data } = await supabase
          .from("live_sessions")
          .select("id, title, status, room_name")
          .in("status", ["scheduled", "live"])
          .order("created_at", { ascending: false });
        setSessions(data || []);
      } else {
        toast({ title: "Failed to go live", description: result.error, variant: "destructive" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
    setGoingLive(false);
  };

  const endStream = async () => {
    if (!selectedSession) return;
    stopAllStreams();
    await disconnectPublisherRoom();
    const { ok, result } = await callEdgeFn("end", { session_id: selectedSession });
    if (ok) {
      toast({ title: "Stream ended" });
      navigate("/admin/live-sessions");
    } else {
      toast({ title: "Error ending stream", description: result.error, variant: "destructive" });
    }
  };

  const step1Done = !!selectedSession;
  const step2Done = isPreviewing;
  const readyToGoLive = step1Done && tokenReady && !tokenError && !isLive;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10" onClick={() => navigate("/admin/live-sessions")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                  <Tv className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Broadcast Studio</h1>
                  <p className="text-sm text-muted-foreground">Stream your class to students in real-time</p>
                </div>
              </div>
            </div>
            {isLive && (
              <Badge className="bg-red-500 text-white border-0 animate-pulse text-sm px-4 py-2 rounded-full font-bold shadow-lg shadow-red-500/30">
                <span className="mr-1.5 inline-block w-2 h-2 bg-white rounded-full animate-ping" />
                LIVE
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── Preview Area ─────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">
              {/* Video Preview */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                {/* Always mount video elements so refs are never null */}
                <video ref={mainVideoRef} autoPlay muted playsInline className={`w-full h-full object-contain ${isPreviewing ? "" : "hidden"}`} />
                {/* PIP overlay for "both" mode */}
                <div
                  className={`absolute bottom-4 right-4 w-[180px] aspect-video rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl backdrop-blur-sm cursor-pointer hover:border-primary hover:scale-105 transition-all group/pip ${isPreviewing && sourceMode === "both" ? "" : "hidden"}`}
                  onClick={() => setPipSwapped((prev) => !prev)}
                  title="Click to swap views"
                >
                  <video ref={pipVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover/pip:bg-black/30 transition-all flex items-center justify-center">
                    <Layers className="h-5 w-5 text-white opacity-0 group-hover/pip:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute bottom-1 left-1 right-1">
                    <Badge className="bg-black/60 text-white border-0 text-[10px] backdrop-blur-md rounded-full px-2 py-0.5 w-full text-center">
                      {pipSwapped ? "Screen" : "Camera"} · Click to swap
                    </Badge>
                  </div>
                </div>
                {isPreviewing && (
                  <>
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <Badge className="bg-black/60 text-white border-0 gap-1.5 text-xs backdrop-blur-md rounded-full px-3 py-1">
                        {sourceMode === "screen" && <><Monitor className="h-3 w-3" /> Screen Share</>}
                        {sourceMode === "camera" && <><Camera className="h-3 w-3" /> Camera</>}
                        {sourceMode === "both" && <><Layers className="h-3 w-3" /> Screen + Camera</>}
                      </Badge>
                      {micStream && !isMuted && (
                        <Badge className="bg-emerald-500/80 text-white border-0 gap-1 text-xs backdrop-blur-md rounded-full px-3 py-1">
                          <Mic className="h-3 w-3" /> Mic On
                          <div className="flex items-end gap-[2px] h-3 ml-1">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div key={i} className="w-[3px] rounded-full bg-white/80 transition-all duration-75" style={{ height: `${Math.max(3, micLevel > i * 20 ? Math.min(12, 3 + (micLevel - i * 20) * 0.45) : 3)}px` }} />
                            ))}
                          </div>
                        </Badge>
                      )}
                      {(!micStream || isMuted) && (
                        <Badge className="bg-red-500/80 text-white border-0 gap-1 text-xs backdrop-blur-md rounded-full px-3 py-1">
                          <MicOff className="h-3 w-3" /> {!micStream ? "No Mic" : "Muted"}
                        </Badge>
                      )}
                    </div>
                    {isLive && (
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-red-600 text-white text-xs font-bold rounded-full px-3 py-1.5 shadow-lg shadow-red-500/40 animate-pulse">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                          </span>
                          REC
                        </div>
                        <div className="bg-black/70 text-white text-xs font-mono font-bold rounded-full px-3 py-1.5 backdrop-blur-md tabular-nums tracking-wider">
                          {formatTimer(liveElapsed)}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {!isPreviewing && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/40 gap-4">
                    <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center">
                      <Tv className="h-12 w-12" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white/60">Choose what to broadcast</p>
                      <p className="text-sm text-white/30 mt-1">Screen, camera, or both together</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mic Error Banner */}
              {micError && (
                <Alert variant="destructive" className="rounded-2xl border-red-500/30 bg-red-500/10">
                  <MicOff className="h-4 w-4" />
                  <AlertTitle className="font-bold">Microphone Issue</AlertTitle>
                  <AlertDescription className="text-sm">{micError}</AlertDescription>
                  <Button size="sm" variant="outline" className="mt-2 rounded-xl" onClick={() => acquireMicrophone()}>
                    🎤 Retry Microphone
                  </Button>
                </Alert>
              )}

              {/* Control Bar */}
              <Card className="rounded-2xl border-border/50 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    {/* Source Buttons */}
                    <div className="flex items-center gap-1.5">
                      {([
                        { mode: "screen" as SourceMode, icon: Monitor, label: "Screen" },
                        { mode: "camera" as SourceMode, icon: Camera, label: "Camera" },
                        { mode: "both" as SourceMode, icon: Layers, label: "Both" },
                      ]).map(({ mode, icon: Icon, label }) => (
                        <Button
                          key={mode}
                          variant={sourceMode === mode ? "default" : "outline"}
                          size="sm"
                          className={`gap-1.5 rounded-xl text-xs font-semibold ${sourceMode === mode ? "shadow-md" : ""}`}
                          onClick={() => selectSource(mode)}
                        >
                          <Icon className="h-3.5 w-3.5" /> {label}
                        </Button>
                      ))}
                    </div>

                    {/* Media Controls */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`rounded-xl h-9 w-9 ${isMuted ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "hover:bg-accent"}`}
                        onClick={toggleMute}
                        disabled={!micStream}
                      >
                        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-xl h-9 gap-1.5 text-xs font-semibold ${micTesting ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" : "hover:bg-accent"}`}
                        onClick={toggleMicTest}
                        disabled={!micStream}
                        title="Listen to your mic through speakers"
                      >
                        <Headphones className="h-3.5 w-3.5" />
                        {micTesting ? "Stop Test" : "Test Mic"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`rounded-xl h-9 w-9 ${!isVideoOn ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "hover:bg-accent"}`}
                        onClick={toggleVideo}
                        disabled={!isPreviewing}
                      >
                        {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      </Button>
                      {isPreviewing && (
                        <Button variant="ghost" size="sm" className="rounded-xl text-xs text-muted-foreground hover:text-destructive" onClick={stopAllStreams}>
                          Stop
                        </Button>
                      )}
                    </div>

                    {/* Live Button */}
                    <div>
                      {!isLive ? (
                        <Button
                          className="gap-2 rounded-xl h-10 font-bold bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/20"
                          onClick={goLive}
                          disabled={!readyToGoLive || goingLive}
                        >
                          {goingLive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                          {goingLive ? "Starting..." : "Go Live"}
                        </Button>
                      ) : (
                        <Button variant="destructive" className="gap-2 rounded-xl h-10 font-bold" onClick={endStream}>
                          <Square className="h-4 w-4" /> End Stream
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ─── Right Panel ──────────────────────────────────────────── */}
            <div className="space-y-4">
              {/* Step 1: Session */}
              <Card className="rounded-2xl border-border/50 shadow-md overflow-hidden">
                <div className={`h-1 ${step1Done ? "bg-emerald-500" : "bg-muted"}`} />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    {step1Done ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">1</span>
                      </div>
                    )}
                    <h3 className="font-bold text-sm">Select Your Class</h3>
                  </div>
                  <Select value={selectedSession} onValueChange={setSelectedSession}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Choose a class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title} <span className="text-muted-foreground">({s.status})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sessions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No sessions found.{" "}
                      <button className="text-primary underline font-semibold" onClick={() => navigate("/admin/live-sessions")}>
                        Create one first
                      </button>
                    </p>
                  )}
                  {loadingToken && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying stream access...
                    </div>
                  )}
                  {tokenError && (
                    <Alert variant="destructive" className="rounded-xl">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{tokenError}</AlertDescription>
                    </Alert>
                  )}
                  {tokenReady && !tokenError && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Stream ready
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: Source */}
              <Card className="rounded-2xl border-border/50 shadow-md overflow-hidden">
                <div className={`h-1 ${step2Done ? "bg-emerald-500" : "bg-muted"}`} />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    {step2Done ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">2</span>
                      </div>
                    )}
                    <h3 className="font-bold text-sm">Choose What to Show</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pick how you want students to see your class.
                  </p>
                  {!isPreviewing && (
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { mode: "screen" as SourceMode, icon: Monitor, label: "Screen", desc: "Share your screen" },
                        { mode: "camera" as SourceMode, icon: Camera, label: "Camera", desc: "Show your face" },
                        { mode: "both" as SourceMode, icon: Layers, label: "Both", desc: "Screen + face" },
                      ]).map(({ mode, icon: Icon, label, desc }) => (
                        <button
                          key={mode}
                          className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group"
                          onClick={() => selectSource(mode)}
                        >
                          <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-bold">{label}</p>
                            <p className="text-[10px] text-muted-foreground">{desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {isPreviewing && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Preview active
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 3: Go Live */}
              <Card className={`rounded-2xl border-border/50 shadow-md overflow-hidden ${readyToGoLive && step2Done ? "ring-2 ring-red-500/30" : ""}`}>
                <div className={`h-1 ${isLive ? "bg-red-500" : "bg-muted"}`} />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    {isLive ? (
                      <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Radio className="h-4 w-4 text-red-500" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">3</span>
                      </div>
                    )}
                    <h3 className="font-bold text-sm">{isLive ? "You're Live!" : "Start Broadcasting"}</h3>
                  </div>

                  {!step2Done && !isLive && (
                    <p className="text-xs text-muted-foreground">
                      Complete Step 2 first — choose your video source above.
                    </p>
                  )}

                  {!isLive ? (
                    <Button
                      className="w-full gap-2 rounded-2xl h-14 font-bold text-lg bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/20 disabled:opacity-40 disabled:shadow-none"
                      onClick={goLive}
                      disabled={!readyToGoLive || goingLive || !step2Done}
                    >
                      {goingLive ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5" />}
                      {goingLive ? "Starting Live..." : "🔴 Go Live Now"}
                    </Button>
                  ) : (
                    <>
                      <Alert className="rounded-xl border-red-500/20 bg-red-500/5">
                        <Sparkles className="h-4 w-4 text-red-500" />
                        <AlertDescription className="text-xs text-red-600 font-medium">
                          Students can see your broadcast right now!
                        </AlertDescription>
                      </Alert>
                      <Button variant="destructive" className="w-full gap-2 rounded-2xl h-14 font-bold text-lg" onClick={endStream}>
                        <Square className="h-5 w-5" /> End Stream
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Facebook Simulcast */}
              {selectedSession && (
                <FacebookSimulcast sessionId={selectedSession} isLive={isLive} />
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
