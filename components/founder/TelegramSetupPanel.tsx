"use client";

import { useActionState, useState } from "react";
import {
  discoverTelegramChats,
  initialTelegramChatsState,
  initialTestNotificationState,
  sendTestNotification,
  type TelegramChatsState,
  type TestNotificationState
} from "@/lib/notifications/test-action";

async function runTest(): Promise<TestNotificationState> {
  return sendTestNotification();
}

async function runDiscovery(): Promise<TelegramChatsState> {
  return discoverTelegramChats();
}

// Two buttons that replace the fiddly part of the Telegram setup: finding
// the chat id by hand in a browser address bar, and guessing whether the
// alerts really arrive.
export function TelegramSetupPanel() {
  const [testState, testAction, testPending] = useActionState(
    runTest,
    initialTestNotificationState
  );
  const [chatsState, chatsAction, chatsPending] = useActionState(
    runDiscovery,
    initialTelegramChatsState
  );
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="telegram-setup">
      <form action={testAction}>
        <button
          className="button button--secondary"
          disabled={testPending}
          type="submit"
        >
          {testPending ? "Отправляю…" : "Отправить проверочный сигнал"}
        </button>
      </form>

      {testState.status !== "idle" ? (
        <p
          className={`form-message form-message--${
            testState.status === "success" ? "success" : "error"
          }`}
        >
          {testState.message}
        </p>
      ) : null}

      <form action={chatsAction}>
        <button
          className="button button--secondary"
          disabled={chatsPending}
          type="submit"
        >
          {chatsPending ? "Ищу…" : "Показать номер чата"}
        </button>
      </form>

      {chatsState.status !== "idle" ? (
        <p
          className={`form-message form-message--${
            chatsState.status === "success" ? "success" : "error"
          }`}
        >
          {chatsState.message}
        </p>
      ) : null}

      {chatsState.chats.length > 0 ? (
        <ul className="telegram-setup__chats">
          {chatsState.chats.map((chat) => (
            <li key={chat.id}>
              <code>{chat.id}</code>
              <span>{chat.title}</span>
              <button
                className="button button--secondary telegram-setup__copy"
                onClick={() => copy(chat.id)}
                type="button"
              >
                {copied === chat.id ? "Скопировано" : "Копировать"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
