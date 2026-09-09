import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCmsContent } from '@/hooks/useCmsContent';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { testimonialImages } from '@/assets/testimonialImages';

const AUTO_SCROLL_DELAY_MS = 1800;

export function Testimonials() {
  const { isEnglish } = useLanguage();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  const cms = useCmsContent('testimonials_section', {
    heading: 'Students love this academy',
    heading_bn: 'শিক্ষার্থীরা এই একাডেমি ভালোবাসে',
    subheading: 'Real Facebook recommendations from students who trust Shaharia Math',
    subheading_bn: 'শাহরিয়া ম্যাথে বিশ্বাস রাখা শিক্ষার্থীদের প্রকৃত ফেসবুক রিকমেন্ডেশন',
  });

  useEffect(() => {
    if (!carouselApi) return;

    const autoScroll = window.setInterval(() => {
      carouselApi.scrollNext();
    }, AUTO_SCROLL_DELAY_MS);

    return () => window.clearInterval(autoScroll);
  }, [carouselApi]);

  return (
    <section className="py-14 md:py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary mb-3">
            <Star className="h-3.5 w-3.5 fill-primary" />
            {isEnglish ? "Trusted by thousands" : "হাজারো শিক্ষার্থীর আস্থা"}
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {isEnglish ? cms.heading : cms.heading_bn}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto mt-3">
            {isEnglish ? cms.subheading : cms.subheading_bn}
          </p>
        </div>

        <Carousel
          setApi={setCarouselApi}
          opts={{ align: 'start', loop: true, duration: 24 }}
          className="max-w-7xl mx-auto"
        >
          <CarouselContent className="items-stretch">
            {testimonialImages.map((testimonial) => (
              <CarouselItem key={testimonial.id} className="basis-[82%] sm:basis-1/2 lg:basis-1/4">
                <div
                  className="group relative h-full cursor-default overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-500 ease-out hover:-translate-y-2 hover:rotate-[0.5deg] hover:border-primary/30 hover:shadow-2xl active:scale-[0.98]"
                  aria-label={isEnglish ? `Testimonial from ${testimonial.name}` : `${testimonial.name} এর টেস্টিমোনিয়াল`}
                >
                  <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-primary/10 via-transparent to-accent/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-active:opacity-100" />
                  <div className="pointer-events-none absolute -inset-10 z-10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.24),transparent_42%)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 group-active:opacity-100" />
                  <div className="flex h-80 w-full items-center justify-center bg-white p-2 sm:h-72 lg:h-80">
                    <img
                      src={testimonial.imageUrl}
                      alt={isEnglish ? `Facebook recommendation from ${testimonial.name}` : `${testimonial.name} এর ফেসবুক রিকমেন্ডেশন`}
                      className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04] group-active:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-top-12 left-auto right-12 translate-y-0" />
          <CarouselNext className="-top-12 right-0 translate-y-0" />
        </Carousel>
      </div>
    </section>
  );
}
