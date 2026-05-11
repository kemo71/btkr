import { FRAMEWORKS } from "./catalog";
import type {
  FrameworkDefinition,
  FrameworkSlug,
  ProblemProfile,
} from "./types";

/**
 * Methodology Wizard recommender.
 *
 * For each framework in the catalog, sums its `fit` scores along the five
 * profile axes. Returns frameworks ranked best-first. The transform is a
 * simple linear sum: each axis contributes 0–5, max total 25.
 *
 * This is intentionally **transparent and explainable** — we want stakeholders
 * to understand why a framework was recommended (the breakdown is exposed
 * via `recommendDetailed()`).
 *
 * @see lib/frameworks/catalog.ts (fit tables)
 */

export interface Recommendation {
  framework: FrameworkDefinition;
  score: number;
  /** Per-axis contribution for the explainability panel. */
  breakdown: Record<keyof ProblemProfile, number>;
}

/**
 * Compute the per-axis breakdown for a single framework against a profile.
 *
 * @example
 * const b = scoreFramework(FRAMEWORKS[0], profile);
 * b.novelty // 0..5
 */
export function scoreFramework(
  framework: FrameworkDefinition,
  profile: ProblemProfile,
): Recommendation["breakdown"] {
  return {
    novelty: framework.fit.novelty[profile.novelty],
    domainExperience:
      framework.fit.domainExperience[profile.domainExperience],
    teamSize: framework.fit.teamSize[profile.teamSize],
    userInsight: framework.fit.userInsight[profile.userInsight],
    technicalConstraints:
      framework.fit.technicalConstraints[profile.technicalConstraints],
  };
}

/**
 * Recommend frameworks for a problem profile, ranked best-first.
 *
 * Ties are broken by the order frameworks appear in the catalog (stable
 * sort), which means the first-declared framework wins on a tie — useful
 * if we want a canonical default.
 *
 * @example
 * const ranked = recommend({
 *   novelty: "incremental",
 *   domainExperience: "high",
 *   teamSize: "small",
 *   userInsight: "deep",
 *   technicalConstraints: "many",
 * });
 * ranked[0].framework.slug // "sit"
 */
export function recommend(profile: ProblemProfile): Recommendation[] {
  const all = FRAMEWORKS.map((f) => {
    const breakdown = scoreFramework(f, profile);
    const score =
      breakdown.novelty +
      breakdown.domainExperience +
      breakdown.teamSize +
      breakdown.userInsight +
      breakdown.technicalConstraints;
    return { framework: f, score, breakdown };
  });

  // Stable sort, descending score
  all.sort((a, b) => b.score - a.score);
  return all;
}

/**
 * Best-fit framework slug. Useful when persisting a single choice on
 * `ideas.framework`.
 *
 * @example
 * idea.framework = bestFitFor(profile);
 */
export function bestFitFor(profile: ProblemProfile): FrameworkSlug {
  return recommend(profile)[0].framework.slug;
}
