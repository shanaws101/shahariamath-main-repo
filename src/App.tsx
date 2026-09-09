import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { useTabTitle } from "@/hooks/useTabTitle";
import { useNativeMobile } from "@/hooks/useNativeMobile";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Defer non-critical widgets until after first paint for faster auth/landing TTI
// This is a test
const WhatsAppWidget = lazy(() =>
  import("@/components/WhatsAppWidget").then((m) => ({ default: m.WhatsAppWidget }))
);
const GoogleAnalyticsWidget = lazy(() =>
  import("@/components/TrackingWidgets").then((m) => ({ default: m.GoogleAnalyticsWidget }))
);
const FacebookPixelWidget = lazy(() =>
  import("@/components/TrackingWidgets").then((m) => ({ default: m.FacebookPixelWidget }))
);

function DeferredWidgets() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const idle = (globalThis as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (typeof idle === "function") {
      const id = idle(() => setReady(true), { timeout: 2500 });
      return () => (globalThis as any).cancelIdleCallback?.(id);
    }
    const timer = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <WhatsAppWidget />
      <GoogleAnalyticsWidget />
      <FacebookPixelWidget />
    </Suspense>
  );
}

// Helper for dynamic imports with retry on network failure
const lazyRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.warn("Component import failed, retrying once...", error);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await componentImport();
    }
  });

