import { useId } from "react";

type Sex = "Female" | "Male" | null;

/** From this age the illustration has grey hair. */
const GREY_FROM = 60;

const SKIN = "#e8b48c";
const SKIN_SHADE = "#d39a72";
const FEATURES = "#2b1d16";
const SMILE = "#a2593c";

/**
 * Illustrated head-and-shoulders portrait of the patient: a man or a woman (grey-haired from 60), on a soft gradient
 * tile. Decorative, so hidden from screen readers: the patient's age and sex are written next to it.
 */
export function PatientAvatar({
  sex,
  age = null,
  size = 42,
  className = "",
}: {
  sex: Sex;
  age?: number | null;
  size?: number;
  className?: string;
}) {
  const id = useId();
  const older = typeof age === "number" && age >= GREY_FROM;
  const [from, to] =
    sex === "Female"
      ? ["#f472b6", "#7c3aed"]
      : sex === "Male"
        ? ["#38bdf8", "#0f766e"]
        : ["#64748b", "#334155"];
  const hair = older ? "#d5d9e0" : sex === "Female" ? "#4a2c1d" : "#2e221c";
  const brow = older ? "#9ca3af" : FEATURES;

  const face = (cy: number, rx: number, ry: number) => (
    <>
      <ellipse cx={24 - rx - 0.2} cy={cy + 1} fill={SKIN_SHADE} rx="1.7" ry="2.5" />
      <ellipse cx={24 + rx + 0.2} cy={cy + 1} fill={SKIN_SHADE} rx="1.7" ry="2.5" />
      <ellipse cx="24" cy={cy} fill={SKIN} rx={rx} ry={ry} />
      <path
        d={`M19.6 ${cy - 2.6}h2.6M25.8 ${cy - 2.6}h2.6`}
        stroke={brow}
        strokeLinecap="round"
        strokeWidth="0.9"
      />
      <circle cx="20.9" cy={cy - 0.4} fill={FEATURES} r="0.95" />
      <circle cx="27.1" cy={cy - 0.4} fill={FEATURES} r="0.95" />
      <path
        d={`M21.7 ${cy + 4}c1.4 1.1 3.2 1.1 4.6 0`}
        fill="none"
        stroke={SMILE}
        strokeLinecap="round"
        strokeWidth="0.95"
      />
    </>
  );

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
        <circle cx="38" cy="8" fill="#fff" opacity="0.14" r="16" />
        {sex === "Female" ? (
          <>
            {/* hair behind the head, to the shoulders (a shorter bob when older) */}
            <path
              d={
                older
                  ? "M14.6 22c0-8.4 4.4-13 9.4-13s9.4 4.6 9.4 13v7.6c-2.5 1.4-5.6 2-9.4 2s-6.9-.6-9.4-2Z"
                  : "M13.8 22c0-9 4.6-13.6 10.2-13.6S34.2 13 34.2 22v12.6c-2.7 1.6-6.1 2.4-10.2 2.4s-7.5-.8-10.2-2.4Z"
              }
              fill={hair}
            />
            <path d="M8 48c0-7.8 6.8-12.4 16-12.4S40 40.2 40 48Z" fill="#fdf2f8" />
            <path d="M19.4 35.9c1.3 2 2.8 3 4.6 3s3.3-1 4.6-3" fill="none" stroke="#f9a8d4" strokeWidth="1.2" />
            <rect fill={SKIN_SHADE} height="8" rx="3" width="6.4" x="20.8" y="28" />
            {face(21, 7.3, 8.6)}
            {/* side-swept fringe */}
            <path
              d="M16.5 20.4c.2-6.6 3.5-10.2 7.6-10.2 4.6 0 7.6 3.6 7.5 9.4-3.7-.4-7.4-2.5-9.4-5.5-1.3 3-3.2 5.2-5.7 6.3Z"
              fill={hair}
            />
            <circle cx="16.4" cy="25.2" fill="#fde68a" r="0.9" />
            <circle cx="31.6" cy="25.2" fill="#fde68a" r="0.9" />
          </>
        ) : sex === "Male" ? (
          <>
            <path d="M6.5 48c0-8.8 7.2-13.4 17.5-13.4S41.5 39.2 41.5 48Z" fill="#e0f2fe" />
            {/* open collar */}
            <path d="M18.6 35.2 24 41.4l5.4-6.2" fill="#bae6fd" />
            <rect fill={SKIN_SHADE} height="8.5" rx="3" width="7.4" x="20.3" y="27.4" />
            {face(20.6, 7.9, 9.1)}
            {/* short hair; receding at the temples when older */}
            <path
              d={
                older
                  ? "M16 19c-.4-6.3 3.4-10.5 8-10.5s8.4 4.2 8 10.5c-.7-1.9-1.6-3.3-2.8-4.1-1.6-1.3-3.4-1.8-5.2-1.8s-3.6.5-5.2 1.8c-1.2.8-2.1 2.2-2.8 4.1Z"
                  : "M15.9 19.6c-.6-7 3.3-11.6 8.1-11.6 5 0 8.8 4.4 8.1 11.6-.8-2.6-2.4-4.6-4.9-5.4-2.6 1.4-7 1.9-10.1.8-.6 1.3-1 2.8-1.2 4.6Z"
              }
              fill={hair}
            />
          </>
        ) : (
          <>
            <path d="M8 48c0-8.6 7-13.4 16-13.4S40 39.4 40 48Z" fill="#fff" opacity="0.9" />
            <circle cx="24" cy="21" fill="#fff" opacity="0.9" r="8.4" />
          </>
        )}
      </g>
    </svg>
  );
}
