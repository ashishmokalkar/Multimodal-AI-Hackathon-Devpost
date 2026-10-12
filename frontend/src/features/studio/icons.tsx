import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({
  size = 16,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconHeart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9Z" />
  </Icon>
);
export const IconPulse = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </Icon>
);
export const IconUser = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Icon>
);
export const IconGauge = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 17a8 8 0 1 1 15 0" />
    <path d="m12 13 4-4" />
    <circle cx="12" cy="13" r="1.2" />
  </Icon>
);
export const IconBars = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v16" />
    <path d="M12 7h6M12 11h3M6 15h6M9 19h3" />
  </Icon>
);
export const IconGrid = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="6" r="1.6" />
    <circle cx="12" cy="6" r="2.4" />
    <circle cx="18" cy="6" r="1" />
    <circle cx="6" cy="12" r="2.4" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="18" cy="12" r="1.8" />
    <circle cx="6" cy="18" r="1" />
    <circle cx="12" cy="18" r="1.8" />
    <circle cx="18" cy="18" r="2.4" />
  </Icon>
);
export const IconPeople = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="2.6" />
    <circle cx="16.5" cy="9" r="2.2" />
    <path d="M3 19a5 5 0 0 1 10 0M13 19a4 4 0 0 1 8 0" />
  </Icon>
);
export const IconSliders = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Icon>
);
export const IconFlask = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
    <path d="M7.5 15h9" />
  </Icon>
);
export const IconChart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20V4M4 20h16" />
    <path d="m7 15 4-5 3 3 5-7" />
  </Icon>
);
export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const IconMinus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 12h12" />
  </Icon>
);
export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.5-4.5" />
  </Icon>
);
export const IconPlay = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" />
  </Icon>
);
export const IconPause = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5v14M16 5v14" strokeWidth={3} />
  </Icon>
);
export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
);
export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);
export const IconTarget = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Icon>
);
export const IconLayers = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Icon>
);
export const IconFlow = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8c4 0 4 8 8 8s4-8 8-8" />
    <circle cx="7" cy="11" r="1" fill="currentColor" />
    <circle cx="15" cy="13" r="1" fill="currentColor" />
  </Icon>
);
export const IconTag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12V4h8l10 10-8 8L3 12Z" />
    <circle cx="7.5" cy="8.5" r="1.3" />
  </Icon>
);
export const IconOrbit = (p: IconProps) => (
  <Icon {...p}>
    <ellipse cx="12" cy="12" rx="9" ry="4" />
    <circle cx="12" cy="12" r="2.2" />
    <path d="m19 6 2 2-2 2" />
  </Icon>
);
export const IconSparkle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3c.8 4.4 2.6 6.2 7 7-4.4.8-6.2 2.6-7 7-.8-4.4-2.6-6.2-7-7 4.4-.8 6.2-2.6 7-7Z" />
  </Icon>
);
export const IconPalette = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.6-1 1-2-.8-1.2 0-2.6 1.4-2.6H17a4 4 0 0 0 4-4C21 7 17 3 12 3Z" />
    <circle cx="7.5" cy="11" r="1.2" />
    <circle cx="10" cy="7" r="1.2" />
    <circle cx="15" cy="7.5" r="1.2" />
  </Icon>
);
export const IconLayout = (p: IconProps) => (
  <Icon {...p}>
    <rect height="16" rx="2" width="18" x="3" y="4" />
    <path d="M9 4v16M9 11h12" />
  </Icon>
);
export const IconShuffle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h3c5 0 5 10 10 10h3M4 17h3c2 0 3-1.5 4-3.5M13 9.5C14 8 15 7 17 7h3" />
    <path d="m18 4 3 3-3 3M18 14l3 3-3 3" />
  </Icon>
);
export const IconEdit = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
  </Icon>
);
export const IconReset = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" />
    <path d="M4 4v4.5h4.5" />
  </Icon>
);
export const IconInfo = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.5" />
  </Icon>
);
export const IconShield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
    <path d="M12 8v5M12 16v.5" />
  </Icon>
);
export const IconCompare = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20V4M4 20h16" />
    <circle cx="9" cy="14" r="1.4" />
    <circle cx="13" cy="11" r="1.4" />
    <circle cx="17" cy="8" r="2.4" />
  </Icon>
);
export const IconSpeaker = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </Icon>
);
export const IconStop = (p: IconProps) => (
  <Icon {...p}>
    <rect height="12" rx="2" width="12" x="6" y="6" />
  </Icon>
);
export const IconReport = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 3h7l5 5v13H7z" />
    <path d="M14 3v5h5M10 13h6M10 17h4" />
  </Icon>
);
export const IconExpand = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
  </Icon>
);
export const IconShrink = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
  </Icon>
);
