import { useEffect, useState } from "react";

const COMPACT_QUERY = "(max-width: 899px)";

/** Below 900 px wide the windows stop floating and stack under the heart. */
export function useCompact(): boolean {
  const [compact, setCompact] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.(COMPACT_QUERY).matches === true,
  );
  useEffect(() => {
    const query = window.matchMedia?.(COMPACT_QUERY);
    if (!query) {
      return;
    }
    const update = () => setCompact(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return compact;
}
