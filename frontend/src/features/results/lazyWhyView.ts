/** WhyView pulls in Recharts and is only used by the mock API profile, so it is loaded on demand. */
export const loadWhyView = () =>
  import("./WhyView").then((module) => ({ default: module.WhyView }));
