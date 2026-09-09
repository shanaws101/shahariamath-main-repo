import { useLanguage } from "@/contexts/LanguageContext";
import { BookOpen, Video, Bell, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

export function QuickActions() {
  const { isEnglish } = useLanguage();

  const actions = [
    { label: isEnglish ? "Browse Subjects" : "বিষয় ব্রাউজ করুন", description: isEnglish ? "Enroll in new courses" : "নতুন কোর্সে ভর্তি হন", icon: BookOpen, to: "/subjects", iconColor: "text-blue-600", iconBg: "bg-blue-500/10" },
    { label: isEnglish ? "Free Classes" : "বিনামূল্যে ক্লাস", description: isEnglish ? "Watch free content" : "বিনামূল্যে কন্টেন্ট দেখুন", icon: Video, to: "/dashboard/free-classes", iconColor: "text-emerald-600", iconBg: "bg-emerald-500/10" },
    { label: isEnglish ? "Notifications" : "বিজ্ঞপ্তি", description: isEnglish ? "View updates" : "আপডেট দেখুন", icon: Bell, to: "/dashboard/notifications", iconColor: "text-violet-600", iconBg: "bg-violet-500/10" },
    { label: isEnglish ? "Get Help" : "সাহায্য নিন", description: isEnglish ? "Contact support" : "সাপোর্টে যোগাযোগ", icon: HelpCircle, to: "/about", iconColor: "text-amber-600", iconBg: "bg-amber-500/10" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-bold">{isEnglish ? "Quick Actions" : "দ্রুত কার্যক্রম"}</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, index) => (
            <Link key={index} to={action.to} className="p-3 rounded-xl border border-border hover:bg-muted/50 transition-all group">
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${action.iconBg} flex items-center justify-center shrink-0`}>
                  <action.icon className={`h-4 w-4 ${action.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
