import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The owner approved the circular "How the center works" journey for phones
// and tablets. It was removed once by mistake; this keeps it in place.
describe("homepage circular journey", () => {
  const page = fs.readFileSync(path.join(process.cwd(), "app", "(public)", "page.tsx"), "utf8");
  const css = fs.readFileSync(path.join(process.cwd(), "app", "(public)", "home-journey.css"), "utf8");

  it("renders the circle on the homepage", () => {
    expect(page).toContain('import { HomeJourney } from "@/components/home/HomeJourney";');
    expect(page).toContain('import "./home-journey.css";');
    expect(page).toContain("<HomeJourney title={mobile.journeyTitle} steps={mobileSteps} />");
  });

  it("shows the circle instead of the cards on phones and tablets", () => {
    expect(css).toContain("@media (max-width: 860px)");
    expect(css).toMatch(/\.home-journey \{ display: block;/);
    expect(css).toContain(".app-route > .app-mobile-route");
  });
});
