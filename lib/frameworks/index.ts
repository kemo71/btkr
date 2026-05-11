/**
 * Innovation frameworks barrel.
 *
 * Public API:
 *   - Types: `FrameworkSlug`, `FrameworkDefinition`, `ProblemProfile`
 *   - Catalog: `FRAMEWORKS`, `getFramework(slug)`
 *   - Selector: `recommend(profile)`, `bestFitFor(profile)`, `scoreFramework(...)`
 *
 * @see lib/frameworks/types.ts
 */
export type {
  FrameworkSlug,
  FrameworkDefinition,
  ProblemProfile,
} from "./types";
export { FRAMEWORKS, getFramework } from "./catalog";
export {
  recommend,
  scoreFramework,
  bestFitFor,
  type Recommendation,
} from "./selector";
