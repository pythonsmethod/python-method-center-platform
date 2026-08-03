import { describe, expect, it } from "vitest";
import {
  buildEscalationInsert,
  buildInsertFailureDedupeKey,
  extractRedFlag
} from "@/lib/assistant/red-flags";

describe("red-flag escalation rows (P0-01)", () => {
  it("records an anonymous physical emergency with a null profile", () => {
    const row = buildEscalationInsert(
      {
        category: "physical",
        messageExcerpt: "сильная боль в груди, немеет рука",
        profileId: null
      },
      null
    );

    expect(row.profile_id).toBeNull();
    expect(row.case_id).toBeNull();
    expect(row.category).toBe("physical_medical");
    expect(row.routing_target).toBe("karen");
    expect(row.requires_immediate_review).toBe(true);
  });

  it("records an anonymous psychological crisis routed to support", () => {
    const row = buildEscalationInsert(
      {
        category: "psychological",
        messageExcerpt: "я не хочу больше жить",
        profileId: null
      },
      null
    );

    expect(row.profile_id).toBeNull();
    expect(row.category).toBe("psychological_crisis");
    expect(row.routing_target).toBe("support");
    expect(row.requires_immediate_review).toBe(true);
  });

  it("keeps the profile and case for an authenticated client", () => {
    const physical = buildEscalationInsert(
      {
        category: "physical",
        messageExcerpt: "боль в груди",
        profileId: "profile-1"
      },
      "case-1"
    );
    const psychological = buildEscalationInsert(
      {
        category: "psychological",
        messageExcerpt: "мысли о суициде",
        profileId: "profile-1"
      },
      "case-1"
    );

    expect(physical.profile_id).toBe("profile-1");
    expect(physical.case_id).toBe("case-1");
    expect(physical.routing_target).toBe("karen");
    expect(psychological.routing_target).toBe("support");
  });

  it("truncates the stored excerpt and records the detection source", () => {
    const row = buildEscalationInsert(
      {
        category: "physical",
        messageExcerpt: "х".repeat(2000),
        profileId: null,
        source: "deterministic"
      },
      null
    );

    expect((row.signals.message_excerpt as string).length).toBe(600);
    expect(row.signals.detected_by).toBe("deterministic");
  });

  it("collapses repeated insert failures under one deterministic key", () => {
    const a = buildInsertFailureDedupeKey("physical", "боль в груди", "2026-08-04");
    const b = buildInsertFailureDedupeKey("physical", "боль в груди", "2026-08-04");
    const otherDay = buildInsertFailureDedupeKey(
      "physical",
      "боль в груди",
      "2026-08-05"
    );

    expect(a).toBe(b);
    expect(a).not.toBe(otherDay);
    expect(a).not.toContain("NaN");
  });
});

describe("marker extraction", () => {
  it("strips the marker and returns the category", () => {
    const physical = extractRedFlag(
      "Вызовите скорую немедленно. [RED_FLAG:physical]"
    );
    const psychological = extractRedFlag(
      "Вы не одни. [RED_FLAG:psychological]"
    );

    expect(physical.category).toBe("physical");
    expect(physical.cleanedReply).not.toContain("RED_FLAG");
    expect(psychological.category).toBe("psychological");
  });

  it("returns null when the model emitted no marker", () => {
    const result = extractRedFlag("Обычный спокойный ответ без маркера.");

    expect(result.category).toBeNull();
  });
});
