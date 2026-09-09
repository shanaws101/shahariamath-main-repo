import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

const SESSIONS = [
  "17-18", "18-19", "19-20", "20-21", "21-22",
  "22-23", "23-24", "24-25", "25-26", "26-27",
];

const DIVISIONS = [
  { en: "Dhaka", bn: "ঢাকা" },
  { en: "Chattogram", bn: "চট্টগ্রাম" },
  { en: "Rajshahi", bn: "রাজশাহী" },
  { en: "Khulna", bn: "খুলনা" },
  { en: "Barishal", bn: "বরিশাল" },
  { en: "Sylhet", bn: "সিলেট" },
  { en: "Rangpur", bn: "রংপুর" },
  { en: "Mymensingh", bn: "ময়মনসিংহ" },
];

const REFERRAL_SOURCES = [
  { value: "facebook", en: "Facebook", bn: "ফেসবুক" },
  { value: "friends", en: "Friends", bn: "বন্ধু" },
  { value: "bunny_stream", en: "Bunny Stream", bn: "বান্নি স্ট্রিম" },
  { value: "whatsapp", en: "WhatsApp", bn: "হোয়াটসঅ্যাপ" },
  { value: "website", en: "Website", bn: "ওয়েবসাইট" },
  { value: "other", en: "Other", bn: "অন্যান্য" },
];

interface Props {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function StudentOnboardingDialog({ open, onOpenChange }: Props) {
  const { isEnglish } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 fields
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [alternativePhone, setAlternativePhone] = useState("");
  const [studentType, setStudentType] = useState("");

  // Step 2 fields
  const [facebookIdName, setFacebookIdName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [hasComplaint, setHasComplaint] = useState("");

  const isStep1Valid = whatsappNumber.trim().length >= 11 && studentType;
  const isStep2Valid = collegeName.trim() && division && referralSource;

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from("student_onboarding")
        .upsert({
          user_id: user.id,
          whatsapp_number: whatsappNumber.trim(),
          alternative_phone: alternativePhone.trim() || null,
          student_type: studentType,
          facebook_id_name: facebookIdName.trim() || null,
          college_name: collegeName.trim(),
          division,
          district: district.trim() || null,
          referral_source: referralSource,
          has_complaint: hasComplaint === "yes",
          completed_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (insertError) throw insertError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      await refreshProfile();

      toast({
        title: isEnglish ? "✅ Information Saved!" : "✅ তথ্য সংরক্ষিত হয়েছে!",
        description: isEnglish
          ? "Thank you! You can now access your courses."
          : "ধন্যবাদ! আপনি এখন আপনার কোর্সগুলো দেখতে পারবেন।",
      });

      onOpenChange?.(false);
    } catch (error) {
      console.error("Onboarding save error:", error);
      toast({
        title: isEnglish ? "Error" : "ত্রুটি",
        description: isEnglish
          ? "Could not save. Please try again."
          : "সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >

        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="text-xl font-bold">
            {isEnglish ? "📋 Almost Done!" : "📋 প্রায় শেষ!"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isEnglish
              ? "Please fill in these details to access your courses"
              : "আপনার কোর্স দেখতে নিচের তথ্যগুলো পূরণ করুন"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{isEnglish ? `Step ${step} of 2` : `ধাপ ${step}/২`}</span>
            <span>{step === 1 ? "50%" : "100%"}</span>
          </div>
          <Progress value={step * 50} className="h-2" />
        </div>

        {step === 1 ? (
          <div className="space-y-5 pt-2">
            {/* WhatsApp Number */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {isEnglish ? "WhatsApp Number *" : "হোয়াটসঅ্যাপ নম্বর *"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isEnglish
                  ? "We'll use this to send you class updates"
                  : "এই নম্বরে ক্লাসের আপডেট পাঠানো হবে"}
              </p>
              <Input
                type="tel"
                placeholder="01XXXXXXXXX"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Alternative Phone */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {isEnglish ? "Alternative Phone (Optional)" : "বিকল্প ফোন নম্বর (ঐচ্ছিক)"}
              </Label>
              <Input
                type="tel"
                placeholder="01XXXXXXXXX"
                value={alternativePhone}
                onChange={(e) => setAlternativePhone(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Student Type */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {isEnglish ? "Student Type *" : "শিক্ষার্থীর ধরন *"}
              </Label>
              <RadioGroup value={studentType} onValueChange={setStudentType} className="grid grid-cols-2 gap-3">
                {[
                  { value: "regular", en: "Regular", bn: "রেগুলার" },
                  { value: "irregular", en: "Irregular", bn: "ইরেগুলার" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      studentType === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value={opt.value} />
                    <span className="text-base font-medium">
                      {isEnglish ? opt.en : opt.bn}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!isStep1Valid}
              className="w-full h-12 text-base font-semibold gap-2"
            >
              {isEnglish ? "Next" : "পরবর্তী"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Facebook ID Name */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {isEnglish ? "Facebook ID Name (Optional)" : "ফেসবুক আইডির নাম (ঐচ্ছিক)"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isEnglish
                  ? "For Facebook group verification"
                  : "ফেসবুক গ্রুপে ভেরিফিকেশনের জন্য"}
              </p>
              <Input
                placeholder={isEnglish ? "Your Facebook name" : "আপনার ফেসবুক নাম"}
                value={facebookIdName}
                onChange={(e) => setFacebookIdName(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* College Name */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {isEnglish ? "College / University Name *" : "কলেজ / বিশ্ববিদ্যালয়ের নাম *"}
              </Label>
              <Input
                placeholder={isEnglish ? "Enter your institution name" : "আপনার প্রতিষ্ঠানের নাম লিখুন"}
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Division */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {isEnglish ? "Division *" : "বিভাগ *"}
              </Label>
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder={isEnglish ? "Select division" : "বিভাগ নির্বাচন করুন"} />
                </SelectTrigger>
                <SelectContent>
                  {DIVISIONS.map((d) => (
                    <SelectItem key={d.en} value={d.en} className="text-base py-3">
                      {isEnglish ? d.en : d.bn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* District */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {isEnglish ? "District (Optional)" : "জেলা (ঐচ্ছিক)"}
              </Label>
              <Input
                placeholder={isEnglish ? "Enter your district" : "আপনার জেলার নাম লিখুন"}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Referral Source */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {isEnglish ? "How did you hear about us? *" : "আমাদের সম্পর্কে কিভাবে জানলেন? *"}
              </Label>
              <RadioGroup value={referralSource} onValueChange={setReferralSource} className="grid grid-cols-2 gap-2">
                {REFERRAL_SOURCES.map((src) => (
                  <label
                    key={src.value}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all text-sm ${
                      referralSource === src.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value={src.value} />
                    <span className="font-medium">
                      {isEnglish ? src.en : src.bn}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Has Complaint */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {isEnglish ? "Any complaints or suggestions?" : "কোনো অভিযোগ বা পরামর্শ আছে?"}
              </Label>
              <RadioGroup value={hasComplaint} onValueChange={setHasComplaint} className="grid grid-cols-2 gap-3">
                {[
                  { value: "no", en: "No", bn: "না" },
                  { value: "yes", en: "Yes", bn: "হ্যাঁ" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      hasComplaint === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value={opt.value} />
                    <span className="text-base font-medium">
                      {isEnglish ? opt.en : opt.bn}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-12 text-base gap-2"
              >
                <ArrowLeft className="h-5 w-5" />
                {isEnglish ? "Back" : "পিছনে"}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isStep2Valid || submitting}
                className="flex-1 h-12 text-base font-semibold gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                {isEnglish ? "Submit" : "জমা দিন"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
