// Package illustrations for the shop: matte black containers with gold
// caps, cartouches and hieroglyph bands — the look Professor Python wants
// for the line. Drawn as vectors so the storefront can be seen and judged
// before a single photo exists; real product photos replace them later.

type ArtProps = {
  // Gradients need unique ids when several packages share a page.
  id: string;
  title?: string;
};

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-gold`} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#f6dfa0" />
        <stop offset="45%" stopColor="#d9a441" />
        <stop offset="100%" stopColor="#8a5f18" />
      </linearGradient>
      <linearGradient id={`${id}-body`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor="#0d0b06" />
        <stop offset="35%" stopColor="#241d10" />
        <stop offset="70%" stopColor="#14100a" />
        <stop offset="100%" stopColor="#070603" />
      </linearGradient>
    </defs>
  );
}

// A band of hieroglyph-like marks — decorative, not real writing.
function Glyphs({ y, id }: { y: number; id: string }) {
  return (
    <g opacity="0.85" stroke={`url(#${id}-gold)`} strokeWidth="1.1" fill="none">
      <path d={`M34 ${y}h3v5h-3z`} />
      <path d={`M42 ${y}v5M40 ${y + 1.5}h4`} />
      <circle cx="50" cy={y + 2.5} r="2" />
      <path d={`M56 ${y + 5}l3-5 3 5z`} />
      <path d={`M68 ${y}h4M70 ${y}v5`} />
      <path d={`M78 ${y + 1}c2-2 4 0 4 2s-2 3-4 2`} />
      <path d={`M88 ${y}v5M86 ${y}h4M86 ${y + 5}h4`} />
    </g>
  );
}

function frame(id: string, title: string | undefined, children: React.ReactNode) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      className="pkg-art"
      role={title ? "img" : undefined}
      viewBox="0 0 128 150"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <Defs id={id} />
      {children}
    </svg>
  );
}

// Capsule jar — the formula itself.
export function ArtJar({ id, title }: ArtProps) {
  return frame(
    id,
    title,
    <>
      <rect
        fill={`url(#${id}-body)`}
        height="88"
        rx="8"
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.2"
        width="84"
        x="22"
        y="52"
      />
      <rect
        fill={`url(#${id}-gold)`}
        height="20"
        rx="4"
        width="72"
        x="28"
        y="34"
      />
      <g opacity="0.45" stroke="#3a2a09" strokeWidth="1">
        {Array.from({ length: 11 }, (_, index) => (
          <path d={`M${33 + index * 6} 36v16`} key={index} />
        ))}
      </g>
      <ellipse cx="64" cy="34" fill={`url(#${id}-gold)`} rx="36" ry="5" />
      {/* Cartouche with the founder's sign */}
      <rect
        fill="none"
        height="42"
        rx="21"
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.4"
        width="44"
        x="42"
        y="70"
      />
      <g stroke={`url(#${id}-gold)`} strokeWidth="1.3" fill="none">
        <ellipse cx="64" cy="84" rx="5" ry="6" />
        <path d="M64 90v14" />
        <path d="M57 95h14" />
      </g>
      <Glyphs id={id} y={118} />
    </>
  );
}

// Dropper bottle — oil or serum.
export function ArtDropper({ id, title }: ArtProps) {
  return frame(
    id,
    title,
    <>
      <rect
        fill={`url(#${id}-gold)`}
        height="26"
        rx="3"
        width="16"
        x="56"
        y="14"
      />
      <rect
        fill={`url(#${id}-gold)`}
        height="12"
        rx="3"
        width="26"
        x="51"
        y="38"
      />
      <path
        d="M46 50h36c3 0 5 3 5 6v78a8 8 0 0 1-8 8H49a8 8 0 0 1-8-8V56c0-3 2-6 5-6z"
        fill={`url(#${id}-body)`}
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.2"
      />
      <g stroke={`url(#${id}-gold)`} strokeWidth="1.2" fill="none">
        <path d="M64 66c-6 4-9 9-9 14 0 5 4 9 9 9s9-4 9-9c0-5-3-10-9-14z" />
        <path d="M55 100h18" />
        <path d="M57 108h14" />
      </g>
    </>
  );
}

// Cream jar — wide and low.
export function ArtCreamJar({ id, title }: ArtProps) {
  return frame(
    id,
    title,
    <>
      <rect
        fill={`url(#${id}-body)`}
        height="62"
        rx="8"
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.2"
        width="96"
        x="16"
        y="74"
      />
      <rect
        fill={`url(#${id}-gold)`}
        height="22"
        rx="5"
        width="86"
        x="21"
        y="54"
      />
      <g opacity="0.45" stroke="#3a2a09" strokeWidth="1">
        {Array.from({ length: 13 }, (_, index) => (
          <path d={`M${26 + index * 6} 56v18`} key={index} />
        ))}
      </g>
      <ellipse cx="64" cy="54" fill={`url(#${id}-gold)`} rx="43" ry="6" />
      <g stroke={`url(#${id}-gold)`} strokeWidth="1.3" fill="none">
        <circle cx="64" cy="100" r="13" />
        <path d="M64 92v16M56 100h16" />
      </g>
      <Glyphs id={id} y={122} />
    </>
  );
}

