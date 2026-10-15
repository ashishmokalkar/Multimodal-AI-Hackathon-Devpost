import { create } from "zustand";
import type { ExtractedValue } from "../../api/types";

/**
 * Where each input of a patient brought in from reports or from ABHA came from; cleared when another patient is
 * opened.
 */
interface ReportState {
  fromReports: Record<string, ExtractedValue> | null;
  documents: string[];
  via: "reports" | "abha";
  setFromReports: (values: ExtractedValue[], documents: string[], via?: "reports" | "abha") => void;
  clear: () => void;
}

export const useReportStore = create<ReportState>((set) => ({
  fromReports: null,
  documents: [],
  via: "reports",
  setFromReports: (values, documents, via = "reports") =>
    set({ fromReports: Object.fromEntries(values.map((value) => [value.name, value])), documents, via }),
  clear: () => set({ fromReports: null, documents: [], via: "reports" }),
}));
