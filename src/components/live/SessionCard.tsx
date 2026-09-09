import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Radio, Clock, Users, PlayCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface SessionCardProps {
  session: {
    id: string;
    title: string;
    title_bn?: string | null;
    description?: string | null;
    description_bn?: string | null;
    status: string;
    scheduled_start?: string | null;
    actual_start?: string | null;
    viewer_count: number;
    is_free: boolean;
    thumbnail_url?: string | null;
    subjects?: { name: string; name_bn: string } | null;
  };
}

export function SessionCard({ session }: SessionCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isBn = language === "bn";

  const title = isBn && session.title_bn ? session.title_bn : session.title;
  const description = isBn && session.description_bn ? session.description_bn : session.description;

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Radio }> = {
    live: { label: "🔴 LIVE NOW", color: "bg-destructive text-destructive-foreground", icon: Radio },
    scheduled: { label: "Upcoming", color: "bg-amber-500/10 text-amber-600", icon: Clock },
    ended: { label: "Ended", color: "bg-muted text-muted-foreground", icon: PlayCircle },
    cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive", icon: Clock },
  };

  const status = statusConfig[session.status] || statusConfig.scheduled;

  return (
    <Card className="overflow-hidden rounded-2xl border border-border hover:shadow-lg transition-all group cursor-pointer"
      onClick={() => navigate(`/watch/${session.id}`)}
    >
      <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5">
        {session.thumbnail_url ? (
          <img src={session.thumbnail_url} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Radio className="h-12 w-12 text-primary/30" />
          </div>
        )}
        <Badge className={`absolute top-3 left-3 ${status.color} border-0 font-bold text-xs`}>
          {status.label}
        </Badge>
        {session.is_free && (
          <Badge className="absolute top-3 right-3 bg-emerald-500 text-white border-0 text-xs">
            FREE
          </Badge>
        )}
        {session.status === "live" && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            <Users className="h-3 w-3" />
            {session.viewer_count}
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{description}</p>
        )}
        {session.scheduled_start && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(session.scheduled_start), "MMM d, yyyy · h:mm a")}
          </p>
        )}
        <Button
          className="w-full mt-3 h-12 rounded-xl font-bold"
          variant={session.status === "live" ? "default" : "outline"}
        >
          {session.status === "live" ? "Watch Now" : session.status === "scheduled" ? "Set Reminder" : "Watch Replay"}
        </Button>
      </CardContent>
    </Card>
  );
}
