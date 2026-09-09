import { BookOpen, Video, Bell, FileText, Receipt, Radio, Settings, LogOut, User, Menu } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";

const menuItems = [
  { titleKey: 'dashboard.mySubjects', url: '/dashboard', icon: BookOpen, end: true },
  { titleKey: 'dashboard.liveClasses', url: '/live-sessions', icon: Radio },
  { titleKey: 'dashboard.freeClasses', url: '/dashboard/free-classes', icon: Video },
  { titleKey: 'dashboard.studyMaterials', url: '/dashboard/pdfs', icon: FileText },
  { titleKey: 'dashboard.paymentHistory', url: '/dashboard/payments', icon: Receipt },
  { titleKey: 'dashboard.notifications', url: '/dashboard/notifications', icon: Bell },
  { titleKey: 'dashboard.settings', url: '/dashboard/settings', icon: Settings },
];

export function MobileMenuSheet() {
  const { t } = useLanguage();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden -ml-1 h-8 w-8 rounded-xl">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-4 border-b border-border text-left">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Shaharia Math" className="w-10 h-10 rounded-xl object-contain" width={40} height={40} />
            <div className="flex flex-col">
              <SheetTitle className="text-sm font-bold tracking-tight">Shaharia Math</SheetTitle>
              <span className="text-[11px] text-muted-foreground">শিক্ষার্থী পোর্টাল</span>
            </div>
          </div>
        </SheetHeader>

        {profile && (
          <div className="mx-4 mt-4 mb-2 px-3 py-3 rounded-xl bg-muted/50 border border-border/50">
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

        <nav className="flex flex-col gap-1 px-3 py-3 flex-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.end}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
              activeClassName="bg-primary/10 text-primary font-semibold"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{t(item.titleKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>{t('nav.logout')}</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
