type IconProps = {
  size?: number;
};

function baseProps(size: number) {
  return {
    "aria-hidden": true as const,
    fill: "none",
    height: size,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.6,
    viewBox: "0 0 24 24",
    width: size
  };
}

export function IconAnkh({ size = 28 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <ellipse cx="12" cy="6.5" rx="3.4" ry="4.3" />
      <line x1="12" x2="12" y1="10.8" y2="21" />
      <line x1="6.5" x2="17.5" y1="13.5" y2="13.5" />
    </svg>
  );
}

export function IconEye({ size = 28 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <path d="M2.5 11c3-3.8 6.2-5.7 9.5-5.7s6.5 1.9 9.5 5.7c-3 3.8-6.2 5.7-9.5 5.7S5.5 14.8 2.5 11Z" />
      <circle cx="12" cy="11" r="2.6" />
      <path d="M8.5 16.2 7 20.5" />
      <path d="M15.5 16.4c1.2 1.6 1.2 3 .2 4.1" />
    </svg>
  );
}

export function IconLotus({ size = 28 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <path d="M12 4c-2.4 3.4-2.4 8.2 0 12 2.4-3.8 2.4-8.6 0-12Z" />
      <path d="M4.5 8c.6 4.4 3.4 7.4 7.5 8-1-4.3-3.8-7-7.5-8Z" />
      <path d="M19.5 8c-.6 4.4-3.4 7.4-7.5 8 1-4.3 3.8-7 7.5-8Z" />
      <path d="M5 18.5c4.6 1.8 9.4 1.8 14 0" />
    </svg>
  );
}

export function IconPyramid({ size = 28 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <path d="M12 4 21.5 19.5H2.5L12 4Z" />
      <path d="M12 4v15.5" />
      <path d="M6 15.5h12" />
    </svg>
  );
}

export function IconSun({ size = 28 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </svg>
  );
}

export function IconScarab({ size = 28 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <ellipse cx="12" cy="13.5" rx="4.6" ry="5.5" />
      <circle cx="12" cy="5.5" r="1.8" />
      <path d="M12 8v11" />
      <path d="M7.4 11 3 8.5M16.6 11 21 8.5M7.4 15.5 3.5 17M16.6 15.5 20.5 17" />
    </svg>
  );
}

export function IconScroll({ size = 28 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <path d="M7 4.5h11a2 2 0 0 1 2 2v11" />
      <path d="M20 17.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4.5" />
    </svg>
  );
}

export function IconFeather({ size = 28 }: IconProps) {
  return (
    <svg {...baseProps(size)}>
      <path d="M19.5 4.5c-6 0-11 4-12.5 10.5 3.5 1.5 8 .5 10.5-3 1.6-2.2 2.3-4.8 2-7.5Z" />
      <path d="M4 20.5C8.5 14 13 10 19.5 4.5" />
    </svg>
  );
}
