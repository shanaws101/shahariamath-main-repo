
-- Add new columns to subjects table
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS subject_type text DEFAULT 'Theory';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS course_type text DEFAULT 'BBA';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS department text;

-- Clear existing subjects to replace with comprehensive list
DELETE FROM public.subjects;

-- Insert all 162 subjects from Excel data
-- BBA - Accounting - 1st Year
INSERT INTO public.subjects (name, name_bn, slug, department, compatible_years, subject_type, course_type, price, is_visible) VALUES
('History of Bangladesh: Language, Culture and Identity', 'বাংলাদেশের ইতিহাস: ভাষা, সংস্কৃতি ও পরিচয়', 'bba-accounting-history-of-bangladesh', 'accounting', '{1}', 'Theory', 'BBA', 0, true),
('Information and Communication Technology', 'তথ্য ও যোগাযোগ প্রযুক্তি', 'bba-accounting-ict-1st', 'accounting', '{1}', 'Theory', 'BBA', 0, true),
('Micro Economics', 'মাইক্রো ইকোনমিক্স', 'bba-accounting-micro-economics', 'accounting', '{1}', 'Theory+Graph', 'BBA', 0, true),
('Principles of Accounting', 'হিসাববিজ্ঞানের মূলনীতি', 'bba-accounting-principles-of-accounting', 'accounting', '{1}', 'Math', 'BBA', 0, true),
('Principles of Finance', 'অর্থায়নের মূলনীতি', 'bba-accounting-principles-of-finance', 'accounting', '{1}', 'Math', 'BBA', 0, true),
('Principles of Management', 'ব্যবস্থাপনার মূলনীতি', 'bba-accounting-principles-of-management', 'accounting', '{1}', 'Theory', 'BBA', 0, true),
('Introduction to Business', 'ব্যবসায় পরিচিতি', 'bba-accounting-intro-to-business', 'accounting', '{1}', 'Theory', 'BBA', 0, true),
('Principles of Marketing', 'বিপণনের মূলনীতি', 'bba-accounting-principles-of-marketing', 'accounting', '{1}', 'Theory', 'BBA', 0, true),

