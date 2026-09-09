import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { Radio, Loader2 } from "lucide-react";

interface LivePlayerProps {
  sessionId: string;
  title?: string;
  isLive?: boolean;
}

function VideoRenderer() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: true,
  });

  const screenTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare
  );
  // There may be multiple camera tracks from different participants (laptop vs phone)
  const cameraTracks = tracks.filter(
    (t) => t.source === Track.Source.Camera
  );
  const primaryCamera = cameraTracks[0];

  // If we have screen + camera, show PiP layout
  const hasScreen = !!screenTrack;
  const hasCamera = !!primaryCamera;

  if (!hasScreen && !hasCamera) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-2" />
          <p className="text-sm">Waiting for stream...</p>
        </div>
      </div>
    );
  }

  // Screen + Camera PiP
  if (hasScreen && hasCamera) {
    return (
      <div className="relative w-full h-full">
        <VideoTrack
          trackRef={screenTrack}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
        <div className="absolute bottom-3 right-3 w-[120px] sm:w-[160px] md:w-[200px] aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black z-10">
          <VideoTrack
            trackRef={primaryCamera}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>
    );
  }

  // Single track (screen or camera only)
  const activeTrack = screenTrack || primaryCamera;
  return (
    <VideoTrack
      trackRef={activeTrack!}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}

export function LivePlayer({ sessionId, title: _title, isLive }: LivePlayerProps) {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livekit-token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authSession?.access_token}`,
            },
            body: JSON.stringify({
              action: "get_token",
              session_id: sessionId,
              is_publisher: false,
            }),
          }
        );
        const result = await res.json();
        if (!res.ok) {
          setError(result.error || "Failed to get stream access");
          return;
        }
        setToken(result.token);
        setWsUrl(result.ws_url);
      } catch {
        setError("Could not connect to the streaming service");
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-xl flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-xl flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Radio className="h-12 w-12 mx-auto mb-3" />
          <p className="font-medium">{error || "Stream not available"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-xl">
      {isLive && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full animate-pulse">
          <span className="w-2 h-2 bg-destructive-foreground rounded-full" />
          LIVE
        </div>
      )}
      <LiveKitRoom
        serverUrl={wsUrl}
        token={token}
        connect={true}
        audio={false}
        video={false}
        style={{ width: "100%", height: "100%" }}
      >
        <VideoRenderer />
      </LiveKitRoom>
      <div
        className="absolute inset-0 z-[1]"
        onContextMenu={(e) => e.preventDefault()}
        style={{ pointerEvents: "auto", background: "transparent" }}
      />
    </div>
  );
}
