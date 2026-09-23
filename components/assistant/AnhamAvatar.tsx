import Image from "next/image";

// Анхам, the center's AI companion — the official render, kept alive.
//
// A flat image cannot blink, so the eyes are covered by two lids drawn on
// top of it: shapes the colour of the face panel that sweep down over each
// eye and lift again. The panel is pure black behind the eyes, so a lid is
// invisible until it moves.
//
// Lid geometry, taken from the render by reading its pixels rather than by
// eye, and expressed as percentages of the canvas so it holds at every size.
//
// The first version was estimated, and it showed. The lids were about half
// again as wide as the eyes and two thirds taller, so a blink put a black
// patch on the visor around each eye instead of closing it — reported as
// "when he blinks his pixels are bigger than his face", which was exactly
// what it looked like.
//
// Measured on anham-master.png (1024x1024) by finding the bright connected
// regions inside the visor: the eyes are round, spanning x 383-467 and
// 567-651, y 332-422. Half a unit of margin covers the soft edge of the
// glow without spilling onto the panel.
//
// The fill is the visor's own colour, sampled from the render around the
// eyes, so even that margin is invisible. Pure black was darker than the
// panel it sat on, which is what made an oversized lid show up as a patch.
//
// If the artwork is ever regenerated, measure again — do not guess.
const EYE_LEFT_X = 41.5;
const EYE_RIGHT_X = 59.5;
const EYE_Y = 36.8;
const EYE_RX = 4.6;
const EYE_RY = 4.9;

const ANHAM_SRC = "/images/anham-master.png";

export type AnhamState = "guest" | "registered" | "client";

type AnhamAvatarProps = {
  size?: number;
  state?: AnhamState;
  // Conversation activity is independent of the person's access tier.
  activity?: "idle" | "thinking";
  className?: string;
  // Decorative next to a visible label, announced when standing alone.
  title?: string;
};

export function AnhamAvatar({
  size = 72,
  state = "guest",
  activity = "idle",
  className,
  title
}: AnhamAvatarProps) {
  return (
    <span
      className={`anham anham--${state}${activity === "thinking" ? " anham--thinking" : ""}${className ? ` ${className}` : ""}`}
      data-activity={activity}
      style={{ width: size, height: size }}
    >
      <span className="anham__figure">
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

        {/* A visual metaphor for preparing a reply, not a claim that a search
            or document check has happened. No timers or extra API calls. */}
        {activity === "thinking" ? (
          <span aria-hidden="true" className="anham__tablet">
            <span className="anham__tablet-screen">
              <span className="anham__tablet-pages"><i /><i /><i /><i /><i /></span>
              <span className="anham__tablet-scan" />
              <svg className="anham__tablet-search" viewBox="0 0 24 24" fill="none">
                <circle cx="10" cy="10" r="5.5" />
                <path d="m14 14 5 5" />
              </svg>
              <span className="anham__tablet-touch" />
            </span>
            <span className="anham__tablet-hand anham__tablet-hand--left" />
            <span className="anham__tablet-hand anham__tablet-hand--right" />
          </span>
        ) : null}
      </span>

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