-- BBA - Accounting - 2nd Year
('Computer and Information Technology', 'কম্পিউটার ও তথ্য প্রযুক্তি', 'bba-accounting-cit-2nd', 'accounting', '{2}', 'Theory', 'BBA', 0, true),
('Taxation in Bangladesh', 'বাংলাদেশে কর ব্যবস্থা', 'bba-accounting-taxation', 'accounting', '{2}', 'Math', 'BBA', 0, true),
('Intermediate Accounting', 'মধ্যবর্তী হিসাববিজ্ঞান', 'bba-accounting-intermediate-accounting', 'accounting', '{2}', 'Math', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-accounting-business-math-2nd', 'accounting', '{2}', 'Math', 'BBA', 0, true),
('Business Statistics', 'ব্যবসায় পরিসংখ্যান', 'bba-accounting-business-stats-2nd', 'accounting', '{2}', 'Math', 'BBA', 0, true),
('Macro Economics', 'ম্যাক্রো ইকোনমিক্স', 'bba-accounting-macro-economics', 'accounting', '{2}', 'Theory+Graph', 'BBA', 0, true),
('Business Communication and Report Writing', 'ব্যবসায় যোগাযোগ ও রিপোর্ট লেখা', 'bba-accounting-communication-2nd', 'accounting', '{2}', 'Theory', 'BBA', 0, true),

-- BBA - Accounting - 3rd Year
('Audit and Assurance', 'অডিট ও নিশ্চয়তা', 'bba-accounting-audit-assurance', 'accounting', '{3}', 'Theory', 'BBA', 0, true),
('Advanced Accounting-I', 'উচ্চতর হিসাববিজ্ঞান-১', 'bba-accounting-advanced-accounting-1', 'accounting', '{3}', 'Math', 'BBA', 0, true),
('Cost Accounting', 'ব্যয় হিসাববিজ্ঞান', 'bba-accounting-cost-accounting', 'accounting', '{3}', 'Math', 'BBA', 0, true),
('Management Accounting', 'ব্যবস্থাপনা হিসাববিজ্ঞান', 'bba-accounting-management-accounting', 'accounting', '{3}', 'Math', 'BBA', 0, true),
('Business and Commercial Laws', 'ব্যবসায় ও বাণিজ্যিক আইন', 'bba-accounting-business-laws', 'accounting', '{3}', 'Theory', 'BBA', 0, true),
('Entrepreneurship', 'উদ্যোক্তা', 'bba-accounting-entrepreneurship', 'accounting', '{3}', 'Theory', 'BBA', 0, true),
('Financial Management', 'আর্থিক ব্যবস্থাপনা', 'bba-accounting-financial-management', 'accounting', '{3}', 'Math', 'BBA', 0, true),
('Banking and Insurance Theories, Laws and Accounts', 'ব্যাংকিং ও বীমা তত্ত্ব, আইন ও হিসাব', 'bba-accounting-banking-insurance', 'accounting', '{3}', 'Theory', 'BBA', 0, true),

-- BBA - Accounting - 4th Year
('Accounting Theory', 'হিসাববিজ্ঞান তত্ত্ব', 'bba-accounting-accounting-theory', 'accounting', '{4}', 'Math', 'BBA', 0, true),
('Advanced Auditing & Professional Ethics', 'উচ্চতর অডিটিং ও পেশাগত নীতি', 'bba-accounting-advanced-auditing', 'accounting', '{4}', 'Theory', 'BBA', 0, true),
('Accounting Information Systems', 'হিসাববিজ্ঞান তথ্য ব্যবস্থা', 'bba-accounting-ais', 'accounting', '{4}', 'Theory', 'BBA', 0, true),
('Organizational Behavior', 'সাংগঠনিক আচরণ', 'bba-accounting-org-behavior', 'accounting', '{4}', 'Theory', 'BBA', 0, true),
('Corporate Law and Practices', 'কর্পোরেট আইন ও চর্চা', 'bba-accounting-corporate-law', 'accounting', '{4}', 'Theory', 'BBA', 0, true),
('Working Capital Management And Financial Statement Analysis', 'কার্যকরী মূলধন ব্যবস্থাপনা ও আর্থিক বিবরণী বিশ্লেষণ', 'bba-accounting-working-capital', 'accounting', '{4}', 'Math', 'BBA', 0, true),
('Advanced Accounting-II', 'উচ্চতর হিসাববিজ্ঞান-২', 'bba-accounting-advanced-accounting-2', 'accounting', '{4}', 'Math', 'BBA', 0, true),
('Investment Analysis and Portfolio Management', 'বিনিয়োগ বিশ্লেষণ ও পোর্টফোলিও ব্যবস্থাপনা', 'bba-accounting-investment-analysis', 'accounting', '{4}', 'Math', 'BBA', 0, true),
('Research Methodology (In English)', 'গবেষণা পদ্ধতি (ইংরেজিতে)', 'bba-accounting-research-methodology', 'accounting', '{4}', 'Math', 'BBA', 0, true),
('Viva-voce', 'মৌখিক পরীক্ষা', 'bba-accounting-viva-voce', 'accounting', '{4}', 'Theory', 'BBA', 0, true),

-- BBA - Management - 1st Year
('History of Bangladesh: Language, Culture, and Identity', 'বাংলাদেশের ইতিহাস: ভাষা, সংস্কৃতি ও পরিচয়', 'bba-management-history-of-bangladesh', 'management', '{1}', 'Theory', 'BBA', 0, true),
('Information and Communication Technology', 'তথ্য ও যোগাযোগ প্রযুক্তি', 'bba-management-ict-1st', 'management', '{1}', 'Theory', 'BBA', 0, true),
('Business Environment and Sustainability', 'ব্যবসায় পরিবেশ ও টেকসইতা', 'bba-management-business-environment', 'management', '{1}', 'Theory', 'BBA', 0, true),
('Micro Economics', 'মাইক্রো ইকোনমিক্স', 'bba-management-micro-economics', 'management', '{1}', 'Theory+Graph', 'BBA', 0, true),
('Introduction to Business', 'ব্যবসায় পরিচিতি', 'bba-management-intro-to-business', 'management', '{1}', 'Theory', 'BBA', 0, true),
('Principles of Management', 'ব্যবস্থাপনার মূলনীতি', 'bba-management-principles-of-management', 'management', '{1}', 'Theory', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-management-business-math-1st', 'management', '{1}', 'Math', 'BBA', 0, true),
('Business Communication', 'ব্যবসায় যোগাযোগ', 'bba-management-business-communication-1st', 'management', '{1}', 'Theory', 'BBA', 0, true),

-- BBA - Management - 2nd Year
('Human Resource Management', 'মানব সম্পদ ব্যবস্থাপনা', 'bba-management-hrm-2nd', 'management', '{2}', 'Theory', 'BBA', 0, true),
('Business Communication', 'ব্যবসায় যোগাযোগ', 'bba-management-business-communication-2nd', 'management', '{2}', 'Theory', 'BBA', 0, true),
('Legal Environment of Business', 'ব্যবসায়ের আইনি পরিবেশ', 'bba-management-legal-environment', 'management', '{2}', 'Theory', 'BBA', 0, true),
('Principles of Finance', 'অর্থায়নের মূলনীতি', 'bba-management-principles-of-finance', 'management', '{2}', 'Math', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-management-business-math-2nd', 'management', '{2}', 'Math', 'BBA', 0, true),
('Computer and Information Technology', 'কম্পিউটার ও তথ্য প্রযুক্তি', 'bba-management-cit-2nd', 'management', '{2}', 'Theory', 'BBA', 0, true),
('Macro Economics', 'ম্যাক্রো ইকোনমিক্স', 'bba-management-macro-economics', 'management', '{2}', 'Theory+Graph', 'BBA', 0, true),

-- BBA - Management - 3rd Year
('Operations Management', 'অপারেশনস ম্যানেজমেন্ট', 'bba-management-operations-management', 'management', '{3}', 'Theory', 'BBA', 0, true),
('Business Statistics', 'ব্যবসায় পরিসংখ্যান', 'bba-management-business-stats-3rd', 'management', '{3}', 'Math', 'BBA', 0, true),
('Organizational Behavior', 'সাংগঠনিক আচরণ', 'bba-management-org-behavior', 'management', '{3}', 'Theory', 'BBA', 0, true),
('Taxation in Bangladesh', 'বাংলাদেশে কর ব্যবস্থা', 'bba-management-taxation', 'management', '{3}', 'Math', 'BBA', 0, true),
('Insurance & Risk Management', 'বীমা ও ঝুঁকি ব্যবস্থাপনা', 'bba-management-insurance-risk', 'management', '{3}', 'Theory', 'BBA', 0, true),
('Company Law', 'কোম্পানি আইন', 'bba-management-company-law', 'management', '{3}', 'Theory', 'BBA', 0, true),
('Management Accounting', 'ব্যবস্থাপনা হিসাববিজ্ঞান', 'bba-management-management-accounting', 'management', '{3}', 'Math', 'BBA', 0, true),
('Marketing Management', 'মার্কেটিং ম্যানেজমেন্ট', 'bba-management-marketing-management', 'management', '{3}', 'Theory', 'BBA', 0, true),

-- BBA - Management - 4th Year
('Bank Management', 'ব্যাংক ব্যবস্থাপনা', 'bba-management-bank-management', 'management', '{4}', 'Theory', 'BBA', 0, true),
('Financial Management', 'আর্থিক ব্যবস্থাপনা', 'bba-management-financial-management', 'management', '{4}', 'Math', 'BBA', 0, true),
('Supply Chain Management', 'সাপ্লাই চেইন ম্যানেজমেন্ট', 'bba-management-supply-chain', 'management', '{4}', 'Theory', 'BBA', 0, true),
('Industrial Relations', 'শিল্প সম্পর্ক', 'bba-management-industrial-relations', 'management', '{4}', 'Theory', 'BBA', 0, true),
('Project Management', 'প্রকল্প ব্যবস্থাপনা', 'bba-management-project-management', 'management', '{4}', 'Math', 'BBA', 0, true),
('International Trade', 'আন্তর্জাতিক বাণিজ্য', 'bba-management-international-trade', 'management', '{4}', 'Theory', 'BBA', 0, true),
('Investment Management', 'বিনিয়োগ ব্যবস্থাপনা', 'bba-management-investment-management', 'management', '{4}', 'Math', 'BBA', 0, true),
('Bangladesh Economy', 'বাংলাদেশ অর্থনীতি', 'bba-management-bangladesh-economy', 'management', '{4}', 'Theory', 'BBA', 0, true),
('Entrepreneurship', 'উদ্যোক্তা', 'bba-management-entrepreneurship', 'management', '{4}', 'Theory', 'BBA', 0, true),
('Viva-voce', 'মৌখিক পরীক্ষা', 'bba-management-viva-voce', 'management', '{4}', 'Theory', 'BBA', 0, true),

-- BBA - Finance - 1st Year
('History of Bangladesh: Language, Culture, and Identity', 'বাংলাদেশের ইতিহাস: ভাষা, সংস্কৃতি ও পরিচয়', 'bba-finance-history-of-bangladesh', 'finance', '{1}', 'Theory', 'BBA', 0, true),
('Information and Communication Technology', 'তথ্য ও যোগাযোগ প্রযুক্তি', 'bba-finance-ict-1st', 'finance', '{1}', 'Theory', 'BBA', 0, true),
('Business Communication', 'ব্যবসায় যোগাযোগ', 'bba-finance-business-communication', 'finance', '{1}', 'Theory', 'BBA', 0, true),
('Principles of Accounting', 'হিসাববিজ্ঞানের মূলনীতি', 'bba-finance-principles-of-accounting', 'finance', '{1}', 'Theory', 'BBA', 0, true),
('Micro Economics', 'মাইক্রো ইকোনমিক্স', 'bba-finance-micro-economics', 'finance', '{1}', 'Theory+Graph', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-finance-business-math-1st', 'finance', '{1}', 'Math', 'BBA', 0, true),
('Principles of Finance', 'অর্থায়নের মূলনীতি', 'bba-finance-principles-of-finance', 'finance', '{1}', 'Math', 'BBA', 0, true),
('Introduction to Business', 'ব্যবসায় পরিচিতি', 'bba-finance-intro-to-business', 'finance', '{1}', 'Theory', 'BBA', 0, true),

-- BBA - Finance - 2nd Year
('Business Statistics', 'ব্যবসায় পরিসংখ্যান', 'bba-finance-business-stats-2nd', 'finance', '{2}', 'Math', 'BBA', 0, true),
('Macro Economics', 'ম্যাক্রো ইকোনমিক্স', 'bba-finance-macro-economics', 'finance', '{2}', 'Theory', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-finance-business-math-2nd', 'finance', '{2}', 'Math', 'BBA', 0, true),
('Law and Practices of Banking and Insurance', 'ব্যাংকিং ও বীমার আইন ও চর্চা', 'bba-finance-banking-insurance-law', 'finance', '{2}', 'Theory', 'BBA', 0, true),
('Computer and Information Technology', 'কম্পিউটার ও তথ্য প্রযুক্তি', 'bba-finance-cit-2nd', 'finance', '{2}', 'Theory', 'BBA', 0, true),
('Legal Aspects of Business', 'ব্যবসায়ের আইনি দিক', 'bba-finance-legal-aspects', 'finance', '{2}', 'Theory', 'BBA', 0, true),
('Business Communication and Report Writing', 'ব্যবসায় যোগাযোগ ও রিপোর্ট লেখা', 'bba-finance-communication-2nd', 'finance', '{2}', 'Theory', 'BBA', 0, true),

-- BBA - Finance - 3rd Year
('Portfolio Management', 'পোর্টফোলিও ব্যবস্থাপনা', 'bba-finance-portfolio-management', 'finance', '{3}', 'Math', 'BBA', 0, true),
('Financial Analysis & Control', 'আর্থিক বিশ্লেষণ ও নিয়ন্ত্রণ', 'bba-finance-financial-analysis', 'finance', '{3}', 'Math', 'BBA', 0, true),
('Entrepreneurship', 'উদ্যোক্তা', 'bba-finance-entrepreneurship', 'finance', '{3}', 'Theory', 'BBA', 0, true),
('Management Accounting', 'ব্যবস্থাপনা হিসাববিজ্ঞান', 'bba-finance-management-accounting', 'finance', '{3}', 'Math', 'BBA', 0, true),
('Auditing', 'অডিটিং', 'bba-finance-auditing', 'finance', '{3}', 'Theory', 'BBA', 0, true),
('Islamic Banking', 'ইসলামিক ব্যাংকিং', 'bba-finance-islamic-banking', 'finance', '{3}', 'Theory', 'BBA', 0, true),
('Marketing of Financial Service', 'আর্থিক সেবার বিপণন', 'bba-finance-marketing-financial-service', 'finance', '{3}', 'Theory', 'BBA', 0, true),
('Financial Management', 'আর্থিক ব্যবস্থাপনা', 'bba-finance-financial-management', 'finance', '{3}', 'Math', 'BBA', 0, true),

-- BBA - Finance - 4th Year
('International Trade and Finance', 'আন্তর্জাতিক বাণিজ্য ও অর্থায়ন', 'bba-finance-intl-trade-finance', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Public Finance and Taxation', 'সরকারি অর্থায়ন ও কর', 'bba-finance-public-finance', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Financial Market and Institutions', 'আর্থিক বাজার ও প্রতিষ্ঠান', 'bba-finance-financial-market', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Comparative Financial System', 'তুলনামূলক আর্থিক ব্যবস্থা', 'bba-finance-comparative-financial', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Human Resource Management', 'মানব সম্পদ ব্যবস্থাপনা', 'bba-finance-hrm-4th', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Business Research Methodology', 'ব্যবসায় গবেষণা পদ্ধতি', 'bba-finance-research-methodology', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('SME and Micro Finance', 'এসএমই ও ক্ষুদ্র অর্থায়ন', 'bba-finance-sme-micro-finance', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('E-Banking & E-Commerce', 'ই-ব্যাংকিং ও ই-কমার্স', 'bba-finance-ebanking-ecommerce', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Central Banking', 'কেন্দ্রীয় ব্যাংকিং', 'bba-finance-central-banking', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Viva-Voce', 'মৌখিক পরীক্ষা', 'bba-finance-viva-voce', 'finance', '{4}', 'Theory', 'BBA', 0, true),

-- BBA - Marketing - 1st Year
('History of Bangladesh: Language, Culture, and Identity', 'বাংলাদেশের ইতিহাস: ভাষা, সংস্কৃতি ও পরিচয়', 'bba-marketing-history-of-bangladesh', 'marketing', '{1}', 'Theory', 'BBA', 0, true),
('Information and Communication Technology', 'তথ্য ও যোগাযোগ প্রযুক্তি', 'bba-marketing-ict-1st', 'marketing', '{1}', 'Theory', 'BBA', 0, true),
('Business Environment and Sustainability', 'ব্যবসায় পরিবেশ ও টেকসইতা', 'bba-marketing-business-environment', 'marketing', '{1}', 'Theory', 'BBA', 0, true),
('Business Communication', 'ব্যবসায় যোগাযোগ', 'bba-marketing-business-communication', 'marketing', '{1}', 'Theory', 'BBA', 0, true),
('Micro Economics', 'মাইক্রো ইকোনমিক্স', 'bba-marketing-micro-economics', 'marketing', '{1}', 'Theory+Graph', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-marketing-business-math-1st', 'marketing', '{1}', 'Math', 'BBA', 0, true),
('Introduction to Business', 'ব্যবসায় পরিচিতি', 'bba-marketing-intro-to-business', 'marketing', '{1}', 'Theory', 'BBA', 0, true),
('Principles of Marketing', 'বিপণনের মূলনীতি', 'bba-marketing-principles-of-marketing', 'marketing', '{1}', 'Theory', 'BBA', 0, true),

-- BBA - Marketing - 2nd Year
('Business Communication', 'ব্যবসায় যোগাযোগ', 'bba-marketing-business-communication-2nd', 'marketing', '{2}', 'Theory', 'BBA', 0, true),
('Fundamentals of Finance', 'অর্থায়নের মৌলিক বিষয়', 'bba-marketing-fundamentals-of-finance', 'marketing', '{2}', 'Math', 'BBA', 0, true),
('Business Statistics', 'ব্যবসায় পরিসংখ্যান', 'bba-marketing-business-stats-2nd', 'marketing', '{2}', 'Math', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-marketing-business-math-2nd', 'marketing', '{2}', 'Math', 'BBA', 0, true),
('Insurance and Risk Management', 'বীমা ও ঝুঁকি ব্যবস্থাপনা', 'bba-marketing-insurance-risk', 'marketing', '{2}', 'Theory', 'BBA', 0, true),
('Micro Economics', 'মাইক্রো ইকোনমিক্স', 'bba-marketing-micro-economics-2nd', 'marketing', '{2}', 'Theory', 'BBA', 0, true),
('Agricultural Marketing', 'কৃষি বিপণন', 'bba-marketing-agricultural-marketing', 'marketing', '{2}', 'Theory', 'BBA', 0, true),

-- BBA - Marketing - 3rd Year
('Principles of Marketing-II', 'বিপণনের মূলনীতি-২', 'bba-marketing-principles-of-marketing-2', 'marketing', '{3}', 'Math', 'BBA', 0, true),
('Organizational Behavior', 'সাংগঠনিক আচরণ', 'bba-marketing-org-behavior', 'marketing', '{3}', 'Theory', 'BBA', 0, true),
('Financial Management', 'আর্থিক ব্যবস্থাপনা', 'bba-marketing-financial-management', 'marketing', '{3}', 'Math', 'BBA', 0, true),
('Business Statistics-II', 'ব্যবসায় পরিসংখ্যান-২', 'bba-marketing-business-stats-2', 'marketing', '{3}', 'Math', 'BBA', 0, true),
('Advertising & Promotion', 'বিজ্ঞাপন ও প্রচার', 'bba-marketing-advertising-promotion', 'marketing', '{3}', 'Theory', 'BBA', 0, true),
('Legal Aspects of Marketing', 'বিপণনের আইনি দিক', 'bba-marketing-legal-aspects', 'marketing', '{3}', 'Theory', 'BBA', 0, true),
('Macro Economics', 'ম্যাক্রো ইকোনমিক্স', 'bba-marketing-macro-economics', 'marketing', '{3}', 'Theory', 'BBA', 0, true),
('Taxation in Bangladesh', 'বাংলাদেশে কর ব্যবস্থা', 'bba-marketing-taxation', 'marketing', '{3}', 'Math', 'BBA', 0, true),

-- BBA - Marketing - 4th Year
('Marketing Management', 'মার্কেটিং ম্যানেজমেন্ট', 'bba-marketing-marketing-management', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Human Resource Management', 'মানব সম্পদ ব্যবস্থাপনা', 'bba-marketing-hrm-4th', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('International Business', 'আন্তর্জাতিক ব্যবসায়', 'bba-marketing-intl-business', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Consumer Behavior', 'ভোক্তা আচরণ', 'bba-marketing-consumer-behavior', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Sales Management', 'বিক্রয় ব্যবস্থাপনা', 'bba-marketing-sales-management', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Brand Management', 'ব্র্যান্ড ম্যানেজমেন্ট', 'bba-marketing-brand-management', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Entrepreneurship Development', 'উদ্যোক্তা উন্নয়ন', 'bba-marketing-entrepreneurship', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Bangladesh Economics', 'বাংলাদেশ অর্থনীতি', 'bba-marketing-bangladesh-economics', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Marketing Research', 'মার্কেটিং রিসার্চ', 'bba-marketing-marketing-research', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Viva-voce', 'মৌখিক পরীক্ষা', 'bba-marketing-viva-voce', 'marketing', '{4}', 'Theory', 'BBA', 0, true),

-- Job Preparation - General
('Bangla', 'বাংলা', 'job-prep-bangla', 'general', NULL, 'N/A', 'Job Preparation', 0, true),
('English', 'ইংরেজি', 'job-prep-english', 'general', NULL, 'N/A', 'Job Preparation', 0, true),
('General Knowledge', 'সাধারণ জ্ঞান', 'job-prep-general-knowledge', 'general', NULL, 'N/A', 'Job Preparation', 0, true),
('General Mathematics', 'সাধারণ গণিত', 'job-prep-general-math', 'general', NULL, 'N/A', 'Job Preparation', 0, true),

-- Statistics Courses
('Social Statistics', 'সামাজিক পরিসংখ্যান', 'stats-social-statistics', 'statistics', NULL, 'Math', 'Statistics Courses', 0, true),
('Business Statistics', 'ব্যবসায় পরিসংখ্যান', 'stats-business-statistics', 'statistics', NULL, 'Math', 'Statistics Courses', 0, true),
('Statistics for Economics', 'অর্থনীতির জন্য পরিসংখ্যান', 'stats-statistics-for-economics', 'statistics', NULL, 'Math', 'Statistics Courses', 0, true),
('Basis Statistics', 'মৌলিক পরিসংখ্যান', 'stats-basis-statistics', 'statistics', NULL, 'Math', 'Statistics Courses', 0, true),
('Research Methodology and Statistics', 'গবেষণা পদ্ধতি ও পরিসংখ্যান', 'stats-research-methodology', 'statistics', NULL, 'Math', 'Statistics Courses', 0, true),
('Social Research & Statistics', 'সামাজিক গবেষণা ও পরিসংখ্যান', 'stats-social-research', 'statistics', NULL, 'Math', 'Statistics Courses', 0, true),

-- BSS (Honours) - Economics
('Basis Mathematics', 'মৌলিক গণিত', 'bss-economics-basis-math', 'economics', NULL, 'Math', 'BSS (Honours)', 0, true),
('Mathematical Economics', 'গাণিতিক অর্থনীতি', 'bss-economics-mathematical-economics', 'economics', NULL, 'Math', 'BSS (Honours)', 0, true),

-- Honours - 2nd Year
('Compulsory English Honours 2nd Year', 'আবশ্যিক ইংরেজি অনার্স ২য় বর্ষ', 'honours-compulsory-english-2nd', 'general', '{2}', 'N/A', 'Honours', 0, true),

-- MBA - Management
('Management Thought', 'ব্যবস্থাপনা চিন্তাধারা', 'mba-management-management-thought', 'management', NULL, 'Theory', 'MBA', 0, true),
('International Business', 'আন্তর্জাতিক ব্যবসায়', 'mba-management-intl-business', 'management', NULL, 'Theory', 'MBA', 0, true),
('Business Research', 'ব্যবসায় গবেষণা', 'mba-management-business-research', 'management', NULL, 'Theory', 'MBA', 0, true),
('Strategic Management', 'কৌশলগত ব্যবস্থাপনা', 'mba-management-strategic-management', 'management', NULL, 'Math', 'MBA', 0, true),
('Management Information System', 'ব্যবস্থাপনা তথ্য ব্যবস্থা', 'mba-management-mis', 'management', NULL, 'Theory', 'MBA', 0, true),
('Training and Development', 'প্রশিক্ষণ ও উন্নয়ন', 'mba-management-training-development', 'management', NULL, 'Theory', 'MBA', 0, true),
('Compensation Management', 'ক্ষতিপূরণ ব্যবস্থাপনা', 'mba-management-compensation', 'management', NULL, 'Theory', 'MBA', 0, true),
('Term Paper', 'টার্ম পেপার', 'mba-management-term-paper', 'management', NULL, 'Theory', 'MBA', 0, true),
('Viva-Voce', 'মৌখিক পরীক্ষা', 'mba-management-viva-voce', 'management', NULL, 'Theory', 'MBA', 0, true),

-- MBA - Accounting
('Applied Accounting Theory', 'ফলিত হিসাববিজ্ঞান তত্ত্ব', 'mba-accounting-applied-accounting', 'accounting', NULL, 'Math', 'MBA', 0, true),
('Advanced Cost Accounting', 'উচ্চতর ব্যয় হিসাববিজ্ঞান', 'mba-accounting-advanced-cost-accounting', 'accounting', NULL, 'Math', 'MBA', 0, true),
('Strategic Management Accounting', 'কৌশলগত ব্যবস্থাপনা হিসাববিজ্ঞান', 'mba-accounting-strategic-mgmt-accounting', 'accounting', NULL, 'Math', 'MBA', 0, true),
('Strategic Management', 'কৌশলগত ব্যবস্থাপনা', 'mba-accounting-strategic-management', 'accounting', NULL, 'Theory', 'MBA', 0, true),
('Corporate Governance', 'কর্পোরেট গভর্নেন্স', 'mba-accounting-corporate-governance', 'accounting', NULL, 'Theory', 'MBA', 0, true),
('Corporate Financial Reporting', 'কর্পোরেট আর্থিক প্রতিবেদন', 'mba-accounting-corporate-financial-reporting', 'accounting', NULL, 'Math', 'MBA', 0, true),
('Corporate Tax Planning', 'কর্পোরেট কর পরিকল্পনা', 'mba-accounting-corporate-tax-planning', 'accounting', NULL, 'Math', 'MBA', 0, true),
('Term Paper', 'টার্ম পেপার', 'mba-accounting-term-paper', 'accounting', NULL, 'Math', 'MBA', 0, true);
