import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Play, Calendar, Clock, Users, BookOpen, Info, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SecureVideoPlayer } from "@/components/video/SecureYouTubePlayer";

interface FreeVideo {
  id: string; title: string; title_bn: string | null;
  description: string | null; description_bn: string | null;
  youtube_url: string; thumbnail_url: string | null;
  subject: { name: string; name_bn: string } | null;
}

interface FreeClass {
  id: string; title: string; title_bn: string | null;
  scheduled_date: string; start_time: string; end_time: string;
  status: 'upcoming' | 'live' | 'finished' | 'cancelled';
  stream_url: string | null;
  subject: { name: string; name_bn: string } | null;
}

export default function FreeClassesPage() {
  const { isEnglish } = useLanguage();
  const { profile } = useAuth();
  const [videos, setVideos] = useState<FreeVideo[]>([]);
  const [classes, setClasses] = useState<FreeClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const hasAcademicProfile = Boolean(profile?.department && profile?.year);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      const department = profile?.department ?? null;
      const year = profile?.year ?? null;
      if (!department || !year) { setVideos([]); setClasses([]); setIsLoading(false); return; }
      const today = new Date().toISOString().split('T')[0];
      const [{ data: videosData }, { data: classesData }] = await Promise.all([
        supabase.from('free_videos').select(`*, subject:subjects(name, name_bn)`).eq('is_visible', true).eq('department', department).contains('compatible_years', [year]).order('display_order'),
        supabase.from('class_schedules').select(`*, subject:subjects(name, name_bn)`).eq('is_free', true).eq('department', department).contains('target_years', [year]).gte('scheduled_date', today).in('status', ['upcoming', 'live']).order('scheduled_date', { ascending: true }).order('start_time', { ascending: true }),
      ]);
      setVideos((videosData ?? []) as unknown as FreeVideo[]);
      setClasses((classesData ?? []) as unknown as FreeClass[]);
      setIsLoading(false);
    };
    fetchContent();
  }, [profile?.department, profile?.year]);


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">
            {isEnglish ? "Free Classes" : "ফ্রি ক্লাস"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEnglish ? "Watch pre-recorded classes and check upcoming free sessions" : "প্রি-রেকর্ডেড ক্লাস দেখুন এবং আসন্ন ফ্রি সেশন দেখুন"}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-border bg-card animate-pulse p-6">
                <div className="h-40 bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Upcoming Free Classes */}
            {classes.length > 0 && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-4 md:p-5 border-b border-border">
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {isEnglish ? "Upcoming Free Live Classes" : "আসন্ন ফ্রি লাইভ ক্লাস"}
                  </h2>
                </div>
                <div className="p-4 md:p-5 space-y-2">
                  {classes.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Video className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{isEnglish ? cls.title : (cls.title_bn || cls.title)}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(cls.scheduled_date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{cls.start_time} - {cls.end_time}</span>
                            {cls.subject && <Badge variant="outline" className="text-[10px] rounded-md">{isEnglish ? cls.subject.name : cls.subject.name_bn}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cls.status === 'live' ? (
                          <>
                            <Badge className="bg-red-500 animate-pulse text-[10px]">LIVE</Badge>
                            {cls.stream_url && (
                              <Button size="sm" asChild className="h-8 rounded-xl text-xs">
                                <a href={cls.stream_url} target="_blank" rel="noopener noreferrer">
                                  <Play className="h-3 w-3 mr-1" />{isEnglish ? "Watch" : "দেখুন"}
                                </a>
                              </Button>
                            )}
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">{isEnglish ? "Upcoming" : "আসন্ন"}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground text-center pt-2 flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    {isEnglish ? "Live classes are conducted on Facebook Groups" : "লাইভ ক্লাস ফেসবুক গ্রুপে পরিচালিত হয়"}
                  </p>
                </div>
              </div>
            )}

            {/* Pre-recorded Videos */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-4 md:p-5 border-b border-border">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  {isEnglish ? "Pre-recorded Classes" : "প্রি-রেকর্ডেড ক্লাস"}
                </h2>
              </div>
              <div className="p-4 md:p-5">
                {videos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {videos.map(video => (
                      <div key={video.id} className="rounded-xl border border-border overflow-hidden bg-card hover:shadow-md transition-all group">
                        <button type="button" onClick={() => setActiveVideo(video.youtube_url)} className="block relative w-full text-left">
                          <div className="aspect-video bg-muted">
                            {video.thumbnail_url ? (
                              <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                <Video className="h-10 w-10 text-primary/30" />
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><Play className="h-5 w-5 text-primary ml-0.5" /></div>
                          </div>
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="gap-1 text-[10px] rounded-md"><Video className="h-2.5 w-2.5" />{isEnglish ? "Free" : "ফ্রি"}</Badge>
                          </div>
                        </button>
                        <div className="p-3">
                          <h4 className="font-semibold line-clamp-2 text-sm">{isEnglish ? video.title : (video.title_bn || video.title)}</h4>
                          {video.subject && <Badge variant="outline" className="mt-1.5 text-[10px] rounded-md">{isEnglish ? video.subject.name : video.subject.name_bn}</Badge>}
                          <Button size="sm" variant="ghost" className="w-full mt-2 gap-1.5 text-xs h-8 rounded-xl" onClick={() => setActiveVideo(video.youtube_url)}>
                            <Play className="h-3 w-3" />{isEnglish ? "Watch Now" : "এখন দেখুন"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <BookOpen className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center max-w-xs">
                      {hasAcademicProfile
                        ? (isEnglish ? "No pre-recorded classes available for your department and year" : "আপনার বিভাগ ও বর্ষের জন্য কোনো প্রি-রেকর্ডেড ক্লাস নেই")
                        : (isEnglish ? "Complete your profile (department + year) in Settings to view classes" : "ক্লাস দেখতে সেটিংস থেকে বিভাগ ও বর্ষ পূরণ করুন")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Card */}
            <div className="rounded-2xl border border-blue-200/50 bg-blue-50/50 dark:bg-blue-950/20 p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-blue-700 dark:text-blue-400 mb-1">{isEnglish ? "About Our Classes" : "আমাদের ক্লাস সম্পর্কে"}</p>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400 text-xs">
                    <li>{isEnglish ? "Pre-recorded videos are available here" : "প্রি-রেকর্ডেড ভিডিও এখানে উপলব্ধ"}</li>
                    <li>{isEnglish ? "Live classes are on Facebook Groups" : "লাইভ ক্লাস ফেসবুক গ্রুপে হয়"}</li>
                    <li>{isEnglish ? "Free live classes are announced in advance" : "ফ্রি লাইভ ক্লাস আগে থেকে ঘোষণা করা হয়"}</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
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
      </div>
    </DashboardLayout>
  );
}
