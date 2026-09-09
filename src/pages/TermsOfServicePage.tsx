import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/contexts/LanguageContext';

type TermsSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type TermsCopy = {
  title: string;
  lastUpdated: string;
  sections: TermsSection[];
};

const englishTermsCopy: TermsCopy = {
  title: 'Terms & Conditions',
  lastUpdated: 'Last Updated: 05/06/2026',
  sections: [
    {
      title: 'Eligibility',
      paragraphs: [
        'You must be eligible to use Shaharia Math under applicable law and must provide truthful information when accessing our courses, content, and services. If you are under the age required to enter into a binding agreement, you may use the Platform only with the consent and supervision of a parent or legal guardian.',
      ],
    },
    {
      title: 'User Accounts',
      paragraphs: [
        'You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to provide accurate, complete, and current account information and to notify us immediately if you suspect unauthorized access or misuse of your account.',
      ],
    },
    {
      title: 'Course Purchases',
      paragraphs: [
        'Course enrollment is confirmed only after successful payment verification. Course details, pricing, available features, and enrollment terms may vary by course and may be updated before purchase. Please review all course information carefully before completing your order.',
      ],
    },
    {
      title: 'Course Access Duration',
      paragraphs: [
        'Access to a purchased course is available for the duration specified on the course page, checkout page, or related purchase communication. When the stated access period expires, access to course materials, recordings, resources, and related features may end unless renewed or extended by Shaharia Math.',
      ],
    },
    {
      title: 'Offline Access',
      paragraphs: [
        'Offline access, downloads, or saved content may be offered for selected courses or devices when supported by the Platform. Offline content remains subject to these Terms and may not be copied, transferred, shared, redistributed, sold, uploaded, or used outside the authorized learning environment.',
      ],
    },
    {
      title: 'Intellectual Property Rights',
      paragraphs: [
        'All courses, lessons, videos, recordings, notes, graphics, quizzes, files, designs, trademarks, logos, software, and other materials available through Shaharia Math are owned by Shaharia Math or its licensors and are protected by intellectual property laws.',
      ],
      items: [
        'You receive a limited, non-exclusive, non-transferable, revocable license to access purchased or enrolled course content for personal educational use only.',
        'You may not copy, reproduce, record, download unless expressly permitted, distribute, publish, sell, rent, sublicense, modify, translate, create derivative works from, or publicly display any Platform content.',
        'You may not remove copyright notices, watermarks, branding, digital rights controls, or other ownership identifiers from course materials.',
        'Any unauthorized use of Platform content may result in account suspension, termination, legal action, and removal of course access without refund.',
      ],
    },
    {
      title: 'Prohibited Activities',
      paragraphs: [
        'You agree not to misuse the Platform or interfere with the learning experience of other users.',
      ],
      items: [
        'Sharing, selling, lending, or transferring your account, login credentials, course access, student ID, or device authorization to another person.',
        'Recording, screen capturing, downloading, copying, redistributing, uploading, broadcasting, or reselling course content without written permission.',
        'Attempting to bypass payment, access controls, device limits, digital rights management, security systems, or usage restrictions.',
        'Using fraudulent information, fake accounts, stolen payment methods, unauthorized discount codes, or abusive referral activity.',
        'Harassing, threatening, abusing, defaming, spamming, or disrupting instructors, students, staff, groups, live classes, or community spaces.',
        'Uploading malware, attempting unauthorized access, reverse engineering, scraping, or otherwise damaging the Platform or its systems.',
      ],
    },
    {
      title: 'Account Suspension and Termination',
      paragraphs: [
        'We may suspend, restrict, or terminate your account or course access if we believe you have violated these Terms, created risk for the Platform or other users, engaged in fraud, or used the Platform in an unauthorized manner. Suspension or termination may occur without prior notice where necessary to protect the Platform, content, instructors, or students.',
      ],
    },
    {
      title: 'Educational Purpose Only',
      paragraphs: [
        'Shaharia Math provides educational content and learning support. We do not guarantee specific academic results, examination scores, admission outcomes, employment outcomes, or any other particular result from using the Platform.',
      ],
    },
    {
      title: 'Certificates',
      paragraphs: [
        'Certificates, if offered, may be issued only after you satisfy the applicable course requirements. Certificates are for educational recognition and do not guarantee academic credit, professional licensing, employment, or acceptance by any institution unless expressly stated by that institution.',
      ],
    },
    {
      title: 'Payments',
      paragraphs: [
        'All payments must be completed through the payment methods authorized by Shaharia Math. Prices and payment options may change from time to time.',
      ],
      items: [
        'Course prices may be listed in Bangladeshi Taka (BDT) or another supported currency, as shown at checkout.',
        'You are responsible for reviewing the total price, applicable discounts, taxes, payment method fees, and course details before payment.',
        'Enrollment is subject to successful payment confirmation and our internal verification processes.',
        'If a payment is reversed, disputed, fraudulent, incomplete, or otherwise invalid, we may suspend or remove course access until the issue is resolved.',
        'Discounts, coupons, offers, and referral benefits may be limited, modified, or withdrawn at our discretion and may not be combined unless expressly permitted.',
      ],
    },
    {
      title: 'Refund Policy',
      paragraphs: [
        'Refund eligibility depends on the course, offer, access status, and applicable purchase conditions displayed or communicated at the time of purchase. Refund requests must be submitted through our official contact channels with the required purchase details. We may deny refund requests where course content has been accessed, consumed, downloaded, shared, or where misuse, policy violation, or fraudulent activity is suspected.',
      ],
    },
    {
      title: 'Service Availability',
      paragraphs: [
        'We work to keep the Platform available and reliable, but we do not guarantee uninterrupted, error-free, or always-available access. Services may be affected by maintenance, updates, technical issues, internet connectivity, third-party providers, security incidents, force majeure events, or other circumstances beyond our control.',
      ],
    },
    {
      title: 'Third-Party Services',
      paragraphs: [
        'The Platform may use or link to third-party services such as payment gateways, video hosting providers, communication tools, analytics services, authentication providers, and external websites. Third-party services are governed by their own terms and policies, and Shaharia Math is not responsible for their actions, availability, content, or practices.',
      ],
    },
    {
      title: 'Device Authorization Policy',
      paragraphs: [
        'To protect course content and prevent unauthorized sharing, Shaharia Math may limit the number of devices, sessions, browsers, or locations that can access an account or course.',
      ],
      items: [
        'You may be required to authorize specific devices before accessing course materials.',
        'Device limits, reset rules, and authorization procedures may vary by course, subscription, app version, or security requirement.',
        'Sharing device access or attempting to bypass device authorization controls is prohibited.',
        'We may temporarily block, review, or restrict access when suspicious device activity, excessive logins, location anomalies, or credential sharing is detected.',
        'Device authorization does not transfer ownership of any content and may be revoked if these Terms are violated.',
      ],
    },
    {
      title: 'Limitation of Liability',
      paragraphs: [
        'To the maximum extent permitted by law, Shaharia Math and its owners, instructors, employees, partners, and service providers will not be liable for indirect, incidental, special, consequential, punitive, or exemplary damages, including loss of data, profits, opportunities, academic outcomes, or business interruption arising from your use of or inability to use the Platform.',
      ],
    },
    {
      title: 'Indemnification',
      paragraphs: [
        'You agree to indemnify and hold harmless Shaharia Math, its owners, instructors, employees, partners, and service providers from any claims, damages, losses, liabilities, costs, and expenses arising from your use of the Platform, your violation of these Terms, your infringement of any rights, or your misuse of course content or services.',
      ],
    },
    {
      title: 'Privacy',
      paragraphs: [
        'Your use of the Platform may involve the collection and processing of personal information. Our handling of personal information is described in our Privacy Policy and related notices. By using the Platform, you agree that we may process your information as described in those policies and as necessary to provide, secure, improve, and support our services.',
      ],
    },
    {
      title: 'Changes to Terms',
      paragraphs: [
        'We may update these Terms from time to time to reflect changes in our services, legal requirements, security practices, or business needs. Updated Terms will be posted on the Platform with a revised last-updated date. Continued use of the Platform after changes become effective means you accept the updated Terms.',
      ],
    },
    {
      title: 'Governing Law',
      paragraphs: [
        'These Terms are governed by the laws of Bangladesh, without regard to conflict-of-law principles. Any disputes arising from or relating to these Terms or the Platform will be handled by the competent courts or authorities of Bangladesh, unless applicable law requires otherwise.',
      ],
    },
    {
      title: 'Contact Information',
      paragraphs: [
        'If you have questions, concerns, notices, or requests related to these Terms, please contact Shaharia Math using the details below:',
      ],
      items: [
        'Email: info@shahariamath.com',
        'Phone: 01813019385',
        'Location: Mymensingh, Bangladesh',
      ],
    },
  ],
};

// A Bangla legal translation is not available yet, so both language modes render the updated English terms consistently.
const termsCopyByLanguage: Record<'en' | 'bn', TermsCopy> = {
  en: englishTermsCopy,
  bn: englishTermsCopy,
};

const TermsOfServicePage = () => {
  const { isEnglish } = useLanguage();
  const pageCopy = termsCopyByLanguage[isEnglish ? 'en' : 'bn'];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-14 md:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
          <div className="container mx-auto px-4 relative max-w-3xl">
            <h1 className="text-2xl md:text-4xl font-extrabold text-foreground tracking-tight mb-2">
              {pageCopy.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {pageCopy.lastUpdated}
            </p>
          </div>
        </section>

        <section className="pb-16 md:pb-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-10 space-y-8">
              {pageCopy.sections.map((section, index) => (
                <section key={section.title}>
                  <h2 className="text-lg font-bold text-foreground mb-3 tracking-tight">
                    {index + 1}. {section.title}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="text-sm text-muted-foreground leading-relaxed mb-3 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                  {section.items && (
                    <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfServicePage;
