import { describe, expect, it } from "vitest";
import { countryFlag, isCountryCode, isFullName } from "@/lib/profile/identity";

describe("profile identity", () => {
  it("requires both a first and last name", () => {
    expect(isFullName("Юрий")).toBe(false);
    expect(isFullName("Dana Jassybaeva")).toBe(true);
    expect(isFullName("Анна-Мария О'Нил")).toBe(true);
  });

  it("validates ISO country codes and renders their flags", () => {
    expect(isCountryCode("KZ")).toBe(true);
    expect(isCountryCode("ZZ")).toBe(false);
    expect(countryFlag("KZ")).toBe("🇰🇿");
  });
});
