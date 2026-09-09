export const SITE_URL = "https://shahariamath.com";
export const SITE_NAME = "Shaharia Math";

/**
 * Single source of truth for course types & departments.
 * Used by the public Subjects page, admin Subjects form,
 * Subject Content editor and Chapter Management.
 */
export const COURSE_TYPES = [
  'BBA',
  'MBA',
  'BBS',
  'BSS',
  'Honors',
  'SSC',
  'HSC',
  'Job Preparation',
  'General Knowledge',
] as const;

export type CourseTypeValue = (typeof COURSE_TYPES)[number];

export const COURSE_TYPE_LABELS: Record<string, { en: string; bn: string }> = {
  BBA:                 { en: 'BBA',               bn: 'বিবিএ' },
  MBA:                 { en: 'MBA',               bn: 'এমবিএ' },
  BBS:                 { en: 'BBS',               bn: 'বিবিএস' },
  BSS:                 { en: 'BSS',               bn: 'বিএসএস' },
  Honors:              { en: 'Honors',            bn: 'অনার্স' },
  SSC:                 { en: 'SSC',               bn: 'এসএসসি' },
  HSC:                 { en: 'HSC',               bn: 'এইচএসসি' },
  'Job Preparation':   { en: 'Job Preparation',   bn: 'চাকরি প্রস্তুতি' },
  'General Knowledge': { en: 'General Knowledge', bn: 'সাধারণ জ্ঞান' },
};

export const DEPARTMENTS = [
  'accounting',
  'management',
  'finance',
  'marketing',
  'economics',
  'general',
] as const;

export type DepartmentValue = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<string, { en: string; bn: string }> = {
  accounting: { en: 'Accounting', bn: 'একাউন্টিং' },
  management: { en: 'Management', bn: 'ম্যানেজমেন্ট' },
  finance:    { en: 'Finance',    bn: 'ফাইন্যান্স' },
  marketing:  { en: 'Marketing',  bn: 'মার্কেটিং' },
  economics:  { en: 'Economics',  bn: 'ইকোনমিক্স' },
  general:    { en: 'General',    bn: 'সাধারণ' },
};

export const formatDepartment = (d?: string | null) =>
  d ? (DEPARTMENT_LABELS[d.toLowerCase()]?.en ?? (d.charAt(0).toUpperCase() + d.slice(1))) : '—';

export const DEFAULT_PDF_READING_TERMS_TITLE = "📚 PDF বই পড়ার শর্তাবলি";

export const DEFAULT_PDF_READING_TERMS_CONTENT = `১. পেইড ভার্ষণে শুধু অতি গুরুত্বপূর্ণ প্রশ্নগুলোর উত্তর দেওয়া হয়েছে। সব প্রশ্নের উত্তর পেতে মূল বই থেকে পড়তে পারেন।
আর মূল বইয়ের প্রতিটি বিষয় বিস্তারিতভাবে বুঝে প্রস্তুতি নিতে চাইলে আমাদের Paid Course-এ ভর্তি হতে পারেন।

২. PDF শুধুমাত্র অনলাইনে পড়া যাবে।
PDF বইটি আমাদের Apps/Website-এর মাধ্যমে পড়া যাবে, তবে PDF ডাউনলোড করা যাবে না।

৩. PDF পড়ার জন্য ২০ টাকা চার্জ প্রযোজ্য।
২০ টাকা চার্জের বিনিময়ে আপনি পরীক্ষা পর্যন্ত PDF বইটি পড়ার সুযোগ পাবেন। পরীক্ষার পর পুনরায় বইটি পড়তে চাইলে নতুন করে নির্ধারিত চার্জ প্রদান করতে হবে।

৪. একজনের জন্য একজনের অ্যাক্সেস।
২০ টাকা চার্জ প্রদান করে শুধুমাত্র ১ জন শিক্ষার্থী PDF বইটি পড়তে পারবেন। অন্য কারও সঙ্গে অ্যাক্সেস, আইডি বা পাসওয়ার্ড শেয়ার করা যাবে না।

৫. বইয়ের অপব্যবহার সম্পূর্ণ নিষিদ্ধ।
PDF-এর কোনো অংশ কপি, স্ক্রিনশট, রেকর্ড, পুনঃপ্রকাশ, বিক্রি বা অন্য কোনো বই/নোট লেখার কাজে ব্যবহার করা যাবে না।

৬. অনৈতিক বা অবৈধ ব্যবহার করলে দায়ভার সম্পূর্ণ আপনার।
কেউ যদি অসৎ উপায়ে PDF সংগ্রহ করে বিক্রি করেন, অন্যের কাছে বিতরণ করেন অথবা বই/শিক্ষাসামগ্রী তৈরিতে ব্যবহার করেন, তাহলে এর সম্পূর্ণ দায়ভার সংশ্লিষ্ট ব্যক্তির। এ ধরনের কর্মকাণ্ডের জন্য প্রয়োজনীয় ব্যবস্থা নেওয়া হতে পারে।

বিশেষ অনুরোধ:
একজন শিক্ষকের পরিশ্রম, সময় ও মেধার মূল্যায়ন করে শিক্ষাসামগ্রীটি শুধুমাত্র নিজের পড়াশোনার কাজে ব্যবহার করুন।`;
