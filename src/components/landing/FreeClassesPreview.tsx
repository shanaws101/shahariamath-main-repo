import { SecureVideoPlayer } from "@/components/video/SecureYouTubePlayer";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useCmsContent } from '@/hooks/useCmsContent';

interface FreeVideo {
  id: string;
  title: string;
  title_bn: string | null;
  youtube_url: string;
  thumbnail_url: string | null;
  created_at: string;
  subjects: { name: string; name_bn: string } | null;
}

const getThumbnail = (video: FreeVideo) => {
  if (video.thumbnail_url) return video.thumbnail_url;
  return '';
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString('en-US', { weekday: 'long' });
  const date = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day}, ${date} at ${time}`;
};

function VideoCard({ video, isEnglish, onPlay }: { video: FreeVideo; isEnglish: boolean; onPlay: () => void }) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-500">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted cursor-pointer" onClick={onPlay}>
        {getThumbnail(video) ? (
          <img
            src={getThumbnail(video)}
            alt={isEnglish ? video.title : (video.title_bn || video.title)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <Play className="h-12 w-12 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center group-hover:bg-foreground/40 transition-colors">
          <div className="w-12 h-12 rounded-full btn-brand flex items-center justify-center shadow-lg">
            <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2.5">
        {video.subjects && (
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {isEnglish ? video.subjects.name : video.subjects.name_bn}
          </span>
        )}

        <h3 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {isEnglish ? video.title : (video.title_bn || video.title)}
        </h3>

        <p className="text-xs text-muted-foreground italic">
          {isEnglish ? 'Free Live Demo Class has been held' : 'ফ্রি লাইভ ডেমো ক্লাস অনুষ্ঠিত হয়েছে'}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="line-clamp-1">{formatDate(video.created_at)}</span>
        </div>

        <Button
          size="sm"
          className="w-full mt-1 bg-foreground text-background hover:bg-foreground/90 font-bold text-xs rounded-lg"
          onClick={onPlay}
        >
          <Play className="h-3.5 w-3.5 mr-1" />
          {isEnglish ? 'WATCH' : 'দেখুন'}
        </Button>
      </div>
    </div>
  );
}

export function FreeClassesPreview() {
  const { isEnglish } = useLanguage();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<FreeVideo[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const cms = useCmsContent('free_classes', {
    heading: 'Our Free Recorded Classes',
    heading_bn: 'আমাদের ফ্রি রেকর্ডকৃত ক্লাস',
    subheading: 'Recorded videos of previous free live courses and live demo classes',
    subheading_bn: 'পূর্ববর্তী ফ্রি লাইভ কোর্স এবং লাইভ ডেমো ক্লাসের রেকর্ডকৃত ভিডিও',
  });

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase
        .from('free_videos')
        .select('id, title, title_bn, youtube_url, thumbnail_url, created_at, subjects(name, name_bn)')
        .eq('is_visible', true)
        .order('display_order', { ascending: true })
        .limit(8);
      if (data) setVideos(data as any);
    };
    fetchVideos();
  }, []);

  return (
    <>
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-brand-subtle opacity-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5">
              <Play className="h-3.5 w-3.5" />
              {isEnglish ? 'Recorded Classes' : 'রেকর্ডকৃত ক্লাস'}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">{isEnglish ? cms.heading : cms.heading_bn}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {isEnglish ? cms.subheading : cms.subheading_bn}
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                isEnglish={isEnglish}
                onPlay={() => setActiveVideo(video.youtube_url)}
              />
            ))}
          </div>

          {videos.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {isEnglish ? 'No recorded classes available yet.' : 'এখনো কোনো রেকর্ডকৃত ক্লাস নেই।'}
            </p>
          )}

          {/* CTA */}
          <div className="text-center mt-12">
            <Button
              size="lg"
              className="btn-brand gap-2 text-base h-12 px-8 rounded-xl"
              onClick={() => navigate('/free-classes')}
            >
              {isEnglish ? 'See All Free Classes' : 'সব ফ্রি ক্লাস দেখুন'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div className="relative w-full max-w-3xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute -top-10 right-0 text-background hover:text-background/80 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <SecureVideoPlayer url={activeVideo} title="Free class" className="rounded-xl overflow-hidden" />
          </div>
        </div>
      )}
    </>
  );
}
