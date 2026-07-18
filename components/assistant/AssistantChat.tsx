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
  providerChoice?: boolean;
  caseId?: string;
};

type Provider = "best" | "claude" | "gpt" | "both";

export function AssistantChat({
  endpoint,
  intro,
  placeholder = "Напишите сообщение…",
  suggestions = [],
  providerChoice = false,
  caseId
}: AssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("best");
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
        body: JSON.stringify({
          messages: nextMessages,
          ...(providerChoice ? { provider } : {}),
          ...(caseId ? { caseId } : {})
        })
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

      {providerChoice ? (
        <label className="assistant-chat__provider">
          Кто отвечает
          <select
            onChange={(event) => setProvider(event.target.value as Provider)}
            value={provider}
          >
            <option value="best">Лучший ответ (арбитр выбирает)</option>
            <option value="claude">Claude</option>
            <option value="gpt">GPT</option>
            <option value="both">Оба вместе (совет)</option>
          </select>
        </label>
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
