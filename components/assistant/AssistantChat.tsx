"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantChatProps = {
  endpoint: string;
  intro: string;
  placeholder?: string;
  suggestions?: string[];
};

export function AssistantChat({
  endpoint,
  intro,
  placeholder = "Напишите сообщение…",
  suggestions = []
}: AssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;

    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages, pending]);

  async function send(text: string) {
    const trimmed = text.trim();

    if (!trimmed || pending) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed }
    ];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages })
      });

      const data = (await response.json().catch(() => null)) as
        | { reply?: string; error?: string }
        | null;

      if (!response.ok || !data?.reply) {
        setError(data?.error ?? "Не удалось получить ответ. Попробуйте ещё раз.");
        return;
      }

      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="assistant-chat">
      <div className="assistant-chat__messages" ref={scrollRef}>
        <div className="assistant-msg assistant-msg--assistant">{intro}</div>
        {messages.map((message, index) => (
          <div
            className={`assistant-msg assistant-msg--${message.role}`}
            key={`${index}-${message.role}`}
          >
            {message.content}
          </div>
        ))}
        {pending ? (
          <div className="assistant-msg assistant-msg--assistant assistant-msg--pending">
            Печатает…
          </div>
        ) : null}
        {error ? <p className="form-message form-message--error">{error}</p> : null}
      </div>

      {messages.length === 0 && suggestions.length > 0 ? (
        <div className="assistant-chat__suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => void send(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="assistant-chat__form"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <textarea
          maxLength={4000}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          placeholder={placeholder}
          rows={2}
          value={input}
        />
        <button className="button" disabled={pending || !input.trim()} type="submit">
          Отправить
        </button>
      </form>
    </div>
  );
}
