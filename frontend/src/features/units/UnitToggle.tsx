import { UNIT_SYSTEM_LABEL, type UnitSystem } from "../../lib/units";
import { useUiStore } from "../../store/uiStore";

const SYSTEMS: readonly UnitSystem[] = ["conventional", "si"];

/**
 * Lab units switch: conventional (mg/dL) or SI (mmol/L, µmol/L, g/L). Display only; the model always receives the
 * conventional values it was trained on.
 */
export function UnitToggle({ className = "" }: { className?: string }) {
  const unitSystem = useUiStore((state) => state.unitSystem);
  const setUnitSystem = useUiStore((state) => state.setUnitSystem);
  return (
    <fieldset className={`unit-toggle ${className}`}>
      <legend className="unit-toggle-legend">Lab units</legend>
      {SYSTEMS.map((system) => (
        <label className="unit-toggle-option" key={system}>
          <input
            checked={unitSystem === system}
            name={`lab-units-${className || "default"}`}
            onChange={() => setUnitSystem(system)}
            type="radio"
          />
          <span>{UNIT_SYSTEM_LABEL[system]}</span>
        </label>
      ))}
    </fieldset>
  );
}
