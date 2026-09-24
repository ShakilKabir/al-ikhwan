/**
 * Club rules, from the note under the 2026 member list:
 * "Yearly Fees introduced from 2026. For Regular member = 3600/year & for
 * Executive member = 1500/year. Club Registration for 1st Time = 1600/-"
 *
 * These are only defaults for new members; each member's own yearly fee is
 * stored with them and can be changed on their page.
 */
import type { MemberCategory } from "@/db/schema";

export const DEFAULT_YEARLY_FEE: Partial<Record<MemberCategory, number>> = {
  regular: 3600,
  executive: 1500,
};

export const REGISTRATION_FEE = 1600;

export const MEMBER_TYPES = ["General", "Ulama/Tolaba/Student", "Executive member", "Exempted"];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/** Cash-book categories used when recording a member's payment. */
export const FEE_CATEGORY_FOR: Record<MemberCategory, string> = {
  regular: "Yearly Renewal Fee",
  executive: "Executive member fee",
  advisor: "Yearly Renewal Fee",
  prospective: "New registration",
};
