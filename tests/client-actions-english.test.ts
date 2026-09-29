import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  locale: "en" as "ru" | "en",
  insertError: null as { message: string } | null,
  stripeEnabled: false,
  couponName: "",
  transactionNote: ""
}));

const supabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(async () => ({ data: { user: { id: "11111111-1111-4111-8111-111111111111" } } }))
  },
  from: vi.fn(() => ({
    insert: vi.fn(async () => ({ error: state.insertError }))
  }))
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: async () => state.locale }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => supabase }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => null }));
vi.mock("@/lib/tokens/queries", () => ({
  getTokenBalance: vi.fn(async () => 100),
  TOKEN_REASONS: { redeemed: "redeemed" },
  writeTokenTransaction: vi.fn(async (input: { note: string }) => {
    state.transactionNote = input.note;
    return { ok: true };
  })
}));
vi.mock("@/lib/payments/stripe", () => ({
  getStripe: () => state.stripeEnabled ? {
    coupons: {
      create: vi.fn(async (input: { name: string }) => {
        state.couponName = input.name;
        return { id: "coupon_1" };
      })
    },
    promotionCodes: {
      create: vi.fn(async () => ({ id: "promo_1", code: "SAVE10" })),
      update: vi.fn(async () => undefined)
    }
  } : null
}));

import { submitAltPaymentRequest } from "@/lib/payments/alt-request-action";
import { sendClientCaseMessage } from "@/lib/messages/actions";
import { addMetricEntry } from "@/lib/metrics/actions";
import { redeemTokens } from "@/lib/tokens/actions";
import { saveNight } from "@/lib/sleep/actions";
import { addSupplement } from "@/lib/supplements/actions";

const initial = { status: "idle" as const, message: "" };
const cyrillic = /[А-Яа-яЁё]/;

function expectEnglish(message: string): void {
  expect(message).not.toMatch(cyrillic);
}

beforeEach(() => {
  state.locale = "en";
  state.insertError = null;
  state.stripeEnabled = false;
  state.couponName = "";
  state.transactionNote = "";
  vi.clearAllMocks();
});

describe("client-facing server action locale", () => {
  it("localizes alternative-payment validation and preserves the Russian wording", async () => {
    const form = new FormData();
    const english = await submitAltPaymentRequest(initial, form);
    expectEnglish(english.message);

    state.locale = "ru";
    const russian = await submitAltPaymentRequest(initial, form);
    expect(russian.message).toBe("Укажите корректный email — на него мы пришлём реквизиты.");
  });

  it("localizes client case-message validation and preserves the Russian wording", async () => {
    const form = new FormData();
    const english = await sendClientCaseMessage(initial, form);
    expectEnglish(english.message);

    state.locale = "ru";
    const russian = await sendClientCaseMessage(initial, form);
    expect(russian.message).toBe("Введите сообщение (до 8000 символов).");
  });

  it("localizes metric errors and a successful message", async () => {
    const invalid = new FormData();
    invalid.set("value", "12");
    invalid.set("measured_at", "2026-09-28");
    expectEnglish((await addMetricEntry(initial, invalid)).message);

    const valid = new FormData();
    valid.set("metric_name", "Hemoglobin");
    valid.set("value", "125");
    valid.set("measured_at", "2026-09-28");
    const saved = await addMetricEntry(initial, valid);
    expect(saved.status).toBe("success");
    expectEnglish(saved.message);
    expect(saved.message).toContain("Hemoglobin");

    state.locale = "ru";
    expect((await addMetricEntry(initial, invalid)).message).toBe("Укажите название показателя — например, «Гемоглобин».");
  });

  it("localizes token redemption validation and preserves the Russian wording", async () => {
    const form = new FormData();
    form.set("amount", "1.5");
    expectEnglish((await redeemTokens(initial, form)).message);

    state.stripeEnabled = true;
    const valid = new FormData();
    valid.set("amount", "10");
    const redeemed = await redeemTokens(initial, valid);
    expect(redeemed.status).toBe("success");
    expectEnglish(redeemed.message);
    expectEnglish(state.couponName);
    expectEnglish(state.transactionNote);

    state.locale = "ru";
    expect((await redeemTokens(initial, form)).message).toBe("Укажите целое количество токенов.");
  });

  it("localizes sleep validation and preserves the Russian wording", async () => {
    const form = new FormData();
    expectEnglish((await saveNight(initial, form)).message);

    state.locale = "ru";
    expect((await saveNight(initial, form)).message).toBe("Укажите дату утра, когда вы проснулись.");
  });

  it("localizes supplement validation and preserves the Russian wording", async () => {
    const form = new FormData();
    expectEnglish((await addSupplement(initial, form)).message);

    state.locale = "ru";
    expect((await addSupplement(initial, form)).message).toBe("Укажите название — например, «Магний» или «Витамин D».");
  });
});
