export function PatientPanel() {
  return (
    <section className="panel" aria-labelledby="patient-panel-heading">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Input workspace</p>
          <h2 id="patient-panel-heading">Patient panel</h2>
        </div>
      </header>
      <div className="panel-body">
        <div className="empty-state">
          <div className="empty-state-mark" aria-hidden="true">
            +
          </div>
          <h3>Patient inputs</h3>
          <p>
            Sample selection and grouped clinical features will be added in
            Phase 2.
          </p>
        </div>
      </div>
    </section>
  );
}
