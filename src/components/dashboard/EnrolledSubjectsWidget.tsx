import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, Users, MessageCircle,
  Play, CheckCircle2, ChevronRight, Layers
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { normalizeWhatsAppLink } from "@/lib/whatsapp";

interface Enrollment {
  id: string;
  subject: {
    id: string; name: string; name_bn: string; slug: string;
    icon: string | null; facebook_group_url: string | null;
    whatsapp_support_url: string | null;
  };
}

interface SubjectProgress {
  totalChapters: number; totalClasses: number;
  completedClasses: number; percentage: number;
}

const cardColors = [
  { accent: 'bg-primary', light: 'bg-primary/8', text: 'text-primary', bar: '[&>div]:bg-primary' },
  { accent: 'bg-emerald-500', light: 'bg-emerald-500/8', text: 'text-emerald-600', bar: '[&>div]:bg-emerald-500' },
  { accent: 'bg-violet-500', light: 'bg-violet-500/8', text: 'text-violet-600', bar: '[&>div]:bg-violet-500' },
  { accent: 'bg-amber-500', light: 'bg-amber-500/8', text: 'text-amber-600', bar: '[&>div]:bg-amber-500' },
  { accent: 'bg-rose-500', light: 'bg-rose-500/8', text: 'text-rose-600', bar: '[&>div]:bg-rose-500' },
  { accent: 'bg-cyan-500', light: 'bg-cyan-500/8', text: 'text-cyan-600', bar: '[&>div]:bg-cyan-500' },
];

export function EnrolledSubjectsWidget({ refreshKey = 0 }: { refreshKey?: number }) {
  const { t, isEnglish } = useLanguage();
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, SubjectProgress>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!user) {
        if (isMounted) setIsLoading(false);
        return;
      }

      if (isMounted) setIsLoading(true);

      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select(`id, subject:subjects(id, name, name_bn, slug, icon, facebook_group_url, whatsapp_support_url)`)
        .eq('user_id', user.id).eq('payment_status', 'completed');

      if (!isMounted) return;

      if (enrollmentData) {
        setEnrollments(enrollmentData as unknown as Enrollment[]);
        const subjectIds = enrollmentData.map((e: any) => e.subject?.id).filter(Boolean);
        if (subjectIds.length > 0) {
          const { data: chapters } = await supabase.from('subject_chapters').select('id, subject_id').in('subject_id', subjectIds);
          if (!isMounted) return;
          const chapterIds = (chapters || []).map(c => c.id);
          let classes: any[] = [];
          if (chapterIds.length > 0) {
            const { data: classData } = await supabase.from('chapter_classes').select('id, chapter_id').in('chapter_id', chapterIds);
            if (!isMounted) return;
            classes = classData || [];
          }
          const pMap: Record<string, SubjectProgress> = {};
          for (const sid of subjectIds) {
            const subjectChapters = (chapters || []).filter(c => c.subject_id === sid);
            const subjectChapterIds = subjectChapters.map(c => c.id);
            const subjectClasses = classes.filter(cl => subjectChapterIds.includes(cl.chapter_id));
            pMap[sid] = { totalChapters: subjectChapters.length, totalClasses: subjectClasses.length, completedClasses: 0, percentage: 0 };
          }
          if (isMounted) setProgressMap(pMap);
        }
      }
      if (isMounted) setIsLoading(false);
    };
    fetchData();

    return () => { isMounted = false; };
  }, [user, refreshKey]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
            <div className="h-28 bg-muted rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20">
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-extrabold mb-1.5 text-foreground tracking-tight">
            {isEnglish ? "No Courses Yet" : "এখনো কোনো কোর্স নেই"}
          </h3>
          <p className="text-muted-foreground text-center mb-6 max-w-[260px] text-sm">
            {isEnglish 
              ? "Start your learning journey by enrolling in a subject."
              : "একটি বিষয়ে ভর্তি হয়ে আপনার শেখার যাত্রা শুরু করুন।"}
          </p>
          <Button asChild className="h-12 rounded-2xl px-8 font-bold">
            <Link to="/subjects">{t('subjects.enrollNow')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold flex items-center gap-2 tracking-tight">
          <BookOpen className="h-4 w-4 text-primary" />
          {t('dashboard.mySubjects')}
          <Badge variant="secondary" className="text-[10px] rounded-lg ml-0.5">{enrollments.length}</Badge>
        </h2>
        <Button variant="ghost" size="sm" asChild className="text-xs gap-1 h-7 rounded-lg">
          <Link to="/subjects">
            {isEnglish ? "More" : "আরো"}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      {/* Subject Cards */}
      <div className="grid grid-cols-1 gap-3">
        {enrollments.map((enrollment, index) => {
          const theme = cardColors[index % cardColors.length];
          const progress = progressMap[enrollment.subject.id];
          const subjectName = isEnglish ? enrollment.subject.name : enrollment.subject.name_bn;
          
          return (
            <Link
              key={enrollment.id}
              to={`/subjects/${enrollment.subject.slug}`}
              className="block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-all active:scale-[0.98] group"
            >
              {/* Top accent bar */}
              <div className={`h-1 ${theme.accent}`} />
              
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-xl ${theme.light} flex items-center justify-center shrink-0`}>
                    {enrollment.subject.icon ? (
                      <span className="text-xl">{enrollment.subject.icon}</span>
                    ) : (
                      <BookOpen className={`h-5 w-5 ${theme.text}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-foreground leading-tight truncate">
                      {subjectName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge className="bg-success/10 text-success border-0 text-[9px] rounded-full px-1.5 py-0 h-4">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                        {isEnglish ? "Enrolled" : "ভর্তি"}
                      </Badge>
                      {progress && progress.totalChapters > 0 && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Layers className="h-2.5 w-2.5" />
                          {progress.totalChapters} {isEnglish ? "ch" : "অধ্যায়"}
                        </span>
                      )}
                    </div>
                  </div>
                  <Play className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>

                {/* Progress */}
                {progress && progress.totalClasses > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">
                        {progress.completedClasses}/{progress.totalClasses} {isEnglish ? "classes" : "ক্লাস"}
                      </span>
                      <span className={`text-[10px] font-bold ${theme.text}`}>{progress.percentage}%</span>
                    </div>
                    <Progress value={progress.percentage} className={`h-1.5 rounded-full ${theme.bar}`} />
                  </div>
                )}

                {/* Social links */}
                {(enrollment.subject.facebook_group_url || enrollment.subject.whatsapp_support_url) && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50" onClick={e => e.preventDefault()}>
                    {enrollment.subject.facebook_group_url && (
                      <a 
                        href={enrollment.subject.facebook_group_url} 
                        target="_blank" rel="noopener noreferrer"
                        className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                      >
                        <Users className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {enrollment.subject.whatsapp_support_url && (
                      <a 
                        href={normalizeWhatsAppLink(enrollment.subject.whatsapp_support_url)} 
                        target="_blank" rel="noopener noreferrer"
                        className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
