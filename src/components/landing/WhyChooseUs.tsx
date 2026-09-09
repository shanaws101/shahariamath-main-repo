import { 
  Video, BookOpen, IdCard, Users, CreditCard, CheckCircle 
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCmsContent } from '@/hooks/useCmsContent';

const features = [
  {
    icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10',
    title: 'Live Interactive Classes', title_bn: 'লাইভ ইন্টারেক্টিভ ক্লাস',
    description: 'Real-time learning with direct teacher interaction', description_bn: 'সরাসরি শিক্ষকের সাথে রিয়েল-টাইম শেখা',
  },
  {
    icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10',
    title: 'Multi-Subject Enrollment', title_bn: 'মাল্টি-সাবজেক্ট ভর্তি',
    description: 'Enroll in multiple subjects with flexible pricing', description_bn: 'নমনীয় মূল্যে একাধিক বিষয়ে ভর্তি হন',
  },
  {
    icon: IdCard, color: 'text-purple-500', bg: 'bg-purple-500/10',
    title: 'Personal Student ID', title_bn: 'ব্যক্তিগত স্টুডেন্ট আইডি',
    description: 'Unique OSA ID for batch access and verification', description_bn: 'ব্যাচ অ্যাক্সেস এবং ভেরিফিকেশনের জন্য অনন্য OSA আইডি',
  },
  {
    icon: Users, color: 'text-pink-500', bg: 'bg-pink-500/10',
    title: 'Facebook Batch Support', title_bn: 'ফেসবুক ব্যাচ সাপোর্ট',
    description: 'Private Facebook groups for each paid batch', description_bn: 'প্রতিটি পেইড ব্যাচের জন্য প্রাইভেট ফেসবুক গ্রুপ',
  },
  {
    icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-500/10',
    title: 'bKash Payment Support', title_bn: 'বিকাশ পেমেন্ট সাপোর্ট',
    description: 'Pay easily with bKash mobile banking', description_bn: 'বিকাশ মোবাইল ব্যাংকিং দিয়ে সহজে পে করুন',
  },
  {
    icon: CheckCircle, color: 'text-cyan-500', bg: 'bg-cyan-500/10',
    title: 'Experienced Teachers', title_bn: 'অভিজ্ঞ শিক্ষক',
    description: 'Learn from teachers with proven track records', description_bn: 'প্রমাণিত ট্র্যাক রেকর্ড সহ শিক্ষকদের কাছ থেকে শিখুন',
  },
];

export function WhyChooseUs() {
  const { isEnglish } = useLanguage();
  const cms = useCmsContent('why_choose_us', {
    heading: 'Why Choose OliSahar Academy',
    heading_bn: 'কেন অলি সাহার একাডেমি বেছে নেবেন',
    subheading: 'Everything you need for successful learning',
    subheading_bn: 'সফল শেখার জন্য আপনার যা দরকার সব কিছু',
  });

  return (
    <section className="py-16 md:py-24 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            {isEnglish ? cms.heading : cms.heading_bn}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {isEnglish ? cms.subheading : cms.subheading_bn}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
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
                <h3 className="font-semibold text-foreground mb-2">
                  {isEnglish ? feature.title : feature.title_bn}
                </h3>
                <p className="text-sm text-muted-foreground">
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
