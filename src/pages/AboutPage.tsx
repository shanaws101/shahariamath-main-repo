import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useCmsContent } from "@/hooks/useCmsContent";
import {
  GraduationCap,
  Target,
  Users,
  BookOpen,
  Award,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Trophy,
  Smartphone,
} from "lucide-react";

const offerings = (isEnglish: boolean) => [
  {
    icon: BookOpen,
    title: isEnglish ? "Live Classes" : "লাইভ ক্লাস",
    description: isEnglish
      ? "Interactive live sessions on Facebook Groups with real-time Q&A"
      : "ফেসবুক গ্রুপে রিয়েল-টাইম প্রশ্নোত্তর সহ ইন্টারেক্টিভ লাইভ সেশন",
  },
  {
    icon: Users,
    title: isEnglish ? "Batch System" : "ব্যাচ সিস্টেম",
    description: isEnglish
      ? "Organized batches for focused learning and peer support"
      : "ফোকাসড লার্নিং এবং সহপাঠী সমর্থনের জন্য সংগঠিত ব্যাচ",
  },
  {
    icon: MessageSquare,
    title: isEnglish ? "WhatsApp Support" : "হোয়াটসঅ্যাপ সাপোর্ট",
    description: isEnglish
      ? "Direct support channel for quick doubt resolution"
      : "দ্রুত সন্দেহ সমাধানের জন্য সরাসরি সাপোর্ট চ্যানেল",
  },
  {
    icon: Award,
    title: isEnglish ? "Exam Preparation" : "পরীক্ষার প্রস্তুতি",
    description: isEnglish
      ? "Comprehensive exam prep with past papers and solutions"
      : "অতীত পেপার এবং সমাধান সহ ব্যাপক পরীক্ষার প্রস্তুতি",
  },
];

const whyUs = (isEnglish: boolean) => [
  isEnglish ? "Affordable pricing tailored for students" : "শিক্ষার্থীদের জন্য সাশ্রয়ী মূল্য",
  isEnglish ? "Expert instruction from experienced educators" : "অভিজ্ঞ শিক্ষাবিদদের কাছ থেকে বিশেষজ্ঞ নির্দেশনা",
  isEnglish ? "Flexible learning — study at your own pace" : "নমনীয় শেখা — আপনার নিজের গতিতে অধ্যয়ন করুন",
  isEnglish ? "Bilingual support in English and Bangla" : "ইংরেজি এবং বাংলায় দ্বিভাষিক সমর্থন",
  isEnglish ? "Community of like-minded learners" : "সমমনা শিক্ষার্থীদের সম্প্রদায়",
  isEnglish ? "Proven track record of student success" : "শিক্ষার্থীদের সাফল্যের প্রমাণিত ট্র্যাক রেকর্ড",
];

