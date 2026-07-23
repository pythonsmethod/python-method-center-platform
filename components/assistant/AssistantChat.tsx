"use client";

import { useEffect, useRef, useState } from "react";
import { useVoiceInput } from "@/components/assistant/useVoiceInput";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

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
  locale?: Locale;
};

type Provider = "best" | "claude" | "gpt" | "both";

export function AssistantChat({
  endpoint,
  intro,
  placeholder,
  suggestions = [],
  providerChoice = false,
  caseId,
  locale = "ru"
}: AssistantChatProps) {
  const t = getDictionary(locale).widget;
  const effectivePlaceholder = placeholder ?? t.placeholder;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("best");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const voice = useVoiceInput((text) => {
    setInput((current) => (current ? `${current} ${text}` : text));
  });

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
          locale,
          ...(providerChoice ? { provider } : {}),
          ...(caseId ? { caseId } : {})
        })
      });

      const data = (await response.json().catch(() => null)) as
        | { reply?: string; error?: string }
        | null;

      if (!response.ok || !data?.reply) {
        setError(data?.error ?? t.errorGeneric);
        return;
      }

      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setError(t.errorNetwork);
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
            {t.sending}
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
          placeholder={voice.listening ? t.listening : effectivePlaceholder}
          rows={2}
          value={voice.interim ? `${input}${input ? " " : ""}${voice.interim}` : input}
        />
        {voice.listening ? (
          <p className="assistant-chat__voice-hint">
            {t.voiceHint}
          </p>
        ) : null}
        <div className="assistant-chat__actions">
          {voice.supported ? (
            <button
              aria-label={voice.listening ? t.micStop : t.micStart}
              className={`assistant-chat__mic${voice.listening ? " assistant-chat__mic--on" : ""}`}
              onClick={voice.toggle}
              type="button"
            >
              🎤
            </button>
          ) : null}
          <button className="button" disabled={pending || !input.trim()} type="submit">
            {t.send}
          </button>
        </div>
      </form>
    </div>
  );
}
