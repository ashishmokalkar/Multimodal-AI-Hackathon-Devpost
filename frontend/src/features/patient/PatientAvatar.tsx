import { useId } from "react";

type Sex = "Female" | "Male" | null;

/**
 * Head-and-shoulders silhouette for the patient, female or male, on a soft gradient tile. A neutral illustration
 * (no face or skin tone) that reads at a glance which patient is open; decorative, so hidden from screen readers
 * (the patient's age and sex are written next to it).
 */
export function PatientAvatar({
  sex,
  size = 42,
  className = "",
}: {
  sex: Sex;
  size?: number;
  className?: string;
}) {
  const id = useId();
  const [from, to] =
    sex === "Female" ? ["#ec4899", "#7c3aed"] : sex === "Male" ? ["#0ea5e9", "#0f766e"] : ["#64748b", "#334155"];
  return (
    <svg
      aria-hidden="true"
      className={`patient-avatar ${className}`}
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect height="48" rx="14" width="48" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect fill={`url(#${id}-bg)`} height="48" width="48" />
        <circle cx="38" cy="8" fill="#fff" opacity="0.12" r="16" />
        {sex === "Female" ? (
          <>
            {/* long hair behind the head and over the shoulders */}
            <path
              d="M12.5 22c0-9 5-14.5 11.5-14.5S35.5 13 35.5 22v10.5c-2.6 2.2-6.4 3.2-11.5 3.2s-8.9-1-11.5-3.2Z"
              fill="#fff"
              opacity="0.5"
            />
            <path d="M8 48c0-8.6 7-13.4 16-13.4S40 39.4 40 48Z" fill="#fff" opacity="0.92" />
            <rect fill="#fff" height="6" opacity="0.92" rx="2.5" width="6" x="21" y="27" />
            <ellipse cx="24" cy="20.5" fill="#fff" rx="7.4" ry="8.6" />
            {/* side-swept fringe */}
            <path
              d="M16.4 19.5c.6-6.2 4-9.3 7.8-9.3 4.6 0 7.6 3.4 7.8 8.7-3.6-.4-7.5-2.4-9.6-5.4-1.4 3-3.4 5-6 6Z"
              fill="#fff"
              opacity="0.55"
            />
          </>
        ) : (
          <>
            <path d="M6 48c0-9.4 7.6-14.4 18-14.4S42 38.6 42 48Z" fill="#fff" opacity="0.92" />
            <rect fill="#fff" height="6" opacity="0.92" rx="2.5" width="7" x="20.5" y="27" />
            <ellipse cx="24" cy="20" fill="#fff" rx="7.8" ry="9" />
            {/* short hair */}
            <path
              d="M15.9 19.4c-.4-6.6 3.3-10.9 8.1-10.9s8.6 4.1 8.1 10.9c-1.3-3.1-3.8-4.9-8.1-4.9s-6.8 1.8-8.1 4.9Z"
              fill="#fff"
              opacity="0.55"
            />
          </>
        )}
      </g>
    </svg>
  );
}
