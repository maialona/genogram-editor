import type { EcoSystemCategory } from "../types/document";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.65,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Shared 24×24 glyph paths for the ecomap system catalog. */
export function EcoSystemGlyphPaths({
  category,
}: {
  category: EcoSystemCategory;
}) {
  switch (category) {
    case "school":
      return (
        <>
          <path d="M3.5 7.4 L12 10.2 L12 19.6 L3.8 17.2 Z" {...STROKE} />
          <path d="M20.5 7.4 L12 10.2 L12 19.6 L20.2 17.2 Z" {...STROKE} />
          <path d="M12 10.2 V19.6" {...STROKE} />
          <path d="M6.6 7.4 V5.2 H9.2" {...STROKE} />
        </>
      );
    case "work":
      return (
        <>
          <rect x="3.5" y="9.2" width="17" height="10.3" rx="1.4" {...STROKE} />
          <path d="M8.2 9.2 V7.3 A3.8 2.4 0 0 1 15.8 7.3 V9.2" {...STROKE} />
          <path d="M3.5 13.6 H20.5" {...STROKE} />
          <path d="M11 13.6 V15.4 H13 V13.6" {...STROKE} />
        </>
      );
    case "religion":
      return (
        <>
          <path d="M12 2.2 V5.4" {...STROKE} />
          <path d="M10.2 3.6 H13.8" {...STROKE} />
          <path d="M10.2 7.2 L12 5.2 L13.8 7.2" {...STROKE} />
          <path d="M6 13.2 L12 7.2 L18 13.2" {...STROKE} />
          <rect x="6.5" y="13.2" width="11" height="7.3" {...STROKE} />
          <path d="M10.6 20.5 V16.2 A1.4 1.4 0 0 1 13.4 16.2 V20.5" {...STROKE} />
        </>
      );
    case "friends":
      return (
        <>
          <circle cx="8.2" cy="7.4" r="2.35" {...STROKE} />
          <path d="M4.2 17.8 C4.4 13.4 7 11.4 8.2 11.4 C9.4 11.4 12 13.4 12.2 17.8" {...STROKE} />
          <circle cx="15.6" cy="7.8" r="2.2" {...STROKE} />
          <path d="M12.1 18.2 C12.4 14.2 14.5 12.2 15.6 12.2 C16.7 12.2 18.9 14.2 19.2 18.2" {...STROKE} />
        </>
      );
    case "health":
      return (
        <>
          <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3.2" {...STROKE} />
          <path d="M12 7.4 V16.6" {...STROKE} strokeWidth={2} />
          <path d="M7.4 12 H16.6" {...STROKE} strokeWidth={2} />
        </>
      );
    case "socialService":
      return (
        <>
          <path d="M4.2 19.4 V11.6 L12 5.6 L19.8 11.6 V19.4 Z" {...STROKE} />
          <path
            d="M12 11.4 C11.2 10.4 9.6 10.5 9.2 11.6 C8.8 12.7 12 15.2 12 15.2 C12 15.2 15.2 12.7 14.8 11.6 C14.4 10.5 12.8 10.4 12 11.4 Z"
            {...STROKE}
          />
        </>
      );
    case "recreation":
      return (
        <>
          <circle cx="12" cy="12" r="8" {...STROKE} />
          <path d="M12 4 V20" {...STROKE} />
          <path d="M4 12 H20" {...STROKE} />
          <path d="M6.2 6.4 C8.6 8.6 8.6 15.4 6.2 17.6" {...STROKE} />
          <path d="M17.8 6.4 C15.4 8.6 15.4 15.4 17.8 17.6" {...STROKE} />
        </>
      );
    case "legal":
      return (
        <>
          <path d="M12 4.6 V18.6" {...STROKE} />
          <path d="M8 19.6 H16" {...STROKE} />
          <path d="M5 8.2 H19" {...STROKE} />
          <path d="M12 4.6 H12.01" {...STROKE} strokeWidth={2.4} />
          <path d="M5 8.2 L3.4 13.4 H6.6 Z" {...STROKE} />
          <path d="M19 8.2 L17.4 13.4 H20.6 Z" {...STROKE} />
        </>
      );
    case "community":
      return (
        <>
          <path d="M3.4 19.2 V12.2 L8.2 8.2 L13 12.2 V19.2 Z" {...STROKE} />
          <path d="M7 19.2 V15.2 H9.4 V19.2" {...STROKE} />
          <path d="M11.6 19.2 V11.4 L16.6 7.4 L21.4 11.4 V19.2 H11.6" {...STROKE} />
          <path d="M15.6 19.2 V15 H18 V19.2" {...STROKE} />
        </>
      );
    case "extendedFamily":
      return (
        <>
          <circle cx="12" cy="6.4" r="2.3" {...STROKE} />
          <path d="M7.8 16.2 C8 12.4 10.4 10.4 12 10.4 C13.6 10.4 16 12.4 16.2 16.2" {...STROKE} />
          <circle cx="5.6" cy="9" r="1.85" {...STROKE} />
          <path d="M2.5 18 C2.7 14.8 4.4 13.2 5.6 13.2 C6.8 13.2 8.5 14.8 8.7 18" {...STROKE} />
          <circle cx="18.4" cy="9" r="1.85" {...STROKE} />
          <path d="M15.3 18 C15.5 14.8 17.2 13.2 18.4 13.2 C19.6 13.2 21.3 14.8 21.5 18" {...STROKE} />
        </>
      );
    case "custom":
      return (
        <>
          <circle
            cx="12"
            cy="12"
            r="7.6"
            {...STROKE}
            strokeDasharray="2.4 1.8"
          />
          <path d="M12 8.4 V15.6" {...STROKE} />
          <path d="M8.4 12 H15.6" {...STROKE} />
        </>
      );
  }
}

export function EcoSystemGlyph({
  category,
  size = 22,
}: {
  category: EcoSystemCategory;
  size?: number;
}) {
  return (
    <svg
      className="eco-system-glyph"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <EcoSystemGlyphPaths category={category} />
    </svg>
  );
}
