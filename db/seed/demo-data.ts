import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { Stage } from "@/lib/lifecycle/stages";

/**
 * Seed a small, realistic dataset so the demo's dashboard and leaderboard
 * aren't empty: ~7 ideas across the seeded users, varied stages / innovation
 * types / frameworks, lifecycle events (including gate approvals + one
 * rejection), votes, comments, and a few accreditations.
 *
 * Idempotent: if `IDEA-0001` already exists the whole function is a no-op.
 * Self-gating: if the seeded users (`<role>@ksaa.gov.sa`) aren't present —
 * which happens in production unless `BTKR_DEMO_MODE=1` — it skips.
 *
 * Called by `scripts/seed.ts` after `seedDevUsers()`.
 *
 * @see scripts/seed.ts
 * @see db/seed/roles.ts (seeds the users this depends on)
 */

const SEED_EMAILS = {
  admin: "admin@ksaa.gov.sa",
  stakeholder: "stakeholder@ksaa.gov.sa",
  employee: "employee@ksaa.gov.sa",
  auditor: "auditor@ksaa.gov.sa",
} as const;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

interface IdeaSpec {
  code: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  author: keyof typeof SEED_EMAILS;
  department: string;
  innovationType: "incremental" | "adjacent" | "disruptive";
  framework:
    | "triz"
    | "sit"
    | "jtbd"
    | "six-hats"
    | "design-thinking"
    | null;
  /** Full stage path, starting at "submitted". The last stage is the
   *  idea's current stage. Each step after "submitted" becomes a
   *  gate-approval event (or gate-rejection if the step lands on "rejected"). */
  stages: Stage[];
  /** Days ago the idea was submitted. Forward steps land one day apart. */
  submittedDaysAgo: number;
  /** Users who voted for this idea. */
  voters: (keyof typeof SEED_EMAILS)[];
  /** [author, body] comments on this idea. */
  comments: { by: keyof typeof SEED_EMAILS; bodyAr: string }[];
}

