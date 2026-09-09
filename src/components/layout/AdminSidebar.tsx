import { 
  Users, 
  Calendar, 
  BarChart3, 
  LogOut,
  LayoutDashboard,
  Ticket,
  UserPlus,
  Layers,
  PenSquare,
  Shield,
  Radio,
  FileText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth, EmployeePermissions } from "@/contexts/AuthContext";
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
import { useMemo } from "react";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  permissionKeys?: (keyof EmployeePermissions)[];
  adminOnly?: boolean;
}

const allMenuItems: MenuItem[] = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Students & Enrollments', url: '/admin/students', icon: Users, permissionKeys: ['can_manage_students', 'can_manage_enrollments'] },
  { title: 'Course Content', url: '/admin/course-content', icon: Layers, permissionKeys: ['can_manage_subjects', 'can_manage_subject_cms'] },
  { title: 'PDF Suggestions', url: '/admin/pdf-suggestions', icon: FileText, permissionKeys: ['can_manage_pdfs', 'can_manage_subjects'] },
  { title: 'Resources', url: '/admin/resources', icon: Calendar, permissionKeys: ['can_manage_calendar', 'can_manage_pdfs', 'can_manage_videos'] },
  { title: 'Promotions', url: '/admin/promotions', icon: Ticket, permissionKeys: ['can_manage_discount_codes', 'can_manage_referral_codes'] },
  { title: 'Content & Blog', url: '/admin/content', icon: PenSquare, permissionKeys: ['can_manage_cms'] },
  { title: 'Live Sessions', url: '/admin/live-sessions', icon: Radio, permissionKeys: ['can_manage_subjects'] },
  { title: 'Analytics', url: '/admin/analytics', icon: BarChart3, permissionKeys: ['can_manage_analytics'] },
  { title: 'Employees', url: '/admin/employees', icon: UserPlus, adminOnly: true },
  { title: 'Security', url: '/admin/security', icon: Shield, adminOnly: true },
];

export function AdminSidebar() {
  const { t } = useLanguage();
  const { signOut, isAdmin, employeePermissions } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const { employeeSubRole } = useAuth();
  const isSuperAdmin = employeeSubRole === 'super_admin';

  const visibleItems = useMemo(() => {
    if (isAdmin || isSuperAdmin) return allMenuItems;
    
    return allMenuItems.filter(item => {
      if (item.adminOnly) return false;
      if (!item.permissionKeys) return true;
      return item.permissionKeys.some(key => employeePermissions?.[key] === true);
    });
  }, [isAdmin, isSuperAdmin, employeePermissions]);

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
              <span className="font-bold text-sm text-foreground tracking-tight">Admin Panel</span>
              <span className="text-[11px] text-muted-foreground">Shaharia Math</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-1">Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/admin'}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
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
          {!collapsed && <span className="text-sm">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
