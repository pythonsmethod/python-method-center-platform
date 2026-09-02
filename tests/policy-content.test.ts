import { describe, expect, it } from "vitest";
import {
  PRIVACY_CONTENT,
  REFUND_CONTENT,
  type LegalDocument
} from "@/lib/legal/policy-content";

// The privacy policy and the refund terms exist in two languages. The
// failure worth guarding against is not a typo — it is one language being
// edited and the other left behind, so that a client reading English is
// told something a client reading Russian is not. These tests pin the two
// editions to the same shape, and pin the handful of facts that a future
// edit must not quietly drop.

function headings(doc: LegalDocument): string[] {
  return doc.sections.map((section) => section.heading);
}

function allText(doc: LegalDocument): string {
  return [
    doc.title,
    doc.subtitle,
    doc.intro ?? "",
    doc.footer,
    ...doc.sections.flatMap((section) => [
      section.heading,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? [])
    ])
  ].join("\n");
}

describe.each([
  ["privacy policy", PRIVACY_CONTENT],
  ["refund terms", REFUND_CONTENT]
] as const)("%s", (_name, content) => {
  it("has the same number of sections in both languages", () => {
    expect(headings(content.en)).toHaveLength(headings(content.ru).length);
  });

  it("has the same shape section by section", () => {
    content.ru.sections.forEach((ruSection, index) => {
      const enSection = content.en.sections[index];

      expect(enSection.paragraphs?.length ?? 0).toBe(
        ruSection.paragraphs?.length ?? 0
      );
      expect(enSection.bullets?.length ?? 0).toBe(
        ruSection.bullets?.length ?? 0
      );
    });
  });

  it("carries no empty section", () => {
    for (const locale of ["ru", "en"] as const) {
      for (const section of content[locale].sections) {
        const count =
          (section.paragraphs?.length ?? 0) + (section.bullets?.length ?? 0);

        expect(count).toBeGreaterThan(0);
      }
    }
  });

  it("names the contact address in both languages", () => {
    expect(allText(content.ru)).toContain("pythonsusa@gmail.com");
    expect(allText(content.en)).toContain("pythonsusa@gmail.com");
  });

  it("keeps the Russian text free of Latin prose and vice versa", () => {
    // A section pasted into the wrong language is the drift that a reader
    // notices and a diff does not. Proper nouns and addresses are the
    // exception, so this only checks that each edition is predominantly
    // its own script.
    const ruCyrillic = (allText(content.ru).match(/[а-яё]/gi) ?? []).length;
    const enCyrillic = (allText(content.en).match(/[а-яё]/gi) ?? []).length;

    expect(ruCyrillic).toBeGreaterThan(1000);
    expect(enCyrillic).toBe(0);
  });
});

describe("privacy policy disclosures", () => {
  it("names every external recipient the code actually calls", () => {
    for (const locale of ["ru", "en"] as const) {
      const text = allText(PRIVACY_CONTENT[locale]);

      for (const processor of [
        "Supabase",
        "Vercel",
        "Stripe",
        "Anthropic",
        "OpenAI",
        "Telegram"
      ]) {
        expect(text).toContain(processor);
      }
    }
  });
});

describe("refund terms", () => {
  it("states the totals the payment page charges", () => {
    // 1,200 + 5% + 180 = 1,440 and 3,500 + 5% = 3,675, as in oferta-v3.
    expect(allText(REFUND_CONTENT.ru)).toContain("1 440");
    expect(allText(REFUND_CONTENT.ru)).toContain("3 675");
    expect(allText(REFUND_CONTENT.en)).toContain("1,440");
    expect(allText(REFUND_CONTENT.en)).toContain("3,675");
  });

  it("defers to the offer rather than replacing it", () => {
    expect(REFUND_CONTENT.ru.footer).toContain("оферт");
    expect(REFUND_CONTENT.en.footer).toContain("offer");
  });
});
