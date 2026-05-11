/**
 * Innovation framework catalog — shared types.
 *
 * Each framework is a structured definition consumed by:
 *   - The Methodology Wizard (`/frameworks`) — recommendation engine
 *   - The Educational Coaching UI — guided walkthroughs
 *   - The Idea Lifecycle — `ideas.framework` references these slugs
 *
 * @see lib/frameworks/catalog.ts (concrete definitions)
 * @see lib/frameworks/selector.ts (recommendation logic)
 * @see docs/togaf/01-business-architecture.md §4 (Capabilities)
 */

/** Stable identifier — referenced by `ideas.framework` and analytics. */
export type FrameworkSlug =
  | "triz"
  | "sit"
  | "jtbd"
  | "six-hats"
  | "design-thinking";

/**
 * Innovation problem dimensions used by the wizard. Each axis maps to a
 * weight per framework in `catalog.ts`.
 */
export interface ProblemProfile {
  /** Is the goal incremental improvement vs disruptive breakthrough? */
  novelty: "incremental" | "adjacent" | "disruptive";
  /** Domain familiarity for the team. */
  domainExperience: "low" | "medium" | "high";
  /** How many people typically collaborate on this kind of problem? */
  teamSize: "solo" | "small" | "large";
  /** How well-understood is the customer / beneficiary? */
  userInsight: "vague" | "partial" | "deep";
  /** How constrained are technical resources? */
  technicalConstraints: "few" | "moderate" | "many";
}

export interface FrameworkDefinition {
  slug: FrameworkSlug;
  nameAr: string;
  nameEn: string;
  oneLinerAr: string;
  oneLinerEn: string;
  /** Origin / canonical reference. */
  origin: string;
  /** Suggested team size description, for tooltips. */
  teamSizeAr: string;
  teamSizeEn: string;
  /** Steps a practitioner walks through — used by the coaching UI. */
  stepsEn: readonly string[];
  stepsAr: readonly string[];
  /**
   * Fit score table — how strongly this framework suits a profile axis value.
   * Range 0..5. Used by the recommender as a linear sum.
   */
  fit: {
    novelty: Record<ProblemProfile["novelty"], number>;
    domainExperience: Record<ProblemProfile["domainExperience"], number>;
    teamSize: Record<ProblemProfile["teamSize"], number>;
    userInsight: Record<ProblemProfile["userInsight"], number>;
    technicalConstraints: Record<ProblemProfile["technicalConstraints"], number>;
  };
}
