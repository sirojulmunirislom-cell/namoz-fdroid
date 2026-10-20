// Keep the travel implementation for a future release. The legacy section ID
// is "calendar"; Islamic events use the separate "events" section.
export const travelEnabled = false;
export const adhkarPreviewEnabled = import.meta.env.VITE_ADHKAR_PREVIEW === "1";
export const sectionAvailable = (id: string) =>
  id !== "admin" && (id !== "calendar" || travelEnabled);
