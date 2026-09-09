import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isEnglish: boolean;
  isBangla: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// English translations
const en: Record<string, string> = {
  // Navigation
  'nav.home': 'Home',
  'nav.subjects': 'Courses',
  'nav.pdfSuggestions': 'PDF Suggestion',
  'nav.freeClasses': 'Free Classes',
  'nav.about': 'About',
  'nav.login': 'Login',
  'nav.joinCourse': 'Enroll Now',
  'nav.dashboard': 'Dashboard',
  'nav.logout': 'Logout',
  
  // Hero Section
  'hero.title': 'Your Future Starts at',
  'hero.titleHighlight': 'Shaharia Math',
  'hero.subtitle': 'Bangladesh\'s premium academy experience for BBA, MBA, SSC, HSC and career-focused learners — powered by smooth phone OTP access, live classes, and structured academic support.',
  'hero.joinCourse': 'Start Learning Today',
  'hero.watchFree': 'Explore Free Classes',
  'hero.studentsCount': '10,000+ Students',
  'hero.classesCount': '500+ Live Classes',
  'hero.subjectsCount': '20+ Courses',
  
  // Subject Categories
  'subjects.title': 'Explore Our Programs',
  'subjects.subtitle': 'Premium programs designed by Shaharia Sir and expert educators across university, school, and career tracks',
  'subjects.management': 'Management',
  'subjects.marketing': 'Marketing',
  'subjects.accounting': 'Accounting',
  'subjects.finance': 'Finance',
  'subjects.economics': 'Economics',
  'subjects.viewAll': 'Browse All Courses',
  'subjects.enrollNow': 'Enroll Now',
  'subjects.price': 'Fee',
  'subjects.perMonth': '/month',
  
  // Free Classes
  'freeClasses.title': 'Free Classes',
  'freeClasses.subtitle': 'Experience our teaching excellence — no payment required',
  'freeClasses.upcoming': 'Upcoming',
  'freeClasses.live': 'Live Now',
  'freeClasses.finished': 'Recorded',
  'freeClasses.watchNow': 'Watch Now',
  'freeClasses.setReminder': 'Set Reminder',
  'freeClasses.viewAll': 'View All Free Classes',
  
  // Why Choose Us
  'whyUs.title': 'Why Shaharia Math?',
  'whyUs.subtitle': 'Trusted by thousands of students across Bangladesh',
  'whyUs.expert': 'Expert Faculty',
  'whyUs.expertDesc': 'Learn directly from Shaharia Sir — one of Bangladesh\'s most sought-after BBA educators — and his curated team of subject experts.',
  'whyUs.live': 'Interactive Live Classes',
  'whyUs.liveDesc': 'Engage in real-time sessions with live Q&A, polls, and direct interaction with your instructor.',
  'whyUs.support': 'Round-the-Clock Support',
  'whyUs.supportDesc': 'Dedicated WhatsApp groups and community forums so you never study alone.',
  'whyUs.affordable': 'Affordable & Flexible',
  'whyUs.affordableDesc': 'Premium education at student-friendly pricing, with bundle discounts and referral rewards.',
  'whyUs.community': 'Vibrant Community',
  'whyUs.communityDesc': 'Join exclusive Facebook groups with thousands of motivated peers.',
  'whyUs.recorded': 'Recorded Lectures',
  'whyUs.recordedDesc': 'Missed a class? Revisit any lecture from our on-demand video library.',
  
  // Testimonials
  'testimonials.title': 'Student Success Stories',
  'testimonials.subtitle': 'Hear from students who are growing with Shaharia Math',
  
  // Footer
  'footer.description': 'Shaharia Math delivers a premium academic journey for BBA, MBA, SSC, HSC and career-focused learners across Bangladesh.',
  'footer.quickLinks': 'Quick Links',
  'footer.subjects': 'Programs',
  'footer.contact': 'Get in Touch',
  'footer.email': 'Email',
  'footer.phone': 'Hotline',
  'footer.whatsapp': 'WhatsApp',
  'footer.rights': 'All rights reserved',
  'footer.privacy': 'Privacy Policy',
  'footer.terms': 'Terms of Service',
  
  // Auth
  'auth.login': 'Login',
  'auth.signup': 'Sign Up',
  'auth.phone': 'Phone Number',
  'auth.phonePlaceholder': 'Enter your phone number',
  'auth.sendOtp': 'Send OTP',
  'auth.verifyOtp': 'Verify OTP',
  'auth.otpSent': 'OTP sent to your phone',
  'auth.enterOtp': 'Enter the 6-digit OTP',
  'auth.resendOtp': 'Resend OTP',
  'auth.name': 'Full Name',
  'auth.namePlaceholder': 'Enter your full name',
  'auth.email': 'Email',
  'auth.emailPlaceholder': 'Enter your email',
  'auth.department': 'Department',
  'auth.selectDepartment': 'Select your department',
  'auth.year': 'Year',
  'auth.selectYear': 'Select your year',
  'auth.continue': 'Continue',
  'auth.back': 'Back',
  
  // Dashboard
  'dashboard.welcome': 'Welcome back',
  'dashboard.studentId': 'Student ID',
  'dashboard.mySubjects': 'My Courses',
  'dashboard.freeClasses': 'Free Classes',
  'dashboard.studyMaterials': 'PDF Suggestions & Notes',
  'dashboard.pdfSuggestions': 'PDF Suggestions',
  'dashboard.paidBatches': 'Paid Batches',
  'dashboard.notifications': 'Notifications',
  'dashboard.settings': 'Settings',
  'dashboard.calendar': 'Calendar',
  'dashboard.liveClasses': 'Live Classes',
  'dashboard.paymentHistory': 'Payment History',
  'dashboard.referEarn': 'Refer & Earn',
  'dashboard.noSubjects': 'No courses enrolled yet',
  'dashboard.enrollNow': 'Enroll in a course to get started',
  'dashboard.joinFacebook': 'Join Facebook Group',
  'dashboard.whatsappSupport': 'WhatsApp Support',
  
  // Payment
  'payment.title': 'Payment Summary',
  'payment.selectedSubjects': 'Selected Courses',
  'payment.total': 'Total Amount',
  'payment.proceed': 'Proceed to Payment',
  'payment.success': 'Payment Successful',
  'payment.failed': 'Payment Failed',
  'payment.tryAgain': 'Try Again',
  
  // Common
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.tryAgain': 'Try Again',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.view': 'View',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.all': 'All',
  'common.taka': '৳',
};

