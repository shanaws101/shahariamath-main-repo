import { Video, BookOpen, Users, Smartphone, MessageCircle, Award } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCmsContent } from '@/hooks/useCmsContent';

const features = [
  {
    icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10',
    title: 'Live Interactive Classes', title_bn: 'লাইভ ইন্টারেক্টিভ ক্লাস',
    description: 'Real-time learning with expert teachers through live video sessions',
    description_bn: 'লাইভ ভিডিও সেশনের মাধ্যমে বিশেষজ্ঞ শিক্ষকদের সাথে রিয়েল-টাইম শেখা',
  },
  {
    icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10',
    title: 'Recorded Lectures', title_bn: 'রেকর্ডেড লেকচার',
    description: 'Watch recorded classes anytime, learn at your own pace',
    description_bn: 'যেকোনো সময় রেকর্ডেড ক্লাস দেখুন, নিজের গতিতে শিখুন',
  },
  {
    icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10',
    title: 'Batch Support Group', title_bn: 'ব্যাচ সাপোর্ট গ্রুপ',
    description: 'Private Facebook groups for each batch with direct teacher support',
    description_bn: 'সরাসরি শিক্ষক সাপোর্ট সহ প্রতিটি ব্যাচের জন্য প্রাইভেট ফেসবুক গ্রুপ',
  },
  {
    icon: Smartphone, color: 'text-pink-500', bg: 'bg-pink-500/10',
    title: 'Mobile Friendly', title_bn: 'মোবাইল ফ্রেন্ডলি',
    description: 'Access all classes and materials from your phone anywhere',
    description_bn: 'যেকোনো জায়গা থেকে আপনার ফোন দিয়ে সব ক্লাস ও উপকরণ অ্যাক্সেস করুন',
  },
  {
    icon: MessageCircle, color: 'text-amber-500', bg: 'bg-amber-500/10',
    title: 'Doubt Clearing', title_bn: 'ডাউট ক্লিয়ারিং',
    description: 'Get your questions answered quickly by experienced teachers',
    description_bn: 'অভিজ্ঞ শিক্ষকদের দ্বারা দ্রুত আপনার প্রশ্নের উত্তর পান',
  },
  {
    icon: Award, color: 'text-cyan-500', bg: 'bg-cyan-500/10',
    title: 'Student ID System', title_bn: 'স্টুডেন্ট আইডি সিস্টেম',
    description: 'Unique OSA ID for every student for batch access and verification',
    description_bn: 'ব্যাচ অ্যাক্সেস এবং ভেরিফিকেশনের জন্য প্রতিটি শিক্ষার্থীর জন্য অনন্য OSA আইডি',
  },
];

export function PlatformFeatures() {
  const { isEnglish } = useLanguage();
  const cms = useCmsContent('platform_features', {
    heading: 'Build Yourself With Our Platform',
    heading_bn: 'আমাদের প্ল্যাটফর্মে নিজেকে গড়ে তুলুন',
    subheading: 'Everything you need for successful Honours exam preparation',
    subheading_bn: 'সফল অনার্স পরীক্ষার প্রস্তুতির জন্য আপনার যা কিছু দরকার',
  });

  return (
    <section className="py-16 md:py-24 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            {isEnglish ? cms.heading : cms.heading_bn}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {isEnglish ? cms.subheading : cms.subheading_bn}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group rounded-2xl bg-card border border-border p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-sm">
                  {isEnglish ? feature.title : feature.title_bn}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isEnglish ? feature.description : feature.description_bn}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
