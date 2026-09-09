import { 
  Smartphone, 
  GraduationCap, 
  Video, 
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCmsContent } from '@/hooks/useCmsContent';

const steps = [
  {
    icon: Smartphone, num: '01',
    title: 'Sign up with Phone OTP', title_bn: 'ফোন OTP দিয়ে সাইন আপ করুন',
    description: 'Quick verification with your phone number', description_bn: 'আপনার ফোন নম্বর দিয়ে দ্রুত ভেরিফিকেশন',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
  },
  {
    icon: GraduationCap, num: '02',
    title: 'Choose Subjects & Enroll', title_bn: 'বিষয় নির্বাচন করুন ও ভর্তি হন',
    description: 'Select your department and subjects, try free classes first', description_bn: 'আপনার বিভাগ এবং বিষয় নির্বাচন করুন, আগে ফ্রি ক্লাস ট্রাই করুন',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop',
  },
  {
    icon: Video, num: '03',
    title: 'Start Learning', title_bn: 'শেখা শুরু করুন',
    description: 'Attend live classes, get Student ID, join batch groups', description_bn: 'লাইভ ক্লাসে যোগ দিন, স্টুডেন্ট আইডি পান, ব্যাচ গ্রুপে যোগ দিন',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop',
  },
];

export function HowItWorks() {
  const { isEnglish } = useLanguage();
  const cms = useCmsContent('how_it_works', {
    heading: 'How It Works',
    heading_bn: 'কীভাবে কাজ করে',
    subheading: 'Get started in just 3 simple steps',
    subheading_bn: 'মাত্র ৩টি সহজ ধাপে শুরু করুন',
  });

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {isEnglish ? cms.heading : cms.heading_bn}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {isEnglish ? cms.subheading : cms.subheading_bn}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="group text-center">
                <div className="relative rounded-2xl overflow-hidden mb-6 aspect-[4/3]">
                  <img
                    src={step.image}
                    alt={isEnglish ? step.title : step.title_bn}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {step.num}
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-2">
                  {isEnglish ? step.title : step.title_bn}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isEnglish ? step.description : step.description_bn}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
