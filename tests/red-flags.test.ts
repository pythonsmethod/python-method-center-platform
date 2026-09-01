import { describe, expect, it } from "vitest";
import { detectRedFlagInMessage } from "@/lib/assistant/red-flags";

// The recognition of crisis language, kept for one use: the sleep tracker
// refuses to file an emergency as a night's note and tells the person where
// to go. The automatic escalation that used to sit behind it — an event row
// and a Telegram alert — was removed by the owner's decision: the centre is
// not an emergency service and must not promise to act like one.

describe("распознавание кризисных фраз в сообщении", () => {
  it("узнаёт физическую угрозу по-русски", () => {
    expect(detectRedFlagInMessage("у меня сильная боль в груди и немеет рука")).toBe("physical");
    expect(detectRedFlagInMessage("я задыхаюсь, нечем дышать")).toBe("physical");
    expect(detectRedFlagInMessage("рвота с кровью со вчерашнего дня")).toBe("physical");
  });

  it("узнаёт психологический кризис по-русски", () => {
    expect(detectRedFlagInMessage("я не хочу больше жить")).toBe("psychological");
    expect(detectRedFlagInMessage("думаю покончить с собой")).toBe("psychological");
    expect(detectRedFlagInMessage("хочу убить себя")).toBe("psychological");
  });

  it("узнаёт то же по-английски", () => {
    expect(detectRedFlagInMessage("I have severe chest pain right now")).toBe("physical");
    expect(detectRedFlagInMessage("I can't breathe properly")).toBe("physical");
    expect(detectRedFlagInMessage("I want to kill myself")).toBe("psychological");
    expect(detectRedFlagInMessage("thinking about self-harm again")).toBe("psychological");
  });

  it("при обоих видах фраз физическая угроза важнее", () => {
    // A medical emergency with psychological language still needs the
    // ambulance first.
    expect(
      detectRedFlagInMessage("не хочу жить, и ещё эта боль в груди не проходит")
    ).toBe("physical");
  });

  it("молчит на обычный разговор о восстановлении", () => {
    expect(detectRedFlagInMessage("хочу жить лучше и восстановиться")).toBeNull();
    expect(detectRedFlagInMessage("какие анализы мне сдать?")).toBeNull();
    expect(detectRedFlagInMessage("после тренировки болят мышцы")).toBeNull();
    expect(detectRedFlagInMessage("how long does the review take?")).toBeNull();
  });
});
