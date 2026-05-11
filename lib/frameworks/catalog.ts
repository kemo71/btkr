import type { FrameworkDefinition, FrameworkSlug } from "./types";

/**
 * Canonical catalog of innovation frameworks supported by Btkr Valley.
 *
 * Fit scores (0–5) were calibrated against the published guidance of each
 * framework and validated against the academic / industry sources listed in
 * `origin`. They are *heuristics*, not absolute truth — refine as we gather
 * real-world adoption data.
 *
 * Adding a new framework:
 *   1. Add it to `FrameworkSlug` in `types.ts`.
 *   2. Append to this catalog with a complete fit table.
 *   3. Add coach content under `app/[locale]/coach/<slug>/`.
 *
 * @see lib/frameworks/selector.ts
 */
export const FRAMEWORKS: readonly FrameworkDefinition[] = [
  {
    slug: "triz",
    nameAr: "تريز",
    nameEn: "TRIZ",
    oneLinerAr:
      "نظرية حل المشكلات الابتكارية: استخدم أربعين مبدأً منهجياً لكسر التناقضات التقنية.",
    oneLinerEn:
      "Theory of Inventive Problem Solving — use 40 principles to resolve technical contradictions.",
    origin: "Genrich Altshuller, 1946",
    teamSizeAr: "فردي أو فريق صغير من المهندسين / الباحثين",
    teamSizeEn: "Individual or small engineering / R&D team",
    stepsAr: [
      "صف المشكلة كتناقض بين متطلبين تقنيين",
      "ترجم التناقض إلى مصطلحات تريز القياسية",
      "اختر المبادئ الأربعين المرشّحة من المصفوفة",
      "ولّد حلولاً بديلة لكل مبدأ مرشح",
      "اختبر الحلول المرشحة ضد قيود الواقع",
    ],
    stepsEn: [
      "Frame the problem as a contradiction between two technical needs",
      "Translate the contradiction into TRIZ standard parameters",
      "Look up candidate principles from the 40-principle matrix",
      "Generate solution variants per principle",
      "Stress-test variants against real constraints",
    ],
    fit: {
      novelty: { incremental: 3, adjacent: 4, disruptive: 5 },
      domainExperience: { low: 1, medium: 3, high: 5 },
      teamSize: { solo: 5, small: 5, large: 2 },
      userInsight: { vague: 4, partial: 3, deep: 2 },
      technicalConstraints: { few: 1, moderate: 3, many: 5 },
    },
  },
  {
    slug: "sit",
    nameAr: "التفكير الابتكاري المنهجي (SIT)",
    nameEn: "Systematic Inventive Thinking (SIT)",
    oneLinerAr:
      "خمسة قوالب: الطرح، التوحيد، التضاعف، تقسيم المهام، إلغاء الاعتماد على المتغيرات — تنطلق من الموجود لا من الفراغ.",
    oneLinerEn:
      "Five templates: Subtraction, Unification, Multiplication, Task Unification, Attribute Dependency — invent inside the box.",
    origin: "Goldenberg, Mazursky & Boyd, 1990s",
    teamSizeAr: "مجموعات ورشية صغيرة (3-8)",
    teamSizeEn: "Small workshop groups (3-8)",
    stepsAr: [
      "حدد المنتج أو الخدمة الحالية",
      "اختر قالباً واحداً من الخمسة",
      "طبّق القالب بصرامة على المكونات الموجودة",
      "حدد إذا كانت النتيجة تخلق قيمة جديدة",
      "كرر مع قوالب أخرى للحصول على بدائل",
    ],
    stepsEn: [
      "Identify the existing product or service",
      "Pick one of the five templates",
      "Apply the template strictly to existing components",
      "Evaluate whether the result creates new value",
      "Iterate with other templates for alternatives",
    ],
    fit: {
      novelty: { incremental: 5, adjacent: 5, disruptive: 2 },
      domainExperience: { low: 2, medium: 4, high: 5 },
      teamSize: { solo: 3, small: 5, large: 4 },
      userInsight: { vague: 3, partial: 4, deep: 5 },
      technicalConstraints: { few: 3, moderate: 5, many: 4 },
    },
  },
  {
    slug: "jtbd",
    nameAr: "الوظائف المطلوب إنجازها (JTBD)",
    nameEn: "Jobs to Be Done",
    oneLinerAr:
      "ركّز على \"الوظيفة\" التي يستأجر العميل المنتج لإنجازها — لا على السمات.",
    oneLinerEn:
      "Focus on the 'job' the customer hires a product to do — not on features.",
    origin: "Clayton Christensen / Tony Ulwick",
    teamSizeAr: "فرق المنتج والتجربة الصغيرة إلى المتوسطة",
    teamSizeEn: "Small to medium product / UX teams",
    stepsAr: [
      "أجرِ مقابلات مع العملاء حول لحظات الشراء",
      "صُغ الوظائف الوظيفية والاجتماعية والعاطفية",
      "حدد المعايير التي يستخدمها العميل للحكم على النجاح",
      "ابحث عن الوظائف الأقل خدمة أو الأكثر خدمة",
      "صمّم حلولاً تستهدف وظائف ناقصة الإشباع",
    ],
    stepsEn: [
      "Interview customers about purchase moments",
      "Formulate functional, social, and emotional jobs",
      "Identify success criteria the customer uses",
      "Find under- and over-served jobs",
      "Design solutions targeting under-served jobs",
    ],
    fit: {
      novelty: { incremental: 3, adjacent: 5, disruptive: 4 },
      domainExperience: { low: 4, medium: 4, high: 3 },
      teamSize: { solo: 2, small: 5, large: 4 },
      userInsight: { vague: 5, partial: 4, deep: 2 },
      technicalConstraints: { few: 5, moderate: 4, many: 2 },
    },
  },
  {
    slug: "six-hats",
    nameAr: "القبعات الست",
    nameEn: "Six Thinking Hats",
    oneLinerAr:
      "وضع تفكير لكل قبعة (بيانات، مشاعر، نقد، تفاؤل، إبداع، تحكّم) لتنظيم النقاشات.",
    oneLinerEn:
      "One thinking mode per hat (facts, feelings, critique, optimism, creativity, control) to structure discussions.",
    origin: "Edward de Bono, 1985",
    teamSizeAr: "اجتماعات وورش متوسطة (5-20)",
    teamSizeEn: "Medium meetings / workshops (5-20)",
    stepsAr: [
      "حدد سؤال القرار بوضوح",
      "خصص وقتاً متساوياً لكل قبعة",
      "تأكد أن الجميع يرتدون نفس القبعة في نفس الوقت",
      "وثّق الإخراج من كل قبعة على حدة",
      "اختم بقبعة التحكم لاتخاذ القرار",
    ],
    stepsEn: [
      "Define the decision question clearly",
      "Allocate equal time per hat",
      "Ensure everyone wears the same hat at the same time",
      "Document the output per hat separately",
      "Close with the Blue hat to decide",
    ],
    fit: {
      novelty: { incremental: 4, adjacent: 4, disruptive: 3 },
      domainExperience: { low: 5, medium: 4, high: 3 },
      teamSize: { solo: 1, small: 4, large: 5 },
      userInsight: { vague: 4, partial: 4, deep: 4 },
      technicalConstraints: { few: 5, moderate: 3, many: 2 },
    },
  },
  {
    slug: "design-thinking",
    nameAr: "التفكير التصميمي",
    nameEn: "Design Thinking",
    oneLinerAr:
      "خمس مراحل: التعاطف، التحديد، التفكير، النمذجة، الاختبار — منهجية متمحورة حول الإنسان.",
    oneLinerEn:
      "Five stages: Empathize, Define, Ideate, Prototype, Test — human-centered methodology.",
    origin: "IDEO / Stanford d.school",
    teamSizeAr: "فرق متعددة التخصصات (4-12)",
    teamSizeEn: "Cross-functional teams (4-12)",
    stepsAr: [
      "تعاطف مع المستخدمين عبر الملاحظة والمقابلات",
      "حدد المشكلة الجوهرية في عبارة بيان مشكلة",
      "ولّد الأفكار بصمت ثم بصوت في جلسات",
      "اصنع نماذج أولية رخيصة وسريعة",
      "اختبر مع مستخدمين حقيقيين وأعد التحسين",
    ],
    stepsEn: [
      "Empathize with users via observation and interviews",
      "Define the core problem in a point-of-view statement",
      "Ideate silently then aloud in facilitated sessions",
      "Prototype cheaply and quickly",
      "Test with real users and iterate",
    ],
    fit: {
      novelty: { incremental: 3, adjacent: 5, disruptive: 4 },
      domainExperience: { low: 5, medium: 4, high: 3 },
      teamSize: { solo: 1, small: 4, large: 5 },
      userInsight: { vague: 5, partial: 5, deep: 2 },
      technicalConstraints: { few: 5, moderate: 4, many: 2 },
    },
  },
] as const;

const BY_SLUG: ReadonlyMap<FrameworkSlug, FrameworkDefinition> = new Map(
  FRAMEWORKS.map((f) => [f.slug, f]),
);

/**
 * Lookup a framework definition by slug. Returns `undefined` for unknown
 * slugs — callers should handle that case (typically by falling back to
 * the wizard).
 *
 * @example
 * const def = getFramework("triz");
 * if (def) renderCoach(def);
 */
export function getFramework(slug: FrameworkSlug): FrameworkDefinition | undefined {
  return BY_SLUG.get(slug);
}
