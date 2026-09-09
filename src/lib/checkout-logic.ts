/**
 * Pure helpers for checkout flow decisions.
 * Kept framework-agnostic so they can be unit-tested in isolation.
 */

export type CheckoutStep = 'info' | 'review' | 'payment' | 'processing' | 'success';

export interface CheckoutProfile {
  department?: string | null;
  year?: number | null;
}

export interface CartSubjectLike {
  id: string;
  department: string | null;
}

/**
 * Decide which step the checkout should start on.
 * - payment=success in URL  -> 'success'
 * - profile has dept + year -> 'review' (skip the info form)
 * - otherwise               -> 'info'
 */
export function getInitialCheckoutStep(
  profile: CheckoutProfile | null | undefined,
  paymentParam: string | null,
): CheckoutStep {
  if (paymentParam === 'success') return 'success';
  if (profile?.department && profile?.year) return 'review';
  return 'info';
}

/**
 * Return cart items whose department does NOT match the student's department.
 * Items without a department are kept (no mismatch).
 */
export function getMismatchedSubjects<T extends CartSubjectLike>(
  items: T[],
  profileDepartment: string | null | undefined,
): T[] {
  if (!profileDepartment) return [];
  const norm = profileDepartment.trim().toLowerCase();
  return items.filter(
    (i) => i.department != null && i.department.trim().toLowerCase() !== norm,
  );
}
