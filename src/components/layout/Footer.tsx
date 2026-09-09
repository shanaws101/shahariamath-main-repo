import { Link } from 'react-router-dom';
import { Facebook, MessageCircle, Mail, Phone, ArrowRight, Sparkles, Youtube } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useCmsContent } from '@/hooks/useCmsContent';
import { normalizeWhatsAppLink } from '@/lib/whatsapp';

export function Footer() {
  const { t, isEnglish } = useLanguage();
  const currentYear = new Date().getFullYear();

  const ctaCms = useCmsContent('footer_cta', {
    heading: 'Start Learning Today', heading_bn: 'আজই শেখা শুরু করুন',
    subheading: 'Join 10,000+ students growing with Shaharia Math', subheading_bn: 'শাহরিয়া ম্যাথে ১০,০০০+ শিক্ষার্থী এগিয়ে যাচ্ছে',
    btn_primary: 'Enroll Now', btn_primary_bn: 'এখনই ভর্তি হন',
    btn_secondary: 'Free Classes', btn_secondary_bn: 'ফ্রি ক্লাস',
  });

  const brandCms = useCmsContent('footer_brand', {
    name: 'Shaharia Math', name_bn: 'শাহরিয়া ম্যাথ',
    description: '', description_bn: '',
  });

  const contactCms = useCmsContent('footer_contact', {
    email: 'info@shahariamath.com',
    phone: 'tel:+8809644195296',
    phone_display: '+8809644195296',
    whatsapp_url: 'https://wa.me/8801787494113',
    whatsapp_label: 'WhatsApp', whatsapp_label_bn: 'হোয়াটসঅ্যাপ',
    facebook_url: 'https://facebook.com',
    youtube_url: 'https://youtube.com/@olisir?si=MGqmiPdL0jxqW-03',
  });

  const quickLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/subjects', label: t('nav.subjects') },
    { href: '/bundles', label: isEnglish ? 'Bundles' : 'বান্ডেল' },
    { href: '/free-classes', label: t('nav.freeClasses') },
    { href: '/blog', label: isEnglish ? 'Blog' : 'ব্লগ' },
    { href: '/about', label: t('nav.about') },
  ];

  const programs = [
    { slug: 'management', name: isEnglish ? 'Management' : 'ম্যানেজমেন্ট' },
    { slug: 'marketing', name: isEnglish ? 'Marketing' : 'মার্কেটিং' },
    { slug: 'accounting', name: isEnglish ? 'Accounting' : 'একাউন্টিং' },
    { slug: 'finance', name: isEnglish ? 'Finance' : 'ফাইন্যান্স' },
    { slug: 'economics', name: isEnglish ? 'Economics' : 'ইকোনমিক্স' },
  ];

  const footerDescription = (isEnglish ? brandCms.description : brandCms.description_bn) || t('footer.description');
  const whatsappLabel = isEnglish ? contactCms.whatsapp_label : contactCms.whatsapp_label_bn || t('footer.whatsapp');
  const whatsappUrl = normalizeWhatsAppLink(contactCms.whatsapp_url);

  return (
    <footer className="relative overflow-hidden">
      {/* ===== CTA Section ===== */}
      <section className="relative bg-foreground">
        <div className="absolute inset-0">
          <div className="absolute -top-32 left-1/4 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-20 right-1/4 h-48 w-48 rounded-full bg-accent-gold/10 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-14 md:py-20 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/5 px-4 py-1.5 text-xs font-semibold text-background/60 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {isEnglish ? 'Join the academy' : 'একাডেমিতে যোগ দিন'}
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-background tracking-tight leading-tight">
              {isEnglish ? ctaCms.heading : ctaCms.heading_bn}
            </h2>
            <p className="text-background/50 text-sm md:text-base mt-3 max-w-lg mx-auto leading-relaxed">
              {isEnglish ? ctaCms.subheading : ctaCms.subheading_bn}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Button asChild size="lg" className="h-14 rounded-2xl px-10 gap-2 font-bold text-base btn-brand shadow-lg">
                <Link to="/join">
                  {isEnglish ? ctaCms.btn_primary : ctaCms.btn_primary_bn}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 rounded-2xl px-8 gap-2 font-semibold text-base border-background/20 text-background bg-background/5 hover:bg-background/10">
                <Link to="/free-classes">
                  {isEnglish ? ctaCms.btn_secondary : ctaCms.btn_secondary_bn}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Main Footer ===== */}
      <div className="bg-foreground border-t border-background/8">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Shaharia Math" className="w-9 h-9 rounded-xl object-contain" width={36} height={36} />
                <span className="font-bold text-lg tracking-tight text-background">
                  {isEnglish ? brandCms.name : brandCms.name_bn}
                </span>
              </div>
              <p className="text-background/40 text-sm leading-relaxed max-w-xs">
                {footerDescription}
              </p>
              <div className="flex gap-2.5">
                <a
                  href={contactCms.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-background/8 flex items-center justify-center text-background/40 hover:text-primary hover:bg-background/15 transition-all"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-background/8 flex items-center justify-center text-background/40 hover:text-primary hover:bg-background/15 transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a
                  href={contactCms.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-background/8 flex items-center justify-center text-background/40 hover:text-primary hover:bg-background/15 transition-all"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-5 text-xs uppercase tracking-[0.2em] text-background/50">{t('footer.quickLinks')}</h3>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-background/40 text-sm hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Programs */}
            <div>
              <h3 className="font-semibold mb-5 text-xs uppercase tracking-[0.2em] text-background/50">{t('footer.subjects')}</h3>
              <ul className="space-y-3">
                {programs.map((program) => (
                  <li key={program.slug}>
                    <Link
                      to={`/subjects/${program.slug}`}
                      className="text-background/40 text-sm hover:text-primary transition-colors"
                    >
                      {program.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="col-span-2 lg:col-span-1">
              <h3 className="font-semibold mb-5 text-xs uppercase tracking-[0.2em] text-background/50">{t('footer.contact')}</h3>
              <ul className="space-y-4">
                <li>
                  <a href={`mailto:${contactCms.email}`} className="flex items-center gap-3 text-background/40 text-sm hover:text-primary transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-background/8 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <span className="break-all">{contactCms.email}</span>
                  </a>
                </li>
                <li>
                  <a href={contactCms.phone} className="flex items-center gap-3 text-background/40 text-sm hover:text-primary transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-background/8 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                      <Phone className="h-4 w-4" />
                    </div>
                    {contactCms.phone_display}
                  </a>
                </li>
                <li>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-background/40 text-sm hover:text-primary transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-background/8 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    {whatsappLabel}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-background/8 mt-10 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-background/30">
              <p>© {currentYear} {isEnglish ? brandCms.name : brandCms.name_bn}. {t('footer.rights')}.</p>
              <div className="flex items-center gap-4">
                <Link 
                  to="/admin/signup" 
                  className="text-background/15 hover:text-primary transition-colors"
                >
                  {isEnglish ? 'Admin' : 'অ্যাডমিন'}
                </Link>
                <span className="text-background/10">•</span>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  {t('footer.privacy')}
                </Link>
                <span className="text-background/10">•</span>
                <Link to="/terms" className="hover:text-primary transition-colors">
                  {t('footer.terms')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
