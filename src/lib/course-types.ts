/**
 * Course types that do NOT use academic years.
 * Year selectors / year tabs should be hidden for these.
 */
export const NO_YEAR_COURSE_TYPES = ['mba', 'bbs', 'ssc', 'hsc', 'job preparation', 'job_preparation'];

export const courseTypeHasYears = (courseType?: string | null): boolean => {
  if (!courseType) return true;
  return !NO_YEAR_COURSE_TYPES.includes(courseType.trim().toLowerCase());
};
