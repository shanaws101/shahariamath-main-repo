import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { SecureVideoPlayer } from "@/components/video/SecureYouTubePlayer";

interface FreeClass {
  id: string;
  title: string;
  title_bn: string | null;
  scheduled_date: string;
  start_time: string;
  status: string;
}

interface FreeVideo {
  id: string;
  title: string;
  title_bn: string | null;
  youtube_url: string;
  thumbnail_url: string | null;
}

export function FreeClassesWidget() {
  const { isEnglish } = useLanguage();
  const [upcomingClasses, setUpcomingClasses] = useState<FreeClass[]>([]);
  const [freeVideos, setFreeVideos] = useState<FreeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch upcoming free classes
      const { data: classData } = await supabase
        .from('class_schedules')
        .select('id, title, title_bn, scheduled_date, start_time, status')
        .eq('is_free', true)
        .gte('scheduled_date', today)
        .in('status', ['upcoming', 'live'])
        .order('scheduled_date', { ascending: true })
        .limit(3);

      if (classData) {
        setUpcomingClasses(classData);
      }

      // Fetch free videos
      const { data: videoData } = await supabase
        .from('free_videos')
        .select('id, title, title_bn, youtube_url, thumbnail_url')
        .eq('is_visible', true)
        .order('display_order', { ascending: true })
        .limit(4);

      if (videoData) {
        setFreeVideos(videoData);
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  const getVideoThumbnail = (_url: string) => null;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-1/3" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            {isEnglish ? "Free Learning Resources" : "বিনামূল্যে শেখার সম্পদ"}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/free-classes">
              {isEnglish ? "View All" : "সব দেখুন"}
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upcoming Free Live Classes */}
        {upcomingClasses.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {isEnglish ? "Upcoming Live Classes" : "আসন্ন লাইভ ক্লাস"}
            </p>
            {upcomingClasses.map(cls => (
              <div 
                key={cls.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Play className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {isEnglish ? cls.title : (cls.title_bn || cls.title)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(cls.scheduled_date).toLocaleDateString()}
                      <Clock className="h-3 w-3 ml-1" />
                      {cls.start_time}
                    </div>
                  </div>
                </div>
                {cls.status === 'live' ? (
                  <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {isEnglish ? "FREE" : "ফ্রি"}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Free Recorded Videos */}
        {freeVideos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {isEnglish ? "Recorded Classes" : "রেকর্ডকৃত ক্লাস"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {freeVideos.map(video => {
                const thumbnail = video.thumbnail_url || getVideoThumbnail(video.youtube_url);
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setActiveVideo(video.youtube_url)}
                    className="group relative aspect-video rounded-lg overflow-hidden border bg-muted hover:ring-2 ring-primary transition-all text-left"
                  >
                    {thumbnail ? (
                      <img 
                        src={thumbnail} 
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white text-xs font-medium line-clamp-2">
                        {isEnglish ? video.title : (video.title_bn || video.title)}
                      </p>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="h-5 w-5 text-primary ml-0.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {upcomingClasses.length === 0 && freeVideos.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {isEnglish ? "No free content available right now" : "এখন কোনো বিনামূল্যে কন্টেন্ট নেই"}
            </p>
          </div>
        )}

        {activeVideo && (
          <div
            className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4"
            onClick={() => setActiveVideo(null)}
          >
            <div className="relative w-full max-w-3xl aspect-video" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="absolute -top-10 right-0 text-background hover:text-background/80 transition-colors"
                aria-label="Close video"
              >
                <X className="h-6 w-6" />
              </button>
              <SecureVideoPlayer url={activeVideo} title="Free class" className="rounded-xl overflow-hidden" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
