import { useState, type InputHTMLAttributes } from "react";
import type { FeatureDefinition } from "../../api/types";
import { fromDisplay, roundForDisplay, toDisplay } from "../../lib/units";

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "min" | "max" | "step"
>;

interface UnitNumberInputProps extends NativeProps {
  definition: FeatureDefinition;
  /** The value in API units. */
  value: unknown;
  /** Called with the value in API units, or "" when the field is cleared. */
  onValueChange: (value: number | "") => void;
}

function shown(value: number, definition: FeatureDefinition): number {
  return roundForDisplay(toDisplay(value, definition), definition);
}

/**
 * Number field that shows and accepts a value in the unit the user chose (mg/dL or mmol/L) and reports it in API
 * units. While the user types, their own text is kept, so a converted value never rewrites what they are typing.
 */
export function UnitNumberInput({
  definition,
  value,
  onValueChange,
  onBlur,
  ...props
}: UnitNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const settled =
    typeof value === "number" && Number.isFinite(value)
      ? String(shown(value, definition))
      : "";
  return (
    <input
      {...props}
      inputMode="decimal"
      max={definition.max === undefined ? undefined : shown(definition.max, definition)}
      min={definition.min === undefined ? undefined : shown(definition.min, definition)}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        onValueChange(
          event.target.value === ""
            ? ""
            : fromDisplay(event.target.valueAsNumber, definition),
        );
      }}
      step="any"
      type="number"
      value={draft ?? settled}
    />
  );
}