// Bangla translations
const bn: Record<string, string> = {
  // Navigation
  'nav.home': 'হোম',
  'nav.subjects': 'কোর্সসমূহ',
  'nav.pdfSuggestions': 'পিডিএফ সাজেশন',
  'nav.freeClasses': 'ফ্রি ক্লাস',
  'nav.about': 'আমাদের সম্পর্কে',
  'nav.login': 'লগইন',
  'nav.joinCourse': 'ভর্তি হন',
  'nav.dashboard': 'ড্যাশবোর্ড',
  'nav.logout': 'লগআউট',
  
  // Hero Section
  'hero.title': 'তোমার ভবিষ্যৎ শুরু হোক',
  'hero.titleHighlight': 'শাহরিয়া ম্যাথ',
  'hero.subtitle': 'বাংলাদেশের প্রিমিয়াম একাডেমি এক্সপেরিয়েন্স — BBA, MBA, SSC, HSC এবং career-focused শিক্ষার্থীদের জন্য স্মুথ ফোন OTP এক্সেস, লাইভ ক্লাস এবং সাজানো একাডেমিক সাপোর্ট।',
  'hero.joinCourse': 'আজই শেখা শুরু করুন',
  'hero.watchFree': 'ফ্রি ক্লাস দেখুন',
  'hero.studentsCount': '১০,০০০+ শিক্ষার্থী',
  'hero.classesCount': '৫০০+ লাইভ ক্লাস',
  'hero.subjectsCount': '২০+ কোর্স',
  
  // Subject Categories
  'subjects.title': 'আমাদের প্রোগ্রামসমূহ',
  'subjects.subtitle': 'শাহরিয়া স্যার ও বিশেষজ্ঞ শিক্ষকদের তত্ত্বাবধানে বিশ্ববিদ্যালয়, স্কুল ও ক্যারিয়ার ট্র্যাকের প্রিমিয়াম প্রোগ্রামসমূহ',
  'subjects.management': 'ম্যানেজমেন্ট',
  'subjects.marketing': 'মার্কেটিং',
  'subjects.accounting': 'একাউন্টিং',
  'subjects.finance': 'ফাইন্যান্স',
  'subjects.economics': 'ইকোনমিক্স',
  'subjects.viewAll': 'সকল কোর্স দেখুন',
  'subjects.enrollNow': 'এখনই ভর্তি হন',
  'subjects.price': 'ফি',
  'subjects.perMonth': '/মাস',
  
  // Free Classes
  'freeClasses.title': 'ফ্রি ক্লাস',
  'freeClasses.subtitle': 'আমাদের শিক্ষাদানের মান নিজে অনুভব করুন — কোনো পেমেন্ট ছাড়াই',
  'freeClasses.upcoming': 'আসন্ন',
  'freeClasses.live': 'লাইভ চলছে',
  'freeClasses.finished': 'রেকর্ডেড',
  'freeClasses.watchNow': 'এখনই দেখুন',
  'freeClasses.setReminder': 'রিমাইন্ডার সেট করুন',
  'freeClasses.viewAll': 'সকল ফ্রি ক্লাস দেখুন',
  
  // Why Choose Us
  'whyUs.title': 'কেন শাহরিয়া ম্যাথ?',
  'whyUs.subtitle': 'বাংলাদেশজুড়ে হাজারো শিক্ষার্থীর আস্থার প্রতিষ্ঠান',
  'whyUs.expert': 'বিশেষজ্ঞ শিক্ষকমণ্ডলী',
  'whyUs.expertDesc': 'বাংলাদেশের অন্যতম সেরা BBA শিক্ষক শাহরিয়া স্যার এবং তাঁর নির্বাচিত বিশেষজ্ঞ শিক্ষকদের কাছ থেকে সরাসরি শিখুন।',
  'whyUs.live': 'ইন্টারেক্টিভ লাইভ ক্লাস',
  'whyUs.liveDesc': 'সরাসরি প্রশ্নোত্তর, পোল এবং শিক্ষকের সাথে সরাসরি যোগাযোগের সুবিধাসহ রিয়েল-টাইম সেশনে অংশ নিন।',
  'whyUs.support': 'সার্বক্ষণিক সহায়তা',
  'whyUs.supportDesc': 'ডেডিকেটেড হোয়াটসঅ্যাপ গ্রুপ এবং কমিউনিটি ফোরাম — যেন আপনি কখনো একা পড়াশুনা করতে না পারেন।',
  'whyUs.affordable': 'সাশ্রয়ী ও নমনীয়',
  'whyUs.affordableDesc': 'শিক্ষার্থী-বান্ধব মূল্যে প্রিমিয়াম শিক্ষা, বান্ডেল ডিসকাউন্ট এবং রেফারেল পুরস্কারসহ।',
  'whyUs.community': 'প্রাণবন্ত কমিউনিটি',
  'whyUs.communityDesc': 'হাজারো উৎসাহী সহপাঠীদের সাথে এক্সক্লুসিভ ফেসবুক গ্রুপে যোগ দিন।',
  'whyUs.recorded': 'রেকর্ডেড লেকচার',
  'whyUs.recordedDesc': 'ক্লাস মিস হয়েছে? আমাদের অন-ডিমান্ড ভিডিও লাইব্রেরি থেকে যেকোনো লেকচার আবার দেখুন।',
  
  // Testimonials
  'testimonials.title': 'শিক্ষার্থীদের সাফল্যের গল্প',
  'testimonials.subtitle': 'যেসব শিক্ষার্থী শাহরিয়া ম্যাথর সাথে এগিয়ে যাচ্ছে, তাদের অভিজ্ঞতা শুনুন',
  
  // Footer
  'footer.description': 'শাহরিয়া ম্যাথ — BBA, MBA, SSC, HSC এবং career-focused শিক্ষার্থীদের জন্য বাংলাদেশের প্রিমিয়াম একাডেমি অভিজ্ঞতা।',
  'footer.quickLinks': 'দ্রুত লিংক',
  'footer.subjects': 'প্রোগ্রামসমূহ',
  'footer.contact': 'যোগাযোগ করুন',
  'footer.email': 'ইমেইল',
  'footer.phone': 'হটলাইন',
  'footer.whatsapp': 'হোয়াটসঅ্যাপ',
  'footer.rights': 'সর্বস্বত্ব সংরক্ষিত',
  'footer.privacy': 'গোপনীয়তা নীতি',
  'footer.terms': 'সেবার শর্তাবলী',
  
  // Auth
  'auth.login': 'লগইন',
  'auth.signup': 'সাইন আপ',
  'auth.phone': 'ফোন নম্বর',
  'auth.phonePlaceholder': 'আপনার ফোন নম্বর লিখুন',
  'auth.sendOtp': 'OTP পাঠান',
  'auth.verifyOtp': 'OTP যাচাই করুন',
  'auth.otpSent': 'আপনার ফোনে OTP পাঠানো হয়েছে',
  'auth.enterOtp': '৬ সংখ্যার OTP লিখুন',
  'auth.resendOtp': 'OTP পুনরায় পাঠান',
  'auth.name': 'পূর্ণ নাম',
  'auth.namePlaceholder': 'আপনার পূর্ণ নাম লিখুন',
  'auth.email': 'ইমেইল',
  'auth.emailPlaceholder': 'আপনার ইমেইল লিখুন',
  'auth.department': 'বিভাগ',
  'auth.selectDepartment': 'আপনার বিভাগ নির্বাচন করুন',
  'auth.year': 'বর্ষ',
  'auth.selectYear': 'আপনার বর্ষ নির্বাচন করুন',
  'auth.continue': 'চালিয়ে যান',
  'auth.back': 'পেছনে',
  
  // Dashboard
  'dashboard.welcome': 'স্বাগতম',
  'dashboard.studentId': 'শিক্ষার্থী আইডি',
  'dashboard.mySubjects': 'আমার কোর্সসমূহ',
  'dashboard.freeClasses': 'ফ্রি ক্লাস',
  'dashboard.studyMaterials': 'পিডিএফ সাজেশন ও নোট',
  'dashboard.pdfSuggestions': 'পিডিএফ সাজেশন',
  'dashboard.paidBatches': 'পেইড ব্যাচ',
  'dashboard.notifications': 'নোটিফিকেশন',
  'dashboard.settings': 'সেটিংস',
  'dashboard.calendar': 'ক্যালেন্ডার',
  'dashboard.liveClasses': 'লাইভ ক্লাস',
  'dashboard.paymentHistory': 'পেমেন্ট ইতিহাস',
  'dashboard.referEarn': 'রেফার ও আয়',
  'dashboard.noSubjects': 'এখনো কোনো কোর্সে ভর্তি হননি',
  'dashboard.enrollNow': 'শুরু করতে একটি কোর্সে ভর্তি হন',
  'dashboard.joinFacebook': 'ফেসবুক গ্রুপে যোগ দিন',
  'dashboard.whatsappSupport': 'হোয়াটসঅ্যাপ সাপোর্ট',
  
  // Payment
  'payment.title': 'পেমেন্ট সারসংক্ষেপ',
  'payment.selectedSubjects': 'নির্বাচিত কোর্সসমূহ',
  'payment.total': 'মোট পরিমাণ',
  'payment.proceed': 'পেমেন্টে এগিয়ে যান',
  'payment.success': 'পেমেন্ট সফল',
  'payment.failed': 'পেমেন্ট ব্যর্থ',
  'payment.tryAgain': 'আবার চেষ্টা করুন',
  
  // Common
  'common.loading': 'লোড হচ্ছে...',
  'common.error': 'কিছু ভুল হয়েছে',
  'common.tryAgain': 'আবার চেষ্টা করুন',
  'common.save': 'সংরক্ষণ করুন',
  'common.cancel': 'বাতিল করুন',
  'common.delete': 'মুছুন',
  'common.edit': 'সম্পাদনা করুন',
  'common.view': 'দেখুন',
  'common.search': 'খুঁজুন',
  'common.filter': 'ফিল্টার',
  'common.all': 'সব',
  'common.taka': '৳',
};

const translations: Record<Language, Record<string, string>> = { en, bn };

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('language');
    return (stored === 'bn' || stored === 'en') ? stored : 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    if (language === 'bn') {
      document.body.classList.add('font-bangla');
    } else {
      document.body.classList.remove('font-bangla');
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    isEnglish: language === 'en',
    isBangla: language === 'bn',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

const fallbackContext: LanguageContextType = {
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
  isEnglish: true,
  isBangla: false,
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    return fallbackContext;
  }
  return context;
}
