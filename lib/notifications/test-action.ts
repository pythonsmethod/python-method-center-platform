"use server";

import { revalidatePath } from "next/cache";
import { getFounderState } from "@/lib/auth/require-founder";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { isTelegramConfigured } from "@/lib/notifications/telegram";

export type TestNotificationState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialTestNotificationState: TestNotificationState = {
  status: "idle",
  message: ""
};

// One-click proof that the Telegram channel really works, end to end:
// the same code path a red flag uses, including the delivery log. Without
// it the only way to test the alerting is to trigger a real emergency.
export async function sendTestNotification(): Promise<TestNotificationState> {
  const auth = await getFounderState();

  if (auth.status !== "authorized") {
    return {
      status: "error",
      message: "Недостаточно прав для отправки проверочного сигнала."
    };
  }

  if (!isTelegramConfigured()) {
    return {
      status: "error",
      message:
        "Telegram-бот ещё не подключён: в Vercel не заданы TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID. Добавьте их и нажмите Redeploy."
    };
  }

  const stamp = new Date().toLocaleString("ru-RU", { timeZone: "UTC" });

  const result = await notifyTeam({
    kind: "processing_error",
    // Unique per attempt: a test must never be swallowed as a duplicate.
    dedupeKey: `test-notification:${Date.now()}`,
    title: "ПРОВЕРКА СВЯЗИ: уведомления работают",
    lines: [
      "Это проверочное сообщение из кабинета основателя.",
      `Отправлено: ${stamp} UTC.`,
      "Если вы это читаете — красные флаги, оплаты и обращения тоже дойдут."
    ],
    link: adminLink("/admin/founder")
  });

  revalidatePath("/admin/founder");

  if (result === "sent") {
    return {
      status: "success",
      message:
        "Отправлено. Проверьте чат в Telegram — сообщение уже там. Если его нет, значит бот добавлен не в тот чат."
    };
  }

  if (result === "skipped") {
    return {
      status: "error",
      message:
        "Событие записано, но не отправлено: Telegram не настроен. Проверьте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в Vercel."
    };
  }

  if (result === "log-unavailable") {
    return {
      status: "error",
      message:
        "Нет доступа к журналу уведомлений — проверьте SUPABASE_SERVICE_ROLE_KEY в Vercel."
    };
  }

  return {
    status: "error",
    message:
      "Telegram не принял сообщение. Чаще всего это неверный TELEGRAM_CHAT_ID или бот не добавлен в чат. Точная причина — в журнале уведомлений (строка «не доставлено»)."
  };
}
