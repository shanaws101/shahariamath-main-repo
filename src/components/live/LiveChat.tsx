import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Pin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  user_name: string;
  message: string;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
}

interface LiveChatProps {
  sessionId: string;
  isStaff?: boolean;
}

export function LiveChat({ sessionId, isStaff }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from("live_chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMessages(data);
    };
    loadMessages();
  }, [sessionId]);

  // Subscribe to realtime
  useEffect(() => {
    const channel = supabase
      .channel(`live-chat-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === (payload.new as ChatMessage).id ? (payload.new as ChatMessage) : m))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "live_chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("live_chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      user_name: profile?.full_name || "Student",
      message: newMessage.trim(),
    });
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    }
    setNewMessage("");
    setSending(false);
  };

  const togglePin = async (msgId: string, currentPin: boolean) => {
    await supabase
      .from("live_chat_messages")
      .update({ is_pinned: !currentPin })
      .eq("id", msgId);
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from("live_chat_messages").delete().eq("id", msgId);
  };

  const pinnedMessages = messages.filter((m) => m.is_pinned);

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-bold text-sm text-foreground">💬 Live Chat</h3>
      </div>

      {pinnedMessages.length > 0 && (
        <div className="px-3 py-2 bg-primary/5 border-b border-border space-y-1">
          {pinnedMessages.map((m) => (
            <div key={m.id} className="flex items-start gap-2 text-xs">
              <Pin className="h-3 w-3 text-primary shrink-0 mt-0.5" />
              <span className="text-foreground">
                <strong>{m.user_name}:</strong> {m.message}
              </span>
            </div>
          ))}
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`group text-sm ${msg.user_id === user?.id ? "text-right" : ""}`}
          >
            <div
              className={`inline-block max-w-[85%] px-3 py-1.5 rounded-xl ${
                msg.user_id === user?.id
                  ? "bg-primary/10 text-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <span className="font-semibold text-xs text-primary">{msg.user_name}</span>
              <p className="text-sm break-words">{msg.message}</p>
            </div>
            {isStaff && (
              <div className="hidden group-hover:flex items-center gap-1 mt-0.5 justify-end">
                <button
                  onClick={() => togglePin(msg.id, msg.is_pinned)}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  {msg.is_pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {user ? (
        <div className="p-3 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 h-10 rounded-xl"
              maxLength={500}
              disabled={sending}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-xl"
              disabled={!newMessage.trim() || sending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="p-3 border-t border-border text-center text-sm text-muted-foreground">
          Log in to chat
        </div>
      )}
    </div>
  );
}
