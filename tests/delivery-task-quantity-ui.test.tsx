import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeliveryTaskCard } from "@/components/delivery/DeliveryTaskCard";
import type { DeliveryTask } from "@/lib/delivery/types";

const task: DeliveryTask = {
  id: "synthetic-task",
  recipient_name: "Sandbox Client",
  recipient_email: "sandbox@example.test",
  recipient_phone: "+15555550123",
  delivery_address: "STAGING TEST ONLY",
  delivery_instructions: null,
  quantity: 6,
  status: "preparing",
  shipment_document_path: null,
  shipment_document_name: null,
  volunteer_comment: null,
  shipped_at: null,
  created_at: "2026-09-24T19:29:45.000Z"
};

describe("complimentary formula delivery quantity", () => {
  it.each([
    ["ru", "Количество формул"],
    ["en", "Formula quantity"]
  ] as const)("shows all six paid units in %s", (locale, label) => {
    const html = renderToStaticMarkup(<DeliveryTaskCard task={task} locale={locale} />);
    expect(html).toContain(`${label}:</strong> 6`);
  });
});
