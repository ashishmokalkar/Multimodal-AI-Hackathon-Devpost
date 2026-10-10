export type PredictionStatus =
  | "initial"
  | "edited"
  | "auto-updating"
  | "invalid"
  | "pending"
  | "error"
  | "ready";

export interface PredictionStatusCopy {
  label: string;
  message: string;
  role: "status" | "alert";
}

export function predictionStatusCopy(
  status: PredictionStatus,
  error: string | null = null,
): PredictionStatusCopy | null {
  switch (status) {
    case "initial":
      return {
        label: "No prediction yet",
        message:
          "Choose a synthetic sample or enter inputs, then select Predict.",
        role: "status",
      };
    case "edited":
      return {
        label: "Inputs changed — prediction cleared",
        message:
          "Select Predict to request current results; previous values are not retained.",
        role: "status",
      };
    case "auto-updating":
      return {
        label: "Automatic update scheduled",
        message:
          "A fresh prediction will be requested after the 500 ms debounce.",
        role: "status",
      };
    case "invalid":
      return {
        label: "Inputs need correction",
        message:
          "Correct invalid feature values in the patient panel, then select Predict.",
        role: "alert",
      };
    case "pending":
      return {
        label: "Prediction pending",
        message:
          "Waiting for the current response. Previous probabilities and explanations are cleared.",
        role: "status",
      };
    case "error":
      return {
        label: "Prediction failed",
        message: `${error ? `${error}. ` : ""}No current prediction is available. Correct inputs or select Predict to retry.`,
        role: "alert",
      };
    case "ready":
      return null;
  }
}
