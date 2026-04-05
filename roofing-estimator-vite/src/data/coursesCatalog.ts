/**
 * Static catalog for the /courses Skillshop-style hub.
 * Set `href` on a program to open an external lesson/LMS/video; omit or leave empty for "coming soon" in the UI.
 */

export interface CourseProgram {
  id: string;
  title: string;
  lessonCount: number;
  durationLabel: string;
  /** External URL when the module is ready (opens in new tab). */
  href?: string;
}

export interface CourseCategory {
  id: string;
  title: string;
  description?: string;
  programs: CourseProgram[];
}

export interface ValueProp {
  title: string;
  body: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface TrainerLink {
  name: string;
  href?: string;
}

export const coursesHero = {
  headline: "With the right playbook, every door is an opportunity.",
  subhead:
    "Expand your craft with practical training built for door-to-door closers, roofing reps, and insurance workflows — on your schedule.",
  primaryCtaLabel: "Go to contacts & settings",
  primaryCtaPath: "/contacts",
} as const;

export const coursesValueProps: ValueProp[] = [
  {
    title: "Field-tested methods",
    body: "Curriculum aligned to real canvassing, storm response, and in-home sales — not generic corporate slides.",
  },
  {
    title: "Train on your time",
    body: "Short modules you can run between territories, on the truck, or after hours. Progress at your pace.",
  },
  {
    title: "Growing library",
    body: "Sales, marketing, claims literacy, and leadership tracks — with more modules as we link external hosts.",
  },
];

export const coursesNarrativeBand = {
  title: "Learn anywhere you already work.",
  body: "HD2D Skill Hub is your in-app catalog for training: browse by track, open linked lessons when available, and request more from your org admin.",
} as const;

export const coursesImmersiveBand = {
  title: "Go deeper on the skills that close deals.",
  body: "Each program card shows how many lessons and total runtime we expect once fully linked. Use external courses (YouTube, LMS, or partner VT) where your team already trains — this hub keeps discovery in one place.",
  ctaLabel: "Browse categories below",
} as const;

/** Sample external link for QA; replace with your real LMS or playlist. */
const SAMPLE_EXTERNAL = "https://developer.mozilla.org/en-US/docs/Web/HTML";

export const coursesCategories: CourseCategory[] = [
  {
    id: "door-to-door-sales",
    title: "Door-to-door sales",
    description: "Opening, objection handling, and same-day momentum.",
    programs: [
      {
        id: "d2d-fundamentals",
        title: "HD2D opener & territory rhythm",
        lessonCount: 8,
        durationLabel: "2h 15m",
        href: SAMPLE_EXTERNAL,
      },
      {
        id: "d2d-objections",
        title: "Objections that actually convert",
        lessonCount: 12,
        durationLabel: "3h 40m",
      },
      {
        id: "d2d-closing",
        title: "Same-visit closes & next-step contracts",
        lessonCount: 6,
        durationLabel: "1h 50m",
      },
      {
        id: "d2d-mindset",
        title: "Daily discipline for reps",
        lessonCount: 10,
        durationLabel: "2h 5m",
      },
    ],
  },
  {
    id: "roofing-technical",
    title: "Roofing & estimating",
    description: "Measurements, scopes, and talking homeowner confidence.",
    programs: [
      {
        id: "roof-measure",
        title: "From map trace to squares on the proposal",
        lessonCount: 14,
        durationLabel: "4h 10m",
      },
      {
        id: "roof-carrier",
        title: "Reading carrier scopes beside your estimate",
        lessonCount: 9,
        durationLabel: "2h 45m",
      },
      {
        id: "roof-pitch",
        title: "Explaining pitch, waste, and line items simply",
        lessonCount: 7,
        durationLabel: "2h 0m",
      },
      {
        id: "roof-photo-doc",
        title: "Photo packs that help supplements stick",
        lessonCount: 5,
        durationLabel: "1h 20m",
      },
    ],
  },
  {
    id: "insurance-claims",
    title: "Insurance & claims literacy",
    description: "RCV, ACV, supplements, and adjuster etiquette.",
    programs: [
      {
        id: "ins-rcv-acv",
        title: "RCV / ACV in plain language for homeowners",
        lessonCount: 6,
        durationLabel: "1h 35m",
      },
      {
        id: "ins-supplement",
        title: "Supplement storytelling from field notes",
        lessonCount: 11,
        durationLabel: "3h 10m",
      },
      {
        id: "ins-adjuster",
        title: "Adjuster meetings & documentation hygiene",
        lessonCount: 8,
        durationLabel: "2h 25m",
      },
      {
        id: "ins-deductible",
        title: "Deductible, depreciation, and payment timing",
        lessonCount: 4,
        durationLabel: "1h 5m",
      },
    ],
  },
  {
    id: "marketing-leads",
    title: "Marketing & lead flow",
    description: "Local brand, follow-up, and digital handoffs.",
    programs: [
      {
        id: "mkt-local",
        title: "Neighborhood reputation & referral loops",
        lessonCount: 9,
        durationLabel: "2h 30m",
      },
      {
        id: "mkt-social",
        title: "Short-form content for storm corridors",
        lessonCount: 12,
        durationLabel: "3h 0m",
      },
      {
        id: "mkt-crm",
        title: "Pipeline hygiene with your CRM or GHL",
        lessonCount: 10,
        durationLabel: "2h 55m",
      },
      {
        id: "mkt-ads",
        title: "Paid ads sanity for local contractors",
        lessonCount: 7,
        durationLabel: "2h 10m",
      },
    ],
  },
  {
    id: "leadership-ops",
    title: "Leadership & ops",
    description: "Crews, compliance tone, and scaling a team.",
    programs: [
      {
        id: "lead-hiring",
        title: "Hiring and onboarding closers",
        lessonCount: 8,
        durationLabel: "2h 40m",
      },
      {
        id: "lead-coaching",
        title: "Ride-along coaching frameworks",
        lessonCount: 6,
        durationLabel: "1h 45m",
      },
      {
        id: "lead-safety",
        title: "Site safety talk tracks homeowners trust",
        lessonCount: 5,
        durationLabel: "1h 15m",
      },
      {
        id: "lead-scaling",
        title: "Territory planning without burning the team",
        lessonCount: 9,
        durationLabel: "2h 50m",
      },
    ],
  },
];

export const coursesTrainerLinks: TrainerLink[] = [
  { name: "HD2D field coaches" },
  { name: "Storm response mentors" },
  { name: "Carrier supplement specialists" },
  { name: "Canvassing captains" },
  { name: "Sales psychologists (guest)" },
  { name: "Roofing estimators (guest)" },
  { name: "Insurance educators (guest)" },
  { name: "Marketing partners" },
  { name: "CRM / GHL integrators" },
  { name: "Legal & compliance (guest)" },
  { name: "Video production (guest)" },
  { name: "Your org SMEs — add links in catalog" },
];

export const coursesFaq: FaqItem[] = [
  {
    question: "What is the HD2D Skill Hub?",
    answer:
      "An in-app training catalog modeled like a skill marketplace: browse tracks, see lesson counts and runtime targets, and open external lessons when your admin has linked them.",
  },
  {
    question: "How do I watch a course?",
    answer:
      "When a program card shows Open lesson, it opens the linked URL (YouTube, LMS, or partner VT) in a new tab. If it says Coming soon, the link is not configured yet — ask your admin or check back.",
  },
  {
    question: "Does progress save in HD2D?",
    answer:
      "Not in this version. Progress lives with the host you open (YouTube, LMS, etc.). Future versions could add enrollment and progress if you connect a backend.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Browsing the hub is included in the app. Any paid third-party course is between you and that provider.",
  },
];

export const coursesClosingCta = {
  title: "Ready to level up?",
  body: "Bookmark this page, share feedback with your team lead, and use Contacts & settings to keep company links and training requests organized.",
  ctaLabel: "Open contacts & settings",
  ctaPath: "/contacts",
} as const;

/** Shape stored in D1 and edited in Admin — courses (must stay aligned with Worker `validateCoursesCatalogPayload`). */
export type CoursesCatalogData = {
  hero: {
    headline: string;
    subhead: string;
    primaryCtaLabel: string;
    primaryCtaPath: string;
  };
  valueProps: ValueProp[];
  narrativeBand: { title: string; body: string };
  immersiveBand: { title: string; body: string; ctaLabel: string };
  categories: CourseCategory[];
  trainerLinks: TrainerLink[];
  faq: FaqItem[];
  closingCta: {
    title: string;
    body: string;
    ctaLabel: string;
    ctaPath: string;
  };
  /** Optional; also overridable via `VITE_COURSES_TRAILER_ID`. */
  trailerYoutubeId?: string;
};

/** Built-in catalog when D1 has no row or fetch fails. */
export const DEFAULT_COURSES_CATALOG: CoursesCatalogData = {
  hero: { ...coursesHero },
  valueProps: coursesValueProps,
  narrativeBand: { ...coursesNarrativeBand },
  immersiveBand: { ...coursesImmersiveBand },
  categories: coursesCategories,
  trainerLinks: coursesTrainerLinks,
  faq: coursesFaq,
  closingCta: { ...coursesClosingCta },
};

export function getCoursesTrailerYoutubeId(): string | undefined {
  const raw = import.meta.env.VITE_COURSES_TRAILER_ID;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t || undefined;
}

/** Env wins over catalog so deployers can override without editing JSON. */
export function resolveTrailerYoutubeId(catalog: CoursesCatalogData): string | undefined {
  const fromEnv = getCoursesTrailerYoutubeId();
  if (fromEnv) return fromEnv;
  const id = catalog.trailerYoutubeId?.trim();
  return id || undefined;
}
