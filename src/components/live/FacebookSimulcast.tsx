import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Play, Square, Loader2, Info, CheckCircle2, HelpCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

interface FacebookSimulcastProps {
  sessionId: string;
  isLive: boolean;
}

export function FacebookSimulcast({ sessionId, isLive }: FacebookSimulcastProps) {
  const [rtmpUrl, setRtmpUrl] = useState("rtmp://live-api-s.facebook.com:443/rtmp");
  const [streamKey, setStreamKey] = useState("");
  const [egressId, setEgressId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const isStreaming = !!egressId;

  const startSimulcast = async () => {
    if (!rtmpUrl.trim() || !streamKey.trim()) {
      setError("Both RTMP Server URL and Stream Key are required");
      return;
    }

    const fullRtmpUrl = `${rtmpUrl.replace(/\/$/, "")}/${streamKey}`;

    setLoading(true);
    setError("");

    try {
      const { ok, result } = await callEdgeFn("start_egress", {
        session_id: sessionId,
        rtmp_url: fullRtmpUrl,
      });

      if (ok) {
        setEgressId(result.egress_id);
      } else {
        setError(result.error || "Failed to start Facebook simulcast");
      }
    } catch {
      setError("Could not reach the streaming backend");
    } finally {
      setLoading(false);
    }
  };

  const stopSimulcast = async () => {
    if (!egressId) return;
    setLoading(true);
    setError("");

    try {
      const { ok, result } = await callEdgeFn("stop_egress", { egress_id: egressId });
      if (ok) {
        setEgressId(null);
      } else {
        setError(result.error || "Failed to stop simulcast");
      }
    } catch {
      setError("Could not reach the streaming backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4 text-[#1877F2]" />
            <h4 className="text-sm font-bold text-foreground">
              Step 4: Facebook Live (Optional)
            </h4>
          </div>
          {isStreaming && (
            <Badge className="bg-[#1877F2] text-white border-0 text-xs animate-pulse">
              LIVE on FB
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Stream your class to Facebook Live at the same time so students can watch on Facebook too.
        </p>

        {!isLive && (
          <Alert className="rounded-xl border-border bg-muted/30">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              First complete Step 3 (Go Live) above. After you're live, come back here to also stream on Facebook.
            </AlertDescription>
          </Alert>
        )}

        {isLive && !isStreaming && (
          <>
            {/* How-to guide */}
            <Collapsible open={showHelp} onOpenChange={setShowHelp}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs text-[#1877F2] hover:text-[#1664d9] p-0 h-auto">
                  <HelpCircle className="h-3.5 w-3.5" />
                  {showHelp ? "Hide instructions" : "How do I find my Facebook Stream Key?"}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Alert className="rounded-xl border-[#1877F2]/20 bg-[#1877F2]/5 mt-2">
                  <AlertTitle className="text-xs font-bold">How to get your Facebook Stream Key:</AlertTitle>
                  <AlertDescription className="text-xs space-y-2 mt-2">
                    <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                      <li>Go to your <strong>Facebook Page</strong> on a computer</li>
                      <li>Click <strong>"Live Video"</strong> button (or go to facebook.com/live/producer)</li>
                      <li>Select <strong>"Streaming Software"</strong> option</li>
                      <li>You'll see two things:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                          <li><strong>Server URL</strong> — already filled in below for you</li>
                          <li><strong>Stream Key</strong> — copy this and paste it below</li>
                        </ul>
                      </li>
                      <li>Come back here and paste the <strong>Stream Key</strong></li>
                      <li>Click <strong>"Start Facebook Simulcast"</strong></li>
                    </ol>
                    <p className="text-[10px] text-muted-foreground/70 mt-2 pt-2 border-t border-border">
                      💡 Tip: The Server URL is pre-filled. You usually only need to paste the Stream Key.
                    </p>
                  </AlertDescription>
                </Alert>
              </CollapsibleContent>
            </Collapsible>

            <div className="space-y-2">
              <Label className="text-xs">Server URL (pre-filled for Facebook)</Label>
              <Input
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                placeholder="rtmp://live-api-s.facebook.com:443/rtmp"
                className="rounded-xl text-xs h-9 font-mono"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Stream Key (from Facebook)</Label>
              <Input
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="Paste your Facebook stream key here"
                className="rounded-xl text-xs h-9"
                type="password"
                disabled={loading}
              />
            </div>
            <Button
              size="sm"
              className="w-full gap-2 rounded-xl h-10 font-bold bg-[#1877F2] hover:bg-[#1664d9] text-white"
              onClick={startSimulcast}
              disabled={loading || !rtmpUrl.trim() || !streamKey.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {loading ? "Starting..." : "Start Facebook Simulcast"}
            </Button>
          </>
        )}

        {isStreaming && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              ✅ Your class is now also live on Facebook!
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="w-full gap-2 rounded-xl h-10 font-bold"
              onClick={stopSimulcast}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {loading ? "Stopping..." : "Stop Facebook Simulcast"}
            </Button>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
