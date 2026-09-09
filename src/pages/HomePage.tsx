import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCmsContent } from "@/hooks/useCmsContent";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { landingHeroDefaults } from "@/lib/landing-hero-content";
import { BundlePreview } from "@/components/landing/BundlePreview";
import { Testimonials } from "@/components/landing/Testimonials";
import { BlogSection } from "@/components/landing/BlogSection";
import { JoinCTA } from "@/components/landing/JoinCTA";
import { PhotoGallery } from "@/components/landing/PhotoGallery";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  MessageCircleMore,
  PlayCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

const departments = [
  {
    filter: "BBA",
    label: "BBA",
    labelBn: "বিবিএ",
    subtitle: "Core business foundation",
    subtitleBn: "ব্যবসায় শিক্ষার মূল ভিত্তি",
    eyebrow: "University",
    eyebrowBn: "বিশ্ববিদ্যালয়",
    color: "from-orange-600 to-orange-800",
    size: "large",
  },
  {
    filter: "MBA",
    label: "MBA",
    labelBn: "এমবিএ",
    subtitle: "Advanced business mastery",
    subtitleBn: "উচ্চতর ব্যবসায়িক দক্ষতা",
    eyebrow: "Professional",
    eyebrowBn: "প্রফেশনাল",
    color: "from-slate-800 to-slate-950",
    size: "medium",
  },
  {
    filter: "accounting",
    label: "Accounting",
    labelBn: "একাউন্টিং",
    subtitle: "Numbers & precision",
    subtitleBn: "সংখ্যা ও নির্ভুলতা",
    eyebrow: "Department",
    eyebrowBn: "বিভাগ",
    color: "from-amber-500 to-orange-600",
    size: "medium",
  },
  {
    filter: "management",
    label: "Management",
    labelBn: "ম্যানেজমেন্ট",
    subtitle: "Leadership & strategy",
    subtitleBn: "নেতৃত্ব ও কৌশল",
    eyebrow: "Department",
    eyebrowBn: "বিভাগ",
    color: "from-teal-500 to-teal-700",
    size: "small",
  },
  {
    filter: "finance",
    label: "Finance",
    labelBn: "ফাইন্যান্স",
    subtitle: "Concepts that stick",
    subtitleBn: "মনে থাকে এমন কনসেপ্ট",
    eyebrow: "Department",
    eyebrowBn: "বিভাগ",
    color: "from-indigo-500 to-indigo-700",
    size: "small",
  },
  {
    filter: "marketing",
    label: "Marketing",
    labelBn: "মার্কেটিং",
    subtitle: "Creative exam strategy",
    subtitleBn: "সৃজনশীল পরীক্ষার স্ট্র্যাটেজি",
    eyebrow: "Department",
    eyebrowBn: "বিভাগ",
    color: "from-pink-500 to-rose-600",
    size: "small",
  },
  {
    filter: "Job Preparation",
    label: "Job Prep",
    labelBn: "চাকরি প্রস্তুতি",
    subtitle: "Campus to career launch",
    subtitleBn: "ক্যাম্পাস থেকে ক্যারিয়ার",
    eyebrow: "Career",
    eyebrowBn: "ক্যারিয়ার",
    color: "from-violet-500 to-purple-700",
    size: "medium",
  },
  {
    filter: "SSC",
    label: "SSC",
    labelBn: "এসএসসি",
    subtitle: "Strong fundamentals",
    subtitleBn: "শক্ত ভিত",
    eyebrow: "School",
    eyebrowBn: "স্কুল",
    color: "from-cyan-500 to-blue-600",
    size: "small",
  },
  {
    filter: "HSC",
    label: "HSC",
    labelBn: "এইচএসসি",
    subtitle: "Board-ready preparation",
    subtitleBn: "বোর্ড প্রস্তুতির দিকনির্দেশনা",
    eyebrow: "College",
    eyebrowBn: "কলেজ",
    color: "from-emerald-400 to-teal-600",
    size: "large",
  },
];

