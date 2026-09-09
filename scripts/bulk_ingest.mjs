import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Read .env
const env = {};
const envContent = fs.readFileSync('.env', 'utf-8');
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [k, v] = line.split('=', 2);
    env[k.trim()] = v.trim().replace(/^["']|["']$/g, '');
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

const DEFAULT_TERMS_TITLE = '📚 PDF বই পড়ার শর্তাবলি';
const DEFAULT_TERMS_CONTENT = `১. পেইড ভার্ষণে শুধু অতি গুরুত্বপূর্ণ প্রশ্নগুলোর উত্তর দেওয়া হয়েছে। সব প্রশ্নের উত্তর পেতে মূল বই থেকে পড়তে পারেন।
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

const SUBJECT_MAP = {
  'business math': { en: 'Business Mathematics', bn: 'ব্যবসায় গণিত' },
  'business mathematics': { en: 'Business Mathematics', bn: 'ব্যবসায় গণিত' },
  'business mathmetics': { en: 'Business Mathematics', bn: 'ব্যবসায় গণিত' },
  'business communication & report writing': { en: 'Business Communication & Report Writing', bn: 'ব্যবসায় যোগাযোগ ও প্রতিবেদন রচনা' },
  'business communication and report writing': { en: 'Business Communication & Report Writing', bn: 'ব্যবসায় যোগাযোগ ও প্রতিবেদন রচনা' },
  'business communication': { en: 'Business Communication', bn: 'ব্যবসায় যোগাযোগ' },
  'macro economics': { en: 'Macro Economics', bn: 'সামষ্টিক অর্থনীতি' },
  'micro economics': { en: 'Micro Economics', bn: 'ব্যষ্টিক অর্থনীতি' },
  'intermediate accounting': { en: 'Intermediate Accounting', bn: 'মধ্যবর্তী হিসাববিজ্ঞান' },
  'taxation in bangladesh': { en: 'Taxation in Bangladesh', bn: 'বাংলাদেশে কর ব্যবস্থা' },
  'business statestics': { en: 'Business Statistics', bn: 'ব্যবসায় পরিসংখ্যান' },
  'ব্যবসায় পরিসংখ্যান': { en: 'Business Statistics', bn: 'ব্যবসায় পরিসংখ্যান' },
  'computer information technology': { en: 'Computer & Information Technology', bn: 'কম্পিউটার ও তথ্য প্রযুক্তি' },
  'computer and information technology': { en: 'Computer & Information Technology', bn: 'কম্পিউটার ও তথ্য প্রযুক্তি' },
  'computer & information technology': { en: 'Computer & Information Technology', bn: 'কম্পিউটার ও তথ্য প্রযুক্তি' },
  'insurance and risk management': { en: 'Insurance and Risk Management', bn: 'বীমা ও ঝুঁকি ব্যবস্থাপনা' },
  'fundamentals of finance': { en: 'Fundamentals of Finance', bn: 'অর্থায়নের মূলনীতি' },
  'principles of finance': { en: 'Principles of Finance', bn: 'অর্থায়নের মূলনীতি' },
  'agricultural marketing': { en: 'Agricultural Marketing', bn: 'কৃষি বাজারজাতকরণ' },
  'human resource management': { en: 'Human Resource Management', bn: 'মানব সম্পদ ব্যবস্থাপনা' },
  'legal environment of business': { en: 'Legal Environment of Business', bn: 'ব্যবসায়ের আইনগত পরিবেশ' },
  'legal aspects of business': { en: 'Legal Aspects of Business', bn: 'ব্যবসায়ের আইনগত দিকসমূহ' },
};

function cleanSubjectName(fname) {
  let name = path.parse(fname).name;
  name = name.replace(/\(.*?\)/g, '');
  name = name.replace(/-?\s*(Acc|Mkt|Mgt|MGT|Acc\.|Mkt\.|Mgt\.)\s*(Paid|free|Free)/gi, '');
  name = name.replace(/\s+(Paid|Free)/gi, '');
  name = name.replace(/\s+/g, ' ').trim();
  return name;
}

const defaultIncludedPresets = [
  { text: 'Complete Part-A, Part-B, Part-C Exam Question & Answer Solution', textBn: 'ক, খ ও গ-বিভাগের শতভাগ নির্ভুল চূড়ান্ত প্রশ্ন ও উত্তর সমাধান' },
  { text: '99% Common Exam Suggestion curated by Oli Sir', textBn: 'অলি স্যারের বিশেষ তত্ত্বাবধানে প্রস্তুতকৃত ৯৯% কমন সাজেশন' },
  { text: 'Exam writing format guidelines by Oli Sir', textBn: 'পরীক্ষায় সর্বোচ্চ নম্বর পাওয়ার স্ট্র্যাটেজি ও খাতা উপস্থাপনের নিয়ম' },
];

async function main() {
  const pdfDir = '/Users/shanaws/Downloads/PDFs';
  console.log(`Starting bulk ingestion from ${pdfDir}...`);

  // Fetch subjects to map subject_id
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, department');

  const subjectList = subjects || [];

  const folders = fs.readdirSync(pdfDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'));

  let totalProcessed = 0;
  let totalUploaded = 0;
  let totalSaved = 0;

  for (const folder of folders) {
    const folderName = folder.name;
    const folderLower = folderName.toLowerCase();

    let dept = 'accounting';
    if (folderLower.includes('marketing')) dept = 'marketing';
    else if (folderLower.includes('management')) dept = 'management';
    else if (folderLower.includes('finance')) dept = 'finance';

    const isFolderFree = folderLower.includes('free');
    const folderPath = path.join(pdfDir, folderName);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.pdf') && !f.startsWith('.'));

    for (const file of files) {
      totalProcessed++;
      const filePath = path.join(folderPath, file);
      const fileBuffer = fs.readFileSync(filePath);
      const fileSize = fs.statSync(filePath).size;

      let isFree = isFolderFree;
      // If filename explicitly says 'paid' or 'free'
      if (file.toLowerCase().includes('paid')) isFree = false;
      else if (file.toLowerCase().includes('free') && isFolderFree) isFree = true;

      const price = isFree ? 0 : 20;
      const originalPrice = isFree ? 0 : 100;

      const cleanSub = cleanSubjectName(file);
      const subInfo = SUBJECT_MAP[cleanSub.toLowerCase()] || { en: cleanSub, bn: cleanSub };

      // Find matching subject_id
      const matchedSubject = subjectList.find(s => 
        s.name.toLowerCase().includes(subInfo.en.toLowerCase()) && 
        (!s.department || s.department.toLowerCase() === dept)
      );

      const deptCapital = dept.charAt(0).toUpperCase() + dept.slice(1);
      const typeEn = isFree ? 'Free PDF Suggestion' : 'Paid PDF Suggestion';
      const typeBn = isFree ? 'ফ্রি পিডিএফ সাজেশন' : 'পেইড পিডিএফ সাজেশন';

      const title = `${subInfo.en} (${deptCapital}) ${typeEn} (2nd Year)`;
      const titleBn = `${subInfo.bn} (${deptCapital}) ${typeBn} (২য় বর্ষ)`;
      const slug = `${subInfo.en.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${dept}-2nd-year-${isFree ? 'free' : 'paid'}-pdf-suggestion`.replace(/-+/g, '-');

      // Upload to Supabase Storage
      const storagePath = `suggestions/2nd-year/${dept}/${isFree ? 'free' : 'paid'}/${Date.now()}_${file.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      console.log(`\n[${totalProcessed}] Uploading: ${file}`);
      console.log(`    Title: ${title}`);
      console.log(`    Dept: ${dept} | Year: [2] | Price: ৳${price}`);

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('course-pdfs')
        .upload(storagePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadErr) {
        console.error(`    ❌ Storage upload failed:`, uploadErr.message);
        continue;
      }

      totalUploaded++;
      const fileUrl = storagePath;
      const id = crypto.randomUUID();

      // Insert into pdf_suggestions
      const payload = {
        id,
        subject_id: matchedSubject ? matchedSubject.id : null,
        title,
        title_bn: titleBn,
        slug,
        department: dept,
        course_type: 'BBA',
        compatible_years: [2],
        subject_type: 'Theory',
        is_free: isFree,
        price,
        original_price: originalPrice,
        description: `${subInfo.en} BBA 2nd Year exclusive ${isFree ? 'Free Sample' : 'Complete Paid Solution'} for ${deptCapital} Department.`,
        description_bn: `${deptCapital} বিভাগের BBA ২য় বর্ষের ${subInfo.bn} বিষয়ের জন্য অলি স্যারের এক্সক্লুসিভ ${isFree ? 'ফ্রি স্যাম্পল' : 'পূর্ণাঙ্গ পেইড সমাধান'}।`,
        whats_included: isFree ? [] : defaultIncludedPresets,
        file_url: fileUrl,
        file_name: file,
        file_size_bytes: fileSize,
        free_pdf_url: isFree ? fileUrl : null,
        free_pdf_name: isFree ? file : null,
        free_pdf_size_bytes: isFree ? fileSize : 0,
        paid_pdf_url: !isFree ? fileUrl : null,
        paid_pdf_name: !isFree ? file : null,
        paid_pdf_size_bytes: !isFree ? fileSize : 0,
        is_free_available: isFree,
        is_paid_available: !isFree,
        is_visible: true,
        display_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase
        .from('pdf_suggestions')
        .upsert(payload, { onConflict: 'id' });

      if (insertErr) {
        console.error(`    ❌ DB Insert Error (pdf_suggestions):`, insertErr.message);
      } else {
        // Also dual-sync to course_pdfs
        await supabase.from('course_pdfs').upsert({
          id,
          title: payload.title,
          title_bn: payload.title_bn,
          subject_id: payload.subject_id,
          department: payload.department,
          target_years: [2],
          file_url: payload.file_url,
          file_size_bytes: payload.file_size_bytes,
          is_free: payload.is_free,
          is_visible: true,
          display_order: 0,
        });

        totalSaved++;
        console.log(`    ✅ Successfully Published & Synced!`);
      }
    }
  }

  console.log(`\n🎉 Ingestion Complete!`);
  console.log(`Total files found: ${totalProcessed}`);
  console.log(`Total files uploaded to storage: ${totalUploaded}`);
  console.log(`Total suggestions published to DB: ${totalSaved}`);
}

main().catch(console.error);
