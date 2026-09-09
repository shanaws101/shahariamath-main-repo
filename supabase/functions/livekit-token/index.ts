import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errRes(message: string, status = 500) {
  return jsonRes({ error: message }, status);
}

import { AccessToken } from "npm:livekit-server-sdk";

// Helper: get LiveKit HTTP API base URL from WS URL
function getLivekitHttpUrl(wsUrl: string): string {
  // wss://xxx.livekit.cloud -> https://xxx.livekit.cloud
  return wsUrl.replace("wss://", "https://").replace("ws://", "http://");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errRes("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return errRes("Unauthorized", 401);

    const { action, ...params } = await req.json();

    const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY");
    const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");
    const LIVEKIT_WS_URL = Deno.env.get("LIVEKIT_WS_URL");

    switch (action) {
      case "create_session": {
        const { data: canManage } = await supabase.rpc("can_manage", {
          _permission: "can_manage_subjects",
        });
        if (!canManage) return errRes("Forbidden", 403);

        const roomName = `live-${crypto.randomUUID().slice(0, 8)}`;

        const { data: session, error: dbError } = await supabase
          .from("live_sessions")
          .insert({
            title: (params.title as string) || "Untitled Session",
            title_bn: (params.title_bn as string) || null,
            description: (params.description as string) || null,
            subject_id: (params.subject_id as string) || null,
            scheduled_start: (params.scheduled_start as string) || null,
            is_free: (params.is_free as boolean) ?? false,
            thumbnail_url: (params.thumbnail_url as string) || null,
            room_name: roomName,
            created_by: user.id,
            status: "scheduled",
          })
          .select()
          .single();

        if (dbError) {
          console.error("DB insert error:", dbError);
          throw new Error("Failed to save session");
        }

        return jsonRes({ session, room_name: roomName });
      }

      case "get_token": {
        if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
          return errRes("LiveKit credentials not configured.", 500);
        }

        const { session_id, is_publisher, device_role } = params;
        if (!session_id) return errRes("session_id required", 400);

        const { data: session } = await supabase
          .from("live_sessions")
          .select("room_name, is_free, subject_id, status")
          .eq("id", session_id)
          .single();

        if (!session) return errRes("Session not found", 404);

        const roomName = session.room_name;
        if (!roomName) return errRes("No room configured for this session", 400);

        const canPublish = !!is_publisher;
        if (canPublish) {
          const { data: canManage } = await supabase.rpc("can_manage", {
            _permission: "can_manage_subjects",
          });
          if (!canManage) return errRes("Not authorized to publish", 403);
        } else {
          if (!session.is_free) {
            if (session.subject_id) {
              const { data: enrollment } = await supabase
                .from("enrollments")
                .select("id")
                .eq("user_id", user.id)
                .eq("subject_id", session.subject_id)
                .eq("payment_status", "completed")
                .maybeSingle();

              const { data: isAdmin } = await supabase.rpc("can_manage", {
                _permission: "can_manage_subjects",
              });
              if (!enrollment && !isAdmin) {
                return errRes("Enrollment required", 403);
              }
            }
          }
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        const participantName = profile?.full_name || "User";
        // For multi-device broadcasting, append device_role to make identity unique
        const suffix = device_role === "camera" ? "-camera" : "";
        const identity = user.id + suffix;
        const displayName = device_role === "camera" ? `${participantName} (Camera)` : participantName;
        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
          identity: identity,
          name: displayName,
          ttl: 3600,
        });
        at.addGrant({
          roomJoin: true,
          room: roomName,
          canPublish: canPublish,
          canSubscribe: true,
          canPublishData: true,
        });
        const token = await at.toJwt();

        return jsonRes({
          token,
          ws_url: LIVEKIT_WS_URL || "wss://your-livekit-instance.livekit.cloud",
          room_name: roomName,
        });
      }

      case "go_live": {
        const { data: canManage } = await supabase.rpc("can_manage", {
          _permission: "can_manage_subjects",
        });
        if (!canManage) return errRes("Forbidden", 403);

        const { session_id } = params;
        if (!session_id) return errRes("session_id required", 400);

        const { error } = await supabase
          .from("live_sessions")
          .update({ status: "live", actual_start: new Date().toISOString() })
          .eq("id", session_id);

        if (error) throw error;
        return jsonRes({ success: true });
      }

      case "end": {
        const { data: canManage } = await supabase.rpc("can_manage", {
          _permission: "can_manage_subjects",
        });
        if (!canManage) return errRes("Forbidden", 403);

        const { session_id } = params;
        if (!session_id) return errRes("session_id required", 400);

        const { error } = await supabase
          .from("live_sessions")
          .update({ status: "ended", actual_end: new Date().toISOString() })
          .eq("id", session_id);

        if (error) throw error;
        return jsonRes({ success: true });
      }

      case "delete": {
        const { data: canManage } = await supabase.rpc("can_manage", {
          _permission: "can_manage_subjects",
        });
        if (!canManage) return errRes("Forbidden", 403);

        const { session_id } = params;
        if (!session_id) return errRes("session_id required", 400);

        const { error } = await supabase
          .from("live_sessions")
          .delete()
          .eq("id", session_id);

        if (error) throw error;
        return jsonRes({ success: true });
      }

      // ─── RTMP Egress (Facebook Simulcast) ───────────────────────
      case "start_egress": {
        const { data: canManage } = await supabase.rpc("can_manage", {
          _permission: "can_manage_subjects",
        });
        if (!canManage) return errRes("Forbidden", 403);

        if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_WS_URL) {
          return errRes("LiveKit credentials not configured", 500);
        }

        const { session_id, rtmp_url } = params;
        if (!session_id) return errRes("session_id required", 400);
        if (!rtmp_url || typeof rtmp_url !== "string" || !rtmp_url.startsWith("rtmp")) {
          return errRes("A valid RTMP URL is required (e.g. rtmp://live-api-s.facebook.com:443/rtmp/STREAM_KEY)", 400);
        }

        // Get the room name for this session
        const { data: session } = await supabase
          .from("live_sessions")
          .select("room_name, status")
          .eq("id", session_id)
          .single();

        if (!session) return errRes("Session not found", 404);
        if (session.status !== "live") return errRes("Session must be live first", 400);

        const roomName = session.room_name;
        if (!roomName) return errRes("No room for this session", 400);

        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { ttl: 600 });
        at.addGrant({ roomRecord: true });
        const apiToken = await at.toJwt();

        const httpUrl = getLivekitHttpUrl(LIVEKIT_WS_URL);

        // Start Room Composite Egress with RTMP output
        const egressRes = await fetch(
          `${httpUrl}/twirp/livekit.Egress/StartRoomCompositeEgress`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiToken}`,
            },
            body: JSON.stringify({
              room_name: roomName,
              layout: "speaker",
              stream_outputs: [
                {
                  protocol: 0, // RTMP
                  urls: [rtmp_url],
                },
              ],
            }),
          }
        );

        const egressData = await egressRes.json();
        if (!egressRes.ok) {
          console.error("Egress API error:", egressData);
          return errRes(egressData?.message || "Failed to start RTMP egress", egressRes.status);
        }

        console.log("Egress started:", egressData.egress_id);
        return jsonRes({ success: true, egress_id: egressData.egress_id });
      }

      case "stop_egress": {
        const { data: canManage } = await supabase.rpc("can_manage", {
          _permission: "can_manage_subjects",
        });
        if (!canManage) return errRes("Forbidden", 403);

        if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_WS_URL) {
          return errRes("LiveKit credentials not configured", 500);
        }

        const { egress_id } = params;
        if (!egress_id || typeof egress_id !== "string") {
          return errRes("egress_id required", 400);
        }

        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { ttl: 600 });
        at.addGrant({ roomRecord: true });
        const apiToken = await at.toJwt();

        const httpUrl = getLivekitHttpUrl(LIVEKIT_WS_URL);

        const stopRes = await fetch(
          `${httpUrl}/twirp/livekit.Egress/StopEgress`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiToken}`,
            },
            body: JSON.stringify({ egress_id }),
          }
        );

        const stopData = await stopRes.json();
        if (!stopRes.ok) {
          console.error("Stop egress error:", stopData);
          return errRes(stopData?.message || "Failed to stop egress", stopRes.status);
        }

        return jsonRes({ success: true });
      }

      default:
        return errRes(`Unknown action: ${action}`, 400);
    }
  } catch (error) {
    console.error("livekit-token error:", error);
    return errRes(error instanceof Error ? error.message : "Internal server error");
  }
});
