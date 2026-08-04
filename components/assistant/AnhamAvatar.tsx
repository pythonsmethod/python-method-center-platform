import Image from "next/image";

// Анхам, the center's AI companion — the official render, kept alive.
//
// A flat image cannot blink, so the eyes are covered by two lids drawn on
// top of it: shapes the colour of the face panel that sweep down over each
// eye and lift again. The panel is pure black behind the eyes, so a lid is
// invisible until it moves.
//
// Lid positions were measured on the render itself and are expressed as
// percentages of the canvas, so they hold at every size he is shown at.
// If the artwork is ever regenerated, re-measure: the eyes will move.
const EYE_LEFT_X = 40.4;
const EYE_RIGHT_X = 61.4;
const EYE_Y = 37.5;
const EYE_RX = 6.6;
const EYE_RY = 7.4;

const ANHAM_SRC = "/images/anham-master.png";

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
  return (
    <span
      className={`anham anham--${state}${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
    >
      <Image
        alt={title ?? ""}
        className="anham__art"
        height={size}
        // He is the first thing on the page in the hero, and the last thing
        // that should pop in late.
        priority={size >= 180}
        src={ANHAM_SRC}
        width={size}
      />

      {/* Lids. Two over the left eye on purpose: blink and wink both drive
          a transform, and one element cannot carry two animations. They are
          the same colour, so the overlap is invisible. */}
      <svg
        aria-hidden="true"
        className="anham__lids"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse
          className="anham__lid anham__lid--blink"
          cx={EYE_LEFT_X}
          cy={EYE_Y}
          rx={EYE_RX}
          ry={EYE_RY}
        />
        <ellipse
          className="anham__lid anham__lid--blink"
          cx={EYE_RIGHT_X}
          cy={EYE_Y}
          rx={EYE_RX}
          ry={EYE_RY}
        />
        <ellipse
          className="anham__lid anham__lid--wink"
          cx={EYE_LEFT_X}
          cy={EYE_Y}
          rx={EYE_RX}
          ry={EYE_RY}
        />
      </svg>

      {/* A ring turns around him once a person has an account. */}
      {state !== "guest" ? (
        <span aria-hidden="true" className="anham__ring" />
      ) : null}

      {/* Extra light a paying client sees: his companion knows his case. */}
      {state === "client" ? (
        <span aria-hidden="true" className="anham__aura">
          <i />
          <i />
          <i />
        </span>
      ) : null}
    </span>
  );
}
