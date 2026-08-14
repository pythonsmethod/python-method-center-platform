import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

// Where Анхам's eyelids are, checked against the artwork itself.
//
// The lids are two shapes drawn over a flat render — the image cannot
// blink, so they close over the eyes and lift again. Their position was
// originally estimated by eye, and it was wrong: about half again as wide
// as the eyes and two thirds taller, in a colour darker than the visor. So
// every blink put a dark patch on the panel around each eye. Reported as
// "when he blinks his pixels are bigger than his face".
//
// Nothing in a build can see that. The only truth is the picture, so the
// picture is what this reads: the bright regions inside the visor are the
// eyes, and each one must sit inside its lid with a margin small enough
// that the lid does not spill onto the panel around it.
//
// If the artwork is ever regenerated, this fails until the lids are
// measured again — which is the point.

const AVATAR = path.join(process.cwd(), "public", "images", "anham-master.png");
const SOURCE = path.join(process.cwd(), "components", "assistant", "AnhamAvatar.tsx");
const STYLES = path.join(process.cwd(), "app", "globals.css");

type Region = { minX: number; maxX: number; minY: number; maxY: number; size: number };

let eyes: Region[] = [];
let width = 0;
let height = 0;

function readConstant(source: string, name: string): number {
  const match = source.match(new RegExp(`const ${name} = ([\\d.]+);`));

  if (!match) {
    throw new Error(`AnhamAvatar no longer defines ${name}`);
  }

  return Number(match[1]);
}

beforeAll(async () => {
  const { data, info } = await sharp(AVATAR).raw().toBuffer({ resolveWithObject: true });
  width = info.width;
  height = info.height;
  const channels = info.channels;

  const isBright = (x: number, y: number) => {
    const i = (y * width + x) * channels;
    const alpha = channels === 4 ? data[i + 3] : 255;

    return alpha > 200 && (data[i] + data[i + 1] + data[i + 2]) / 3 > 100;
  };

  // Only inside the visor: the ears carry gold rings of their own.
  const x0 = Math.round(width * 0.33);
  const x1 = Math.round(width * 0.67);
  const y0 = Math.round(height * 0.22);
  const y1 = Math.round(height * 0.5);

  const seen = new Uint8Array(width * height);
  const regions: Region[] = [];

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (seen[y * width + x] || !isBright(x, y)) {
        continue;
      }

      const stack: Array<[number, number]> = [[x, y]];
      seen[y * width + x] = 1;
      const region: Region = { minX: x, maxX: x, minY: y, maxY: y, size: 0 };

      while (stack.length > 0) {
        const [cx, cy] = stack.pop() as [number, number];
        region.size += 1;
        region.minX = Math.min(region.minX, cx);
        region.maxX = Math.max(region.maxX, cx);
        region.minY = Math.min(region.minY, cy);
        region.maxY = Math.max(region.maxY, cy);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;

          if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) {
            continue;
          }

          if (seen[ny * width + nx] || !isBright(nx, ny)) {
            continue;
          }

          seen[ny * width + nx] = 1;
          stack.push([nx, ny]);
        }
      }

      if (region.size > 400) {
        regions.push(region);
      }
    }
  }

  eyes = regions
    .sort((a, b) => b.size - a.size)
    .slice(0, 2)
    .sort((a, b) => a.minX - b.minX);
}, 30_000);

describe("the eyes in the artwork", () => {
  it("are two regions of the same size, side by side", () => {
    expect(eyes).toHaveLength(2);
    expect(Math.abs(eyes[0].size - eyes[1].size) / eyes[0].size).toBeLessThan(0.1);
  });
});

describe("the eyelids drawn over them", () => {
  const source = readFileSync(SOURCE, "utf8");

  it("cover each eye completely", () => {
    const cx = [readConstant(source, "EYE_LEFT_X"), readConstant(source, "EYE_RIGHT_X")];
    const cy = readConstant(source, "EYE_Y");
    const rx = readConstant(source, "EYE_RX");
    const ry = readConstant(source, "EYE_RY");

    eyes.forEach((eye, index) => {
      const eyeLeft = (eye.minX / width) * 100;
      const eyeRight = (eye.maxX / width) * 100;
      const eyeTop = (eye.minY / height) * 100;
      const eyeBottom = (eye.maxY / height) * 100;

      expect(cx[index] - rx, `lid ${index} starts right of the eye`).toBeLessThanOrEqual(
        eyeLeft
      );
      expect(cx[index] + rx, `lid ${index} ends left of the eye`).toBeGreaterThanOrEqual(
        eyeRight
      );
      expect(cy - ry, `lid ${index} starts below the eye`).toBeLessThanOrEqual(eyeTop);
      expect(cy + ry, `lid ${index} ends above the eye`).toBeGreaterThanOrEqual(
        eyeBottom
      );
    });
  });

  it("do not spill onto the visor around them", () => {
    // The failure that was reported: a lid much larger than the eye,
    // darker than the panel, appearing as a patch on every blink.
    const rx = readConstant(source, "EYE_RX");
    const ry = readConstant(source, "EYE_RY");

    const eyeRx = ((eyes[0].maxX - eyes[0].minX) / 2 / width) * 100;
    const eyeRy = ((eyes[0].maxY - eyes[0].minY) / 2 / height) * 100;

    expect(rx - eyeRx, "lid is wider than the eye by more than a unit").toBeLessThan(1);
    expect(ry - eyeRy, "lid is taller than the eye by more than a unit").toBeLessThan(1);
  });

  it("move in sync with the floating artwork", () => {
    const styles = readFileSync(STYLES, "utf8");
    const artAnimation = styles.match(/\.anham__art\s*\{[\s\S]*?animation:\s*([^;]+);/);
    const lidsAnimation = styles.match(/\.anham__lids\s*\{[\s\S]*?animation:\s*([^;]+);/);

    expect(artAnimation?.[1]).toBe("anham-float 5.5s ease-in-out infinite");
    expect(lidsAnimation?.[1]).toBe(artAnimation?.[1]);
  });
});