const promiseCards = {
  en: [
    {
      title: "Phone OTP, then straight in",
      description: "No messy signup — number, OTP, done. Students move from interest to learning in seconds.",
      icon: Smartphone,
    },
    {
      title: "An academy feel, not a random tutoring page",
      description: "Structured programs, stronger credibility, and a polished student journey built around Shaharia Math's authority.",
      icon: GraduationCap,
    },
    {
      title: "Live, recorded, and community-led",
      description: "Students get real classes, replay support, and mentor-backed communication instead of fragmented learning.",
      icon: Users,
    },
  ],
  bn: [
    {
      title: "ফোন OTP, তারপর সরাসরি এক্সেস",
      description: "কোনো জটিল সাইনআপ নয় — নম্বর দিন, OTP দিন, ব্যস। আগ্রহ থেকে শেখায় কয়েক সেকেন্ড।",
      icon: Smartphone,
    },
    {
      title: "একটি সত্যিকারের একাডেমির অনুভূতি",
      description: "স্ট্রাকচার্ড প্রোগ্রাম, শক্তিশালী ব্র্যান্ড ভ্যালু এবং শাহরিয়া স্যারের অথরিটিকে কেন্দ্র করে গড়া।",
      icon: GraduationCap,
    },
    {
      title: "লাইভ, রেকর্ডেড ও কমিউনিটি সাপোর্ট",
      description: "লাইভ ক্লাস, রিপ্লে সাপোর্ট এবং মেন্টর-গাইডেড কমিউনিকেশন — পূর্ণ সিস্টেম।",
      icon: Users,
    },
  ],
};

// Bento size classes
function getBentoClass(size: string, index: number) {
  // On mobile: all full width. On desktop: bento layout
  if (size === "large") return "sm:col-span-2";
  if (size === "small") return "sm:col-span-1";
  return "sm:col-span-1";
}

