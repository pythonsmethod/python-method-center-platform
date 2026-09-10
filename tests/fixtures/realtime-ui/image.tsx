import type { ImageProps } from "next/image";
// The isolated Vite harness has no Next image optimizer. Use the same local art.
export default function FixtureImage({ src, alt, width, height, className }: ImageProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={typeof src === "string" ? src : ""} alt={alt} width={width} height={height} className={className} />;
}
