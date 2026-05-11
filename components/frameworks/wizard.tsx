"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  recommend,
  FRAMEWORKS,
  type ProblemProfile,
  type Recommendation,
} from "@/lib/frameworks";
import { Card, CardBody, CardHeader, Badge, Select, Field } from "@/components/dga";

type AxisKey = keyof ProblemProfile;

const AXIS_OPTIONS: Record<AxisKey, readonly ProblemProfile[AxisKey][]> = {
  novelty: ["incremental", "adjacent", "disruptive"],
  domainExperience: ["low", "medium", "high"],
  teamSize: ["solo", "small", "large"],
  userInsight: ["vague", "partial", "deep"],
  technicalConstraints: ["few", "moderate", "many"],
};

const DEFAULT_PROFILE: ProblemProfile = {
  novelty: "incremental",
  domainExperience: "medium",
  teamSize: "small",
  userInsight: "partial",
  technicalConstraints: "moderate",
};

/**
 * Methodology Wizard — a controlled form that asks five questions and
 * surfaces a ranked list of recommended frameworks with explainable score
 * breakdowns.
 *
 * Pure client state: nothing is persisted server-side until the user
 * confirms a selection (next slice adds the "Save to Idea" action via a
 * server action).
 *
 * @example
 * <Wizard initial={defaultProfile} />
 */
export function Wizard({
  initial = DEFAULT_PROFILE,
}: {
  initial?: ProblemProfile;
}) {
  const t = useTranslations("frameworks");
  const [profile, setProfile] = useState<ProblemProfile>(initial);
  const ranked = useMemo<Recommendation[]>(() => recommend(profile), [profile]);
  const top = ranked[0];

  function setAxis<K extends AxisKey>(axis: K, value: ProblemProfile[K]) {
    setProfile((p) => ({ ...p, [axis]: value }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader title={t("wizard.title")} subtitle={t("wizard.subtitle")} />
        <CardBody className="grid gap-4">
          {(Object.keys(AXIS_OPTIONS) as AxisKey[]).map((axis) => (
            <Field
              key={axis}
              label={t(`axes.${axis}.label`)}
              hint={t(`axes.${axis}.hint`)}
            >
              {(props) => (
                <Select
                  {...props}
                  value={profile[axis]}
                  onChange={(e) =>
                    setAxis(
                      axis,
                      e.target.value as ProblemProfile[typeof axis],
                    )
                  }
                >
                  {AXIS_OPTIONS[axis].map((v) => (
                    <option key={v} value={v}>
                      {t(`axes.${axis}.options.${v}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ))}
        </CardBody>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader
            title={t("results.bestFitTitle")}
            subtitle={t("results.bestFitSubtitle")}
            action={<Badge tone="success">{top.score} / 25</Badge>}
          />
          <CardBody>
            <h3 className="text-2xl font-semibold text-neutral-900">
              {t(`names.${top.framework.slug}`)}
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              {t(`oneLiners.${top.framework.slug}`)}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(top.breakdown).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-1.5"
                >
                  <dt className="text-neutral-600">
                    {t(`axes.${k as AxisKey}.label`)}
                  </dt>
                  <dd className="font-medium text-primary-700">{v} / 5</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("results.allRankings")} />
          <CardBody className="flex flex-col gap-2">
            {ranked.map((r, i) => (
              <div
                key={r.framework.slug}
                className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <Badge tone={i === 0 ? "success" : "neutral"}>{i + 1}</Badge>
                  <span className="font-medium text-neutral-900">
                    {t(`names.${r.framework.slug}`)}
                  </span>
                </div>
                <span className="text-sm tabular-nums text-neutral-500">
                  {r.score} / 25
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

Wizard.frameworks = FRAMEWORKS;
