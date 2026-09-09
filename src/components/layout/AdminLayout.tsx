import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface AdminLayoutProps {
  children: ReactNode;
  requiredPermission?: string;
}

export function AdminLayout({ children, requiredPermission }: AdminLayoutProps) {
  const { language, setLanguage } = useLanguage();
  const { user, isLoading, isAdmin, isEmployee, employeePermissions, employeeSubRole } = useAuth();
  const loginMethod = typeof window !== "undefined" ? sessionStorage.getItem("login_method") : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginMethod === "email" ? "/admin/login" : "/login"} replace />;
  }

  if (!isAdmin && !isEmployee) {
    return <Navigate to={loginMethod === "email" ? "/admin/login" : "/dashboard"} replace />;
  }

  if (!isAdmin && isEmployee && requiredPermission && employeePermissions) {
    if (employeeSubRole !== 'super_admin') {
      const hasPermission = (employeePermissions as any)[requiredPermission] === true;
      if (!hasPermission) {
        return <Navigate to="/admin" replace />;
      }
    }
  }

  const subRoleLabel = employeeSubRole === 'super_admin' ? 'Super Admin' 
    : employeeSubRole === 'editor' ? 'Editor' 
    : employeeSubRole === 'content_writer' ? 'Content Writer' 
    : null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AdminSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground tracking-tight">Admin Panel</span>
                {isAdmin && (
                  <Badge className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                    {user?.email === 'shanaws.ux@gmail.com' ? '👑 Boss' : 'Admin'}
                  </Badge>
                )}
                {!isAdmin && isEmployee && subRoleLabel && (
                  <Badge variant="secondary" className="text-[10px] h-5">{subRoleLabel}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                className="gap-1.5 h-8 rounded-lg text-xs"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
              </Button>
            </div>
          </header>
          
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