// Public Pages - lazy loaded
const Index = lazyRetry(() => import("./pages/HomePage"));
const LoginPage = lazyRetry(() => import("./pages/LoginPage"));
const JoinPage = lazyRetry(() => import("./pages/JoinPage"));
const SubjectsPage = lazyRetry(() => import("./pages/SubjectsPage"));
const SubjectDetailPage = lazyRetry(() => import("./pages/SubjectDetailPage"));
const PdfSuggestionsPage = lazyRetry(() => import("./pages/PdfSuggestionsPage"));
const PdfSuggestionDetailPage = lazyRetry(() => import("./pages/PdfSuggestionDetailPage"));
const FreeClassesPublicPage = lazyRetry(() => import("./pages/FreeClassesPublicPage"));
const AboutPage = lazyRetry(() => import("./pages/AboutPage"));
const PrivacyPolicyPage = lazyRetry(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazyRetry(() => import("./pages/TermsOfServicePage"));
const BlogPage = lazyRetry(() => import("./pages/BlogPage"));
const BlogDetailPage = lazyRetry(() => import("./pages/BlogDetailPage"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const ReferralRedirectPage = lazyRetry(() => import("./pages/ReferralRedirectPage"));
const BundlesPage = lazyRetry(() => import("./pages/BundlesPage"));
const BundleDetailPage = lazyRetry(() => import("./pages/BundleDetailPage"));
const CheckoutPage = lazyRetry(() => import("./pages/CheckoutPage"));
const LiveSessionsPage = lazyRetry(() => import("./pages/LiveSessionsPage"));
const WatchSessionPage = lazyRetry(() => import("./pages/WatchSessionPage"));

// Student Dashboard Pages - lazy loaded
const DashboardPage = lazyRetry(() => import("./pages/dashboard/DashboardPage"));
const FreeClassesPage = lazyRetry(() => import("./pages/dashboard/FreeClassesPage"));
const NotificationsPage = lazyRetry(() => import("./pages/dashboard/NotificationsPage"));
const ProfileSettingsPage = lazyRetry(() => import("./pages/dashboard/ProfileSettingsPage"));
const PDFReaderPage = lazyRetry(() => import("./pages/dashboard/PDFReaderPage"));
const PaymentHistoryPage = lazyRetry(() => import("./pages/dashboard/PaymentHistoryPage"));
const DashboardCalendarPage = lazyRetry(() => import("./pages/dashboard/CalendarPage"));
const ReferEarnPage = lazyRetry(() => import("./pages/dashboard/ReferEarnPage"));

// Admin Pages - lazy loaded
const AdminLoginPage = lazyRetry(() => import("./pages/admin/AdminLoginPage"));
const AdminSignupPage = lazyRetry(() => import("./pages/admin/AdminSignupPage"));
const AdminDashboardPage = lazyRetry(() => import("./pages/admin/AdminDashboardPage"));
const StudentsEnrollmentsPage = lazyRetry(() => import("./pages/admin/StudentsEnrollmentsPage"));
const SubjectsManagementPage = lazyRetry(() => import("./pages/admin/SubjectsManagementPage"));
const PDFSuggestionsManagementPage = lazyRetry(() => import("./pages/admin/PDFSuggestionsManagementPage"));
const PromotionsPage = lazyRetry(() => import("./pages/admin/PromotionsPage"));
const CMSPage = lazyRetry(() => import("./pages/admin/CMSPage"));
const AnalyticsMonitoringPage = lazyRetry(() => import("./pages/admin/AnalyticsMonitoringPage"));
const CarouselBannersPage = lazyRetry(() => import("./pages/admin/CarouselBannersPage"));
const EmployeeManagementPage = lazyRetry(() => import("./pages/admin/EmployeeManagementPage"));
const EmployeeDashboardPage = lazyRetry(() => import("./pages/employee/EmployeeDashboardPage"));
const SMSCampaignPage = lazyRetry(() => import("./pages/admin/SMSCampaignPage"));
const SecuritySettingsPage = lazyRetry(() => import("./pages/admin/SecuritySettingsPage"));
const CourseContentPage = lazyRetry(() => import("./pages/admin/CourseContentPage"));
const ContentManagementPage = lazyRetry(() => import("./pages/admin/ContentManagementPage"));
const ResourcesPage = lazyRetry(() => import("./pages/admin/ResourcesPage"));
const LiveSessionManagementPage = lazyRetry(() => import("./pages/admin/LiveSessionManagementPage"));
const GoLivePage = lazyRetry(() => import("./pages/admin/GoLivePage"));
const CameraPublishPage = lazyRetry(() => import("./pages/admin/CameraPublishPage"));
const ReferralReportPage = lazyRetry(() => import("./pages/admin/ReferralReportPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  useTabTitle();
  useEffect(() => {
    const preload = () => {
      void import("./pages/dashboard/DashboardPage");
      void import("./pages/dashboard/FreeClassesPage");
      void import("./pages/dashboard/NotificationsPage");
      void import("./pages/dashboard/ProfileSettingsPage");
      void import("./pages/admin/AdminDashboardPage");
      void import("./pages/admin/StudentsPage");
      void import("./pages/admin/EnrollmentsPage");
      void import("./pages/SubjectsPage");
      void import("./pages/PdfSuggestionsPage");
      void import("./pages/BundlesPage");
      void import("./pages/BundleDetailPage");
      void import("./pages/CheckoutPage");
    };

    const idleCallback = (globalThis as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const cancelIdleCallback = (globalThis as any).cancelIdleCallback as
      | ((id: number) => void)
      | undefined;

    if (typeof idleCallback === "function") {
      const id = idleCallback(preload, { timeout: 2200 });
      return () => cancelIdleCallback?.(id);
    }

    const timeout = setTimeout(preload, 1200);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <NativeMobileBridge />
                <DeferredWidgets />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/join" element={<JoinPage />} />
                    <Route path="/subjects" element={<SubjectsPage />} />
                    <Route path="/subjects/:slug" element={<SubjectDetailPage />} />
                    <Route path="/pdf-suggestions" element={<PdfSuggestionsPage />} />
                    <Route path="/pdf-suggestions/:slug" element={<PdfSuggestionDetailPage />} />
                    <Route path="/free-classes" element={<FreeClassesPublicPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms" element={<TermsOfServicePage />} />
                    <Route path="/bundles" element={<BundlesPage />} />
                    <Route path="/bundles/:id" element={<BundleDetailPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/blog/:slug" element={<BlogDetailPage />} />
                    <Route path="/live-sessions" element={<LiveSessionsPage />} />
                    <Route path="/watch/:sessionId" element={<WatchSessionPage />} />

                    {/* Student Dashboard Routes */}
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/dashboard/free-classes" element={<FreeClassesPage />} />
                    <Route path="/dashboard/notifications" element={<NotificationsPage />} />
                    <Route path="/dashboard/settings" element={<ProfileSettingsPage />} />
                    <Route path="/dashboard/pdfs" element={<PDFReaderPage />} />
                    <Route path="/dashboard/pdf-reader" element={<PDFReaderPage />} />
                    <Route path="/dashboard/payments" element={<PaymentHistoryPage />} />
                    <Route path="/dashboard/calendar" element={<DashboardCalendarPage />} />
                    <Route path="/dashboard/refer-earn" element={<ReferEarnPage />} />

                    {/* Admin Routes */}
                    <Route path="/admin/login" element={<AdminLoginPage />} />
                    <Route path="/admin/signup" element={<AdminSignupPage />} />
                    <Route path="/admin" element={<AdminDashboardPage />} />
                    <Route path="/admin/students" element={<StudentsEnrollmentsPage />} />
                    <Route path="/admin/subjects" element={<SubjectsManagementPage />} />
                    <Route path="/admin/pdf-suggestions" element={<PDFSuggestionsManagementPage />} />
                    <Route path="/admin/promotions" element={<PromotionsPage />} />
                    <Route path="/admin/cms" element={<CMSPage />} />
                    <Route path="/admin/analytics" element={<AnalyticsMonitoringPage />} />
                    <Route path="/admin/carousel" element={<CarouselBannersPage />} />
                    <Route path="/admin/course-content" element={<CourseContentPage />} />
                    <Route path="/admin/content" element={<ContentManagementPage />} />
                    <Route path="/admin/resources" element={<ResourcesPage />} />
                    <Route path="/admin/employees" element={<EmployeeManagementPage />} />
                    <Route path="/admin/sms-campaigns" element={<SMSCampaignPage />} />
                    <Route path="/admin/security" element={<SecuritySettingsPage />} />
                    <Route path="/admin/live-sessions" element={<LiveSessionManagementPage />} />
                    <Route path="/admin/go-live" element={<GoLivePage />} />
                    <Route path="/admin/camera-publish" element={<CameraPublishPage />} />
                    <Route path="/admin/referral-report" element={<ReferralReportPage />} />

                    {/* Employee Routes */}
                    <Route path="/employee" element={<EmployeeDashboardPage />} />

                    {/* Referral Redirect */}
                    <Route path="/ref/:code" element={<ReferralRedirectPage />} />

                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
      <Analytics />
      <SpeedInsights />
    </QueryClientProvider>
  );
};

function NativeMobileBridge() {
  useNativeMobile();
  return null;
}

export default App;
