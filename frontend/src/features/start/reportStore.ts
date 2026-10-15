import { create } from "zustand";
import type { ExtractedValue } from "../../api/types";

/** Where each input of a patient brought in from reports came from; cleared when another patient is opened. */
interface ReportState {
  fromReports: Record<string, ExtractedValue> | null;
  documents: string[];
  setFromReports: (values: ExtractedValue[], documents: string[]) => void;
  clear: () => void;
}

export const useReportStore = create<ReportState>((set) => ({
  fromReports: null,
  documents: [],
  setFromReports: (values, documents) =>
    set({ fromReports: Object.fromEntries(values.map((value) => [value.name, value])), documents }),
  clear: () => set({ fromReports: null, documents: [] }),
}));
