import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Settings, Filter, Video, Sparkles, GraduationCap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SecureVideoPlayer } from '@/components/video/SecureYouTubePlayer';

interface FreeVideo {
  id: string; title: string; title_bn: string | null;
  description: string | null; description_bn: string | null;
  youtube_url: string; thumbnail_url: string | null;
  department: string | null; compatible_years: number[] | null;
  subjects: { name: string; name_bn: string } | null;
}

const DEPT_LABELS: Record<string, { en: string; bn: string }> = {
  management: { en: 'Management', bn: 'ম্যানেজমেন্ট' },
  marketing: { en: 'Marketing', bn: 'মার্কেটিং' },
  accounting: { en: 'Accounting', bn: 'একাউন্টিং' },
  finance: { en: 'Finance', bn: 'ফাইন্যান্স' },
  economics: { en: 'Economics', bn: 'ইকোনমিক্স' },
};

export default function FreeClassesPublicPage() {
  const { isEnglish } = useLanguage();
  const { user, profile } = useAuth();
  const [videos, setVideos] = useState<FreeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const isLocked = !!user && !!profile?.department;
  const effectiveDept = isLocked ? profile.department! : (selectedDept !== 'all' ? selectedDept : null);

  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('free_videos').select('*, subjects(name, name_bn)')
        .eq('is_visible', true).order('display_order', { ascending: true });
      if (data) setVideos(data as any);
      setIsLoading(false);
    };
    fetchVideos();
  }, []);

  const filtered = useMemo(() => {
    return videos.filter((v) => {
      if (effectiveDept && v.department !== effectiveDept) return false;
      if (selectedYear !== 'all') {
        const y = parseInt(selectedYear);
        if (!v.compatible_years?.includes(y)) return false;
      }
      if (selectedSubject !== 'all' && v.subjects?.name !== selectedSubject) return false;
      return true;
    });
  }, [videos, effectiveDept, selectedYear, selectedSubject]);

  const { deptCounts, yearCounts, subjectCounts } = useMemo(() => {
    const deptC: Record<string, number> = {};
    const yearC: Record<number, number> = {};
    const subC: Record<string, number> = {};
    videos.forEach((v) => {
      const passesYear = selectedYear === 'all' || v.compatible_years?.includes(parseInt(selectedYear));
      const passesSubject = selectedSubject === 'all' || v.subjects?.name === selectedSubject;
      if (passesYear && passesSubject && v.department) deptC[v.department] = (deptC[v.department] || 0) + 1;
      const passesDept = !effectiveDept || v.department === effectiveDept;
      if (passesDept && passesSubject && v.compatible_years) v.compatible_years.forEach((y) => { yearC[y] = (yearC[y] || 0) + 1; });
      if (passesDept && passesYear && v.subjects) subC[v.subjects.name] = (subC[v.subjects.name] || 0) + 1;
    });
    return { deptCounts: deptC, yearCounts: yearC, subjectCounts: subC };
  }, [videos, effectiveDept, selectedYear, selectedSubject]);

  const { departments, years, subjects } = useMemo(() => {
    const deptSet = new Set<string>();
    const yearSet = new Set<number>();
    const subjectMap = new Map<string, { en: string; bn: string }>();
    videos.forEach((v) => {
      if (v.department) deptSet.add(v.department);
      v.compatible_years?.forEach((y) => yearSet.add(y));
      if (v.subjects) subjectMap.set(v.subjects.name, { en: v.subjects.name, bn: v.subjects.name_bn });
    });
    return {
      departments: Array.from(deptSet).sort(),
      years: Array.from(yearSet).sort((a, b) => a - b),
      subjects: Array.from(subjectMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [videos]);

  useEffect(() => { setSelectedSubject('all'); }, [selectedDept, selectedYear]);

  const getVideoThumbnail = (_url: string) => null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-950 via-primary to-orange-700 py-16 md:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(255,255,255,0.12),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="container mx-auto px-4 relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary-foreground/50 hover:text-primary-foreground/80 mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              {isEnglish ? 'Home' : 'হোম'}
            </Link>
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-5">
                <Badge className="bg-white/10 text-white border-0 rounded-full px-4 py-1.5 text-xs font-medium gap-1.5 backdrop-blur-sm">
                  <Video className="h-3 w-3" />
                  {isEnglish ? '100% Free Content' : '১০০% ফ্রি কন্টেন্ট'}
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-[1.1]">
                {isEnglish ? 'Free' : 'ফ্রি'}{' '}
                <span className="bg-gradient-to-r from-orange-200 to-white bg-clip-text text-transparent">
                  {isEnglish ? 'Classes' : 'ক্লাস'}
                </span>
              </h1>
              <p className="text-white/60 text-lg md:text-xl max-w-lg leading-relaxed">
                {isEnglish
                  ? 'Experience our teaching quality before you commit — watch unlimited free content'
                  : 'ভর্তির আগে আমাদের শিক্ষার মান অনুভব করুন — সীমাহীন ফ্রি কন্টেন্ট দেখুন'}
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8 md:py-12">
          {/* Locked dept indicator */}
          {isLocked && (
            <div className="mb-6 flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-0 py-1.5 px-4 rounded-full font-medium">
                <GraduationCap className="h-3 w-3 mr-1.5" />
                {isEnglish ? DEPT_LABELS[profile.department!]?.en : DEPT_LABELS[profile.department!]?.bn}
              </Badge>
              <Button variant="link" size="sm" asChild className="text-xs p-0 h-auto">
                <Link to="/dashboard/settings" className="gap-1">
                  <Settings className="h-3 w-3" />{isEnglish ? 'Change' : 'পরিবর্তন'}
                </Link>
              </Button>
            </div>
          )}

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-8 p-4 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {!isLocked && (
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-[180px] rounded-xl h-10 border-border/60">
                  <SelectValue placeholder={isEnglish ? 'Department' : 'বিভাগ'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isEnglish ? 'All Departments' : 'সকল বিভাগ'}</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {isEnglish ? DEPT_LABELS[d]?.en || d : DEPT_LABELS[d]?.bn || d} ({deptCounts[d] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[160px] rounded-xl h-10 border-border/60">
                <SelectValue placeholder={isEnglish ? 'Year' : 'বর্ষ'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isEnglish ? 'All Years' : 'সকল বর্ষ'}</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {isEnglish ? `Year ${y}` : `${y} বর্ষ`} ({yearCounts[y] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[220px] rounded-xl h-10 border-border/60">
                <SelectValue placeholder={isEnglish ? 'Subject' : 'বিষয়'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isEnglish ? 'All Subjects' : 'সকল বিষয়'}</SelectItem>
                {subjects.map(([name, labels]) => (
                  <SelectItem key={name} value={name}>
                    {isEnglish ? labels.en : labels.bn} ({subjectCounts[name] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto hidden md:block">
              {filtered.length} {isEnglish ? 'videos' : 'ভিডিও'}
            </span>
          </div>

          {/* Video grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="rounded-2xl bg-muted animate-pulse aspect-[4/3]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-6">
                <Video className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold mb-2">{isEnglish ? 'No videos found' : 'কোনো ভিডিও পাওয়া যায়নি'}</h3>
              <p className="text-muted-foreground text-sm">{isEnglish ? 'Try adjusting your filters' : 'ফিল্টার পরিবর্তন করুন'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((video) => {
                const thumbnail = video.thumbnail_url || getVideoThumbnail(video.youtube_url);

                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setActiveVideo(video.youtube_url)}
                    className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {thumbnail ? (
                        <img 
                          src={thumbnail} 
                          alt={video.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <Play className="h-12 w-12 text-primary/20" />
                        </div>
                      )}
                      
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/90 dark:bg-black/70 flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-75 transition-all duration-300">
                          <Play className="h-6 w-6 text-primary ml-0.5" fill="currentColor" />
                        </div>
                      </div>

                      {/* Free badge */}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-emerald-500 text-white border-0 text-[10px] font-bold rounded-full shadow-lg gap-1">
                          <Sparkles className="h-2.5 w-2.5" />
                          {isEnglish ? 'FREE' : 'ফ্রি'}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      {video.subjects && (
                        <Badge variant="secondary" className="mb-2 bg-primary/8 text-primary border-0 rounded-full text-[10px] font-medium">
                          {isEnglish ? video.subjects.name : video.subjects.name_bn}
                        </Badge>
                      )}
                      <h3 className="font-bold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors mb-1">
                        {isEnglish ? video.title : (video.title_bn || video.title)}
                      </h3>
                      {video.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                          {isEnglish ? video.description : (video.description_bn || video.description)}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-primary font-medium">
                        <Play className="h-3 w-3" />
                        {isEnglish ? 'Watch Now' : 'এখন দেখুন'}
                      </div>
                    </div>

                    {/* Hover ring */}
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 group-hover:ring-primary/20 transition-all pointer-events-none" />
                  </button>
                );
              })}
            </div>
          )}

          {/* CTA */}
          <div className="mt-16 relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-950 via-primary to-orange-700 p-8 md:p-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_60%)]" />
            <div className="relative z-10 text-center max-w-lg mx-auto">
              <Badge className="bg-white/10 text-white border-0 rounded-full px-4 py-1.5 text-xs font-medium gap-1.5 mb-5 backdrop-blur-sm">
                <Sparkles className="h-3 w-3" />
                {isEnglish ? 'Full Access' : 'সম্পূর্ণ অ্যাক্সেস'}
              </Badge>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white mb-4">
                {isEnglish ? 'Ready for the full experience?' : 'সম্পূর্ণ অভিজ্ঞতার জন্য প্রস্তুত?'}
              </h2>
              <p className="text-white/60 mb-8 text-base md:text-lg">
                {isEnglish
                  ? 'Enroll in our courses to unlock all classes, PDFs, and exclusive support'
                  : 'সব ক্লাস, পিডিএফ এবং এক্সক্লুসিভ সাপোর্ট আনলক করতে ভর্তি হন'}
              </p>
              <Button asChild size="lg" className="h-14 rounded-2xl px-10 font-bold text-base bg-white text-primary hover:bg-white/90">
                <Link to="/join">{isEnglish ? 'Join Course Now' : 'এখনই কোর্সে যোগ দিন'}</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />

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
  );
}
