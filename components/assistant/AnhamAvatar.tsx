// Анхам, the center's AI companion. Drawn as vector rather than shipped as
// a bitmap on purpose: he appears on every page at sizes from 48px in the
// corner to 200px in the hero, and he has to stay crisp at all of them
// without four exports and a 2 MB download on a phone.
//
// The form is fixed and does not change between states — only his state
// does, exactly as specified:
//   guest      — calm, soft gold glow
//   registered — brighter, a thin ring turning around him
//   client     — deeper glow, extra light, a steadier gaze
//
// When the official high-resolution render exists, swap the <svg> body here
// for an <Image>; nothing else in the app needs to know.

export type AnhamState = "guest" | "registered" | "client";

type AnhamAvatarProps = {
  size?: number;
  state?: AnhamState;
  className?: string;
  // Decorative next to a visible label, announced when standing alone.
  title?: string;
};

export function AnhamAvatar({
  size = 72,
  state = "guest",
  className,
  title
}: AnhamAvatarProps) {
  // Unique per instance so two Анхам on one page cannot steal each other's
  // gradients — several can be on screen at once (hero plus companion).
  const uid = `anham-${state}-${size}`;

  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={`anham anham--${state}${className ? ` ${className}` : ""}`}
      height={size}
      role={title ? "img" : undefined}
      viewBox="0 0 120 120"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}

      <defs>
        {/* Gold-cream shell, lit from the upper left. */}
        <radialGradient cx="38%" cy="30%" id={`${uid}-shell`} r="78%">
          <stop offset="0%" stopColor="#f6e7bf" />
          <stop offset="52%" stopColor="#d9b558" />
          <stop offset="100%" stopColor="#8d6a22" />
        </radialGradient>

        {/* Glossy black face panel with a soft highlight near the top. */}
        <radialGradient cx="42%" cy="24%" id={`${uid}-face`} r="86%">
          <stop offset="0%" stopColor="#3a3630" />
          <stop offset="38%" stopColor="#15120d" />
          <stop offset="100%" stopColor="#05040300" stopOpacity="1" />
        </radialGradient>

        <linearGradient id={`${uid}-eye`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffeec2" />
          <stop offset="100%" stopColor="#e8c25f" />
        </linearGradient>

        <filter
          height="260%"
          id={`${uid}-glow`}
          width="260%"
          x="-80%"
          y="-80%"
        >
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* The ankh the center carries. Reused on the forehead and on both
            side modules so the sign reads at every size. */}
        <g id={`${uid}-ankh`}>
          <ellipse
            cx="0"
            cy="-4.4"
            fill="none"
            rx="2.6"
            ry="3.2"
            strokeWidth="1.5"
          />
          <line strokeLinecap="round" strokeWidth="1.5" x1="-3.4" x2="3.4" y1="0.4" y2="0.4" />
          <line strokeLinecap="round" strokeWidth="1.5" x1="0" x2="0" y1="-1.2" y2="5.6" />
        </g>
      </defs>

      {/* Soft gold halo. Sits behind everything and never takes a click. */}
      <circle
        className="anham__halo"
        cx="60"
        cy="62"
        fill="#d4af37"
        opacity="0.2"
        r="44"
      />

      {/* Side modules, each carrying the ankh. */}
      <g className="anham__modules">
        <rect
          fill={`url(#${uid}-shell)`}
          height="26"
          rx="7"
          width="15"
          x="8"
          y="50"
        />
        <rect
          fill={`url(#${uid}-shell)`}
          height="26"
          rx="7"
          width="15"
          x="97"
          y="50"
        />
        <g stroke="#4a3b24" fill="none" opacity="0.85">
          <use href={`#${uid}-ankh`} transform="translate(15.5 63) scale(0.85)" />
          <use href={`#${uid}-ankh`} transform="translate(104.5 63) scale(0.85)" />
        </g>
      </g>

      {/* Turning ring — appears once a person has an account. */}
      {state !== "guest" ? (
        <circle
          className="anham__ring"
          cx="60"
          cy="62"
          fill="none"
          r="47"
          stroke="#e3c25f"
          strokeDasharray="16 12"
          strokeLinecap="round"
          strokeOpacity="0.75"
          strokeWidth="1.6"
        />
      ) : null}

      {/* Body: round, and it stays round. */}
      <circle cx="60" cy="62" fill={`url(#${uid}-shell)`} r="40" />
      <circle
        cx="60"
        cy="62"
        fill="none"
        r="40"
        stroke="#f3e2b4"
        strokeOpacity="0.55"
        strokeWidth="1.2"
      />

      {/* Ankh on the forehead. */}
      <g fill="none" stroke="#5a4318" strokeOpacity="0.9">
        <use href={`#${uid}-ankh`} transform="translate(60 34) scale(1.15)" />
      </g>

      {/* Large glossy black face panel. */}
      <ellipse cx="60" cy="68" fill="#0d0b08" rx="30" ry="27" />
      <ellipse cx="60" cy="68" fill={`url(#${uid}-face)`} rx="30" ry="27" />

      {/* Big warm eyes and a small kind smile. Nothing sharp, nothing
          narrowed — a child should not read a threat in this face.

          He is alive: he blinks, and now and then he winks. The blink and
          the wink run on cycles of 7s and 11s, which share no common
          factor, so the pattern never lines up into something mechanical.
          Two nested groups because both animate a transform and one
          element cannot carry two. */}
      <g className="anham__face" filter={`url(#${uid}-glow)`}>
        <g className="anham__eyes">
          <g className="anham__eye-wink">
            <ellipse
              className="anham__eye"
              cx="49"
              cy="65"
              fill={`url(#${uid}-eye)`}
              rx="6.2"
              ry="7.4"
            />
          </g>
          <ellipse
            className="anham__eye"
            cx="71"
            cy="65"
            fill={`url(#${uid}-eye)`}
            rx="6.2"
            ry="7.4"
          />
        </g>
        <path
          className="anham__smile"
          d="M53 78 Q60 84 67 78"
          fill="none"
          stroke="#f2d489"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
      </g>

      {/* Extra light a paying client sees: his companion knows his case. */}
      {state === "client" ? (
        <g className="anham__aura" fill="#f0d795">
          <circle cx="60" cy="18" r="2.2" />
          <circle cx="97" cy="34" r="1.6" />
          <circle cx="23" cy="34" r="1.6" />
        </g>
      ) : null}

      {/* Arms, resting — an open posture rather than a braced one. */}
      <g fill={`url(#${uid}-shell)`}>
        <rect height="11" rx="5.5" width="17" x="30" y="97" />
        <rect height="11" rx="5.5" width="17" x="73" y="97" />
      </g>
    </svg>
  );
}
