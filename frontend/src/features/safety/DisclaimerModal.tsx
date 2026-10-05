import { DISCLAIMER_TEXT } from "./disclaimer";

interface DisclaimerModalProps {
  onAcknowledge: () => void;
}

export function DisclaimerModal({ onAcknowledge }: DisclaimerModalProps) {
  return (
    <div className="modal-backdrop">
      <section
        aria-labelledby="disclaimer-title"
        aria-modal="true"
        className="disclaimer-modal"
        role="dialog"
      >
        <div className="modal-icon" aria-hidden="true">
          !
        </div>
        <p className="eyebrow">Important clinical notice</p>
        <h2 id="disclaimer-title">Before you continue</h2>
        <p className="modal-intro">
          This prototype is intended for educational demonstration and
          decision-support research only.
        </p>
        <p className="modal-disclaimer-copy">{DISCLAIMER_TEXT}</p>
        <button
          autoFocus
          className="acknowledge-button"
          onClick={onAcknowledge}
          type="button"
        >
          Acknowledge and continue
        </button>
      </section>
    </div>
  );
}
