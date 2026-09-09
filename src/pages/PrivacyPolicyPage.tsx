import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/contexts/LanguageContext';

const policySections = [
  {
    title: '1. Information We Collect',
    content: (
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-2">1.1 Personal Information</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            When you create an account, enroll in a course, contact us, or use Shaharia Math, we may collect personal information such as:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Full name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Student ID or account identifier</li>
            <li>Department, academic year, batch, or course enrollment details</li>
            <li>Messages, support requests, feedback, and other information you send to us</li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground mb-2">1.2 Technical Information</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            We may automatically collect technical and usage information when you access our website, classes, or digital services, including:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>IP address</li>
            <li>Browser type and version</li>
            <li>Device type, operating system, and device identifiers</li>
            <li>Pages visited, features used, links clicked, and time spent on the platform</li>
            <li>Class attendance, video viewing activity, quiz or learning interactions, and referral activity</li>
            <li>Log data, approximate location derived from technical data, and error reports</li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground mb-2">1.3 Payment Information</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            When you make a payment, payment processing is handled by third-party payment service providers. We may receive and store limited transaction information, including:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Transaction ID</li>
            <li>Payment amount and payment status</li>
            <li>Selected payment method, including bKash where applicable</li>
            <li>Invoice, enrollment, discount, or refund-related records</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            We do not store your complete card number, mobile financial services PIN, or other sensitive payment credentials.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: '2. How We Use Your Information',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">We use the information we collect to operate, provide, improve, and protect Shaharia Math, including to:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Create, verify, and manage your student account and profile</li>
          <li>Process course enrollment, payments, discounts, coupons, refunds, and transaction records</li>
          <li>Provide access to live classes, recorded lectures, course materials, exams, support, and batch communities</li>
          <li>Communicate class schedules, notices, service updates, security alerts, and administrative messages</li>
          <li>Send promotional communications, offers, and learning recommendations where permitted</li>
          <li>Personalize your learning experience and measure course performance</li>
          <li>Analyze platform usage, troubleshoot issues, and improve website functionality</li>
          <li>Prevent fraud, misuse, unauthorized access, and violations of our policies</li>
          <li>Comply with legal, tax, accounting, reporting, and regulatory obligations</li>
        </ul>
      </div>
    ),
  },
  {
    title: '3. Cookies and Tracking Technologies',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">We may use cookies, pixels, local storage, and similar tracking technologies to support and improve our services. These technologies may be used to:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Keep you signed in and remember your preferences</li>
          <li>Maintain session security and detect suspicious activity</li>
          <li>Understand how users navigate and interact with our platform</li>
          <li>Measure the effectiveness of classes, campaigns, and website features</li>
          <li>Deliver, personalize, and evaluate advertising and promotional content</li>
          <li>Support embedded content and third-party integrations</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">You can usually manage cookies through your browser settings, but disabling cookies may affect some platform features.</p>
      </div>
    ),
  },
  {
    title: '4. Analytics and Advertising Services',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">We may use third-party analytics and advertising services to understand usage, improve our services, and promote Shaharia Math. These services may collect information through cookies, pixels, tags, or similar technologies.</p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Google Analytics</li>
          <li>Google Ads</li>
          <li>Facebook Pixel</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">These third parties may process information according to their own privacy policies and settings. Their tools help us measure visits, conversions, engagement, and advertising performance.</p>
      </div>
    ),
  },
  {
    title: '5. Embedded Content',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">Our website or course pages may include embedded content from third-party platforms, such as videos, forms, posts, or interactive learning tools. Embedded content may behave as if you visited the third-party website directly.</p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>YouTube videos or players may collect viewing and device information.</li>
          <li>Third-party forms, widgets, or media may collect interaction and technical data.</li>
          <li>Third-party platforms may use cookies or tracking technologies under their own policies.</li>
        </ul>
      </div>
    ),
  },
  {
    title: '6. Sharing of Information',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">We do not sell your personal information. We may share information only when necessary for legitimate educational, operational, legal, or business purposes, including with:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Payment processors and transaction service providers, including bKash</li>
          <li>Technology, hosting, security, analytics, communication, and customer support service providers</li>
          <li>Teachers, administrators, mentors, and authorized team members who need information to provide services</li>
          <li>Advertising and analytics partners used for measurement and campaign management</li>
          <li>Legal, regulatory, government, or law-enforcement authorities when required by applicable law</li>
          <li>Professional advisors, auditors, or business partners involved in operating or improving our services</li>
        </ul>
      </div>
    ),
  },
  {
    title: '7. Data Retention',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">We keep personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including to:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Provide your account, enrolled courses, certificates, and learning history</li>
          <li>Maintain payment, invoice, refund, tax, and accounting records</li>
          <li>Respond to support requests, complaints, disputes, or legal claims</li>
          <li>Protect against fraud, abuse, security incidents, and unauthorized activity</li>
          <li>Comply with legal, regulatory, audit, and reporting requirements</li>
          <li>Improve our services using aggregated or de-identified information where appropriate</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">When information is no longer needed, we will delete, anonymize, or securely retain it as required by applicable law.</p>
      </div>
    ),
  },
  {
    title: '8. Account Management',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">You are responsible for keeping your account information accurate and your login credentials confidential. Depending on available features and applicable requirements, you may be able to:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Access and review your account information</li>
          <li>Update or correct your profile details</li>
          <li>Change your password or security settings</li>
          <li>Manage course enrollment, communication preferences, and notification settings</li>
          <li>Request account deletion or deactivation, subject to necessary record retention</li>
          <li>Contact us for support with account access or privacy requests</li>
        </ul>
      </div>
    ),
  },
  {
    title: '9. Data Security',
    content: (
      <p className="text-sm text-muted-foreground leading-relaxed">
        We use reasonable administrative, technical, and organizational safeguards designed to protect personal information from unauthorized access, loss, misuse, alteration, or disclosure. These safeguards may include secure authentication, access controls, encrypted transmission where appropriate, monitoring, and limited access by authorized personnel. No online service is completely secure, so you should also protect your password and devices.
      </p>
    ),
  },
  {
    title: "10. Children's Privacy",
    content: (
      <p className="text-sm text-muted-foreground leading-relaxed">
        Shaharia Math is intended for students and learners who can use our services under applicable laws and, where required, with the involvement or consent of a parent or guardian. We do not knowingly collect personal information from children in violation of applicable law. If you believe a child has provided personal information without proper consent, please contact us so we can review and take appropriate action.
      </p>
    ),
  },
  {
    title: '11. International Access',
    content: (
      <p className="text-sm text-muted-foreground leading-relaxed">
        Our services may be accessed from outside Bangladesh. If you access Shaharia Math internationally, your information may be processed in Bangladesh or other locations where our service providers operate. By using our services, you understand that privacy laws in these locations may differ from those in your country or region.
      </p>
    ),
  },
  {
    title: '12. Your Rights',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">Subject to applicable law and verification of your request, you may have the right to:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Request access to the personal information we hold about you</li>
          <li>Request correction of inaccurate or incomplete information</li>
          <li>Request deletion of your account or personal information where applicable</li>
          <li>Object to or restrict certain processing activities</li>
          <li>Withdraw consent where processing is based on consent</li>
          <li>Opt out of promotional communications</li>
          <li>Ask questions or submit complaints about our privacy practices</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">We may need to retain certain information when required for legal, security, payment, dispute-resolution, or legitimate business purposes.</p>
      </div>
    ),
  },
  {
    title: '13. Changes to This Privacy Policy',
    content: (
      <p className="text-sm text-muted-foreground leading-relaxed">
        We may update this Privacy Policy from time to time to reflect changes in our services, technologies, legal requirements, or business practices. When we update the policy, we will revise the “Last Updated” date. Continued use of Shaharia Math after an update means you acknowledge the updated policy.
      </p>
    ),
  },
  {
    title: '14. Contact Information',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">If you have questions, requests, or concerns about this Privacy Policy or how we handle personal information, please contact us:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Email: info@shahariamath.com</li>
          <li>Phone: 01813019385</li>
          <li>Location: Mymensingh, Bangladesh</li>
        </ul>
      </div>
    ),
  },
];

const PrivacyPolicyPage = () => {
  const { isEnglish } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-14 md:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
          <div className="container mx-auto px-4 relative max-w-3xl">
            <h1 className="text-2xl md:text-4xl font-extrabold text-foreground tracking-tight mb-2">
              {isEnglish ? 'Privacy Policy' : 'গোপনীয়তা নীতি'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEnglish ? 'Last Updated: 05/06/2026' : 'সর্বশেষ আপডেট: ০৫/০৬/২০২৬'}
            </p>
          </div>
        </section>

        <section className="pb-16 md:pb-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-10 space-y-8">
              {policySections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-lg font-bold text-foreground mb-3 tracking-tight">{section.title}</h2>
                  {section.content}
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

export default PrivacyPolicyPage;
