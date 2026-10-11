import { useState } from "react";
import type { InsightTarget } from "../../../lib/insights";
import { useUiStore } from "../../../store/uiStore";
import { CohortCompare } from "../../cohort/CohortCompare";
import { useCohortComparison } from "../../cohort/useCohortComparison";
import { FloatingWindow } from "../FloatingWindow";
import { IconCompare } from "../icons";
import { EmptyState, TargetChips } from "../parts";
import { useStudioData } from "../studioData";

/**
 * "Higher than X% of same-age, same-sex patients": the estimate placed among similar patients in the study, as a
 * nomogram (estimate against age, middle half shaded).
 */
export function CompareWindow() {
  const { shown, predictionInputs } = useStudioData();
  const selectedVessel = useUiStore((state) => state.selectedVessel);
  const [own, setOwn] = useState<InsightTarget | null>(null);
  const target: InsightTarget = own ?? selectedVessel ?? "cad";
  const { comparison, cohort, isPending } = useCohortComparison(
    shown,
    predictionInputs,
    target,
  );

  return (
    <FloatingWindow icon={<IconCompare />} id="compare" title="Similar patients">
      <TargetChips onChange={setOwn} value={target} />
      {comparison && cohort ? (
        <CohortCompare comparison={comparison} population={cohort.population} />
      ) : (
        <EmptyState>
          {!shown
            ? "Waiting for a prediction."
            : shown.mock
              ? "The comparison needs the real model."
              : isPending
                ? "Loading the study cohort…"
                : "The study cohort is not available from this API."}
        </EmptyState>
      )}
    </FloatingWindow>
  );
}