export default function HomePage() {
  const { isEnglish } = useLanguage();
  const heroCms = useCmsContent("landing_hero", landingHeroDefaults);
  const cmsText = (key: keyof typeof landingHeroDefaults) => {
    const localizedKey = `${key}_bn` as keyof typeof landingHeroDefaults;
    return isEnglish ? heroCms[key] : heroCms[localizedKey] || heroCms[key];
  };
  const heroBullets = [1, 2, 3]
    .map((index) => cmsText(`bullet_${index}` as keyof typeof landingHeroDefaults))
    .filter(Boolean);
  const heroSteps = [
    { icon: Smartphone, text: cmsText("step_1") },
    { icon: BookOpen, text: cmsText("step_2") },
    { icon: MessageCircleMore, text: cmsText("step_3") },
  ].filter((step) => step.text);
  const stats = [1, 2, 3, 4]
    .map((index) => ({
      value: cmsText(`stat_${index}_value` as keyof typeof landingHeroDefaults),
      label: cmsText(`stat_${index}_label` as keyof typeof landingHeroDefaults),
    }))
    .filter((stat) => stat.value || stat.label);
  const promises = isEnglish ? promiseCards.en : promiseCards.bn;
  const primaryCtaUrl = heroCms.primary_cta_url || "/join";
  const secondaryCtaUrl = heroCms.secondary_cta_url || "/free-classes";
  const isExternalUrl = (url: string) => /^https?:\/\//i.test(url);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* ========== HERO SECTION ========== */}
        <section className="relative overflow-hidden bg-gradient-hero">
          <div className="absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-border" />
            <div className="absolute -top-20 left-[8%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute top-20 right-[8%] h-80 w-80 rounded-full bg-accent-gold/10 blur-3xl" />
          </div>

          <div className="container mx-auto px-4 py-10 md:py-14 lg:py-16 relative z-10">
            <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
              {/* Left: Copy */}
              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {cmsText("badge")}
                </div>

                <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground md:text-4xl lg:text-5xl">
                  {cmsText("title_prefix")}{" "}
                  <span className="text-gradient-energetic">
                    {cmsText("title_highlight")}
                  </span>
                  <br />
                  <span className="text-2xl font-bold text-muted-foreground md:text-3xl lg:text-4xl">
                    {cmsText("title_suffix")}
                  </span>
                </h1>

                <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
                  {cmsText("description")}
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" className="btn-brand h-14 gap-2.5 rounded-2xl px-10 text-base font-bold shadow-lg" asChild>
                    {isExternalUrl(primaryCtaUrl) ? (
                      <a href={primaryCtaUrl} target="_blank" rel="noreferrer">
                        {cmsText("primary_cta")}
                        <ArrowRight className="h-5 w-5" />
                      </a>
                    ) : (
                      <Link to={primaryCtaUrl}>
                        {cmsText("primary_cta")}
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-2xl border-border bg-background/80 px-8 text-base font-semibold backdrop-blur hover:bg-accent"
                    asChild
                  >
                    {isExternalUrl(secondaryCtaUrl) ? (
                      <a href={secondaryCtaUrl} target="_blank" rel="noreferrer">
                        <PlayCircle className="h-5 w-5" />
                        {cmsText("secondary_cta")}
                      </a>
                    ) : (
                      <Link to={secondaryCtaUrl}>
                        <PlayCircle className="h-5 w-5" />
                        {cmsText("secondary_cta")}
                      </Link>
                    )}
                  </Button>
                </div>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  {heroBullets.map((item) => (
                    <div
                      key={item}
                      className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Visual card */}
              <div className="relative lg:pl-6">
                <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/85 p-4 shadow-xl backdrop-blur md:p-5">
                  <div className="absolute inset-0 bg-gradient-brand-subtle opacity-80" />
                  <div className="relative">
                    {/* Dashboard preview bar */}
                    <div className="flex items-center justify-between rounded-2xl border border-border bg-background/80 px-4 py-3 shadow-sm backdrop-blur">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
                          {cmsText("dashboard_eyebrow")}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-foreground">
                          {cmsText("dashboard_text")}
                        </p>
                      </div>
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <LayoutDashboard className="h-4 w-4" />
                      </div>
                    </div>

                    {heroCms.image_url && (
                      <div className="mt-3 overflow-hidden rounded-[1.75rem] border border-border bg-background shadow-sm">
                        <img
                          src={heroCms.image_url}
                          alt={cmsText("title_highlight")}
                          className="aspect-[16/10] w-full object-cover"
                        />
                      </div>
                    )}

                    {/* Dark student journey card */}
                    <div className="mt-3 overflow-hidden rounded-[1.75rem] border border-border bg-foreground p-4 text-background shadow-lg md:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.26em] text-background/50">
                            {cmsText("journey_eyebrow")}
                          </p>
                          <h2 className="mt-1.5 text-xl font-bold leading-tight md:text-2xl">
                            {cmsText("journey_title")}
                          </h2>
                        </div>
                        {/* LIVE indicator with red dot */}
                        <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 shrink-0">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-red-400">
                            {cmsText("live_label")}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2.5">
                        {heroSteps.map((step) => (
                          <div key={step.text} className="flex items-center gap-3 rounded-xl bg-background/8 px-3 py-2.5">
                            <div className="rounded-lg bg-background/12 p-1.5 text-background">
                              <step.icon className="h-3.5 w-3.5" />
                            </div>
                            <p className="text-xs leading-5 text-background/85">
                              {step.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badge: OTP Access */}
                <div className="absolute -left-10 -top-6 hidden w-44 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur lg:block">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {cmsText("access_label")}
                      </p>
                      <p className="text-xs font-bold text-foreground">
                        {cmsText("access_text")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating badge: Brand Strength */}
                <div className="absolute -right-6 -bottom-2 hidden w-48 rounded-2xl border border-border bg-card p-3 shadow-lg lg:block">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold">
                    {cmsText("brand_label")}
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    {cmsText("brand_text")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== STATS BAR ========== */}
        <section className="border-y border-border bg-card/80 backdrop-blur">
          <div className="container mx-auto grid grid-cols-2 gap-3 px-4 py-5 md:grid-cols-4 md:gap-5">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border bg-background/80 px-4 py-3 shadow-sm text-center md:text-left">
                <p className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">{stat.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ========== DEPARTMENT BENTO GRID ========== */}
        <section className="py-14 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-8 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  <Trophy className="h-3.5 w-3.5" />
                  Programs with real academy presence
                </div>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
                  Explore every department.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Premium category cards — visual, modern, and easier to browse.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
              {departments.map((dept) => (
                <Link
                  key={dept.filter}
                  to={`/subjects?filter=${encodeURIComponent(dept.filter)}`}
                  className={`group relative overflow-hidden rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-gradient-to-br ${dept.color} ${getBentoClass(dept.size, 0)}`}
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute -bottom-8 -left-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

                  <div className="relative flex h-full min-h-[140px] flex-col justify-between text-white sm:min-h-[160px]">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em]">
                        {dept.eyebrow}
                      </span>
                      <ArrowRight className="h-4 w-4 opacity-60 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                        {dept.label}
                      </h3>
                      <p className="mt-1.5 text-xs leading-5 text-white/75 md:text-sm">
                        {dept.subtitle}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ========== VALUE PROPS ========== */}
        <section className="bg-muted/30 py-14 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-8 max-w-2xl">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {isEnglish ? "What makes this feel like a real academy" : "যে কারণে এটি সত্যিকারের একাডেমির মতো"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
                {isEnglish
                  ? "Structure, confidence, smoother entry, and a premium student experience from the first screen."
                  : "Structure, confidence, smoother entry এবং প্রথম স্ক্রিন থেকেই premium student experience।"}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {promises.map((promise) => (
                <div key={promise.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm card-glow">
                  <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
                    <promise.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground">{promise.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {promise.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <BlogSection />
        <BundlePreview />
        <Testimonials />
        <PhotoGallery />
        <JoinCTA />
      </main>

      <Footer />
    </div>
  );
}