export default function AboutPage() {
  const { isEnglish } = useLanguage();

  const heroCms = useCmsContent('about_hero', {
    badge: 'About Us', badge_bn: 'আমাদের সম্পর্কে',
    heading: 'One Academy. Built Around Shaharia Sir.', heading_bn: 'এক একাডেমি। শাহরিয়া স্যারকে কেন্দ্র করে গড়া।',
    subheading: 'Premium education in BBA, MBA, SSC, HSC and beyond — accessible, affordable, and designed for real results.',
    subheading_bn: 'BBA, MBA, SSC, HSC এবং আরও অনেক কিছুতে প্রিমিয়াম শিক্ষা — সহজলভ্য, সাশ্রয়ী এবং বাস্তব ফলাফলের জন্য।',
  });

  const missionCms = useCmsContent('about_mission', {
    label: 'Our Mission', label_bn: 'আমাদের লক্ষ্য',
    heading: 'Making Quality Education Accessible to Everyone',
    heading_bn: 'সবার জন্য মানসম্মত শিক্ষা সহজলভ্য করা',
    description: 'We believe every student deserves personalized guidance and comprehensive learning resources to achieve their full potential. Our platform bridges the gap between traditional education and modern learning needs.',
    description_bn: 'আমরা বিশ্বাস করি প্রতিটি শিক্ষার্থী তাদের পূর্ণ সম্ভাবনা অর্জনের জন্য ব্যক্তিগত নির্দেশনা এবং ব্যাপক শিক্ষা সংস্থানের যোগ্য।',
    founder_name: 'Shaharia Sir', founder_name_bn: 'শাহরিয়া স্যার',
    founder_title: 'Founder & Lead Instructor', founder_title_bn: 'প্রতিষ্ঠাতা এবং প্রধান প্রশিক্ষক',
    founder_bio: 'One of the largest BBA teachers in Bangladesh. With years of experience mentoring thousands of university students, Shaharia Sir founded this academy to deliver premium, structured education at scale.',
    founder_bio_bn: 'বাংলাদেশের অন্যতম বৃহৎ BBA শিক্ষক। হাজার হাজার বিশ্ববিদ্যালয় শিক্ষার্থীকে মেন্টরিং করার বছরের অভিজ্ঞতা নিয়ে, শাহরিয়া স্যার এই একাডেমি প্রতিষ্ঠা করেছেন।',
  });

  const offeringsCms = useCmsContent('about_offerings', {
    heading: 'What We Offer', heading_bn: 'আমরা কী অফার করি',
    subheading: 'Everything you need to excel in your academic journey',
    subheading_bn: 'আপনার একাডেমিক যাত্রায় উৎকর্ষ অর্জনের জন্য যা দরকার',
  });

  const whyUsCms = useCmsContent('about_why_us', {
    heading: 'Why Students Choose Us', heading_bn: 'শিক্ষার্থীরা কেন আমাদের বেছে নেয়',
  });

  const ctaCms = useCmsContent('about_cta', {
    heading: 'Ready to Start Your Learning Journey?', heading_bn: 'আপনার শেখার যাত্রা শুরু করতে প্রস্তুত?',
    subheading: 'Join thousands of students who are already improving their grades.',
    subheading_bn: 'হাজার হাজার শিক্ষার্থীদের সাথে যোগ দিন যারা ইতিমধ্যে তাদের ফলাফল উন্নত করছে।',
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-brand py-20 md:py-28">
        <div className="absolute inset-0">
          <div className="absolute -top-20 left-1/4 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {isEnglish ? heroCms.badge : heroCms.badge_bn}
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white">
            {isEnglish ? heroCms.heading : heroCms.heading_bn}
          </h1>
          <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            {isEnglish ? heroCms.subheading : heroCms.subheading_bn}
          </p>
        </div>
      </section>

      <main>
        {/* ── Stats bar ── */}
        <section className="border-b border-border bg-card/80 backdrop-blur">
          <div className="container mx-auto grid grid-cols-2 gap-3 px-4 py-5 md:grid-cols-4 md:gap-5">
            {[
              { value: "10,000+", label: isEnglish ? "Students mentored" : "শিক্ষার্থী গাইডেড" },
              { value: "9", label: isEnglish ? "Academic tracks" : "একাডেমিক ট্র্যাক" },
              { value: "500+", label: isEnglish ? "Live classes" : "লাইভ ক্লাস" },
              { value: "OTP", label: isEnglish ? "Phone login" : "ফোন লগইন" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border bg-background/80 px-4 py-3 shadow-sm text-center">
                <p className="text-2xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Mission ── */}
        <section className="py-14 md:py-20">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary mb-4">
                  <Target className="h-3.5 w-3.5" />
                  {isEnglish ? missionCms.label : missionCms.label_bn}
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground mb-5">
                  {isEnglish ? missionCms.heading : missionCms.heading_bn}
                </h2>
                <p className="text-sm text-muted-foreground leading-7">
                  {isEnglish ? missionCms.description : missionCms.description_bn}
                </p>
              </div>

              <div className="relative">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm card-glow space-y-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {isEnglish ? missionCms.founder_name : missionCms.founder_name_bn}
                    </h3>
                    <p className="text-xs text-primary font-semibold mb-3">
                      {isEnglish ? missionCms.founder_title : missionCms.founder_title_bn}
                    </p>
                    <p className="text-sm text-muted-foreground leading-6">
                      {isEnglish ? missionCms.founder_bio : missionCms.founder_bio_bn}
                    </p>
                  </div>
                </div>
                <div className="absolute -inset-6 -z-10 rounded-3xl bg-primary/[0.04] blur-2xl" />
              </div>
            </div>
          </div>
        </section>

        {/* ── What We Offer ── */}
        <section className="py-14 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="mb-8 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary mb-3">
                <Trophy className="h-3.5 w-3.5" />
                {isEnglish ? "Our offerings" : "আমাদের অফারিং"}
              </div>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {isEnglish ? offeringsCms.heading : offeringsCms.heading_bn}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-7">
                {isEnglish ? offeringsCms.subheading : offeringsCms.subheading_bn}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {offerings(isEnglish).map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm card-glow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-6">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Students Choose Us ── */}
        <section className="py-14 md:py-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="mb-8">
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {isEnglish ? whyUsCms.heading : whyUsCms.heading_bn}
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
              {whyUs(isEnglish).map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground leading-6">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-14 md:py-20 bg-gradient-brand">
          <div className="container mx-auto px-4 text-center max-w-2xl space-y-7">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight tracking-tight">
              {isEnglish ? ctaCms.heading : ctaCms.heading_bn}
            </h2>
            <p className="text-white/70 text-sm">
              {isEnglish ? ctaCms.subheading : ctaCms.subheading_bn}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="h-14 rounded-2xl px-10 text-base font-bold bg-white text-foreground hover:bg-white/90 shadow-lg" asChild>
                <Link to="/join">
                  {isEnglish ? "Enroll Now" : "এখনই ভর্তি হন"}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 rounded-2xl px-8 text-base font-semibold border-white/30 bg-transparent text-white hover:bg-white/10" asChild>
                <Link to="/subjects">
                  {isEnglish ? "Browse Courses" : "কোর্স দেখুন"}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}