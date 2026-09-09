import { BookOpen, Video, Bell, LogOut, User, Settings, FileText, Receipt, Radio, Gift } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const menuItems = [
  { titleKey: 'dashboard.mySubjects', url: '/dashboard', icon: BookOpen },
  { titleKey: 'dashboard.liveClasses', url: '/live-sessions', icon: Radio },
  { titleKey: 'dashboard.freeClasses', url: '/dashboard/free-classes', icon: Video },
  { titleKey: 'dashboard.pdfSuggestions', url: '/dashboard/pdfs', icon: FileText },
  { titleKey: 'dashboard.paymentHistory', url: '/dashboard/payments', icon: Receipt },
  { titleKey: 'dashboard.referEarn', url: '/dashboard/refer-earn', icon: Gift },
  { titleKey: 'dashboard.notifications', url: '/dashboard/notifications', icon: Bell },
  { titleKey: 'dashboard.settings', url: '/dashboard/settings', icon: Settings },
];

export function DashboardSidebar() {
  const { t } = useLanguage();
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Shaharia Math" className="w-9 h-9 rounded-xl object-contain shrink-0" width={36} height={36} />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm text-foreground tracking-tight">Shaharia Math</span>
              <span className="text-[11px] text-muted-foreground">শিক্ষার্থী পোর্টাল</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {!collapsed && profile && (
          <div className="mb-4 mx-2 px-3 py-3 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold truncate">{profile.full_name}</span>
            </div>
            {profile.student_id && (
              <Badge variant="secondary" className="text-[10px] font-mono ml-9">
                {profile.student_id}
              </Badge>
            )}
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/dashboard'}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{t(item.titleKey)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive rounded-xl h-10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="text-sm">{t('nav.logout')}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
