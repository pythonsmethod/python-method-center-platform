import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The owner approved the circular "How the center works" journey for every
// screen. It was removed once by mistake; this keeps it in place.
describe("homepage circular journey", () => {
  const page = fs.readFileSync(path.join(process.cwd(), "app", "(public)", "page.tsx"), "utf8");
  const css = fs.readFileSync(path.join(process.cwd(), "app", "(public)", "home-journey.css"), "utf8");

  it("renders the circle on the homepage", () => {
    expect(page).toContain('import { HomeJourney } from "@/components/home/HomeJourney";');
    expect(page).toContain('import "./home-journey.css";');
    expect(page).toContain("<HomeJourney title={mobile.journeyTitle} steps={mobileSteps} />");
  });

  it("shows the circle on every screen, with no card list beside it", () => {
    expect(css).toMatch(/^[^@]*\.home-journey \{ display: block;/);
    expect(css).not.toContain(".home-journey { display: none; }");
    expect(page).not.toContain("app-mobile-route");
  });
});
