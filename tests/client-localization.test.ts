import { describe, expect, it } from "vitest";
import {
  documentStatusLabel,
  lifecycleEventLabel,
  paymentProductLabel,
  paymentStatusLabel
} from "@/lib/i18n/status-labels";

describe("client status labels", () => {
  it("renders common values in Russian", () => {
    expect(documentStatusLabel("uploaded", "ru")).toBe("Загружен");
  });

  it("renders every client-facing label family in English", () => {
    expect(documentStatusLabel("uploaded", "en")).toBe("Uploaded");
    expect(lifecycleEventLabel("case_created", "en")).toBe("Case created");
    expect(paymentProductLabel("support_5_weeks", "en")).toBe("Support — 5 weeks");
    expect(paymentStatusLabel("paid", "en")).toBe("Paid");
  });
});
