import { SecureVideoPlayer, toBunnyEmbedUrl } from "@/components/video/SecureYouTubePlayer";
import { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  ArrowLeft,
  Users,
  CheckCircle,
  Calendar,
  Clock,
  Play,
  Target,
  MessageSquare,
  FileText,
  CreditCard,
  HelpCircle,
  Phone,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import PurchaseDialog from "@/components/PurchaseDialog";
import { useCart } from "@/contexts/CartContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChaptersSection } from "@/components/subject/ChaptersSection";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { normalizeWhatsAppLink } from "@/lib/whatsapp";

interface Subject {
  id: string;
  name: string;
  name_bn: string;
  description: string | null;
  description_bn: string | null;
  price: number;
  original_price: number;
  slug: string;
  compatible_years: number[] | null;
  facebook_group_url: string | null;
  whatsapp_support_url: string | null;
  demo_video_url: string | null;
  instructor_avatars: string[] | null;
}

interface ClassSchedule {
  id: string;
  title: string;
  title_bn: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: "upcoming" | "live" | "finished" | "cancelled";
  is_free: boolean;
}

interface SubjectCmsContent {
  faq: { q: string; qEn: string; a: string; aEn: string }[];
  courseFeatures: { text: string; textBn: string }[];
  whatYoullLearn: { text: string; textBn: string }[];
  courseDetailsWho: string;
  courseDetailsWhoBn: string;
  courseDetailsPrepare: string;
  courseDetailsPrepareBn: string;
}

const defaultCmsContent: SubjectCmsContent = {
  faq: [
    { q: "কোর্সটি কাদের জন্য?", qEn: "Who is this course for?", a: "এই কোর্সটি বিশ্ববিদ্যালয়ের ব্যবসায় শিক্ষা বিভাগের শিক্ষার্থীদের জন্য ডিজাইন করা হয়েছে।", aEn: "This course is designed for university students studying business-related disciplines." },
    { q: "ক্লাস কিভাবে হবে?", qEn: "How are classes conducted?", a: "সকল ক্লাস Facebook Group-এ লাইভ নেওয়া হয়। এনরোলমেন্টের পর গ্রুপে যোগ দিতে পারবেন।", aEn: "All classes are conducted live in the Facebook Group. You can join the group after enrollment." },
    { q: "পেমেন্ট কিভাবে করবো?", qEn: "How do I make payment?", a: "bKash-এর মাধ্যমে পেমেন্ট করতে পারবেন। Enroll বাটনে ক্লিক করে পেমেন্ট প্রসেস শুরু করুন।", aEn: "You can pay via bKash. Click the Enroll button to start the payment process." },
    { q: "রিফান্ড পলিসি কি?", qEn: "What is the refund policy?", a: "এনরোলমেন্টের ৭ দিনের মধ্যে রিফান্ডের জন্য আবেদন করতে পারবেন।", aEn: "You can apply for a refund within 7 days of enrollment." },
  ],
  courseFeatures: [
    { text: "Complete curriculum coverage", textBn: "সম্পূর্ণ পাঠ্যক্রম কভারেজ" },
    { text: "Live classes via Facebook Group", textBn: "ফেসবুক গ্রুপে লাইভ ক্লাস" },
    { text: "Exam-focused preparation", textBn: "পরীক্ষামুখী প্রস্তুতি" },
    { text: "Practice questions & solutions", textBn: "প্র্যাকটিস প্রশ্ন ও সমাধান" },
    { text: "Past paper discussions", textBn: "বিগত বছরের প্রশ্ন আলোচনা" },
    { text: "WhatsApp support access", textBn: "হোয়াটসঅ্যাপ সাপোর্ট" },
  ],
  whatYoullLearn: [
    { text: "Complete curriculum coverage", textBn: "সম্পূর্ণ পাঠ্যক্রম কভারেজ" },
    { text: "Understanding exam questions and patterns", textBn: "পরীক্ষার প্রশ্নের ধরন বোঝা" },
    { text: "Exam-focused preparation", textBn: "পরীক্ষামুখী প্রস্তুতি" },
    { text: "Complete preparation for both MCQ & CQ", textBn: "MCQ ও CQ উভয়ের প্রস্তুতি" },
    { text: "Problem-solving techniques", textBn: "সমস্যা সমাধানের কৌশল" },
    { text: "Past paper analysis and discussions", textBn: "বিগত প্রশ্ন বিশ্লেষণ" },
  ],
  courseDetailsWho: "Students studying business disciplines who want structured exam preparation with expert guidance and comprehensive chapter-wise support.",
  courseDetailsWhoBn: "ব্যবসায় শিক্ষা বিভাগের শিক্ষার্থীরা যারা বিশেষজ্ঞ নির্দেশনায় কাঠামোগত পরীক্ষা প্রস্তুতি চান।",
  courseDetailsPrepare: "This course provides a complete learning experience with live classes, practice sessions, and exam-focused preparation to help you excel in your university exams.",
  courseDetailsPrepareBn: "এই কোর্সটি লাইভ ক্লাস, প্র্যাকটিস সেশন এবং পরীক্ষামুখী প্রস্তুতির মাধ্যমে একটি সম্পূর্ণ শেখার অভিজ্ঞতা প্রদান করে।",
};

const NAV_ITEMS = [
  { id: "overview", label: "Overview", labelBn: "সংক্ষেপ" },
  { id: "what-youll-learn", label: "What you'll learn", labelBn: "যা শিখবেন" },
  { id: "chapters", label: "Chapters", labelBn: "চ্যাপ্টার" },
  { id: "class-routine", label: "Class routine", labelBn: "ক্লাস রুটিন" },
  { id: "course-details", label: "Course details", labelBn: "কোর্সের বিবরণ" },
  { id: "payment", label: "Payment", labelBn: "পেমেন্ট" },
  { id: "faq", label: "FAQ", labelBn: "জিজ্ঞাসা" },
];

//fix the isse here
interface Instructor {
  id: string;
  name: string;
  name_bn: string | null;
  position: string | null;
  position_bn: string | null;
  education: string | null;
  education_bn: string | null;
  avatar_url: string | null;
}

export default function SubjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, isEnglish } = useLanguage();
  const { user, isAdmin, isEmployee } = useAuth();
  const navigate = useNavigate();
  const { addToCart, isInCart } = useCart();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [activeNav, setActiveNav] = useState("overview");
  const [cmsContent, setCmsContent] = useState<SubjectCmsContent>(defaultCmsContent);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalChapters, setTotalChapters] = useState(0);
  const [freeClassCount, setFreeClassCount] = useState(0);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      const { data: subjectData, error: subjectError } = await supabase
        .from("subjects")
        .select("*")
        .eq("slug", slug)
        .single();

      if (subjectError || !subjectData) {
        navigate("/subjects");
        return;
      }

      setSubject(subjectData as unknown as Subject);

      const { data: cmsData } = await supabase
        .from("cms_content")
        .select("content")
        .eq("section", `subject_${subjectData.id}`)
        .maybeSingle();

      if (cmsData?.content) {
        setCmsContent({ ...defaultCmsContent, ...(cmsData.content as unknown as SubjectCmsContent) });
      }

      const { data: allSubjectsData } = await supabase
        .from("subjects")
        .select("*")
        .eq("is_visible", true);

      if (allSubjectsData) {
        if (user) {
          const { data: enrollments } = await supabase
            .from("enrollments")
            .select("subject_id")
            .eq("user_id", user.id)
            .eq("payment_status", "completed");

          const enrolledIds = enrollments?.map((e) => e.subject_id) || [];
          setAllSubjects(allSubjectsData.filter((s) => !enrolledIds.includes(s.id)) as unknown as Subject[]);
        } else {
          setAllSubjects(allSubjectsData as unknown as Subject[]);
        }
      }

      const { data: classesData } = await supabase
        .from("class_schedules")
        .select("*")
        .eq("subject_id", subjectData.id)
        .order("scheduled_date", { ascending: true });

      if (classesData) setClasses(classesData as ClassSchedule[]);

      const { data: instructorData } = await supabase
        .from("instructors")
        .select("*")
        .eq("subject_id", subjectData.id)
        .order("display_order");

      if (instructorData) setInstructors(instructorData as Instructor[]);

      const { data: chaptersData } = await supabase
        .from("subject_chapters")
        .select("id")
        .eq("subject_id", subjectData.id);
      const chapterIds = (chaptersData || []).map(c => c.id);
      setTotalChapters(chapterIds.length);
      if (chapterIds.length > 0) {
        const { data: allClasses } = await supabase
          .from("chapter_classes")
          .select("id, is_free")
          .in("chapter_id", chapterIds);
        setTotalClasses((allClasses || []).length);
        setFreeClassCount((allClasses || []).filter(c => c.is_free).length);
      }

      if (user) {
        const { data: enrollmentData } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("subject_id", subjectData.id)
          .eq("payment_status", "completed")
          .maybeSingle();
        setIsEnrolled(!!enrollmentData);
      }

      setIsLoading(false);
    };
    fetchData();
  }, [slug, user, navigate]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveNav(entry.target.id);
        });
      },
      { rootMargin: "-100px 0px -60% 0px" }
    );
    NAV_ITEMS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isLoading]);

  const handleEnrollClick = async () => {
    if (!user) {
      navigate("/join");
      return;
    }
    if (isAdmin || isEmployee) return;
    if (!subject) return;
    if (!isInCart(subject.id)) {
      await addToCart({
        id: subject.id,
        name: subject.name,
        name_bn: subject.name_bn,
        price: subject.price,
        subject_type: (subject as any).subject_type,
        department: (subject as any).department,
        course_type: (subject as any).course_type,
        compatible_years: subject.compatible_years,
      });
    }
    navigate("/checkout");
  };

  const handlePurchaseSuccess = () => {
    setIsEnrolled(true);
    setAllSubjects((prev) => prev.filter((s) => s.id !== subject?.id));
  };

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!subject) return null;

  const upcomingClasses = classes.filter((c) => c.status === "upcoming" || c.status === "live");
  const getDayName = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
  const demoVideoUrl = String(subject.demo_video_url ?? "").trim() || null;

  return (
    <div className="min-h-screen bg-background">
      <Header />


      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground to-primary/30 text-background py-8 md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(16,185,129,0.15),transparent_60%)]" />
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <Link
            to="/subjects"
            className="inline-flex items-center gap-1.5 text-sm text-background/60 hover:text-background/80 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {isEnglish ? 'Back to Subjects' : 'বিষয় তালিকায় ফিরুন'}
          </Link>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-4">
                {subject.compatible_years?.map((year) => (
                  <Badge key={year} className="bg-background/10 text-background border-background/20 text-xs rounded-full">
                    Year {year}
                  </Badge>
                ))}
              </div>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                {isEnglish ? subject.name : subject.name_bn}
              </h1>
              <p className="text-background/70 text-sm md:text-base leading-relaxed max-w-xl mb-6">
                {isEnglish ? subject.description : subject.description_bn || subject.description}
              </p>

              {instructors.length > 0 && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex -space-x-2">
                    {instructors.map((inst) => (
                      <Avatar key={inst.id} className="h-10 w-10 border-2 border-background/20">
                        {inst.avatar_url && <AvatarImage src={inst.avatar_url} alt={inst.name} />}
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {inst.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <div className="text-sm">
                    <span className="text-background/80 font-medium">
                      {instructors.map(i => isEnglish ? i.name : (i.name_bn || i.name)).join(', ')}
                    </span>
                    {instructors[0]?.position && (
                      <span className="block text-xs text-background/50">
                        {isEnglish ? instructors[0].position : (instructors[0].position_bn || instructors[0].position)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {(totalClasses > 0 || totalChapters > 0) && (
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-background/10 rounded-2xl px-4 py-2.5">
                    <BookOpen className="h-4 w-4 text-background/70" />
                    <span className="text-sm text-background/90 font-medium">
                      {totalChapters} {isEnglish ? (totalChapters === 1 ? "Chapter" : "Chapters") : "টি চ্যাপ্টার"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-background/10 rounded-2xl px-4 py-2.5">
                    <Video className="h-4 w-4 text-background/70" />
                    <span className="text-sm text-background/90 font-medium">
                      {totalClasses} {isEnglish ? (totalClasses === 1 ? "Class" : "Classes") : "টি ক্লাস"}
                    </span>
                  </div>
                  {freeClassCount > 0 && (
                    <div className="flex items-center gap-2 bg-background/10 rounded-2xl px-4 py-2.5">
                      <Play className="h-4 w-4 text-background/70" />
                      <span className="text-sm text-background/90 font-medium">
                        {freeClassCount} {isEnglish ? "Free" : "টি ফ্রি"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky nav tabs */}
      <nav className="sticky top-[57px] z-40 bg-card border-b border-border">
        <div className="container mx-auto px-2 sm:px-4 max-w-6xl">
          <div className="flex gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap rounded-xl transition-colors ${
                  activeNav === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {isEnglish ? item.label : item.labelBn}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="container mx-auto px-4 max-w-6xl py-8 md:py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0 space-y-10">
            {/* Overview */}
            <div id="overview" ref={(el) => (sectionRefs.current["overview"] = el)}>
              {isEnrolled && (
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 mb-6">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300">You're enrolled!</p>
                    <p className="text-sm text-green-600 dark:text-green-400">You have full access to this course.</p>
                  </div>
                </div>
              )}

              {/* Mobile price card */}
              <div className="lg:hidden rounded-2xl border border-border bg-card p-5 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  {subject.original_price > 0 && subject.original_price > subject.price && (
                    <span className="text-lg text-muted-foreground line-through">৳{subject.original_price}</span>
                  )}
                  <span className="text-3xl font-extrabold text-foreground">৳{subject.price}</span>
                </div>
                {!isEnrolled ? (
                  <div className="space-y-2">
                    <Button 
                      className={`w-full h-14 rounded-2xl text-base font-bold ${
                        isAdmin || isEmployee ? 'bg-muted text-muted-foreground opacity-100 hover:bg-muted' : ''
                      }`}
                      onClick={handleEnrollClick} 
                      disabled={isAdmin || isEmployee}
                    >
                      {isEnglish ? "Enroll Now" : "এনরোল করুন"}
                    </Button>
                    {(isAdmin || isEmployee) && (
                      <p className="text-xs text-center text-red-500 font-medium leading-tight px-1">
                        {isEnglish ? 'You are an admin, so you cannot enroll in this course.' : 'আপনি অ্যাডমিন, তাই আপনি এই কোর্সে এনরোল করতে পারবেন না।'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                    <CheckCircle className="h-4 w-4" /> Enrolled
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-base leading-tight">
                    {isEnglish ? 'Facebook Group Batch' : 'ফেসবুক গ্রুপ ব্যাচ'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {isEnglish
                    ? "After enrollment, you'll get access to an exclusive Facebook Group where all live classes are conducted."
                    : 'এনরোলমেন্টের পর আপনি আমাদের প্রাইভেট ফেসবুক গ্রুপে যোগ দিতে পারবেন, যেখানে সব লাইভ ক্লাস হয়।'}
                </p>
                <div className="bg-muted rounded-xl p-4 space-y-2">
                  <h4 className="text-sm font-bold text-foreground">
                    {isEnglish ? 'How to Join:' : 'যেভাবে যোগ দিবেন:'}
                  </h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed">
                    <li>{isEnglish ? 'Complete your enrollment and payment' : 'এনরোলমেন্ট ও পেমেন্ট সম্পন্ন করুন'}</li>
                    <li>{isEnglish ? 'Note your Student ID (format: SMC-2026-XXXXXX)' : 'আপনার Student ID সংগ্রহ করুন (SMC-2026-XXXXXX)'}</li>
                    <li>{isEnglish ? 'Request to join the Facebook Group' : 'ফেসবুক গ্রুপে join request পাঠান'}</li>
                    <li>{isEnglish ? 'Enter your name and Student ID in the membership questions' : 'মেম্বারশিপ প্রশ্নে নাম ও Student ID লিখুন'}</li>
                    <li>{isEnglish ? 'Admin will approve your request within 24 hours' : '২৪ ঘন্টার মধ্যে অ্যাডমিন আপনাকে অ্যাপ্রুভ করবেন'}</li>
                  </ol>
                </div>
                {!isEnrolled && (
                  <Button
                    onClick={handleEnrollClick}
                    className="w-full h-14 rounded-2xl text-base font-bold mt-4"
                  >
                    {isEnglish ? 'Join Paid Batch' : 'পেইড ব্যাচে যোগ দিন'}
                  </Button>
                )}
                {isEnrolled && subject.facebook_group_url && (
                  <Button
                    asChild
                    className="w-full h-14 rounded-2xl text-base font-bold mt-4"
                  >
                    <a href={subject.facebook_group_url} target="_blank" rel="noopener noreferrer">
                      {isEnglish ? 'Open Facebook Group' : 'ফেসবুক গ্রুপ খুলুন'}
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* What You'll Learn */}
            <div id="what-youll-learn" ref={(el) => (sectionRefs.current["what-youll-learn"] = el)}>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2 tracking-tight">
                <Target className="h-5 w-5 text-primary" />
                {isEnglish ? "What you will learn" : "এই কোর্সে যা শিখবেন"}
              </h2>
              <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cmsContent.whatYoullLearn.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{isEnglish ? item.text : item.textBn}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Chapters */}
            <div id="chapters" ref={(el) => (sectionRefs.current["chapters"] = el)}>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2 tracking-tight">
                <Video className="h-5 w-5 text-primary" />
                {isEnglish ? "Chapters" : "চ্যাপ্টার"}
              </h2>
              <ChaptersSection
                subjectId={subject.id}
                isEnrolled={isEnrolled}
                onEnrollClick={handleEnrollClick}
              />
            </div>

            <div id="class-routine" ref={(el) => (sectionRefs.current["class-routine"] = el)}>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2 tracking-tight">
                <Calendar className="h-5 w-5 text-primary" />
                {isEnglish ? "Class routine" : "ক্লাস রুটিন"}
              </h2>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="bg-primary text-primary-foreground px-5 py-3 text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {isEnglish ? 'Weekly Routine' : 'সাপ্তাহিক রুটিন'}
                </div>
                {upcomingClasses.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {upcomingClasses.slice(0, 7).map((cls) => (
                      <li key={cls.id} className="p-4 flex items-start gap-3">
                        <div className="h-11 w-11 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                            {getDayName(cls.scheduled_date).slice(0, 3)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {isEnglish ? cls.title : cls.title_bn || cls.title}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {cls.start_time} – {cls.end_time}
                            {cls.is_free && (
                              <span className="ml-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-[10px] font-bold">
                                FREE
                              </span>
                            )}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {isEnglish ? 'No classes scheduled yet. Check back soon!' : 'এখনো কোনো ক্লাস নির্ধারিত হয়নি।'}
                  </div>
                )}
              </div>
            </div>

            {classes.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2 tracking-tight">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {isEnglish ? "Course syllabus" : "কোর্সের সিলেবাস"}
                </h2>
                <Accordion type="multiple" className="space-y-2">
                  {classes.map((cls) => (
                    <AccordionItem key={cls.id} value={cls.id} className="border border-border rounded-2xl px-5 bg-card data-[state=open]:bg-muted/50">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Play className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-sm text-foreground">{isEnglish ? cls.title : cls.title_bn || cls.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground ml-11">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(cls.scheduled_date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{cls.start_time} - {cls.end_time}</span>
                          <Badge variant={cls.status === "live" ? "destructive" : "secondary"} className="text-xs rounded-full">{cls.status === "live" ? "Live" : cls.status}</Badge>
                          {cls.is_free && <Badge variant="outline" className="text-xs border-green-300 text-green-600 rounded-full">Free</Badge>}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* Course Details */}
            <div id="course-details" ref={(el) => (sectionRefs.current["course-details"] = el)}>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2 tracking-tight">
                <FileText className="h-5 w-5 text-primary" />
                {isEnglish ? "Course details" : "কোর্সের বিবরণ"}
              </h2>
              <Accordion type="multiple" defaultValue={["who-is-for"]} className="space-y-2">
                <AccordionItem value="who-is-for" className="border border-border rounded-2xl px-5 bg-card">
                  <AccordionTrigger className="hover:no-underline py-4 font-semibold text-sm">
                    {isEnglish ? "Who this course is for" : "এই কোর্সটি কাদের জন্য"}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-sm text-muted-foreground">
                    {isEnglish ? cmsContent.courseDetailsWho : cmsContent.courseDetailsWhoBn}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="how-prepare" className="border border-border rounded-2xl px-5 bg-card">
                  <AccordionTrigger className="hover:no-underline py-4 font-semibold text-sm">
                    {isEnglish ? "How will the course prepare you?" : "কোর্সটি আপনাকে কিভাবে প্রস্তুত করবে?"}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-sm text-muted-foreground">
                    {isEnglish ? cmsContent.courseDetailsPrepare : cmsContent.courseDetailsPrepareBn}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="about" className="border border-border rounded-2xl px-5 bg-card">
                  <AccordionTrigger className="hover:no-underline py-4 font-semibold text-sm">
                    {isEnglish ? "About the Course" : "কোর্স সম্পর্কে"}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-sm text-muted-foreground">
                    {isEnglish ? subject.description : subject.description_bn || subject.description || "Comprehensive course designed to help you succeed."}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Payment */}
            <div id="payment" ref={(el) => (sectionRefs.current["payment"] = el)}>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2 tracking-tight">
                <CreditCard className="h-5 w-5 text-primary" />
                {isEnglish ? "Payment process" : "পেমেন্ট প্রক্রিয়া"}
              </h2>
              <div className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  কোর্সটি কিনতে নিচের বাটনে ক্লিক করুন অথবা bKash-এ পেমেন্ট করুন।
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Course price:</span>
                  {subject.original_price > 0 && subject.original_price > subject.price && (
                    <span className="text-sm text-muted-foreground line-through">৳{subject.original_price}</span>
                  )}
                  <span className="text-lg font-bold text-primary">৳{subject.price}</span>
                </div>
                {!isEnrolled && (
                  <div className="space-y-1">
                    <Button 
                      onClick={handleEnrollClick} 
                      disabled={isAdmin || isEmployee} 
                      className={`w-full sm:w-auto h-14 rounded-2xl px-10 font-bold text-base ${
                        isAdmin || isEmployee ? 'bg-muted text-muted-foreground opacity-100 hover:bg-muted' : ''
                      }`}
                    >
                      {isEnglish ? "Enroll Now" : "এনরোল করুন"}
                    </Button>
                    {(isAdmin || isEmployee) && (
                      <p className="text-xs text-red-500 font-medium leading-tight px-1">
                        {isEnglish ? 'You are an admin, so you cannot enroll.' : 'অ্যাডমিনরা এনরোল করতে পারবেন না।'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* FAQ */}
            <div id="faq" ref={(el) => (sectionRefs.current["faq"] = el)}>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2 tracking-tight">
                <HelpCircle className="h-5 w-5 text-primary" />
                {isEnglish ? "Frequently Asked Questions" : "সাধারণ জিজ্ঞাসা"}
              </h2>
              <Accordion type="multiple" className="space-y-2">
                {cmsContent.faq.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-2xl px-5 bg-card">
                    <AccordionTrigger className="hover:no-underline py-4 font-semibold text-sm">
                      {isEnglish ? item.qEn : item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-sm text-muted-foreground">
                      {isEnglish ? item.aEn : item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Bottom CTA */}
            {!isEnrolled && (
              <div className="rounded-2xl bg-gradient-to-br from-foreground to-primary/30 text-background p-6 md:p-8 text-center">
                <h3 className="text-lg font-bold mb-2">আরো কোন জিজ্ঞাসা আছে?</h3>
                <p className="text-background/70 text-sm mb-4">যেকোনো প্রশ্নে আমাদের সাথে যোগাযোগ করুন</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {subject.whatsapp_support_url && (
                    <Button variant="outline" size="sm" className="border-background/30 text-background bg-background/10 hover:bg-background/20 rounded-xl" asChild>
                      <a href={normalizeWhatsAppLink(subject.whatsapp_support_url)} target="_blank" rel="noopener noreferrer">
                        <Phone className="h-4 w-4 mr-1.5" /> WhatsApp Support
                      </a>
                    </Button>
                  )}
                  <div className="flex flex-col items-center gap-1">
                    <Button 
                      size="sm" 
                      onClick={handleEnrollClick} 
                      disabled={isAdmin || isEmployee}
                      className={`rounded-xl ${isAdmin || isEmployee ? 'bg-muted text-muted-foreground opacity-100 hover:bg-muted' : ''}`}
                    >
                      {isEnglish ? `Enroll Now — ৳${subject.price}` : `এনরোল করুন — ৳${subject.price}`}
                    </Button>
                    {(isAdmin || isEmployee) && (
                      <p className="text-[10px] text-red-300 font-medium leading-tight">
                        {isEnglish ? 'Admins cannot enroll' : 'অ্যাডমিনরা এনরোল করতে পারবেন না'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column - sticky sidebar */}
          <div className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-32 space-y-4">
              {demoVideoUrl && (
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  <div className="aspect-video">
                    <SecureVideoPlayer url={demoVideoUrl} title="Demo Class" autoplay={false} />
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border">
                  <div className="flex items-baseline gap-2 mb-4">
                    {subject.original_price > 0 && subject.original_price > subject.price && (
                      <span className="text-lg text-muted-foreground line-through">৳{subject.original_price}</span>
                    )}
                    <span className="text-3xl font-extrabold text-foreground">৳{subject.price}</span>
                  </div>
                  {isEnrolled ? (
                    <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                      <CheckCircle className="h-4 w-4" /> Enrolled
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button 
                        className={`w-full h-14 rounded-2xl text-base font-bold ${
                          isAdmin || isEmployee ? 'bg-muted text-muted-foreground opacity-100 hover:bg-muted' : ''
                        }`}
                        onClick={handleEnrollClick} 
                        disabled={isAdmin || isEmployee}
                      >
                        {isEnglish ? "Enroll Now" : "এনরোল করুন"}
                      </Button>
                      {(isAdmin || isEmployee) && (
                        <p className="text-xs text-center text-red-500 font-medium leading-tight px-1">
                          {isEnglish ? 'You are an admin, so you cannot enroll in this course.' : 'আপনি অ্যাডমিন, তাই আপনি এই কোর্সে এনরোল করতে পারবেন না।'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h4 className="text-sm font-bold text-foreground mb-3">
                    {isEnglish ? "What's included" : "এই কোর্সে যা যা আছে"}
                  </h4>
                  <ul className="space-y-2.5">
                    {cmsContent.courseFeatures.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{isEnglish ? feature.text : feature.textBn}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mx-5 mb-5 p-3 rounded-xl bg-muted text-xs text-muted-foreground flex items-start gap-2">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Your Student ID (SMC-2026-XXXXXX) is your unique identifier — keep it safe.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      {!isEnrolled && (
        <>
          {/* Spacer so content isn't hidden behind sticky bar */}
          <div className="lg:hidden h-24" aria-hidden />
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center justify-between gap-3 max-w-lg mx-auto px-4 py-3">
              <div className="shrink-0">
                {subject.original_price > 0 && subject.original_price > subject.price && (
                  <span className="text-xs text-muted-foreground line-through block leading-none">৳{subject.original_price}</span>
                )}
                <span className="text-xl font-extrabold text-foreground leading-tight">৳{subject.price}</span>
              </div>
              <div className="flex-1 flex flex-col gap-1 justify-center">
                <Button 
                  onClick={handleEnrollClick} 
                  disabled={isAdmin || isEmployee} 
                  className={`w-full h-14 rounded-2xl font-bold text-base ${
                    isAdmin || isEmployee ? 'bg-muted text-muted-foreground opacity-100 hover:bg-muted' : ''
                  }`}
                >
                  {isEnglish ? 'Join Paid Batch' : 'পেইড ব্যাচে যোগ দিন'}
                </Button>
                {(isAdmin || isEmployee) && (
                  <p className="text-[10px] text-center text-red-500 font-medium leading-tight mt-1">
                    {isEnglish ? 'You are an admin, so you cannot enroll.' : 'আপনি অ্যাডমিন, তাই এনরোল করতে পারবেন না।'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <Footer />

      <PurchaseDialog
        open={showPurchaseDialog}
        onOpenChange={setShowPurchaseDialog}
        subjects={allSubjects}
        preSelectedSubjectId={subject?.id}
        onSuccess={handlePurchaseSuccess}
      />
    </div>
  );
}
