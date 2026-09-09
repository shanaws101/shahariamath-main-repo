import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Users, BookOpen, Video, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import useEmblaCarousel from 'embla-carousel-react';

interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
  title: string | null;
  title_bn: string | null;
  display_order: number;
}

const stats = [
  { icon: Users, value: '500+', label: 'Students', label_bn: 'শিক্ষার্থী' },
  { icon: BookOpen, value: '5+', label: 'Subjects', label_bn: 'বিষয়' },
  { icon: Video, value: '100+', label: 'Free Videos', label_bn: 'ফ্রি ভিডিও' },
];

export function HeroSection() {
  const { isEnglish } = useLanguage();
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase
        .from('carousel_banners')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });
      if (data) setBanners(data);
    };
    fetchBanners();
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || banners.length <= 1) return;
    const interval = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(interval);
  }, [emblaApi, banners.length]);

  const handleBannerClick = (linkUrl: string | null) => {
    if (!linkUrl) return;
    if (linkUrl.startsWith('http')) {
      window.open(linkUrl, '_blank');
    } else {
      navigate(linkUrl);
    }
  };

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] rounded-full bg-secondary/[0.03] blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-14 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="space-y-8 max-w-xl">
            <div className="space-y-5">
              <h1 className="text-[2.5rem] md:text-[3.25rem] lg:text-[3.75rem] font-extrabold leading-[1.1] tracking-tight text-foreground">
                {isEnglish ? (
                  <>
                    Start Learning{' '}
                    <span className="block">Anytime, From</span>
                    <span className="block">Anywhere</span>
                  </>
                ) : (
                  <>
                    যেকোনো সময়,{' '}
                    <span className="block">যেকোনো জায়গা থেকে</span>
                    <span className="block">শেখা শুরু করুন</span>
                  </>
                )}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
                {isEnglish
                  ? 'Join hundreds of Honours students who are already improving their grades with OliSahar Academy'
                  : 'শত শত অনার্স শিক্ষার্থীদের সাথে যোগ দিন যারা ইতিমধ্যে অলি সাহার একাডেমিের মাধ্যমে তাদের ফলাফল উন্নত করছে'}
              </p>
            </div>

            {/* Inline stats */}
            <div className="flex items-center gap-6 md:gap-8">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground leading-none">{stat.value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {isEnglish ? stat.label : stat.label_bn}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
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
                className="rounded-full border-border text-foreground hover:bg-accent text-base h-13 px-8 gap-2"
                onClick={() => navigate('/free-classes')}
              >
                <Play className="h-4 w-4" />
                {isEnglish ? 'Try Free Classes' : 'ফ্রি ক্লাস দেখুন'}
              </Button>
            </div>
          </div>

          {/* Right — Banner Carousel */}
          <div className="relative">
            {banners.length > 0 ? (
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-border">
                <div ref={emblaRef} className="overflow-hidden">
                  <div className="flex">
                    {banners.map((banner, index) => (
                      <div
                        key={banner.id}
                        className="relative flex-[0_0_100%] min-w-0 cursor-pointer"
                        onClick={() => handleBannerClick(banner.link_url)}
                      >
                        <div className="relative aspect-[16/10] w-full">
                          <img
                            src={banner.image_url}
                            alt={isEnglish ? (banner.title || 'Banner') : (banner.title_bn || banner.title || 'Banner')}
                            className="w-full h-full object-cover"
                            loading={index === 0 ? 'eager' : 'lazy'}
                            fetchPriority={index === 0 ? 'high' : 'auto'}
                          />
                          {(banner.title || banner.title_bn) && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end">
                              <div className="px-5 pb-5">
                                <h2 className="text-white text-lg md:text-xl font-bold drop-shadow-lg">
                                  {isEnglish ? banner.title : (banner.title_bn || banner.title)}
                                </h2>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrows */}
                {banners.length > 1 && (
                  <>
                    <button
                      onClick={() => emblaApi?.scrollPrev()}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => emblaApi?.scrollNext()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}

                {/* Dots */}
                {banners.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                    {banners.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => emblaApi?.scrollTo(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === selectedIndex ? 'bg-white w-5' : 'bg-white/50 w-2'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Fallback phone mockup when no banners */
              <div className="hidden lg:block relative w-[300px] mx-auto">
                <div className="rounded-[2.5rem] bg-secondary p-[2px] shadow-2xl">
                  <div className="rounded-[2.4rem] bg-secondary overflow-hidden px-5 pb-8 pt-6 space-y-5">
                    <div className="flex justify-center mb-2">
                      <div className="w-28 h-1.5 rounded-full bg-muted-foreground/20" />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-secondary-foreground font-bold text-base">OliSahar Academy</h3>
                      <p className="text-secondary-foreground/60 text-xs">Your Learning Dashboard</p>
                    </div>
                    {['Management', 'Marketing', 'Accounting'].map((name, i) => (
                      <div key={i} className="rounded-2xl bg-secondary-foreground/5 p-4 space-y-3">
                        <div className="text-secondary-foreground text-sm font-semibold">{name}</div>
                        <div className="h-1.5 rounded-full bg-secondary-foreground/10 overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${60 + i * 12}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Glow behind */}
            <div className="absolute -inset-10 -z-10 bg-primary/[0.04] rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
