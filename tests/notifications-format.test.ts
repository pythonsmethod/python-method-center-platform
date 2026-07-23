import { describe, expect, it } from "vitest";
import {
  buildNotificationText,
  truncateExcerpt
} from "@/lib/notifications/format";

describe("truncateExcerpt", () => {
  it("returns null for empty input", () => {
    expect(truncateExcerpt(null)).toBeNull();
    expect(truncateExcerpt("")).toBeNull();
    expect(truncateExcerpt("   \n ")).toBeNull();
  });

  it("collapses whitespace to a single line", () => {
    expect(truncateExcerpt("боль\nв   груди")).toBe("боль в груди");
  });

  it("caps length with an ellipsis and never exceeds the limit", () => {
    const long = "а".repeat(500);
    const result = truncateExcerpt(long, 160);
    expect(result?.length).toBeLessThanOrEqual(160);
    expect(result?.endsWith("…")).toBe(true);
  });

  it("keeps short strings intact", () => {
    expect(truncateExcerpt("короткий текст")).toBe("короткий текст");
  });
});

describe("buildNotificationText", () => {
  it("joins title, non-empty lines and link", () => {
    const text = buildNotificationText({
      title: "Тест",
      lines: ["строка 1", null, "", "строка 2"],
      link: "https://example.com/admin"
    });
    expect(text).toBe("☥ Тест\nстрока 1\nстрока 2\nhttps://example.com/admin");
  });

  it("omits the link when absent", () => {
    const text = buildNotificationText({ title: "Тест", lines: ["a"] });
    expect(text).toBe("☥ Тест\na");
  });
});