const IDEAS: IdeaSpec[] = [
  {
    code: "IDEA-0001",
    titleAr: "منصة موحّدة لمصطلحات اللغة العربية",
    titleEn: "Unified Arabic terminology platform",
    summaryAr:
      "بناء مرجع رقمي موحّد للمصطلحات اللغوية المعتمدة يُحدّث آلياً ويتكامل مع أدوات التحرير.",
    author: "employee",
    department: "Research & Development",
    innovationType: "adjacent",
    framework: "jtbd",
    stages: [
      "submitted",
      "triage",
      "evaluation",
      "development",
      "pilot",
      "scale",
    ],
    submittedDaysAgo: 95,
    voters: ["admin", "stakeholder", "employee", "auditor"],
    comments: [
      {
        by: "stakeholder",
        bodyAr: "فكرة محورية — نوصي بالتوسعة الكاملة عبر الإدارات.",
      },
      { by: "auditor", bodyAr: "تم توثيق قرارات البوابات بشكل سليم." },
    ],
  },
  {
    code: "IDEA-0002",
    titleAr: "مساعد ذكي لتدقيق النصوص الأكاديمية",
    titleEn: "AI assistant for academic text review",
    summaryAr:
      "مدقق لغوي وأسلوبي مدعوم بالذكاء الاصطناعي للأبحاث المقدّمة، مع اقتراحات قابلة للقبول/الرفض.",
    author: "employee",
    department: "Research & Development",
    innovationType: "disruptive",
    framework: "design-thinking",
    stages: ["submitted", "triage", "evaluation", "development", "pilot"],
    submittedDaysAgo: 64,
    voters: ["admin", "stakeholder", "auditor"],
    comments: [
      { by: "employee", bodyAr: "نتائج التجريب الأولية واعدة جداً." },
    ],
  },
  {
    code: "IDEA-0003",
    titleAr: "تبسيط إجراءات اعتماد البرامج التدريبية",
    titleEn: "Streamlined training-program accreditation",
    summaryAr:
      "إعادة تصميم مسار الاعتماد لتقليل عدد الخطوات من تسع إلى ثلاث مع لوحة متابعة.",
    author: "stakeholder",
    department: "Executive Office",
    innovationType: "incremental",
    framework: "sit",
    stages: ["submitted", "triage", "evaluation", "development"],
    submittedDaysAgo: 41,
    voters: ["employee", "auditor"],
    comments: [],
  },
  {
    code: "IDEA-0004",
    titleAr: "لوحة مؤشرات لتبنّي المعايير اللغوية",
    titleEn: "Dashboard for language-standard adoption",
    summaryAr:
      "مؤشرات حيّة لمدى تبنّي الجهات للمعايير اللغوية المعتمدة، مع تنبيهات للفجوات.",
    author: "employee",
    department: "Research & Development",
    innovationType: "incremental",
    framework: "six-hats",
    stages: ["submitted", "triage", "evaluation"],
    submittedDaysAgo: 28,
    voters: ["admin", "employee", "stakeholder"],
    comments: [
      { by: "admin", bodyAr: "نقترح إضافة تصنيف حسب نوع الجهة." },
    ],
  },
  {
    code: "IDEA-0005",
    titleAr: "مكتبة محتوى تفاعلي لتعليم العربية",
    titleEn: "Interactive content library for Arabic teaching",
    summaryAr:
      "مكتبة وحدات تعليمية تفاعلية قابلة لإعادة الاستخدام، مرتبطة بالمناهج المعتمدة.",
    author: "employee",
    department: "Training",
    innovationType: "adjacent",
    framework: "triz",
    stages: ["submitted", "triage"],
    submittedDaysAgo: 15,
    voters: ["auditor"],
    comments: [],
  },
  {
    code: "IDEA-0006",
    titleAr: "تطبيق جوّال لقياس الطلاقة اللغوية",
    titleEn: "Mobile app for measuring language fluency",
    summaryAr:
      "اختبار طلاقة قصير قائم على الصوت يعطي درجة فورية ويقترح مساراً للتحسين.",
    author: "stakeholder",
    department: "Executive Office",
    innovationType: "disruptive",
    framework: null,
    stages: ["submitted"],
    submittedDaysAgo: 6,
    voters: ["employee", "admin"],
    comments: [],
  },
  {
    code: "IDEA-0007",
    titleAr: "بوّابة موحّدة لتقديم الطلبات الداخلية",
    titleEn: "Unified internal-requests portal",
    summaryAr:
      "نموذج موحّد لكل الطلبات الإدارية الداخلية مع توجيه آلي للموافِق المختص.",
    author: "admin",
    department: "IT",
    innovationType: "incremental",
    framework: null,
    stages: ["submitted", "triage", "rejected"],
    submittedDaysAgo: 33,
    voters: [],
    comments: [],
  },
];

const ACCREDITATIONS = [
  {
    user: "employee" as const,
    provider: "GINI" as const,
    code: "GInI-CPI",
    titleAr: "محترف معتمد في الابتكار",
    titleEn: "Certified Professional Innovator (CPI)",
    issuedDaysAgo: 200,
  },
  {
    user: "employee" as const,
    provider: "INTERNAL" as const,
    code: "BTKR-CHAMPION",
    titleAr: "بطل الابتكار — وادي بتكر",
    titleEn: "Innovation Champion — Btkr Valley",
    issuedDaysAgo: 60,
  },
  {
    user: "stakeholder" as const,
    provider: "NPDP" as const,
    code: "PDMA-NPDP",
    titleAr: "محترف تطوير منتجات جديدة",
    titleEn: "New Product Development Professional (NPDP)",
    issuedDaysAgo: 365,
  },
];

const APPROVE_RATIONALE = "تم استيفاء معايير البوابة؛ يُوصى بالانتقال للمرحلة التالية.";
const REJECT_RATIONALE = "لا تتوافق الفكرة مع الأولويات الحالية للأكاديمية في هذه المرحلة.";

