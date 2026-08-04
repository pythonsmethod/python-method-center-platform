"use server";

import { headers } from "next/headers";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { SHOP_CATALOG } from "@/lib/shop/catalog";
import { validateShopWaitlistInput } from "@/lib/shop/validation";
import type { ShopWaitlistActionState } from "@/lib/shop/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 8;
const hits = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (hits.size > 5000) {
    hits.clear();
  }

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

// Postgres unique violation: this person already asked about this product.
const UNIQUE_VIOLATION = "23505";

// Asks to be told when a shop product becomes available.
//
// Fails soft in one specific direction: if the row cannot be written but
// the team is still reached, the request has not been lost — the email is
// inside the alert — so the person is told it worked, because it did. Only
// when both the table and the alert fail do they see an error, and then it
// is true.
export async function joinShopWaitlist(
  _previousState: ShopWaitlistActionState,
  formData: FormData
): Promise<ShopWaitlistActionState> {
  const locale = await getLocale();
  const t = getDictionary(locale).shop.waitlist;

  const validation = validateShopWaitlistInput(
    {
      email: String(formData.get("email") ?? ""),
      itemId: String(formData.get("itemId") ?? ""),
      consent: formData.get("consent") === "on",
      honeypot: String(formData.get("website") ?? "")
    },
    {
      invalidEmail: t.errorEmail,
      consentRequired: t.errorConsent,
      generic: t.errorGeneric
    }
  );

  if ("error" in validation) {
    return { status: "error", message: validation.error };
  }

  const headerStore = await headers();
  const clientKey =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(clientKey)) {
    return { status: "error", message: t.errorRateLimited };
  }

  // The team reads the alert in Russian whatever the visitor was reading.
  const itemLabel = validation.itemId
    ? SHOP_CATALOG.ru.items[validation.itemId].title
    : "Вся линия";

  let profileId: string | null = null;

  try {
    const auth = await createSupabaseServerClient();

    if (auth) {
      const {
        data: { user }
      } = await auth.auth.getUser();

      profileId = user?.id ?? null;
    }
  } catch {
    profileId = null;
  }

  const supabase = createSupabaseServiceClient();
  let stored = false;

  if (supabase) {
    const { error } = await supabase.from("shop_waitlist").insert({
      email: validation.email,
      item_id: validation.itemId,
      profile_id: profileId,
      locale
    });

    if (error?.code === UNIQUE_VIOLATION) {
      // Already on the list. Nothing to write and nothing to announce.
      return { status: "success", message: t.successRepeat };
    }

    stored = !error;
  }

  const delivery = await notifyTeam({
    kind: "support_request",
    dedupeKey: `shop_waitlist:${validation.email.toLowerCase()}:${
      validation.itemId ?? "line"
    }`,
    title: "🛍 ЛИСТ ОЖИДАНИЯ МАГАЗИНА — новая запись",
    lines: [
      `Позиция: ${itemLabel}`,
      `Email: ${validation.email}`,
      `Язык: ${locale === "en" ? "английский" : "русский"}`,
      profileId ? `Зарегистрирован: профиль ${profileId}` : "Гость сайта",
      stored
        ? "Запись сохранена в shop_waitlist."
        : "ВНИМАНИЕ: запись в базу не прошла — email есть только в этом сообщении."
    ],
    link: adminLink("/admin")
  });

  if (!stored && delivery !== "sent" && delivery !== "duplicate") {
    return { status: "error", message: t.errorUnavailable };
  }

  return { status: "success", message: t.success };
}
