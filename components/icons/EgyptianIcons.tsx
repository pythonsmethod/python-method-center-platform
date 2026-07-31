// Egyptian-style line icons drawn for the center, in the same spirit as
// the ankh already used across the site. Vectors, not pictures: they stay
// sharp on any screen, take the accent colour from the theme, and weigh
// nothing.

type IconProps = {
  className?: string;
  title?: string;
};

function frame(children: React.ReactNode, props: IconProps) {
  return (
    <svg
      aria-hidden={props.title ? undefined : true}
      className={`egy-icon${props.className ? ` ${props.className}` : ""}`}
      fill="none"
      role={props.title ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      {props.title ? <title>{props.title}</title> : null}
      {children}
    </svg>
  );
}

// Ankh — the sign of life. The center's own symbol.
export function IconAnkh(props: IconProps) {
  return frame(
    <>
      <ellipse cx="24" cy="14" rx="7.5" ry="9" />
      <path d="M24 23v20" />
      <path d="M13 27h22" />
    </>,
    props
  );
}

// Uraeus — the rising cobra. The python of Python Method.
export function IconCobra(props: IconProps) {
  return frame(
    <>
      <path d="M16.5 22c-3.5-6.5 1-14 7.5-14s11 7.5 7.5 14" />
      <circle cx="24" cy="12.5" r="3" />
      <circle cx="24" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
      <path d="M24 22c0 5.5-6.5 7-6.5 12 0 4 4.5 6 9.5 6" />
      <path d="M21 26.5c2.5 1.5 5.5 1.5 8 0" />
      <path d="M13 40h22" />
    </>,
    props
  );
}

// Eye of Horus — wholeness restored; the classic sign of healing.
export function IconEyeOfHorus(props: IconProps) {
  return frame(
    <>
      <path d="M9 24c4-6 10-9 15-9s9 3 11 7" />
      <path d="M9 24c4 6 10 9 15 9 4.4 0 8-2 10-5" />
      <circle cx="22" cy="24" r="4" />
      <path d="M22 33v5c0 3 2 5 5 5" />
      <path d="M30 32c1 3 3 5 6 5" />
    </>,
    props
  );
}

// Scarab — renewal, the morning sun rolled into a new day.
export function IconScarab(props: IconProps) {
  return frame(
    <>
      <ellipse cx="24" cy="27" rx="9" ry="12" />
      <path d="M24 15v24" />
      <path d="M15 22c-4-1-6-4-6-7" />
      <path d="M33 22c4-1 6-4 6-7" />
      <path d="M15 32c-4 1-6 4-6 7" />
      <path d="M33 32c4 1 6 4 6 7" />
      <circle cx="24" cy="11" r="4" />
    </>,
    props
  );
}

// Lotus — opening again each morning after closing at night.
export function IconLotus(props: IconProps) {
  return frame(
    <>
      <path d="M24 40c-7 0-12-5-14-11 5-1 9 .6 11.6 3.6" />
      <path d="M24 40c7 0 12-5 14-11-5-1-9 .6-11.6 3.6" />
      <path d="M24 40c-4 0-7-4-7-10 0-5 3-9.6 7-13 4 3.4 7 8 7 13 0 6-3 10-7 10z" />
      <path d="M24 40v3" />
      <path d="M14 43h20" />
    </>,
    props
  );
}

// Papyrus scroll — the written method, kept and passed on.
export function IconPapyrus(props: IconProps) {
  return frame(
    <>
      <path d="M14 12h20a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H14" />
      <path d="M14 12a4 4 0 0 0 0 8h4" />
      <path d="M14 40a4 4 0 0 0 0-8h4" />
      <path d="M22 20h10" />
      <path d="M22 26h10" />
      <path d="M22 32h6" />
    </>,
    props
  );
}

// Winged sun disk — protection over the journey.
export function IconWingedSun(props: IconProps) {
  return frame(
    <>
      <circle cx="24" cy="24" r="5.5" />
      <path d="M18.6 22c-5-3.5-10.6-4.6-16.6-3 2.4 2.4 3.6 5 3.6 7.6 4.4-2.6 8.8-3.8 13-3.8" />
      <path d="M29.4 22c5-3.5 10.6-4.6 16.6-3-2.4 2.4-3.6 5-3.6 7.6-4.4-2.6-8.8-3.8-13-3.8" />
      <path d="M6.6 27.6c3.6-1.4 7.4-2 11.4-2" />
      <path d="M41.4 27.6c-3.6-1.4-7.4-2-11.4-2" />
    </>,
    props
  );
}

// Djed pillar — stability, the backbone; the spine of the body restored.
export function IconDjed(props: IconProps) {
  return frame(
    <>
      <path d="M24 6v36" />
      <path d="M16 42h16" />
      <path d="M17 14h14" />
      <path d="M16 20h16" />
      <path d="M17 26h14" />
      <path d="M19 10h10" />
    </>,
    props
  );
}

// Scales of Maat — balance, the measure by which a case is weighed.
export function IconScales(props: IconProps) {
  return frame(
    <>
      <path d="M24 8v30" />
      <path d="M16 42h16" />
      <path d="M10 16h28" />
      <path d="M10 16l-5 10a5 5 0 0 0 10 0z" />
      <path d="M38 16l-5 10a5 5 0 0 0 10 0z" />
      <circle cx="24" cy="8" r="2" />
    </>,
    props
  );
}

// Water — the hieroglyph for water, purity and flow.
export function IconWater(props: IconProps) {
  return frame(
    <>
      <path d="M8 17c3-3 5-3 8 0s5 3 8 0 5-3 8 0" />
      <path d="M8 25c3-3 5-3 8 0s5 3 8 0 5-3 8 0" />
      <path d="M8 33c3-3 5-3 8 0s5 3 8 0 5-3 8 0" />
    </>,
    props
  );
}

export const egyptianIcons = {
  ankh: IconAnkh,
  cobra: IconCobra,
  eye: IconEyeOfHorus,
  scarab: IconScarab,
  lotus: IconLotus,
  papyrus: IconPapyrus,
  wingedSun: IconWingedSun,
  djed: IconDjed,
  scales: IconScales,
  water: IconWater
} as const;

export type EgyptianIconName = keyof typeof egyptianIcons;
