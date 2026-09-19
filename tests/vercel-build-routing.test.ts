import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = "scripts/vercel-ignore-build.sh";

const WEB_PROJECT = "prj_Lym5X8Vru64nF1iuoW57BGTgtLpE";
const CLINICAL_PROJECT = "prj_XNF5KW6ERqu9zRbxens8Rtwjac5e";
const MOBILE_PROJECT = "prj_fx6kW7rgDJW9KxTNGgiFMIcKw5Yt";

function result(projectId: string, ref: string) {
  return spawnSync("sh", [script], {
    env: {
      ...process.env,
      VERCEL_PROJECT_ID: projectId,
      VERCEL_GIT_COMMIT_REF: ref
    },
    encoding: "utf8"
  });
}

describe("Vercel automatic build routing", () => {
  it("keeps previews enabled for the primary web project", () => {
    for (const ref of ["main", "agent/feature", "anything"]) {
      expect(result(WEB_PROJECT, ref).status).toBe(1);
    }
  });

  it("skips unrelated feature branches for clinical staging", () => {
    expect(result(CLINICAL_PROJECT, "agent/pmc-monthly-pricing-20260919").status).toBe(0);
    expect(result(CLINICAL_PROJECT, "feature/copy").status).toBe(0);
  });

  it("allows clinical staging only on main or explicitly scoped branches", () => {
    for (const ref of ["main", "clinical/labs", "staging/acceptance", "anham-clinical/test"]) {
      expect(result(CLINICAL_PROJECT, ref).status).toBe(1);
    }
  });

  it("skips unrelated feature branches for the mobile project", () => {
    expect(result(MOBILE_PROJECT, "agent/pmc-monthly-pricing-20260919").status).toBe(0);
    expect(result(MOBILE_PROJECT, "feature/copy").status).toBe(0);
  });

  it("allows mobile builds only on main or explicitly scoped branches", () => {
    for (const ref of ["main", "mobile/payments", "anham-mobile/voice"]) {
      expect(result(MOBILE_PROJECT, ref).status).toBe(1);
    }
  });

  it("fails open for an unknown future project instead of silently suppressing it", () => {
    expect(result("prj_future_project", "agent/test").status).toBe(1);
  });

  it("keeps the routing script wired as Vercel's ignored build step", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    expect(config.ignoreCommand).toBe("sh scripts/vercel-ignore-build.sh");
  });
});
