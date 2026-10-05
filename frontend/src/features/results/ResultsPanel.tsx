export function ResultsPanel() {
  return (
    <section
      className="panel results-panel"
      aria-labelledby="results-panel-heading"
    >
      <header className="panel-header">
        <div>
          <p className="eyebrow">Prediction summary</p>
          <h2 id="results-panel-heading">Results panel</h2>
        </div>
      </header>
      <div className="panel-body">
        <div className="empty-state">
          <div className="empty-state-mark" aria-hidden="true">
            %
          </div>
          <h3>Predicted outcomes</h3>
          <p>
            CAD risk, vessel probabilities, and feature explanations will appear
            here after API integration.
          </p>
        </div>
      </div>
    </section>
  );
}
