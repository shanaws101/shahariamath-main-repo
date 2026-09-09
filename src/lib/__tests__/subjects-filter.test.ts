import { describe, it, expect } from 'vitest';
import {
  filterSubjects,
  resolveEffectiveFilters,
  type SubjectLike,
} from '@/lib/subjects-filter';

const make = (overrides: Partial<SubjectLike> & Pick<SubjectLike, 'id'>): SubjectLike => ({
  name: 'Subject ' + overrides.id,
  name_bn: 'বিষয় ' + overrides.id,
  department: 'marketing',
  course_type: 'BBA',
  compatible_years: [1, 2, 3, 4],
  ...overrides,
});

const subjects: SubjectLike[] = [
  make({ id: '1', department: 'marketing', course_type: 'BBA', compatible_years: [1, 2] }),
  make({ id: '2', department: 'marketing', course_type: 'BBA', compatible_years: [3] }),
  make({ id: '3', department: 'finance',   course_type: 'BBA', compatible_years: [1, 2, 3, 4] }),
  make({ id: '4', department: 'accounting', course_type: 'BBA', compatible_years: [4] }),
  make({ id: '5', department: 'general',   course_type: 'Job Preparation', compatible_years: [1] }),
  make({ id: '6', name: 'Calculus', name_bn: 'ক্যালকুলাস', department: 'marketing', course_type: 'BBA', compatible_years: [1] }),
];

describe('resolveEffectiveFilters', () => {
  it('locks dept + course for logged-in student with profile.department', () => {
    const r = resolveEffectiveFilters({
      profile: { department: 'finance', course_type: 'BBA' },
      isLoggedIn: true,
      course: 'all',
      dept: 'all',
    });
    expect(r.isStudentLocked).toBe(true);
    expect(r.effectiveDept).toBe('finance');
    expect(r.effectiveCourse).toBe('BBA');
  });

  it('falls back to BBA when student has no course_type set', () => {
    const r = resolveEffectiveFilters({
      profile: { department: 'marketing' },
      isLoggedIn: true,
      course: 'all',
      dept: 'all',
    });
    expect(r.effectiveCourse).toBe('BBA');
  });

  it('does NOT lock for anonymous visitors — uses their selected filters', () => {
    const r = resolveEffectiveFilters({
      profile: null,
      isLoggedIn: false,
      course: 'MBA',
      dept: 'finance',
    });
    expect(r.isStudentLocked).toBe(false);
    expect(r.effectiveCourse).toBe('MBA');
    expect(r.effectiveDept).toBe('finance');
  });

  it('does NOT lock when logged in but profile has no department', () => {
    const r = resolveEffectiveFilters({
      profile: { department: null },
      isLoggedIn: true,
      course: 'all',
      dept: 'accounting',
    });
    expect(r.isStudentLocked).toBe(false);
    expect(r.effectiveDept).toBe('accounting');
  });
});

describe('filterSubjects — student-locked', () => {
  it('returns ONLY the student department subjects (all years)', () => {
    const result = filterSubjects({
      subjects,
      profile: { department: 'marketing', course_type: 'BBA' },
      isLoggedIn: true,
      course: 'all',  // ignored
      dept: 'all',    // ignored
      year: null,
      search: '',
    });
    expect(result.map(s => s.id).sort()).toEqual(['1', '2', '6']);
  });

  it('still respects year filter on top of the dept lock', () => {
    const result = filterSubjects({
      subjects,
      profile: { department: 'marketing' },
      isLoggedIn: true,
      course: 'all',
      dept: 'all',
      year: 3,
      search: '',
    });
    expect(result.map(s => s.id)).toEqual(['2']);
  });

  it('cannot be tricked by the visitor-style dept selector', () => {
    // Student tries to view 'finance' but is locked to 'marketing'
    const result = filterSubjects({
      subjects,
      profile: { department: 'marketing' },
      isLoggedIn: true,
      course: 'all',
      dept: 'finance',
      year: null,
      search: '',
    });
    expect(result.every(s => s.department === 'marketing')).toBe(true);
  });
});

describe('filterSubjects — anonymous visitor', () => {
  it('returns everything when filters are "all"', () => {
    const result = filterSubjects({
      subjects,
      profile: null,
      isLoggedIn: false,
      course: 'all',
      dept: 'all',
      year: null,
      search: '',
    });
    expect(result).toHaveLength(subjects.length);
  });

  it('filters by chosen course type', () => {
    const result = filterSubjects({
      subjects,
      profile: null,
      isLoggedIn: false,
      course: 'Job Preparation',
      dept: 'all',
      year: null,
      search: '',
    });
    expect(result.map(s => s.id)).toEqual(['5']);
  });

  it('filters by chosen department', () => {
    const result = filterSubjects({
      subjects,
      profile: null,
      isLoggedIn: false,
      course: 'all',
      dept: 'finance',
      year: null,
      search: '',
    });
    expect(result.map(s => s.id)).toEqual(['3']);
  });

  it('search matches English name (case-insensitive)', () => {
    const result = filterSubjects({
      subjects,
      profile: null,
      isLoggedIn: false,
      course: 'all',
      dept: 'all',
      year: null,
      search: 'calc',
    });
    expect(result.map(s => s.id)).toEqual(['6']);
  });

  it('search matches Bangla name', () => {
    const result = filterSubjects({
      subjects,
      profile: null,
      isLoggedIn: false,
      course: 'all',
      dept: 'all',
      year: null,
      search: 'ক্যালকুলাস',
    });
    expect(result.map(s => s.id)).toEqual(['6']);
  });
});
