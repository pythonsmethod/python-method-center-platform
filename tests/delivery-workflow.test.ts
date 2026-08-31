import { describe, expect, it } from "vitest";
import { formatDeliveryAddress, isDeliveryProfileComplete } from "@/lib/delivery/profile";

const profile = {
  delivery_first_name: "Dana",
  delivery_last_name: "Jassybayeva",
  delivery_email: "dana@example.com",
  delivery_phone: "+77001234567",
  delivery_country_code: "KZ",
  delivery_region: "Almaty",
  delivery_city: "Almaty",
  delivery_street: "Abay Avenue",
  delivery_building: "10",
  delivery_unit: "Office 5",
  delivery_postal_code: "050000",
  delivery_instructions: "Hold at the collection point",
  delivery_confirmed_at: "2026-08-31T00:00:00Z"
};

describe("delivery workflow", () => {
  it("requires the complete international delivery identity and address", () => {
    expect(isDeliveryProfileComplete(profile)).toBe(true);
    expect(isDeliveryProfileComplete({ ...profile, delivery_postal_code: "" })).toBe(false);
    expect(isDeliveryProfileComplete({ ...profile, delivery_phone: "7001234567" })).toBe(false);
    expect(isDeliveryProfileComplete({ ...profile, delivery_email: "invalid" })).toBe(false);
  });

  it("formats the address snapshot used by Anna and the volunteer", () => {
    expect(formatDeliveryAddress(profile)).toBe(
      "050000, KZ, Almaty, Almaty, Abay Avenue, 10, Office 5"
    );
  });
});
