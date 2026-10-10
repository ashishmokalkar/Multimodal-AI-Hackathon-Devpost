import { DISCLAIMER_TEXT } from "./disclaimer";

export function DisclaimerBanner() {
  return (
    <aside className="disclaimer-banner" role="note">
      <span className="banner-label">Decision support only</span>
      <p>{DISCLAIMER_TEXT}</p>
    </aside>
  );
}