export async function seedDemoData(): Promise<void> {
  // Idempotent: bail if the dataset is already there.
  const [existing] = await db
    .select({ id: schema.ideas.id })
    .from(schema.ideas)
    .where(eq(schema.ideas.code, "IDEA-0001"))
    .limit(1);
  if (existing) {
    console.log("demo data already present — skipping");
    return;
  }

  // Self-gate: need the seeded users.
  const userRows = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(inArray(schema.users.email, Object.values(SEED_EMAILS)));
  const idByEmail = new Map(userRows.map((r) => [r.email, r.id]));
  const id = (k: keyof typeof SEED_EMAILS) => idByEmail.get(SEED_EMAILS[k]);
  if (
    !id("admin") ||
    !id("stakeholder") ||
    !id("employee") ||
    !id("auditor")
  ) {
    console.log("demo data skipped — seeded users not present");
    return;
  }
  const stakeholderId = id("stakeholder")!;

  for (const spec of IDEAS) {
    const authorId = id(spec.author)!;
    const submittedAt = daysAgo(spec.submittedDaysAgo);
    const currentStage = spec.stages[spec.stages.length - 1];

    const [insertedIdea] = await db
      .insert(schema.ideas)
      .values({
        code: spec.code,
        titleAr: spec.titleAr,
        titleEn: spec.titleEn,
        summaryAr: spec.summaryAr,
        body: { markdown: spec.summaryAr },
        authorId,
        department: spec.department,
        innovationType: spec.innovationType,
        stage: currentStage,
        framework: spec.framework,
        createdAt: submittedAt,
        updatedAt: submittedAt,
      })
      .onConflictDoNothing({ target: schema.ideas.code })
      .returning({ id: schema.ideas.id });
    if (!insertedIdea) continue; // raced; skip
    const ideaId = insertedIdea.id;

    // Lifecycle events: creation (transition), then one per forward step.
    const events: (typeof schema.lifecycleEvents.$inferInsert)[] = [
      {
        ideaId,
        fromStage: null,
        toStage: spec.stages[0],
        eventType: "transition",
        actorId: authorId,
        rationale: null,
        occurredAt: submittedAt,
      },
    ];
    for (let i = 1; i < spec.stages.length; i++) {
      const to = spec.stages[i];
      events.push({
        ideaId,
        fromStage: spec.stages[i - 1],
        toStage: to,
        eventType: to === "rejected" ? "gate-rejection" : "gate-approval",
        actorId: stakeholderId,
        rationale: to === "rejected" ? REJECT_RATIONALE : APPROVE_RATIONALE,
        occurredAt: daysAgo(spec.submittedDaysAgo - i),
      });
    }
    await db.insert(schema.lifecycleEvents).values(events);

    // Votes.
    for (const v of spec.voters) {
      await db
        .insert(schema.ideaVotes)
        .values({ ideaId, userId: id(v)!, weight: 1, castAt: daysAgo(spec.submittedDaysAgo - 1) })
        .onConflictDoNothing();
    }

    // Comments.
    for (const c of spec.comments) {
      await db.insert(schema.ideaComments).values({
        ideaId,
        authorId: id(c.by)!,
        parentId: null,
        body: c.bodyAr,
        createdAt: daysAgo(Math.max(0, spec.submittedDaysAgo - 2)),
      });
    }
  }

  // Accreditations.
  for (const a of ACCREDITATIONS) {
    await db.insert(schema.accreditations).values({
      userId: id(a.user)!,
      provider: a.provider,
      code: a.code,
      titleAr: a.titleAr,
      titleEn: a.titleEn,
      issuedAt: daysAgo(a.issuedDaysAgo),
      verifiedBy: stakeholderId,
    });
  }

  console.log(`demo data seeded: ${IDEAS.length} ideas, ${ACCREDITATIONS.length} accreditations`);
}
