import { ArrowRight, Users, BookOpen, Video, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCmsContent } from '@/hooks/useCmsContent';
import { motion } from 'framer-motion';

export function AppPromoSection() {
  const { isEnglish } = useLanguage();
  const navigate = useNavigate();

  const cms = useCmsContent('app_promo', {
    heading: 'Start Learning Anytime, From Anywhere',
    heading_bn: 'আমাদের প্ল্যাটফর্মে শেখা শুরু করুন, যেকোনো জায়গা থেকে',
    subheading: 'Join hundreds of Honours students who are already improving their grades with OliSahar Academy',
    subheading_bn: 'শত শত অনার্স শিক্ষার্থীদের সাথে যোগ দিন যারা ইতিমধ্যে অলি সাহার একাডেমিের মাধ্যমে তাদের গ্রেড উন্নত করছে',
    stat1_value: '500+',
    stat1_label: 'Students',
    stat1_label_bn: 'শিক্ষার্থী',
    stat2_value: '5+',
    stat2_label: 'Subjects',
    stat2_label_bn: 'বিষয়',
    stat3_value: '100+',
    stat3_label: 'Free Videos',
    stat3_label_bn: 'ফ্রি ভিডিও',
  });

  const stats = [
    { value: cms.stat1_value, label: isEnglish ? cms.stat1_label : cms.stat1_label_bn, icon: Users },
    { value: cms.stat2_value, label: isEnglish ? cms.stat2_label : cms.stat2_label_bn, icon: BookOpen },
    { value: cms.stat3_value, label: isEnglish ? cms.stat3_label : cms.stat3_label_bn, icon: Video },
  ];

  const dashboardItems = [
    { name: 'Management', color: 'hsl(160 60% 45%)', progress: 72 },
    { name: 'Marketing', color: 'hsl(270 60% 55%)', progress: 58 },
    { name: 'Accounting', color: 'hsl(28 90% 50%)', progress: 85 },
  ];

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Full bleed dark background */}
      <div className="absolute inset-0 bg-secondary" />
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/[0.06] blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-[80px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center max-w-6xl mx-auto">
          {/* Left — Content */}
          <div className="space-y-8 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                {isEnglish ? 'Learn Smarter' : 'স্মার্টভাবে শিখুন'}
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-secondary-foreground leading-[1.1] tracking-tight">
              {isEnglish ? cms.heading : cms.heading_bn}
            </h2>

            <p className="text-secondary-foreground/60 text-base md:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
              {isEnglish ? cms.subheading : cms.subheading_bn}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-8">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-secondary-foreground">{stat.value}</div>
                      <div className="text-xs text-secondary-foreground/50">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                className="btn-brand rounded-full text-base h-13 px-8 gap-2 text-primary-foreground"
                onClick={() => navigate('/join')}
              >
                {isEnglish ? 'Join Now' : 'এখনই যোগ দিন'}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 text-base h-13 px-8"
                onClick={() => navigate('/free-classes')}
              >
                {isEnglish ? 'Try Free Classes' : 'ফ্রি ক্লাস ট্রাই করুন'}
              </Button>
            </div>
          </div>

          {/* Right — Phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 40, rotateY: -8 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              {/* Phone frame */}
              <div className="w-[280px] rounded-[2.5rem] bg-gradient-to-b from-secondary-foreground/10 to-secondary-foreground/5 p-[2px] shadow-2xl shadow-black/40">
                <div className="rounded-[2.4rem] bg-secondary overflow-hidden border border-secondary-foreground/5">
                  {/* Notch */}
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-24 h-1.5 rounded-full bg-secondary-foreground/15" />
                  </div>

                  {/* Screen content */}
                  <div className="px-5 pb-8 pt-2 space-y-4">
                    <div className="text-center space-y-0.5 mb-2">
                      <h3 className="text-secondary-foreground font-bold text-sm">OliSahar Academy</h3>
                      <p className="text-secondary-foreground/40 text-[11px]">
                        {isEnglish ? 'Your Learning Dashboard' : 'আপনার লার্নিং ড্যাশবোর্ড'}
                      </p>
                    </div>

                    {dashboardItems.map((item, i) => (
                      <div
                        key={i}
                        className="rounded-2xl bg-secondary-foreground/[0.06] border border-secondary-foreground/[0.06] p-4 space-y-3 hover:bg-secondary-foreground/[0.08] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `color-mix(in srgb, ${item.color} 15%, transparent)` }}
                          >
                            <BookOpen className="h-4 w-4" style={{ color: item.color }} />
                          </div>
                          <div>
                            <div className="text-secondary-foreground text-xs font-semibold">{item.name}</div>
                            <div className="text-secondary-foreground/35 text-[10px]">
                              {isEnglish ? 'Live class today' : 'আজ লাইভ ক্লাস'}
                            </div>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary-foreground/[0.08] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${item.progress}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Glow behind phone */}
              <div className="absolute -inset-16 -z-10 bg-primary/[0.06] rounded-full blur-3xl" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
