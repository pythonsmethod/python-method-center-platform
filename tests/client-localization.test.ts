import { describe, expect, it } from "vitest";
import {
  caseDirectionLabel,
  caseStatusLabel,
  caseUrgencyLabel,
  documentStatusLabel,
  lifecycleEventLabel,
  paymentProductLabel,
  paymentStatusLabel,
  supportStatusLabel
} from "@/lib/i18n/status-labels";

describe("client status labels", () => {
  it("renders common values in Russian", () => {
    expect(caseStatusLabel("ready_for_review", "ru")).toBe("Передан на изучение");
    expect(documentStatusLabel("uploaded", "ru")).toBe("Загружен");
  });

  it("renders every client-facing label family in English", () => {
    expect(caseStatusLabel("ready_for_review", "en")).toBe("Submitted for review");
    expect(caseUrgencyLabel("normal", "en")).toBe("Normal");
    expect(caseDirectionLabel("recovery", "en")).toBe("Recovery");
    expect(documentStatusLabel("uploaded", "en")).toBe("Uploaded");
    expect(supportStatusLabel("open", "en")).toBe("Open");
    expect(lifecycleEventLabel("case_created", "en")).toBe("Case created");
    expect(paymentProductLabel("support_5_weeks", "en")).toBe("Support — 5 weeks");
    expect(paymentStatusLabel("paid", "en")).toBe("Paid");
  });
});
