import { ReactNode, useCallback } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe, Bell, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MobileMenuSheet } from "@/components/dashboard/MobileMenuSheet";
import { Navigate, Link } from "react-router-dom";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { language, setLanguage } = useLanguage();
  const { user, isLoading, isAdmin, isEmployee, isStudent, employeePermissions, employeeSubRole } = useAuth();
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
    await new Promise((r) => setTimeout(r, 400));
  }, [queryClient]);

  const { containerRef, pullDistance, isRefreshing, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="Shaharia Math" className="w-10 h-10 rounded-xl object-contain animate-pulse" width={40} height={40} />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const loginMethod = typeof window !== "undefined" ? sessionStorage.getItem("login_method") : null;

  if (!user) {
    return <Navigate to={loginMethod === "email" ? "/admin/login" : "/login"} replace />;
  }
  const hasEmployeeAdminAccess =
    employeeSubRole === "super_admin" ||
    Object.entries(employeePermissions ?? {}).some(
      ([key, value]) => key.startsWith("can_manage_") && value === true
    );

  if (loginMethod === "email") {
    if (isAdmin || (isEmployee && hasEmployeeAdminAccess)) {
      return <Navigate to="/admin" replace />;
    }
    if (isEmployee) {
      return <Navigate to="/employee" replace />;
    }
  }

  if (isAdmin && !isStudent) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>
        <SidebarInset className="flex flex-col flex-1">
          {/* Header */}
          <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <MobileMenuSheet />
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Link to="/dashboard" className="flex items-center gap-2 md:hidden">
                <img src="/logo.png" alt="Shaharia Math" className="w-7 h-7 rounded-lg object-contain" width={28} height={28} />
                <span className="font-bold text-sm tracking-tight">Shaharia Math</span>
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                className="gap-1.5 text-xs h-8 px-2.5 rounded-xl"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{language === 'en' ? 'বাংলা' : 'EN'}</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" asChild>
                <Link to="/dashboard/notifications">
                  <Bell className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </header>
          
          {/* Pull to Refresh Indicator */}
          <div
            className={cn(
              "md:hidden flex items-center justify-center overflow-hidden transition-all duration-200 ease-out bg-muted/30",
              pullDistance > 0 ? "border-b border-border" : ""
            )}
            style={{ height: pullDistance > 0 ? `${pullDistance}px` : "0px" }}
          >
            <div className="flex flex-col items-center gap-1">
              {isRefreshing ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <svg
                  className="h-5 w-5 text-muted-foreground transition-transform duration-200"
                  style={{ transform: `rotate(${progress * 180}deg)` }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="7 13 12 18 17 13" />
                  <polyline points="7 6 12 11 17 6" />
                </svg>
              )}
              <span className="text-[10px] text-muted-foreground font-medium">
                {isRefreshing ? "Refreshing..." : progress >= 1 ? "Release to refresh" : "Pull to refresh"}
              </span>
            </div>
          </div>

          {/* Main Content */}
          <main
            ref={containerRef as React.RefObject<HTMLElement>}
            className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-auto"
          >
            {children}
          </main>
        </SidebarInset>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
