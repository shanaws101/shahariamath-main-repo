/**
 * Pure helpers for the Subjects (courses) page filtering.
 * Logged-in students with a department are auto-locked to that
 * department and their course type; new visitors filter freely.
 */

export interface SubjectLike {
  id: string;
  name: string;
  name_bn: string;
  department: string | null;
  course_type: string | null;
  compatible_years: number[] | null;
}

export interface FilterProfile {
  department?: string | null;
  course_type?: string | null;
}

export interface FilterParams<T extends SubjectLike> {
  subjects: T[];
  profile?: FilterProfile | null;
  isLoggedIn: boolean;
  /** Course tab the visitor selected (ignored when locked). */
  course: string;
  /** Department tab the visitor selected (ignored when locked). */
  dept: string;
  /** Year filter (1-4) or null for all. */
  year: number | null;
  /** Free-text search across name / name_bn. */
  search: string;
}

export interface FilterResult {
  isStudentLocked: boolean;
  effectiveCourse: string;
  effectiveDept: string;
}

const normalizeFilterValue = (value: string | null | undefined) =>
  (value ?? '').trim().toLowerCase();

/** Resolve the effective course/department after applying the student lock. */
export function resolveEffectiveFilters(
  params: Pick<FilterParams<SubjectLike>, 'profile' | 'isLoggedIn' | 'course' | 'dept'>,
): FilterResult {
  const isStudentLocked = !!params.isLoggedIn && !!params.profile?.department;
  const effectiveCourse = isStudentLocked
    ? (params.profile?.course_type || 'BBA')
    : params.course;
  const effectiveDept = isStudentLocked
    ? (params.profile!.department as string)
    : params.dept;
  return { isStudentLocked, effectiveCourse, effectiveDept };
}

/** Apply course/department/year/search filters and return the matching subjects. */
export function filterSubjects<T extends SubjectLike>(params: FilterParams<T>): T[] {
  const { effectiveCourse, effectiveDept } = resolveEffectiveFilters(params);
  const q = params.search.trim().toLowerCase();
  const courseLc = normalizeFilterValue(effectiveCourse);
  const deptLc = normalizeFilterValue(effectiveDept);
  return params.subjects.filter((s) => {
    if (courseLc !== 'all' && normalizeFilterValue(s.course_type) !== courseLc) return false;
    if (deptLc !== 'all' && normalizeFilterValue(s.department) !== deptLc) return false;
    if (params.year && !s.compatible_years?.includes(params.year)) return false;
    if (q) {
      return (
        s.name.toLowerCase().includes(q) ||
        s.name_bn.includes(params.search.trim())
      );
    }
    return true;
  });
}
