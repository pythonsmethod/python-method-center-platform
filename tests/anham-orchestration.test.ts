import { describe, expect, it } from "vitest";
import { chooseAnhamMode } from "@/lib/assistant/router";

describe("Anham request routing", () => {
  it("keeps everyday conversation on one strong model", () => {
    expect(
      chooseAnhamMode([{ role: "user", content: "Спасибо, всё понятно." }])
    ).toBe("standard");
  });

  it("uses deep synthesis for a whole-body or test-result question", () => {
    expect(
      chooseAnhamMode([
        {
          role: "user",
          content: "Что сейчас происходит с организмом и как связаны показатели анализов?"
        }
      ])
    ).toBe("deep");
  });

  it("uses deep synthesis for a data-heavy question", () => {
    expect(
      chooseAnhamMode([
        { role: "user", content: "Сопоставь значения 18,4, 116 и 4,8." }
      ])
    ).toBe("deep");
  });
});
