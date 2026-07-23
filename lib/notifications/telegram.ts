// Telegram delivery channel for team notifications. Config lives in env:
// TELEGRAM_BOT_TOKEN — bot token from @BotFather;
// TELEGRAM_CHAT_ID — chat/channel id the team reads.

const SEND_TIMEOUT_MS = 8000;
const RETRY_DELAYS_MS = [500, 1500];

export function isTelegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim()
  );
}

type SendResult = { ok: true } | { ok: false; error: string };

async function sendOnce(text: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    return { ok: false, error: "telegram-not-configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true
        }),
        signal: controller.signal
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false, error: `telegram-http-${response.status}: ${detail.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "telegram-unknown-error"
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendTelegramMessage(
  text: string
): Promise<SendResult & { attempts: number }> {
  let attempts = 0;
  let lastError = "not-attempted";

  for (let i = 0; i <= RETRY_DELAYS_MS.length; i += 1) {
    attempts += 1;
    const result = await sendOnce(text);

    if (result.ok) {
      return { ok: true, attempts };
    }

    lastError = result.error;

    if (i < RETRY_DELAYS_MS.length) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[i]));
    }
  }

  return { ok: false, error: lastError, attempts };
}