// Pump bottle — body lotion.
export function ArtPumpBottle({ id, title }: ArtProps) {
  return frame(
    id,
    title,
    <>
      <path
        d="M58 10h12v8h-12z"
        fill={`url(#${id}-gold)`}
      />
      <path d="M70 14h12v4H70z" fill={`url(#${id}-gold)`} />
      <rect fill={`url(#${id}-gold)`} height="14" rx="3" width="20" x="54" y="20" />
      <path
        d="M44 36h40c3 0 6 3 6 7v92a7 7 0 0 1-7 7H45a7 7 0 0 1-7-7V43c0-4 3-7 6-7z"
        fill={`url(#${id}-body)`}
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.2"
      />
      <rect
        fill="none"
        height="46"
        rx="6"
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.3"
        width="40"
        x="44"
        y="60"
      />
      <g stroke={`url(#${id}-gold)`} strokeWidth="1.2" fill="none">
        <path d="M52 76c4-4 8-4 12 0s8 4 12 0" />
        <path d="M52 86c4-4 8-4 12 0s8 4 12 0" />
      </g>
      <Glyphs id={id} y={118} />
    </>
  );
}

// Hoodie — the wearable side of the line.
export function ArtHoodie({ id, title }: ArtProps) {
  return frame(
    id,
    title,
    <>
      <path
        d="M44 34l-26 12 8 26 12-5v66h52V67l12 5 8-26-26-12c-4 8-8 12-20 12s-16-4-20-12z"
        fill={`url(#${id}-body)`}
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.2"
      />
      <path
        d="M44 34c4 8 8 12 20 12s16-4 20-12"
        fill="none"
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.2"
      />
      <path d="M64 46v88" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="0.9" opacity="0.6" />
      {/* Eye of Horus on the chest */}
      <g stroke={`url(#${id}-gold)`} strokeWidth="1.3" fill="none">
        <path d="M48 82c4-5 9-7 13-7s7 2 9 5" />
        <path d="M48 82c4 5 9 7 13 7 4 0 6-2 8-4" />
        <circle cx="57" cy="82" r="3" />
        <path d="M57 89v4c0 2 2 4 4 4" />
        <path d="M70 87c1 2 3 4 5 4" />
      </g>
    </>
  );
}

// Ankh pendant — the sign of the center, worn.
export function ArtPendant({ id, title }: ArtProps) {
  return frame(
    id,
    title,
    <>
      <path
        d="M28 20c8 22 22 34 36 34s28-12 36-34"
        fill="none"
        stroke={`url(#${id}-gold)`}
        strokeWidth="2.4"
      />
      <g fill="none" stroke={`url(#${id}-gold)`} strokeWidth="3">
        <ellipse cx="64" cy="72" rx="13" ry="16" />
        <path d="M64 88v44" />
        <path d="M45 100h38" />
      </g>
      <circle cx="64" cy="72" fill={`url(#${id}-gold)`} opacity="0.25" r="7" />
    </>
  );
}

// Book of the method.
export function ArtBook({ id, title }: ArtProps) {
  return frame(
    id,
    title,
    <>
      <path
        d="M26 26h64a10 10 0 0 1 10 10v88a10 10 0 0 1-10 10H26z"
        fill={`url(#${id}-body)`}
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.2"
      />
      <path d="M26 26v108" stroke={`url(#${id}-gold)`} strokeWidth="3" />
      <rect
        fill="none"
        height="52"
        rx="26"
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.4"
        width="40"
        x="42"
        y="46"
      />
      <g stroke={`url(#${id}-gold)`} strokeWidth="1.3" fill="none">
        <ellipse cx="62" cy="64" rx="5" ry="6" />
        <path d="M62 70v16" />
        <path d="M55 76h14" />
      </g>
      <g stroke={`url(#${id}-gold)`} strokeWidth="1.1" opacity="0.8">
        <path d="M40 112h48" />
        <path d="M46 120h36" />
      </g>
    </>
  );
}

// Diary — daily marks of the state.
export function ArtDiary({ id, title }: ArtProps) {
  return frame(
    id,
    title,
    <>
      <rect
        fill={`url(#${id}-body)`}
        height="104"
        rx="6"
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.2"
        width="80"
        x="24"
        y="26"
      />
      <g stroke={`url(#${id}-gold)`} strokeWidth="2">
        <path d="M40 20v14" />
        <path d="M64 20v14" />
        <path d="M88 20v14" />
      </g>
      <g stroke={`url(#${id}-gold)`} strokeWidth="1" opacity="0.75">
        <path d="M36 56h56" />
        <path d="M36 68h56" />
        <path d="M36 80h56" />
        <path d="M36 92h40" />
      </g>
      <g stroke={`url(#${id}-gold)`} strokeWidth="1.4" fill="none">
        <path d="M78 100l6 6 12-14" />
      </g>
    </>
  );
}

export const packageArt = {
  jar: ArtJar,
  dropper: ArtDropper,
  cream: ArtCreamJar,
  lotion: ArtPumpBottle,
  hoodie: ArtHoodie,
  pendant: ArtPendant,
  book: ArtBook,
  diary: ArtDiary
} as const;

export type PackageArtName = keyof typeof packageArt;
