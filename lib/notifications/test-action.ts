"use server";

import { revalidatePath } from "next/cache";
import { getFounderState } from "@/lib/auth/require-founder";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { isTelegramConfigured } from "@/lib/notifications/telegram";
import type {
  TelegramChat,
  TelegramChatsState,
  TestNotificationState
} from "@/lib/notifications/telegram-setup-state";

type TelegramChatPayload = {
  id?: number;
  title?: string;
  type?: string;
  first_name?: string;
  username?: string;
};

function describeChat(chat: TelegramChatPayload): TelegramChat | null {
  if (typeof chat.id !== "number") {
    return null;
  }

  const name =
    chat.title ??
    chat.first_name ??
    (chat.username ? `@${chat.username}` : null) ??
    "без названия";

  const kind =
    chat.type === "private"
      ? "личная переписка"
      : chat.type === "channel"
        ? "канал"
        : "группа";

  return { id: String(chat.id), title: `${name} · ${kind}` };
}

// Finds the chat id for TELEGRAM_CHAT_ID without the owner having to build
// an api.telegram.org URL by hand on a phone — the step where every setup
// gets stuck. Needs only TELEGRAM_BOT_TOKEN to be set.
export async function discoverTelegramChats(): Promise<TelegramChatsState> {
  const auth = await getFounderState();

  if (auth.status !== "authorized") {
    return { status: "error", message: "Недостаточно прав.", chats: [] };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token) {
    return {
      status: "error",
      message:
        "Сначала добавьте в Vercel переменную TELEGRAM_BOT_TOKEN (токен от BotFather) и нажмите Redeploy. Номер чата после этого найдётся сам.",
      chats: []
    };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    );
    const payload = (await response.json()) as {
      ok?: boolean;
      error_code?: number;
      description?: string;
      result?: Array<Record<string, { chat?: TelegramChatPayload }>>;
    };

    if (!payload.ok) {
      if (payload.error_code === 401) {
        return {
          status: "error",
          message:
            "Telegram не принял токен. Возьмите его заново: @BotFather → /mybots → ваш бот → API Token, вставьте в Vercel в TELEGRAM_BOT_TOKEN и нажмите Redeploy.",
          chats: []
        };
      }

      return {
        status: "error",
        message: `Telegram ответил: ${payload.description ?? "неизвестная ошибка"}.`,
        chats: []
      };
    }

    const found = new Map<string, TelegramChat>();

    for (const update of payload.result ?? []) {
      for (const value of Object.values(update)) {
        const chat = value?.chat ? describeChat(value.chat) : null;

        if (chat) {
          found.set(chat.id, chat);
        }
      }
    }

    if (found.size === 0) {
      return {
        status: "error",
        message:
          "Токен верный, но чатов пока не видно. Добавьте бота в вашу группу и напишите в ней любое сообщение — потом нажмите кнопку ещё раз.",
        chats: []
      };
    }

    return {
      status: "success",
      message:
        "Нашлись такие чаты. Возьмите номер нужной группы (он с минусом), вставьте его в Vercel в переменную TELEGRAM_CHAT_ID и нажмите Redeploy.",
      chats: [...found.values()]
    };
  } catch {
    return {
      status: "error",
      message: "Не удалось связаться с Telegram. Попробуйте ещё раз через минуту.",
      chats: []
    };
  }
}

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
