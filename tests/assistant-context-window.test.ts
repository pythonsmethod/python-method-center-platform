import { describe, expect, it } from "vitest";
import {
  contextWindow,
  MODEL_CONTEXT_MESSAGES,
  type ContextMessage
} from "@/lib/assistant/context-window";

function thread(count: number): ContextMessage[] {
  return Array.from({ length: count }, (_unused, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `message ${index}`
  })) as ContextMessage[];
}

describe("what a restored conversation sends to the model", () => {
  it("keeps a short thread whole", () => {
    const messages = thread(3);

    expect(contextWindow(messages)).toEqual(messages);
  });

  it("sends only the recent part of a long saved conversation", () => {
    const result = contextWindow(thread(60));

    expect(result.length).toBeLessThanOrEqual(MODEL_CONTEXT_MESSAGES);
    expect(result[result.length - 1]?.content).toBe("message 59");
  });

  it("always starts with a message from the person", () => {
    // An odd-length cut would begin on an assistant reply, which the server
    // rejects outright.
    for (const size of [13, 25, 41, 61]) {
      expect(contextWindow(thread(size))[0]?.role).toBe("user");
    }
  });

  it("leaves an empty thread empty", () => {
    expect(contextWindow([])).toEqual([]);
  });
});
