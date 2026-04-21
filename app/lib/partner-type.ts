export type PartnerType = "school" | "coaching" | "college" | "university" | "other" | string;

interface LabelVariants {
  noun: string;          // "your {noun}"          → "your school"
  possessive: string;    // "your {possessive}"    → "your school's"
  adminRole: string;     // "{adminRole} admin"    → "school admin"
}

const LABELS: Record<string, LabelVariants> = {
  school: {
    noun: "school",
    possessive: "school's",
    adminRole: "school",
  },
  coaching: {
    noun: "coaching centre",
    possessive: "coaching centre's",
    adminRole: "coaching",
  },
  college: {
    noun: "college",
    possessive: "college's",
    adminRole: "college",
  },
  university: {
    noun: "university",
    possessive: "university's",
    adminRole: "university",
  },
  other: {
    noun: "institute",
    possessive: "institute's",
    adminRole: "institute",
  },
};

const FALLBACK: LabelVariants = LABELS.other;

export function getPartnerTypeLabel(type: PartnerType | null | undefined): LabelVariants {
  if (!type) return FALLBACK;
  return LABELS[type] ?? FALLBACK;
}
