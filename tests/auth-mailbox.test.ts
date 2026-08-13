import { describe, expect, it } from "vitest";
import { findMailbox } from "@/lib/auth/mailbox";

// The button that opens the right inbox is the difference between "I got
// in" and "I could not find the letter" for someone who does not use a
// computer often. Sending them to the wrong provider would be worse than
// sending them nowhere, so an unknown domain must stay unknown.
describe("findMailbox", () => {
  it("recognises the providers the centre's clients actually use", () => {
    expect(findMailbox("anna@gmail.com")?.label).toBe("Gmail");
    expect(findMailbox("anna@mail.ru")?.label).toBe("Mail.ru");
    expect(findMailbox("anna@bk.ru")?.label).toBe("Mail.ru");
    expect(findMailbox("anna@yandex.ru")?.label).toBe("Яндекс.Почту");
    expect(findMailbox("anna@icloud.com")?.label).toBe("iCloud Почту");
    expect(findMailbox("anna@hotmail.com")?.label).toBe("Outlook");
  });

  it("ignores case and stray spaces, the way the sign-up form does", () => {
    expect(findMailbox("  Anna@Gmail.COM ")?.label).toBe("Gmail");
  });

  it("offers nothing for a domain it does not know", () => {
    expect(findMailbox("anna@her-own-clinic.ru")).toBeNull();
  });

  it("survives anything that is not an address", () => {
    expect(findMailbox("")).toBeNull();
    expect(findMailbox("anna")).toBeNull();
    expect(findMailbox(undefined as unknown as string)).toBeNull();
  });

  it("points every known provider at an https address", () => {
    for (const email of ["a@gmail.com", "a@mail.ru", "a@yandex.ru"]) {
      expect(findMailbox(email)?.url.startsWith("https://")).toBe(true);
    }
  });
});
